'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Star } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { PLAN_LIMITS, type SubscriptionPlan } from '@/types'
import { formatCurrency } from '@/lib/utils'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: [
    '3 AI triage queries/day',
    '1 pet profile',
    'Basic health records',
    'Food safety checker (limited)',
    'Community support',
  ],
  basic: [
    '15 AI triage queries/day',
    'Up to 3 pets',
    'Full health records',
    'Vaccination tracker',
    'Unlimited food safety',
    'Email support',
  ],
  premium: [
    '50 AI triage queries/day',
    'Up to 5 pets',
    'Everything in Basic',
    'PDF health exports (monthly)',
    'Push reminders',
    'Priority 24/7 chat support',
    '1 family sharing',
  ],
  family: [
    '100 AI triage queries/day',
    'Up to 10 pets',
    'Everything in Premium',
    'Up to 5 family members',
    'Weekly PDF exports',
    'Priority phone support',
  ],
}

const POPULAR_PLAN: SubscriptionPlan = 'premium'

export default function SubscribePage() {
  const router = useRouter()
  const toast = useToast()
  const { subscription, setSubscription } = useAuthStore()
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null)

  const plans: SubscriptionPlan[] = ['free', 'basic', 'premium', 'family']

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan === 'free' || plan === subscription?.plan_type) return
    setLoadingPlan(plan)

    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Create payment order
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ plan, currency, provider: currency === 'INR' ? 'razorpay' : 'stripe' }),
        }
      )

      const orderData = await res.json()
      if (!res.ok) throw new Error(orderData.error)

      if (currency === 'INR') {
        // Load Razorpay SDK
        await loadRazorpayScript()

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'petVetta',
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
          order_id: orderData.orderId,
          handler: async (response: Record<string, string>) => {
            // Verify payment
            const verifyRes = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  provider: 'razorpay',
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  plan,
                }),
              }
            )
            if (verifyRes.ok) {
              toast.success(`🎉 Upgraded to ${plan}! Enjoy premium features.`)
              // Refresh subscription
              const { data: sub } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', session?.user.id)
                .single()
              if (sub) setSubscription(sub)
              router.push('/')
            }
          },
          prefill: {
            name: session?.user.user_metadata.full_name,
            email: session?.user.email,
          },
          theme: { color: '#2980b9' },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      }
    } catch (err) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Load Razorpay SDK */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" />

      <TopHeader title="Choose a Plan" showBack backHref="/profile" />

      <main className="page-container pt-[72px]">
        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-[#1a2e4a] mb-2">Upgrade petVetta</h1>
          <p className="text-[#555555] text-sm">Cancel anytime. No hidden charges.</p>

          {/* Currency Selector */}
          <div className="flex justify-center mt-4">
            <div className="flex bg-white border border-gray-200 rounded-full p-1 gap-1">
              {(['INR', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-5 py-1.5 rounded-full text-[13px] font-semibold transition-colors min-h-[36px] ${
                    currency === c
                      ? 'bg-[#1a2e4a] text-white'
                      : 'text-[#555555]'
                  }`}
                >
                  {c === 'INR' ? '🇮🇳 ₹' : '🌍 $'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const limits = PLAN_LIMITS[plan]
            const features = PLAN_FEATURES[plan]
            const price = currency === 'INR' ? limits.priceINR : limits.priceUSD
            const isCurrent = subscription?.plan_type === plan
            const isPopular = plan === POPULAR_PLAN

            return (
              <div
                key={plan}
                className={`relative rounded-2xl border-2 overflow-hidden ${
                  isPopular ? 'border-[#2980b9]' : 'border-gray-200 bg-white'
                }`}
              >
                {isPopular && (
                  <div className="bg-[#2980b9] text-white text-center py-1.5 text-[12px] font-bold tracking-wide">
                    ⭐ MOST POPULAR
                  </div>
                )}

                <div className={`p-5 ${isPopular ? 'bg-[#2980b9]/5' : 'bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-[18px] text-[#1a2e4a]">{limits.label}</h3>
                      <p className="text-[24px] font-bold text-[#2980b9]">
                        {price === 0 ? 'Free' : `${currency === 'INR' ? '₹' : '$'}${price}`}
                        {price > 0 && <span className="text-[13px] font-normal text-[#555555]">/mo</span>}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="bg-[#27ae60] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check size={15} className="text-[#27ae60] flex-shrink-0 mt-0.5" />
                        <span className="text-[13px] text-[#2c3e50]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan === 'free' ? (
                    isCurrent ? (
                      <div className="text-center text-[13px] text-[#555555] py-2">
                        Your current plan
                      </div>
                    ) : null
                  ) : (
                    <Button
                      fullWidth
                      variant={isCurrent ? 'ghost' : isPopular ? 'primary' : 'secondary'}
                      loading={loadingPlan === plan}
                      disabled={isCurrent || loadingPlan !== null}
                      onClick={() => handleUpgrade(plan)}
                    >
                      {isCurrent ? '✓ Current Plan' : `Upgrade to ${limits.label}`}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-[12px] text-[#555555]">
            UPI · Cards · Net Banking · Paytm · PhonePe (India)
          </p>
          <p className="text-[12px] text-[#555555]">
            All plans include a 7-day free trial
          </p>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}
