import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-PLATFORM-PAYMENT] ${step}${detailsStr}`);
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
    
    const { payment_intent_id } = await req.json();

    if (!payment_intent_id) {
      throw new Error("Missing payment_intent_id");
    }

    logStep("Confirming payment", { paymentIntentId: payment_intent_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    logStep("PaymentIntent retrieved", { 
      status: paymentIntent.status,
      metadata: paymentIntent.metadata 
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not successful. Status: ${paymentIntent.status}`);
    }

    const transactionId = paymentIntent.metadata.transaction_id;
    const platformFeeId = paymentIntent.metadata.platform_fee_id;

    // Update transaction status
    await supabaseClient
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId);
    logStep("Transaction updated to completed");

    // Get the application fee ID from the payment intent
    let applicationFeeId = null;
    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
      applicationFeeId = charge.application_fee;
    }

    // Update platform fee record
    await supabaseClient
      .from('platform_fees')
      .update({ 
        status: 'completed',
        stripe_application_fee_id: applicationFeeId,
        processed_at: new Date().toISOString()
      })
      .eq('id', platformFeeId);
    logStep("Platform fee updated to completed");

    return new Response(JSON.stringify({ 
      success: true,
      transactionId,
      platformFeeId
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
