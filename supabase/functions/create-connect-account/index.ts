import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Check if user is a creator — authoritative source is user_roles table
    const { data: roleRow } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'creator')
      .maybeSingle();

    if (!roleRow) {
      throw new Error("Only creators can connect Stripe accounts");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if account already exists
    const { data: settings } = await supabaseClient
      .from('creator_settings')
      .select('stripe_account_id, stripe_connect_status')
      .eq('user_id', user.id)
      .maybeSingle();

    let accountId = settings?.stripe_account_id;

    // Create account if it doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: user.id, platform: 'dm.me' },
      });
      accountId = account.id;

      // Upsert — creator_settings row may not exist yet
      await supabaseClient
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          stripe_connect_status: 'pending',
        }, { onConflict: 'user_id' });
    }

    // Check if already fully onboarded
    const account = await stripe.accounts.retrieve(accountId);
    if (account.charges_enabled && account.payouts_enabled) {
      await supabaseClient
        .from('creator_settings')
        .update({ stripe_connect_status: 'active' })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ status: 'active', message: 'Stripe account already connected' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${req.headers.get("origin")}/payout-settings`,
      return_url: `${req.headers.get("origin")}/payout-settings?stripe_connected=true`,
      type: 'account_onboarding',
    });

    console.log("Connect account link created for user:", user.id);

    return new Response(JSON.stringify({ url: accountLink.url, status: 'pending' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating connect account:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
