'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function OTPVerifyPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const toast = useToast()
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [loading, setLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
    const timer = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all filled
    if (newOtp.every((d) => d !== '') && value) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      })

      if (error) {
        toast.error('Invalid or expired code. Please try again.')
        setOtp(Array(6).fill(''))
        inputRefs.current[0]?.focus()
        return
      }

      toast.success('Email verified! Let\'s add your first pet.')
      router.push('/pets/add?onboarding=true')
    } catch {
      toast.error('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCountdown > 0) return
    const supabase = getSupabaseClient()
    await supabase.auth.resend({ type: 'signup', email })
    setResendCountdown(60)
    toast.info('Verification code resent to your email.')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[480px] mx-auto">
      <div className="bg-[#1a2e4a] px-6 pt-12 pb-8 text-center">
        <span className="text-3xl font-bold text-white">
          pet<span className="text-[#16a085]">Vetta</span>
        </span>
      </div>

      <div className="flex-1 px-6 pt-10 text-center">
        <div className="text-5xl mb-4" role="img" aria-label="Email">📧</div>
        <h1 className="text-[24px] font-bold text-[#1a2e4a] mb-2">Verify your email</h1>
        <p className="text-[#555555] text-sm mb-2">
          Enter the 6-digit code sent to
        </p>
        <p className="text-[#2980b9] font-semibold text-sm mb-8">{email}</p>

        {/* OTP Inputs */}
        <div
          className="flex justify-center gap-3 mb-8"
          onPaste={handlePaste}
          role="group"
          aria-label="One-time password"
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-colors
                border-gray-300 focus:border-[#2980b9] focus:outline-none focus:ring-2 focus:ring-[#2980b9]/20
                bg-white text-[#2c3e50]"
            />
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={() => otp.every((d) => d) && handleVerify(otp.join(''))}
          disabled={otp.some((d) => !d)}
        >
          Verify Email
        </Button>

        <div className="mt-6">
          <button
            onClick={handleResend}
            disabled={resendCountdown > 0}
            className="text-sm min-h-[44px] px-4 disabled:text-gray-400 text-[#2980b9] hover:underline disabled:no-underline"
          >
            {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  )
}
