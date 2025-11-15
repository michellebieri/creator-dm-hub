import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response(JSON.stringify({ error: "Webhook configuration error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("Webhook event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status === "paid") {
          const metadata = session.metadata || {};
          
          // Handle message pack purchase
          if (metadata.pack_id && metadata.creator_id && metadata.customer_id) {
            const quantity = parseInt(metadata.quantity || "0");
            
            // Check if credits already exist
            const { data: existingCredits } = await supabaseClient
              .from("customer_credits")
              .select("*")
              .eq("customer_id", metadata.customer_id)
              .eq("creator_id", metadata.creator_id)
              .eq("pack_id", metadata.pack_id)
              .single();

            if (!existingCredits) {
              // Add credits
              await supabaseClient.from("customer_credits").insert({
                customer_id: metadata.customer_id,
                creator_id: metadata.creator_id,
                pack_id: metadata.pack_id,
                credits_remaining: quantity,
              });

              // Record transaction
              await supabaseClient.from("transactions").insert({
                customer_id: metadata.customer_id,
                creator_id: metadata.creator_id,
                pack_id: metadata.pack_id,
                amount: session.amount_total! / 100,
                net_amount: (session.amount_total! / 100) * 0.85,
                platform_fee: (session.amount_total! / 100) * 0.15,
                processor_fee: 0,
                transaction_type: "pack_purchase",
                status: "completed",
                stripe_payment_id: session.payment_intent as string,
              });

              // Send notifications
              await supabaseClient.functions.invoke("create-notification", {
                body: {
                  userId: metadata.customer_id,
                  type: "payment_success",
                  title: "Credits Purchased",
                  message: `You successfully purchased ${quantity} message credits!`,
                  link: "/messages",
                },
              });

              await supabaseClient.functions.invoke("create-notification", {
                body: {
                  userId: metadata.creator_id,
                  type: "new_sale",
                  title: "New Sale",
                  message: `You earned $${((session.amount_total! / 100) * 0.85).toFixed(2)} from a message pack purchase!`,
                  link: "/earnings",
                },
              });
            }
          }
          
          // Handle bundle purchase
          if (metadata.bundle_id && metadata.customer_id) {
            const { data: bundleContents } = await supabaseClient
              .from("bundle_contents")
              .select("unlockable_id")
              .eq("bundle_id", metadata.bundle_id);

            if (bundleContents) {
              // Unlock all content
              for (const content of bundleContents) {
                const { data: unlockable } = await supabaseClient
                  .from("unlockables")
                  .select("unlocked_by, creator_id")
                  .eq("id", content.unlockable_id)
                  .single();

                if (unlockable) {
                  const unlockedBy = unlockable.unlocked_by || [];
                  if (!unlockedBy.includes(metadata.customer_id)) {
                    await supabaseClient
                      .from("unlockables")
                      .update({ unlocked_by: [...unlockedBy, metadata.customer_id] })
                      .eq("id", content.unlockable_id);
                  }
                }
              }

              // Record transaction
              const { data: bundle } = await supabaseClient
                .from("content_bundles")
                .select("price, creator_id")
                .eq("id", metadata.bundle_id)
                .single();

              if (bundle) {
                await supabaseClient.from("transactions").insert({
                  customer_id: metadata.customer_id,
                  creator_id: bundle.creator_id,
                  amount: bundle.price,
                  net_amount: bundle.price * 0.85,
                  platform_fee: bundle.price * 0.15,
                  processor_fee: 0,
                  transaction_type: "unlockable",
                  status: "completed",
                  stripe_payment_id: session.payment_intent as string,
                });

                // Send notification
                await supabaseClient.functions.invoke("create-notification", {
                  body: {
                    userId: bundle.creator_id,
                    type: "new_sale",
                    title: "Bundle Purchased",
                    message: `Someone purchased your bundle for $${bundle.price.toFixed(2)}!`,
                    link: "/earnings",
                  },
                });
              }
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("Payment failed:", paymentIntent.id);
        // Could send notification to customer about failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
