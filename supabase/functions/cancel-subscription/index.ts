import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { subscriptionId } = await req.json();
    if (!subscriptionId) throw new Error("Missing subscriptionId");
    logStep("Request data", { subscriptionId });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Verify the subscription belongs to this user
    const { data: subRecord, error: subError } = await supabaseClient
      .from('creator_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .eq('customer_id', user.id)
      .single();
    
    if (subError || !subRecord) {
      throw new Error("Subscription not found or does not belong to this user");
    }
    logStep("Subscription record found", { recordId: subRecord.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Cancel at period end (user keeps access until end of billing period)
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    logStep("Stripe subscription set to cancel at period end", { 
      subscriptionId: canceledSubscription.id,
      cancelAt: canceledSubscription.cancel_at,
    });

    // Update database record
    const { error: updateError } = await supabaseClient
      .from('creator_subscriptions')
      .update({ 
        status: 'canceling',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subRecord.id);
    
    if (updateError) {
      logStep("Error updating subscription record", { error: updateError });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      cancel_at: canceledSubscription.cancel_at ? new Date(canceledSubscription.cancel_at * 1000).toISOString() : null,
      current_period_end: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
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
