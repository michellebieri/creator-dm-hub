import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple sanitizer for notification content
function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .trim()
    .slice(0, 1000); // Limit length
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Security: Only allow service role to call this function
    // This function should only be invoked by other edge functions, not directly by clients
    const apiKey = req.headers.get('apikey');
    const authHeader = req.headers.get('Authorization');
    
    const isServiceRole = apiKey === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!isServiceRole) {
      // If not service role, verify the user is authenticated
      if (!authHeader) {
        console.error("Unauthorized access attempt - no auth header");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (authError || !user) {
        console.error("Unauthorized access attempt - invalid token");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      
      // Users can only create notifications for themselves (limited use case)
      // Most notifications should be created by service role from other edge functions
      const { userId } = await req.json();
      if (userId !== user.id) {
        console.error("User attempted to create notification for another user");
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    const { userId, type, title, message, link } = await req.json();

    if (!userId || !type || !title || !message) {
      throw new Error("Missing required fields: userId, type, title, message");
    }

    // Validate UUID format for userId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new Error("Invalid userId format");
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeText(title);
    const sanitizedMessage = sanitizeText(message);
    const sanitizedType = type.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
    
    // Validate link if provided (must be relative or https)
    let sanitizedLink = null;
    if (link) {
      if (link.startsWith('/') || link.startsWith('https://')) {
        sanitizedLink = link.slice(0, 500);
      }
    }

    // Create notification
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: sanitizedType,
        title: sanitizedTitle,
        message: sanitizedMessage,
        link: sanitizedLink,
      })
      .select()
      .single();

    if (error) throw error;

    console.log("Notification created:", data.id);

    // Send email notification in background
    supabaseClient.functions.invoke('send-notification-email', {
      body: { userId, type: sanitizedType, title: sanitizedTitle, message: sanitizedMessage, link: sanitizedLink }
    }).catch(err => console.log('Email notification error:', err));

    return new Response(JSON.stringify({ success: true, notification: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
