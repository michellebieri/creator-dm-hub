import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    let subject = '';
    let body = '';

    if (type === 'new_message') {
      subject = `New message from ${senderName}`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0EA5E9;">You have a new message!</h2>
          <p>Hi ${profile.display_name},</p>
          <p>${senderName} sent you a message:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">${messagePreview}</p>
          </div>
          <p>
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/messages" 
               style="background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Message
            </a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            You're receiving this because someone sent you a message on DM.me
          </p>
        </div>
      `;
    } else if (type === 'new_unlockable') {
      subject = `${senderName} sent you exclusive content`;
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0EA5E9;">🔒 New Unlockable Content!</h2>
          <p>Hi ${profile.display_name},</p>
          <p>${senderName} sent you exclusive unlockable content.</p>
          <p>
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/messages" 
               style="background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View & Unlock
            </a>
          </p>
        </div>
      `;
    }

    // Send email using Supabase's built-in email service (via auth)
    // Note: In production, you'd integrate with a service like SendGrid or Resend
    console.log(`Email notification queued for ${user.email}: ${subject}`);
    
    // For now, just log it. In production, integrate with email service:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'DM.me <noreply@dmme.com>',
    //     to: user.email,
    //     subject,
    //     html: body
    //   })
    // });

    return new Response(JSON.stringify({ success: true }), {
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
