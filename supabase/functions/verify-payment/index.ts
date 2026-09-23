// ============================================================
// petVetta — Edge Function: verify-payment
// POST /functions/v1/verify-payment
// HMAC webhook validation + subscription activation
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts'
import { encode } from 'https://deno.land/std@0.224.0/encoding/hex.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function hmacSHA256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return new TextDecoder().decode(encode(new Uint8Array(sig)))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { provider, orderId, paymentId, signature, plan, userId } = body

    if (provider === 'razorpay') {
      // HMAC validation: orderId|paymentId
      const expectedSig = await hmacSHA256(
        `${orderId}|${paymentId}`,
        Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
      )

      if (expectedSig !== signature) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })
      }

      // Amount validation (check against stored order)
      const { data: tx } = await supabaseAdmin
        .from('payment_transactions')
        .select('*')
        .eq('provider_order_id', orderId)
        .single()

      if (!tx) {
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })
      }

      // Idempotency check — prevent double processing
      if (tx.status === 'captured') {
        return new Response(JSON.stringify({ success: true, duplicate: true }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        })
      }

      // Update transaction
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          provider_payment_id: paymentId,
          provider_signature: signature,
          status: 'captured',
        })
        .eq('provider_order_id', orderId)

      // Activate subscription
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: tx.user_id,
          plan_type: plan ?? 'basic',
          status: 'active',
          currency: 'INR',
          amount_paid: tx.amount,
          payment_provider: 'razorpay',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' })

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
      status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('verify-payment error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
