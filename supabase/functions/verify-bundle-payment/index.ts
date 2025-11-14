import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { sessionId, bundleId } = await req.json();

    if (!sessionId || !bundleId) {
      throw new Error('Session ID and Bundle ID are required');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Verify the payment session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    if (session.metadata?.bundle_id !== bundleId || session.metadata?.customer_id !== user.id) {
      throw new Error('Invalid session data');
    }

    // Get bundle contents
    const { data: bundleContents, error: contentsError } = await supabaseClient
      .from('bundle_contents')
      .select('unlockable_id')
      .eq('bundle_id', bundleId);

    if (contentsError) throw contentsError;

    if (!bundleContents || bundleContents.length === 0) {
      throw new Error('No content found in bundle');
    }

    // Unlock all content in the bundle
    const unlockPromises = bundleContents.map(async (content) => {
      const { data: unlockable } = await supabaseClient
        .from('unlockables')
        .select('unlocked_by')
        .eq('id', content.unlockable_id)
        .single();

      const currentUnlockedBy = unlockable?.unlocked_by || [];
      
      if (!currentUnlockedBy.includes(user.id)) {
        return supabaseClient
          .from('unlockables')
          .update({
            unlocked_by: [...currentUnlockedBy, user.id],
          })
          .eq('id', content.unlockable_id);
      }
    });

    await Promise.all(unlockPromises);

    // Create transaction record
    const { data: bundle } = await supabaseClient
      .from('content_bundles')
      .select('price, creator_id')
      .eq('id', bundleId)
      .single();

    if (bundle) {
      const platformFee = bundle.price * 0.15;
      const netAmount = bundle.price * 0.85;

      await supabaseClient
        .from('transactions')
        .insert({
          customer_id: user.id,
          creator_id: bundle.creator_id,
          amount: bundle.price,
          net_amount: netAmount,
          platform_fee: platformFee,
          processor_fee: 0,
          transaction_type: 'unlockable',
          status: 'completed',
          stripe_payment_id: session.payment_intent as string,
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bundle unlocked successfully',
        unlockedCount: bundleContents.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error verifying bundle payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
