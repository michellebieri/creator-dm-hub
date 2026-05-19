import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept service-role key (edge-function-to-edge-function) OR
  // an authenticated user JWT (browser → function, e.g. MessagingInterface).
  // Mirrors the pattern used in create-notification (B2 fix).
  const apiKey = req.headers.get("apikey");
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const isServiceRole = apiKey === serviceRoleKey;

  if (!isServiceRole) {
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Verify the caller holds a valid user session
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Check if RESEND_API_KEY is configured
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey || resendApiKey === '' || resendApiKey === 'not_configured') {
    console.log('RESEND_API_KEY not configured - email notifications disabled');
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Email notifications disabled - RESEND_API_KEY not configured' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { type, recipientId, senderName, messagePreview } = await req.json();

    // Get recipient's email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('id', recipientId)
      .single();

    if (profileError) throw profileError;

    // Get user email from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(recipientId);
    
    if (userError || !user?.email) {
      console.log('No email found for user:', recipientId);
      return new Response(JSON.stringify({ success: false, message: 'No email found' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user has email notifications enabled
    if (user.user_metadata?.email_notifications === false) {
      console.log('Email notifications disabled for user:', recipientId);
      return new Response(JSON.stringify({ success: false, message: 'Notifications disabled' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'http://localhost:5173';

    let subject = '';
    let html = '';

    if (type === 'new_message') {
      subject = `New message from ${senderName}`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Message from ${senderName}</h2>
          <p>Hi ${profile.display_name},</p>
          <p>You have a new message from ${senderName}:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${messagePreview}</p>
          </div>
          <a href="${appUrl}/messages" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Message</a>
        </div>
      `;
    } else if (type === 'new_unlockable') {
      subject = `${senderName} sent you exclusive content`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Exclusive Content from ${senderName}</h2>
          <p>Hi ${profile.display_name},</p>
          <p>${senderName} has sent you exclusive content!</p>
          <a href="${appUrl}/messages" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Content</a>
        </div>
      `;
    }

    // Send email using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'DM.me <onboarding@resend.dev>',
        to: [user.email],
        subject,
        html,
      })
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await resendResponse.json();
    console.log(`Email sent successfully to ${user.email}:`, data);

    return new Response(JSON.stringify({ success: true, emailId: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
