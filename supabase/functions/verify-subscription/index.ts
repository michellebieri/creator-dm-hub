import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { tierId, creatorId } = await req.json();
    logStep("Request data", { tierId, creatorId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Find active subscription for this creator
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,
    });

    let matchingSubscription = null;
    for (const sub of subscriptions.data) {
      if (sub.metadata.creator_id === creatorId) {
        matchingSubscription = sub;
        break;
      }
    }

    if (!matchingSubscription) {
      logStep("No matching subscription found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Active subscription found", { subscriptionId: matchingSubscription.id });

    // Get tier details
    const { data: tier } = await supabaseClient
      .from('subscription_tiers')
      .select('*')
      .eq('id', matchingSubscription.metadata.tier_id)
      .single();

    // Check if subscription record exists in database, create if not
    const { data: existingSub } = await supabaseClient
      .from('creator_subscriptions')
      .select('id')
      .eq('customer_id', user.id)
      .eq('tier_id', matchingSubscription.metadata.tier_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!existingSub) {
      // Create subscription record
      const periodEnd = new Date(matchingSubscription.current_period_end * 1000);
      const periodStart = new Date(matchingSubscription.current_period_start * 1000);

      const { error: insertError } = await supabaseClient
        .from('creator_subscriptions')
        .insert({
          customer_id: user.id,
          tier_id: matchingSubscription.metadata.tier_id,
          status: 'active',
          stripe_subscription_id: matchingSubscription.id,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });

      if (insertError) {
        logStep("Error creating subscription record", { error: insertError });
      } else {
        logStep("Subscription record created");
      }

      // Initialize message usage tracking
      if (tier && (tier.free_messages_per_month || tier.unlimited_messages)) {
        const { error: usageError } = await supabaseClient
          .from('subscription_message_usage')
          .insert({
            customer_id: user.id,
            creator_id: creatorId,
            subscription_id: matchingSubscription.metadata.tier_id,
            messages_used: 0,
            messages_allowed: tier.unlimited_messages ? 999999 : (tier.free_messages_per_month || 0),
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
          });
        
        if (usageError) {
          logStep("Error creating usage record", { error: usageError });
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: true,
      subscription: {
        id: matchingSubscription.id,
        tier_id: matchingSubscription.metadata.tier_id,
        tier_name: tier?.name,
        current_period_end: new Date(matchingSubscription.current_period_end * 1000).toISOString(),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
