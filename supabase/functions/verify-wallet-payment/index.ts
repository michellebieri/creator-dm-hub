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
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ success: false, message: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { transaction_type, user_id, amount } = session.metadata || {};

    if (transaction_type !== 'wallet_deposit' || !user_id || !amount) {
      throw new Error("Invalid session metadata");
    }

    const depositAmount = parseFloat(amount);
    const paymentIntentId = session.payment_intent as string;

    // Atomically insert the wallet_transaction first using the unique index on
    // (user_id, stripe_payment_intent_id) to prevent double-crediting.
    // If this insert fails with a unique violation, the deposit was already processed.
    const { error: txInsertError } = await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id,
        amount: depositAmount,
        transaction_type: 'deposit',
        description: `Stripe payment ${paymentIntentId}`,
        stripe_payment_intent_id: paymentIntentId,
      });

    if (txInsertError) {
      if (txInsertError.code === '23505') {
        // Unique violation — already processed, return current balance
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user_id)
          .single();
        return new Response(JSON.stringify({ success: true, balance: profile?.wallet_balance || 0, message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      throw new Error("Failed to record transaction");
    }

    // Transaction recorded — only ONE caller can reach here per payment intent
    // (unique index on wallet_transactions guarantees it), so read-then-write is safe.
    const { data: currentProfile } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user_id)
      .single();

    const newBalance = (currentProfile?.wallet_balance || 0) + depositAmount;

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      throw new Error("Failed to update wallet balance");
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

    console.log("Wallet payment verified and balance updated");

    return new Response(JSON.stringify({ success: true, balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
