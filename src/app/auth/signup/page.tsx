'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
  consent: z.boolean().refine((v) => v === true, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const toast = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message ?? 'Sign up failed. Please try again.')
        return
      }

      if (authData.user) {
        if (authData.user.email_confirmed_at) {
          toast.success('Account created! Let's add your first pet.')
          router.push('/pets/add?onboarding=true')
        } else {
          router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`)
        }
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[480px] mx-auto">
      {/* Header */}
      <div className="bg-[#1a2e4a] px-6 pt-12 pb-8 text-center">
        <Link href="/onboarding">
          <span className="text-3xl font-bold text-white">
            pet<span className="text-[#16a085]">Vetta</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-6 pt-8 pb-6 overflow-y-auto">
        <h1 className="text-[24px] font-bold text-[#1a2e4a] mb-2">Create your account</h1>
        <p className="text-[#555555] text-sm mb-8">
          Free forever. No credit card required.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Full Name"
            type="text"
            placeholder="Priya Sharma"
            error={errors.fullName?.message}
            autoComplete="name"
            {...register('fullName')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            autoComplete="email"
            inputMode="email"
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              error={errors.password?.message}
              autoComplete="new-password"
              hint="Must contain uppercase letter and number"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          {/* Consent checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 rounded border-gray-300 text-[#2980b9] accent-[#2980b9]"
                {...register('consent')}
              />
              <span className="text-[13px] text-[#555555] leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-[#2980b9] underline">Terms of Service</Link>,{' '}
                <Link href="/privacy" className="text-[#2980b9] underline">Privacy Policy</Link>,
                and consent to petVetta's AI health guidance and data collection.
              </span>
            </label>
            {errors.consent && (
              <p className="text-[12px] text-[#c0392b] mt-1">{errors.consent.message}</p>
            )}
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[#555555] mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#2980b9] font-semibold hover:underline">
            Log in
          </Link>
        </p>

        {/* Medical Disclaimer */}
        <div className="mt-6 p-3 bg-[#ecf0f1] rounded-xl">
          <p className="text-[11px] text-[#555555] italic leading-relaxed">
            <strong>Medical Disclaimer:</strong> petVetta provides AI-driven general health information for
            educational purposes only and is NOT a substitute for professional veterinary advice, diagnosis,
            or treatment. Always consult a licensed veterinarian for health concerns.
          </p>
        </div>
      </div>
    </div>
  )
}
