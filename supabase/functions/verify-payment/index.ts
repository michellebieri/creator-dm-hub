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

    const { pack_id, creator_id, customer_id, quantity } = session.metadata || {};

    if (!pack_id || !creator_id || !customer_id) {
      throw new Error("Missing metadata in session");
    }

    // Idempotency: check if this payment intent was already recorded
    const paymentIntentId = session.payment_intent as string;
    const { data: existingTx } = await supabaseClient
      .from('transactions')
      .select('id')
      .eq('stripe_payment_id', paymentIntentId)
      .maybeSingle();

    if (existingTx) {
      console.log("Payment already recorded, skipping:", paymentIntentId);
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Add credits atomically — uses RPC to increment on repeat purchases of same pack
    const { error: creditsError } = await supabaseClient.rpc("add_customer_credits", {
      p_customer_id: customer_id,
      p_creator_id:  creator_id,
      p_pack_id:     pack_id,
      p_quantity:    parseInt(quantity),
    });

    if (creditsError) {
      console.error("Error adding credits:", creditsError);
      throw new Error("Failed to add credits");
    }

    // Record transaction — 'pack' is the valid enum value (not 'pack_purchase')
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        customer_id,
        creator_id,
        pack_id,
        amount: session.amount_total! / 100,
        net_amount: (session.amount_total! / 100) * 0.75,
        platform_fee: (session.amount_total! / 100) * 0.25,
        processor_fee: 0,
        transaction_type: 'pack',
        status: 'completed',
        stripe_payment_id: paymentIntentId,
      });

    if (transactionError) {
      console.error("Error recording transaction:", transactionError);
    }

    // Create notification for customer
    await supabaseClient.functions.invoke('create-notification', {
      body: {
        userId: customer_id,
        type: 'payment_success',
        title: 'Credits Purchased',
        message: `You successfully purchased ${quantity} message credits!`,
        link: '/messages',
      },
    });

    // Create notification for creator
    await supabaseClient.functions.invoke('create-notification', {
      body: {
        userId: creator_id,
        type: 'new_sale',
        title: 'New Sale',
        message: `You earned $${((session.amount_total! / 100) * 0.75).toFixed(2)} from a message pack purchase!`,
        link: '/earnings',
      },
    });

    console.log("Payment verified and credits added");

    return new Response(JSON.stringify({ success: true }), {
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
