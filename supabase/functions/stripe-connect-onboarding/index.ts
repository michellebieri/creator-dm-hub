import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARDING] ${step}${detailsStr}`);
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
    logStep("Function started");

    // Optional body — may be empty (e.g., from Revenue page)
    let returnTo = 'revenue';
    try {
      const body = await req.json();
      if (body?.returnTo) returnTo = body.returnTo;
    } catch (_) { /* no body — use default */ }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

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
    logStep("User is a creator");

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
    logStep("Current settings", { accountId, status: settings?.stripe_connect_status });

    // Create account if it doesn't exist
    if (!accountId) {
      logStep("Creating new Stripe Connect account");
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          user_id: user.id,
          platform: 'dm.me'
        }
      });
      accountId = account.id;
      logStep("Created Stripe Connect account", { accountId });

      // Upsert — creator_settings row may not exist yet (created later in onboarding)
      await supabaseClient
        .from('creator_settings')
        .upsert({
          user_id: user.id,
          stripe_account_id: accountId,
          stripe_connect_status: 'pending',
        }, { onConflict: 'user_id' });
      logStep("Saved account ID to database");
    }

    // Check account status
    const account = await stripe.accounts.retrieve(accountId);
    const isFullyOnboarded = account.charges_enabled && account.payouts_enabled;
    logStep("Account status", { 
      chargesEnabled: account.charges_enabled, 
      payoutsEnabled: account.payouts_enabled,
      isFullyOnboarded 
    });

    if (isFullyOnboarded) {
      // Update status in database
      await supabaseClient
        .from('creator_settings')
        .update({ stripe_connect_status: 'active' })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ 
        status: 'active',
        message: 'Your Stripe account is fully connected'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const returnUrl = returnTo === 'onboarding'
      ? `${origin}/creator-onboarding?stripe_connected=true`
      : `${origin}/revenue?success=true`;
    const refreshUrl = returnTo === 'onboarding'
      ? `${origin}/creator-onboarding?stripe_refresh=true`
      : `${origin}/revenue?refresh=true`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    logStep("Created account link", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      status: 'pending'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
