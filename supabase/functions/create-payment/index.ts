import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    // Check rate limit
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const rateLimit = await checkRateLimit(supabaseClient, 'create-payment', user.id, clientIp || undefined);
    
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

    const body = await req.json();
    const packId = body?.packId;
    const creatorId = body?.creatorId;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!packId || typeof packId !== 'string' || !uuidRegex.test(packId)) {
      return new Response(
        JSON.stringify({ error: "Valid Pack ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!creatorId || typeof creatorId !== 'string' || !uuidRegex.test(creatorId)) {
      return new Response(
        JSON.stringify({ error: "Valid Creator ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get pack details
    const { data: pack, error: packError } = await supabaseClient
      .from('message_packs')
      .select('*')
      .eq('id', packId)
      .eq('creator_id', creatorId)
      .single();

    if (packError || !pack) {
      throw new Error("Message pack not found");
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pack.quantity} Message Credits`,
              description: `Purchase ${pack.quantity} message credits`,
            },
            unit_amount: Math.round(pack.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/messages`,
      metadata: {
        pack_id: packId,
        creator_id: creatorId,
        customer_id: user.id,
        quantity: pack.quantity.toString(),
      },
    });

    console.log("Payment session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
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
