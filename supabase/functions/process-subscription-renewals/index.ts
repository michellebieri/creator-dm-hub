import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Manual trigger for the renewal cron job — useful for admin / testing.
// The production job runs via pg_cron (migration 20260512000004) which
// calls process_all_subscription_renewals() directly in SQL at 02:00 UTC.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Require admin auth for manual triggers
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData.user) {
        const { data: hasAdmin } = await supabase.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
        if (!hasAdmin) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }
      }
    } else {
      // No auth header — only allow from pg_cron (internal) by checking service key header
      const apiKey = req.headers.get("apikey") || req.headers.get("x-api-key");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey || apiKey !== serviceKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    console.log("[process-subscription-renewals] Manual trigger — calling process_all_subscription_renewals()");

    const { data, error } = await supabase.rpc("process_all_subscription_renewals");

    if (error) throw error;

    console.log("[process-subscription-renewals] Result:", data);

    return new Response(JSON.stringify({ success: true, result: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-subscription-renewals] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
