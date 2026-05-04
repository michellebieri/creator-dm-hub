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

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      throw new Error("Payment method ID is required");
    }

    // Get the payment method from database
    const { data: paymentMethod } = await supabaseClient
      .from("payment_methods")
      .select("stripe_payment_method_id")
      .eq("id", paymentMethodId)
      .eq("user_id", user.id)
      .single();

    if (!paymentMethod) {
      throw new Error("Payment method not found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Detach payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);

    // Delete from database
    const { error } = await supabaseClient
      .from("payment_methods")
      .delete()
      .eq("id", paymentMethodId)
      .eq("user_id", user.id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});