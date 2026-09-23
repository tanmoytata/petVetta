'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { usePetStore, useAuthStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Pet, TriageLevel } from '@/types'

const triageSchema = z.object({
  petId: z.string().min(1, 'Please select a pet'),
  symptomsText: z
    .string()
    .min(5, 'Please describe the symptoms (at least 5 characters)')
    .max(500, 'Maximum 500 characters'),
  durationHours: z.string().optional(),
  severityLevel: z.enum(['mild', 'moderate', 'severe']).default('moderate'),
})
type TriageForm = z.infer<typeof triageSchema>

const DURATION_OPTIONS = [
  { value: '0.5', label: 'Less than 1 hour' },
  { value: '6', label: '1-12 hours' },
  { value: '30', label: '12-48 hours' },
  { value: '72', label: 'More than 48 hours' },
]

function TriageSymptomsContent() {
  const router = useRouter()
  const params = useSearchParams()
  const preselectedPetId = params.get('petId') ?? ''
  const toast = useToast()
  const { pets } = usePetStore()
  const { subscription } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [symptomsLength, setSymptomsLength] = useState(0)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<TriageForm>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      petId: preselectedPetId || (pets[0]?.id ?? ''),
      severityLevel: 'moderate',
    },
  })

  const symptomsText = watch('symptomsText')

  useEffect(() => {
    setSymptomsLength(symptomsText?.length ?? 0)
  }, [symptomsText])

  const onSubmit = async (data: TriageForm) => {
    setSubmitting(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/triage-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          petId: data.petId,
          symptomsText: data.symptomsText,
          durationHours: data.durationHours ? parseFloat(data.durationHours) : undefined,
          severityLevel: data.severityLevel,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        if (result.limitReached) {
          toast.warning('Daily query limit reached. Upgrade your plan for more queries.')
          router.push('/subscribe')
          return
        }
        toast.error(result.error ?? 'Triage failed. Please try again.')
        return
      }

      // Pass result to results page via URL + sessionStorage
      sessionStorage.setItem('triageResult', JSON.stringify({ ...result, petId: data.petId }))
      router.push('/triage/result')
    } catch {
      toast.error('Failed to connect to AI. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPetId = watch('petId')
  const selectedPet = pets.find((p) => p.id === selectedPetId)

  const planLimits: Record<string, number> = {
    free: 3, basic: 15, premium: 50, family: 100,
  }
  const dailyLimit = planLimits[subscription?.plan_type ?? 'free'] ?? 3

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Check Symptoms" showBack backHref="/" />

      <main className="page-container pt-[72px]">
        {submitting ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-[#ecf0f1] border-t-[#2980b9] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                🩺
              </div>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-[#1a2e4a] mb-1">Analyzing symptoms...</p>
              <p className="text-[13px] text-[#555555]">
                petVetta AI is reviewing{' '}
                <strong>{selectedPet?.name ?? 'your pet'}'s</strong> symptoms
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Pet selector */}
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50] mb-2">Which pet? *</p>
              {pets.length === 0 ? (
                <Card variant="info" className="text-center py-4">
                  <p className="text-[13px] text-[#555555]">
                    No pets yet.{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/pets/add')}
                      className="text-[#2980b9] font-semibold"
                    >
                      Add a pet first
                    </button>
                  </p>
                </Card>
              ) : (
                <Controller
                  name="petId"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Select pet">
                      {pets.map((pet) => (
                        <button
                          key={pet.id}
                          type="button"
                          role="radio"
                          aria-checked={field.value === pet.id}
                          onClick={() => field.onChange(pet.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-[13px] font-medium transition-colors min-h-[44px] ${
                            field.value === pet.id
                              ? 'border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]'
                              : 'border-gray-200 text-[#555555] bg-white'
                          }`}
                        >
                          <span>{pet.species === 'dog' ? '🐕' : '🐈'}</span>
                          <span>{pet.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                />
              )}
              {errors.petId && (
                <p className="text-[12px] text-[#c0392b] mt-1">{errors.petId.message}</p>
              )}
            </div>

            {/* Symptoms input */}
            <div>
              <label className="text-[14px] font-medium text-[#2c3e50] block mb-1.5">
                Describe what you've noticed *
              </label>
              <div className="relative">
                <textarea
                  className={`w-full border rounded-lg px-4 py-3 text-[14px] text-[#2c3e50] placeholder:text-gray-400 resize-none min-h-[120px] focus:outline-none focus:ring-2 transition-colors ${
                    errors.symptomsText
                      ? 'border-[#c0392b] focus:ring-[#c0392b]/20 focus:border-[#c0392b]'
                      : 'border-gray-300 focus:border-[#2980b9] focus:ring-[#2980b9]/20'
                  }`}
                  placeholder="e.g. Not eating since yesterday, vomiting twice, seems lethargic..."
                  maxLength={500}
                  aria-label="Describe symptoms"
                  {...register('symptomsText')}
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
                  {symptomsLength}/500
                </span>
              </div>
              {errors.symptomsText && (
                <p className="text-[12px] text-[#c0392b] mt-1">{errors.symptomsText.message}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50] mb-2">
                How long has this been happening?
              </p>
              <div className="space-y-2" role="radiogroup" aria-label="Duration">
                {DURATION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 cursor-pointer min-h-[44px]"
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      className="w-4 h-4 accent-[#2980b9]"
                      {...register('durationHours')}
                    />
                    <span className="text-[14px] text-[#2c3e50]">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <p className="text-[14px] font-medium text-[#2c3e50] mb-2">Severity</p>
              <Controller
                name="severityLevel"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2" role="radiogroup" aria-label="Severity">
                    {[
                      { value: 'mild',     label: 'Mild',     color: '#27ae60' },
                      { value: 'moderate', label: 'Moderate', color: '#e67e22' },
                      { value: 'severe',   label: 'Severe',   color: '#c0392b' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === opt.value}
                        onClick={() => field.onChange(opt.value)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-[13px] font-semibold transition-colors min-h-[44px] ${
                          field.value === opt.value
                            ? 'text-white'
                            : 'border-gray-200 text-[#555555] bg-white'
                        }`}
                        style={
                          field.value === opt.value
                            ? { backgroundColor: opt.color, borderColor: opt.color }
                            : {}
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Query limit notice */}
            <div className="flex items-center gap-2 text-[12px] text-[#555555]">
              <span>
                {subscription?.plan_type === 'free' && `${dailyLimit} free queries/day`}
              </span>
              {subscription?.plan_type === 'free' && (
                <button
                  type="button"
                  onClick={() => router.push('/subscribe')}
                  className="text-[#2980b9] font-semibold"
                >
                  Upgrade →
                </button>
              )}
            </div>

            {/* AI Disclaimer */}
            <Card variant="info" className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-[#e67e22] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#555555] italic leading-relaxed">
                petVetta provides AI-driven guidance for educational purposes only. Not a
                substitute for professional veterinary advice. Always consult a licensed vet for
                serious concerns.
              </p>
            </Card>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={submitting}
              disabled={pets.length === 0}
            >
              Get AI Guidance →
            </Button>
          </form>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}

export default function TriageSymptomsPage() {
  return (
    <Suspense>
      <TriageSymptomsContent />
    </Suspense>
  )
}
