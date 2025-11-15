import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      throw new Error("Payment Intent ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ success: false, message: "Payment not completed" }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { user_id, amount } = paymentIntent.metadata || {};

    if (!user_id || !amount) {
      throw new Error("Invalid payment intent metadata");
    }

    // Check if already processed
    const { data: existingTransaction } = await supabaseClient
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('description', `Payment ${paymentIntentId}`)
      .single();

    if (existingTransaction) {
      // Already processed, get current balance
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user_id)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          balance: parseFloat(String(profile?.wallet_balance || 0)),
          message: "Already processed" 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const depositAmount = parseFloat(amount);

    // Get current balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user_id)
      .single();

    const currentBalance = parseFloat(String(profile?.wallet_balance || 0));
    const newBalance = currentBalance + depositAmount;

    // Update wallet balance
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      throw new Error("Failed to update wallet balance");
    }

    // Record transaction
    const { error: transactionError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id,
        amount: depositAmount,
        transaction_type: 'deposit',
        description: `Payment ${paymentIntentId}`,
        balance_after: newBalance,
      });

    if (transactionError) {
      console.error("Error recording transaction:", transactionError);
    }

    // Create notification
    await supabaseClient.functions.invoke('create-notification', {
      body: {
        userId: user_id,
        type: 'payment_success',
        title: 'Funds Added',
        message: `$${depositAmount.toFixed(2)} has been added to your wallet!`,
        link: '/wallet',
      },
    });

    console.log("Wallet payment confirmed and balance updated");

    return new Response(
      JSON.stringify({ success: true, balance: newBalance }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error confirming payment:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
