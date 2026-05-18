import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role so we can read+write profiles.stripe_customer_id
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { tierId, creatorId } = await req.json();
    if (!tierId || !creatorId) {
      throw new Error("Missing tierId or creatorId");
    }
    logStep("Request data", { tierId, creatorId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Fetch tier details
    const { data: tier, error: tierError } = await supabaseClient
      .from('subscription_tiers')
      .select('*')
      .eq('id', tierId)
      .single();
    
    if (tierError || !tier) throw new Error("Subscription tier not found");
    logStep("Tier found", { tierName: tier.name, price: tier.price });

    // Fetch creator profile
    const { data: creator, error: creatorError } = await supabaseClient
      .from('profiles')
      .select('display_name, username')
      .eq('id', creatorId)
      .single();
    
    if (creatorError || !creator) throw new Error("Creator not found");
    logStep("Creator found", { creatorName: creator.display_name });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Resolve Stripe customer — must have supabase_user_id in metadata so
    // the customer.subscription.created webhook can record the subscription.
    let customerId: string | undefined;

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
      // Ensure metadata is present (may have been created without it)
      const existing = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (!existing.metadata?.supabase_user_id) {
        await stripe.customers.update(customerId, { metadata: { supabase_user_id: user.id } });
        logStep("Updated existing Stripe customer metadata", { customerId });
      } else {
        logStep("Existing Stripe customer found", { customerId });
      }
    } else {
      // Create a new Stripe customer with proper metadata
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
      // Persist so future flows reuse the same customer
      await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
      logStep("Created new Stripe customer", { customerId });
    }

    // Determine price interval
    const interval = tier.billing_interval === 'yearly' ? 'year' : 'month';

    // Create checkout session with subscription mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creator.display_name} - ${tier.name} Subscription`,
              description: tier.description || `Subscribe to ${creator.display_name}`,
              metadata: {
                tier_id: tierId,
                creator_id: creatorId,
                tier_name: tier.name,
              },
            },
            unit_amount: Math.round(tier.price * 100), // Convert to cents
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      statement_descriptor: "DM.me",
      success_url: `${req.headers.get("origin")}/creator/${creator.username}?subscription=success&tier=${tierId}`,
      cancel_url: `${req.headers.get("origin")}/creator/${creator.username}?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        creator_id: creatorId,
        tier_id: tierId,
        type: 'creator_subscription',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          creator_id: creatorId,
          tier_id: tierId,
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
