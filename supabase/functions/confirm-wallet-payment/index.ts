import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user identity
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { paymentIntentId } = await req.json()
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'Missing paymentIntentId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify payment with Stripe using raw fetch (no SDK)
    const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      headers: { 'Authorization': `Bearer ${stripeKey}` },
    })
    const paymentIntent = await stripeRes.json()

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: paymentIntent.error?.message || 'Stripe error' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (paymentIntent.status !== 'succeeded') {
      return new Response(JSON.stringify({ error: 'Payment not successful' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Security: ensure this payment belongs to the authenticated user
    if (paymentIntent.metadata?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const amountDollars = paymentIntent.amount / 100

    // Get current wallet balance (profile may not exist yet for new users)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single()

    const currentBalance = profile?.wallet_balance ?? 0
    const newBalance = currentBalance + amountDollars

    // Upsert wallet balance — creates profile row if it doesn't exist
    const { error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: user.id, wallet_balance: newBalance }, { onConflict: 'id' })

    if (upsertError) throw new Error('Failed to update balance: ' + upsertError.message)

    // Record the transaction
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: amountDollars,
        transaction_type: 'deposit',
        description: 'Wallet top-up via Stripe',
        balance_after: newBalance,
        payment_method: 'stripe',
      })

    return new Response(
      JSON.stringify({ success: true, balance: newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('confirm-wallet-payment error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
