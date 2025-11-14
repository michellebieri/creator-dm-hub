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

    const { amount } = await req.json();

    if (!amount || amount < 10) {
      throw new Error("Minimum payout amount is $10");
    }

    // Check creator settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('creator_settings')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings?.stripe_account_id) {
      throw new Error("Stripe account not connected");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: settings.stripe_account_id,
      description: `Payout for creator ${user.id}`,
    });

    console.log("Stripe transfer created:", transfer.id);

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payouts')
      .insert({
        creator_id: user.id,
        amount,
        scheduled_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: 'completed',
        stripe_transfer_id: transfer.id,
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Create notification for creator
    await supabaseClient.functions.invoke('create-notification', {
      body: {
        userId: user.id,
        type: 'payout_completed',
        title: 'Payout Completed',
        message: `Your payout of $${amount.toFixed(2)} has been transferred to your account!`,
        link: '/payout-settings',
      },
    });

    return new Response(JSON.stringify({ success: true, payout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error requesting payout:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
