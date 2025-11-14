import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { NewMessageEmail } from './_templates/new-message.tsx';
import { NewUnlockableEmail } from './_templates/new-unlockable.tsx';

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
      html = await renderAsync(
        React.createElement(NewMessageEmail, {
          recipientName: profile.display_name,
          senderName,
          messagePreview,
          appUrl,
        })
      );
    } else if (type === 'new_unlockable') {
      subject = `${senderName} sent you exclusive content`;
      html = await renderAsync(
        React.createElement(NewUnlockableEmail, {
          recipientName: profile.display_name,
          senderName,
          appUrl,
        })
      );
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
