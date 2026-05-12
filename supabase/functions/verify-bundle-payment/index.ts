import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-BUNDLE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    logStep("User authenticated", { userId: user.id });

    const { sessionId, bundleId } = await req.json();

    if (!sessionId || !bundleId) {
      throw new Error('Session ID and Bundle ID are required');
    }
    logStep("Request params", { sessionId, bundleId });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Verify the payment session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { paymentStatus: session.payment_status });

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    if (session.metadata?.bundle_id !== bundleId || session.metadata?.customer_id !== user.id) {
      throw new Error('Invalid session data');
    }

    // Check if already processed
    const { data: existingTransaction } = await supabaseClient
      .from('transactions')
      .select('id')
      .eq('stripe_payment_id', session.payment_intent as string)
      .maybeSingle();

    if (existingTransaction) {
      logStep("Transaction already processed", { transactionId: existingTransaction.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Bundle already unlocked',
          alreadyProcessed: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabaseClient
      .from('content_bundles')
      .select('id, title, price, creator_id')
      .eq('id', bundleId)
      .single();

    if (bundleError || !bundle) {
      throw new Error('Bundle not found');
    }
    logStep("Bundle found", { bundleId: bundle.id, title: bundle.title });

    // Get bundle contents
    const { data: bundleContents, error: contentsError } = await supabaseClient
      .from('bundle_contents')
      .select('unlockable_id')
      .eq('bundle_id', bundleId);

    if (contentsError) throw contentsError;

    if (!bundleContents || bundleContents.length === 0) {
      throw new Error('No content found in bundle');
    }
    logStep("Bundle contents found", { count: bundleContents.length });

    // Unlock all content in the bundle
    let unlockedCount = 0;
    for (const content of bundleContents) {
      const { data: unlockable } = await supabaseClient
        .from('unlockables')
        .select('unlocked_by')
        .eq('id', content.unlockable_id)
        .single();

      const currentUnlockedBy = unlockable?.unlocked_by || [];
      
      if (!currentUnlockedBy.includes(user.id)) {
        const { error: updateError } = await supabaseClient
          .from('unlockables')
          .update({
            unlocked_by: [...currentUnlockedBy, user.id],
          })
          .eq('id', content.unlockable_id);

        if (!updateError) {
          unlockedCount++;
        } else {
          logStep("Error unlocking content", { unlockableId: content.unlockable_id, error: updateError });
        }
      } else {
        unlockedCount++; // Already unlocked
      }
    }
    logStep("Content unlocked", { unlockedCount });

    // Create transaction record with bundle_id pointing to bundle
    const platformFee = bundle.price * 0.15;
    const netAmount = bundle.price * 0.85;

    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        customer_id: user.id,
        creator_id: bundle.creator_id,
        amount: bundle.price,
        net_amount: netAmount,
        platform_fee: platformFee,
        processor_fee: 0,
        transaction_type: 'unlockable',
        bundle_id: bundleId,
        status: 'completed',
        stripe_payment_id: session.payment_intent as string,
      });

    if (transactionError) {
      logStep("Transaction insert error", { error: transactionError });
    } else {
      logStep("Transaction recorded");
    }

    // Get customer display name for notification
    const { data: customerProfile } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const customerName = customerProfile?.display_name || 'A customer';

    // Send notification to creator
    const notificationPayload = {
      userId: bundle.creator_id,
      type: 'bundle_purchase',
      title: 'Bundle Purchased! 🎉',
      message: `${customerName} purchased your bundle "${bundle.title}" for $${bundle.price.toFixed(2)}`,
      link: '/earnings',
    };
    
    logStep("Sending notification to creator", notificationPayload);

    const { error: notifError } = await supabaseClient.functions.invoke('create-notification', {
      body: notificationPayload,
    });

    if (notifError) {
      logStep("Notification error (non-fatal)", { error: notifError });
    } else {
      logStep("Creator notification sent");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bundle unlocked successfully',
        unlockedCount: bundleContents.length,
        bundleTitle: bundle.title
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : 'Unknown error' });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
