import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limit.ts";

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
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    }
  );

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Check rate limit
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const rateLimit = await checkRateLimit(supabaseClient, 'add-funds', user.id, clientIp || undefined);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
            "Content-Type": "application/json",
          },
          status: 429,
        }
      );
    }

    const { amount } = await req.json();
    
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create PaymentIntent for embedded payment form
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        transaction_type: 'wallet_deposit',
        user_id: user.id,
        amount: amount.toString(),
      },
    });

    console.log("Wallet deposit PaymentIntent created:", paymentIntent.id);

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      headers: { 
        ...corsHeaders, 
        ...getRateLimitHeaders(rateLimit.remaining, rateLimit.resetAt),
        "Content-Type": "application/json" 
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
