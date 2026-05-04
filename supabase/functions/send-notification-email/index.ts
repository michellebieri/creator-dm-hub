import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type, title, message, link }: NotificationEmailRequest = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user email and preferences
    const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (!userData?.user?.email) {
      console.log("User has no email");
      return new Response(JSON.stringify({ success: false, reason: "No email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check email preferences
    const { data: prefs } = await supabaseClient
      .from("email_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Map notification types to preference fields
    const typeMap: Record<string, keyof typeof prefs> = {
      new_message: 'new_message',
      new_subscriber: 'new_subscriber',
      new_purchase: 'new_purchase',
      new_sale: 'new_purchase',
      new_tip: 'new_tip',
      new_comment: 'new_comment',
      new_follower: 'new_follower',
      payment_success: 'new_purchase',
      content_unlocked: 'new_purchase',
    };

    const prefField = typeMap[type];
    if (prefs && prefField && !prefs[prefField]) {
      console.log(`User disabled emails for ${type}`);
      return new Response(JSON.stringify({ success: false, reason: "Disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://yourdomain.com";
    const actionButton = link ? `
      <p style="margin: 30px 0;">
        <a href="${appUrl}${link}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
          View Details
        </a>
      </p>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background-color: white; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${title}</h1>
            </div>
            <div class="content">
              <p>${message}</p>
              ${actionButton}
            </div>
            <div class="footer">
              <p>You're receiving this email because you have notifications enabled.</p>
              <p><a href="${appUrl}/email-preferences">Manage your email preferences</a></p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await supabaseClient.functions.invoke("send-email", {
      body: {
        to: userData.user.email,
        subject: title,
        html: html,
        type: 'notification',
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
