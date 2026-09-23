'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
})
type ForgotForm = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[480px] mx-auto">
      <div className="bg-[#1a2e4a] px-6 pt-12 pb-8 text-center">
        <span className="text-3xl font-bold text-white">
          pet<span className="text-[#16a085]">Vetta</span>
        </span>
      </div>

      <div className="flex-1 px-6 pt-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#555555] mb-6 min-h-[44px]"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Back to login</span>
        </button>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4" role="img" aria-label="Email sent">✉️</div>
            <h1 className="text-[24px] font-bold text-[#1a2e4a] mb-3">Check your email</h1>
            <p className="text-[#555555] text-sm leading-relaxed mb-8">
              We've sent a password reset link to your email address. It will expire in 1 hour.
            </p>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => router.push('/auth/login')}
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-[#1a2e4a] mb-2">Reset password</h1>
            <p className="text-[#555555] text-sm mb-8">
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                error={errors.email?.message}
                autoComplete="email"
                inputMode="email"
                {...register('email')}
              />
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
