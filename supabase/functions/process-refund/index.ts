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

    // Verify admin role
    const { data: hasAdminRole, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !hasAdminRole) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { refundId, action } = await req.json();

    if (!refundId || !action) {
      throw new Error("refundId and action are required");
    }

    // Get refund details
    const { data: refund, error: refundError } = await supabaseClient
      .from('refunds')
      .select(`
        *,
        transaction:transactions(
          stripe_payment_id,
          customer_id,
          creator_id,
          amount
        )
      `)
      .eq('id', refundId)
      .single();

    if (refundError || !refund) {
      throw new Error("Refund not found");
    }

    if (refund.status !== 'pending') {
      throw new Error(`Refund already ${refund.status}`);
    }

    if (action === 'approve') {
      // Process refund through Stripe
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const stripeRefund = await stripe.refunds.create({
        payment_intent: refund.transaction.stripe_payment_id,
        amount: Math.round(refund.amount * 100), // Convert to cents
        reason: 'requested_by_customer',
      });

      console.log("Stripe refund created:", stripeRefund.id);

      // Update refund record
      const { error: updateError } = await supabaseClient
        .from('refunds')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          stripe_refund_id: stripeRefund.id,
        })
        .eq('id', refundId);

      if (updateError) throw updateError;

      // Update transaction status
      await supabaseClient
        .from('transactions')
        .update({ status: 'refunded' })
        .eq('id', refund.transaction_id);

      // Notify customer
      await supabaseClient.functions.invoke('create-notification', {
        body: {
          userId: refund.transaction.customer_id,
          type: 'refund_approved',
          title: 'Refund Processed',
          message: `Your refund of $${refund.amount.toFixed(2)} has been approved and processed.`,
          link: '/purchase-history',
        },
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Refund approved and processed',
        stripeRefundId: stripeRefund.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === 'reject') {
      // Reject refund
      const { error: updateError } = await supabaseClient
        .from('refunds')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
        })
        .eq('id', refundId);

      if (updateError) throw updateError;

      // Notify customer
      await supabaseClient.functions.invoke('create-notification', {
        body: {
          userId: refund.transaction.customer_id,
          type: 'refund_rejected',
          title: 'Refund Request Rejected',
          message: `Your refund request for $${refund.amount.toFixed(2)} has been reviewed and rejected.`,
          link: '/purchase-history',
        },
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Refund rejected' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error("Invalid action. Must be 'approve' or 'reject'");
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
