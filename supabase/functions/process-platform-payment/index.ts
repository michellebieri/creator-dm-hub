import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PLATFORM-PAYMENT] ${step}${detailsStr}`);
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

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const callerUser = authData.user;
    if (!callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    logStep("Caller authenticated", { userId: callerUser.id });

    const {
      amount,
      creator_id,
      customer_id,
      transaction_type,
      description,
      metadata = {}
    } = await req.json();

    if (!amount || !creator_id || !customer_id || !transaction_type) {
      throw new Error("Missing required fields: amount, creator_id, customer_id, transaction_type");
    }

    // Enforce that the authenticated user is the customer making the payment
    if (callerUser.id !== customer_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: customer_id must match authenticated user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Request params", { amount, creator_id, customer_id, transaction_type });

    // Get platform config
    const { data: platformConfig } = await supabaseClient
      .from('platform_config')
      .select('*')
      .single();

    const platformFeePercentage = platformConfig?.platform_fee_percentage || 20;
    logStep("Platform config", { platformFeePercentage });

    // Get creator's Stripe Connect account
    const { data: creatorSettings } = await supabaseClient
      .from('creator_settings')
      .select('stripe_account_id, stripe_connect_status')
      .eq('user_id', creator_id)
      .single();

    if (!creatorSettings?.stripe_account_id || creatorSettings.stripe_connect_status !== 'active') {
      throw new Error("Creator has not connected their Stripe account");
    }
    logStep("Creator Stripe account", { accountId: creatorSettings.stripe_account_id });

    // Get customer email for Stripe
    const { data: customerProfile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', customer_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Calculate fees
    const amountInCents = Math.round(amount * 100);
    const platformFeeAmount = Math.round(amountInCents * (platformFeePercentage / 100));
    const creatorNetAmount = amountInCents - platformFeeAmount;

    logStep("Fee calculation", { 
      grossAmount: amountInCents, 
      platformFee: platformFeeAmount, 
      creatorNet: creatorNetAmount 
    });

    // Create the transaction record first
    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        customer_id,
        creator_id,
        transaction_type,
        amount,
        platform_fee: platformFeeAmount / 100,
        processor_fee: 0,
        net_amount: creatorNetAmount / 100,
        status: 'pending'
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }
    logStep("Transaction created", { transactionId: transaction.id });

    // Create platform fee record
    const { data: platformFee, error: feeError } = await supabaseClient
      .from('platform_fees')
      .insert({
        transaction_id: transaction.id,
        creator_id,
        gross_amount: amount,
        platform_fee_amount: platformFeeAmount / 100,
        creator_net_amount: creatorNetAmount / 100,
        status: 'pending'
      })
      .select()
      .single();

    if (feeError) {
      throw new Error(`Failed to create platform fee record: ${feeError.message}`);
    }
    logStep("Platform fee record created", { feeId: platformFee.id });

    // Create PaymentIntent with application_fee_amount for platform fee
    const origin = req.headers.get("origin") || "http://localhost:5173";
    
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: 'usd',
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: creatorSettings.stripe_account_id,
      },
      metadata: {
        transaction_id: transaction.id,
        platform_fee_id: platformFee.id,
        customer_id,
        creator_id,
        transaction_type,
        ...metadata
      }
    };

    // Add customer if exists
    if (customerProfile?.stripe_customer_id) {
      paymentIntentParams.customer = customerProfile.stripe_customer_id;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ? 'present' : 'missing'
    });

    // Update transaction with Stripe payment ID
    await supabaseClient
      .from('transactions')
      .update({ stripe_payment_id: paymentIntent.id })
      .eq('id', transaction.id);

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction.id,
      platformFeeId: platformFee.id,
      amount: amountInCents,
      platformFee: platformFeeAmount,
      creatorNet: creatorNetAmount
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
