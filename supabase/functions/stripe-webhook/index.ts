import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log("Webhook event type:", event.type, "ID:", event.id);

    // Check if event already processed (idempotency)
    const { data: processedEvent } = await supabaseClient
      .from('processed_webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (processedEvent) {
      console.log("Event already processed:", event.id);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Mark event as being processed
    await supabaseClient
      .from('processed_webhook_events')
      .insert({ event_id: event.id, event_type: event.type });

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

              // Record transaction — use valid enum value 'pack' (not 'pack_purchase')
              await supabaseClient.from("transactions").insert({
                customer_id: metadata.customer_id,
                creator_id: metadata.creator_id,
                pack_id: metadata.pack_id,
                amount: session.amount_total! / 100,
                net_amount: (session.amount_total! / 100) * 0.85,
                platform_fee: (session.amount_total! / 100) * 0.15,
                processor_fee: 0,
                transaction_type: "pack",
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

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        // Retrieve customer and get user ID from metadata (avoids listing all users)
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;

        if (!userId || !priceId) {
          console.error("Missing supabase_user_id in Stripe customer metadata or missing price ID", { customerId, priceId });
          break;
        }

        // Find subscription tier by stripe price id
        const { data: tier } = await supabaseClient
          .from("subscription_tiers")
          .select("id, creator_id, price")
          .eq("stripe_price_id", priceId)
          .single();

        if (!tier) {
          console.error("Subscription tier not found for price:", priceId);
          break;
        }

        // Create subscription record (include creator_id — added via migration)
        await supabaseClient.from("creator_subscriptions").insert({
          customer_id: userId,
          creator_id: tier.creator_id,
          tier_id: tier.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        // Record transaction
        await supabaseClient.from("transactions").insert({
          customer_id: userId,
          creator_id: tier.creator_id,
          amount: tier.price,
          net_amount: tier.price * 0.85,
          platform_fee: tier.price * 0.15,
          processor_fee: 0,
          transaction_type: "subscription",
          status: "completed",
          stripe_payment_id: subscription.latest_invoice as string,
        });

        // Send notifications
        await supabaseClient.functions.invoke("create-notification", {
          body: {
            userId: userId,
            type: "subscription_active",
            title: "Subscription Active",
            message: "Your subscription is now active!",
            link: "/subscriptions",
          },
        });

        await supabaseClient.functions.invoke("create-notification", {
          body: {
            userId: tier.creator_id,
            type: "new_subscriber",
            title: "New Subscriber",
            message: `You have a new subscriber! You earned $${(tier.price * 0.85).toFixed(2)}`,
            link: "/earnings",
          },
        });

        console.log("Subscription created:", subscription.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Update subscription status
        await supabaseClient
          .from("creator_subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log("Subscription updated:", subscription.id, "Status:", subscription.status);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // Update subscription to canceled
        const { data: subData } = await supabaseClient
          .from("creator_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id)
          .select("customer_id")
          .single();

        if (subData) {
          // Send notification
          await supabaseClient.functions.invoke("create-notification", {
            body: {
              userId: subData.customer_id,
              type: "subscription_canceled",
              title: "Subscription Canceled",
              message: "Your subscription has been canceled. You'll still have access until the end of your billing period.",
              link: "/subscriptions",
            },
          });
        }

        console.log("Subscription deleted:", subscription.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find subscription and record transaction
          const { data: subscription } = await supabaseClient
            .from("creator_subscriptions")
            .select("customer_id, tier_id, subscription_tiers(creator_id, price)")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (subscription && subscription.subscription_tiers) {
            const tier = subscription.subscription_tiers as any;
            
            await supabaseClient.from("transactions").insert({
              customer_id: subscription.customer_id,
              creator_id: tier.creator_id,
              amount: tier.price,
              net_amount: tier.price * 0.85,
              platform_fee: tier.price * 0.15,
              processor_fee: 0,
              transaction_type: "subscription",
              status: "completed",
              stripe_payment_id: invoice.payment_intent as string,
            });

            // Send notification to creator
            await supabaseClient.functions.invoke("create-notification", {
              body: {
                userId: tier.creator_id,
                type: "subscription_payment",
                title: "Subscription Payment Received",
                message: `You earned $${(tier.price * 0.85).toFixed(2)} from a subscription renewal!`,
                link: "/earnings",
              },
            });
          }
        }

        console.log("Invoice payment succeeded:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Find subscription and notify customer
          const { data: subscription } = await supabaseClient
            .from("creator_subscriptions")
            .select("customer_id")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          if (subscription) {
            await supabaseClient.functions.invoke("create-notification", {
              body: {
                userId: subscription.customer_id,
                type: "payment_failed",
                title: "Payment Failed",
                message: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
                link: "/subscriptions",
              },
            });
          }
        }

        console.log("Invoice payment failed:", invoice.id);
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
