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
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #0EA5E9, #14B8A6); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💬 New Message</h1>
              </div>
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #333333; margin-bottom: 10px;">Hi ${profile.display_name},</p>
                <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
                  <strong>${senderName}</strong> sent you a message:
                </p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #0EA5E9;">
                  <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                    ${messagePreview}
                  </p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/conversations" 
                     style="background-color: #0EA5E9; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                    View Message
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  You're receiving this because someone sent you a message on DM.me
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (type === 'new_unlockable') {
      subject = `${senderName} sent you exclusive content`;
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #0EA5E9, #14B8A6); padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔒 Exclusive Content</h1>
              </div>
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: #333333; margin-bottom: 10px;">Hi ${profile.display_name},</p>
                <p style="font-size: 16px; color: #333333; margin-bottom: 30px;">
                  <strong>${senderName}</strong> sent you exclusive unlockable content!
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${appUrl}/conversations" 
                     style="background-color: #0EA5E9; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                    View & Unlock Content
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  You're receiving this because someone sent you premium content on DM.me
                </p>
              </div>
            </div>
          </body>
        </html>
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
