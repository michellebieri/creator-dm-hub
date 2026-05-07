import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// v3 - force redeploy after fixing GitHub Actions auth token
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

    // Use Supabase JS client for auth only (no Stripe SDK - use raw fetch instead)
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

    const { amount } = await req.json()
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
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

    // Debug: return key mode so we can verify which key is active
    const keyMode = stripeKey.startsWith('sk_test_') ? 'test' : 'live'
    console.log('STRIPE key mode:', keyMode, '| first 12 chars:', stripeKey.substring(0, 12))

    const amountInCents = Math.round(amount * 100)

    // Call Stripe API directly — no SDK, no Deno compatibility issues
    const params = new URLSearchParams()
    params.append('amount', String(amountInCents))
    params.append('currency', 'usd')
    params.append('automatic_payment_methods[enabled]', 'true')
    params.append('metadata[user_id]', user.id)
    params.append('metadata[type]', 'wallet_deposit')

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const stripeData = await stripeRes.json()

    if (!stripeRes.ok) {
      console.error('Stripe error:', stripeData)
      return new Response(
        JSON.stringify({ error: stripeData.error?.message || 'Stripe error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ clientSecret: stripeData.client_secret, keyMode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('add-funds error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
