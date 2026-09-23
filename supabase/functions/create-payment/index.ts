// ============================================================
// petVetta — Edge Function: create-payment
// POST /functions/v1/create-payment
// Razorpay (India) + Stripe (Global) order creation
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLAN_PRICES: Record<string, { INR: number; USD: number }> = {
  basic:   { INR: 199,  USD: 999  },  // USD in cents
  premium: { INR: 499,  USD: 1999 },
  family:  { INR: 799,  USD: 2999 },
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const { plan, currency = 'INR', provider = 'razorpay' } = await req.json()

    if (!plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    const prices = PLAN_PRICES[plan]
    const amount = currency === 'INR' ? prices.INR * 100 : prices.USD // Razorpay uses paise, Stripe uses cents

    if (provider === 'razorpay') {
      // Razorpay order creation
      const razorpayKeyId     = Deno.env.get('RAZORPAY_KEY_ID')!
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
      const credentials       = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

      const razorRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          receipt: `pv_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: { userId: user.id, plan },
        }),
      })

      if (!razorRes.ok) {
        const err = await razorRes.text()
        console.error('Razorpay error:', err)
        return new Response(JSON.stringify({ error: 'Payment gateway error' }), {
          status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })
      }

      const order = await razorRes.json()

      // Create pending payment record
      await supabaseAdmin.from('payment_transactions').insert({
        user_id: user.id,
        payment_provider: 'razorpay',
        provider_order_id: order.id,
        amount: prices.INR,
        currency: 'INR',
        status: 'created',
      })

      return new Response(JSON.stringify({
        provider: 'razorpay',
        orderId: order.id,
        amount,
        currency: 'INR',
        keyId: razorpayKeyId,
      }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    if (provider === 'stripe') {
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!

      const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(amount),
          currency: 'usd',
          'metadata[userId]': user.id,
          'metadata[plan]': plan,
        }),
      })

      const intent = await stripeRes.json()

      await supabaseAdmin.from('payment_transactions').insert({
        user_id: user.id,
        payment_provider: 'stripe',
        provider_order_id: intent.id,
        amount: prices.USD / 100,
        currency: 'USD',
        status: 'created',
      })

      return new Response(JSON.stringify({
        provider: 'stripe',
        clientSecret: intent.client_secret,
        amount,
        currency: 'usd',
      }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid payment provider' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('create-payment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
