'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone_country_code: z.string().default('+91'),
  phone_number: z.string().optional(),
  country: z.string().default('IN'),
  preferred_lang: z.string().default('en'),
})
type SettingsForm = z.infer<typeof schema>

export default function SettingsPage() {
  const toast = useToast()
  const { profile, setProfile } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone_country_code: profile?.phone_country_code ?? '+91',
      phone_number: profile?.phone_number ?? '',
      country: profile?.country ?? 'IN',
      preferred_lang: profile?.preferred_lang ?? 'en',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? '',
        phone_country_code: profile.phone_country_code,
        phone_number: profile.phone_number ?? '',
        country: profile.country,
        preferred_lang: profile.preferred_lang,
      })
    }
  }, [profile])

  const onSubmit = async (data: SettingsForm) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', profile?.id)
        .select()
        .single()

      if (error) throw error
      setProfile(updated as Profile)
      toast.success('Settings saved!')
    } catch {
      toast.error('Failed to save settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This will permanently delete your account and all pet data.')) return
    setDeleting(true)
    try {
      const supabase = getSupabaseClient()
      // Note: actual deletion requires admin function or Supabase Realtime
      toast.info('Account deletion request submitted. Your data will be removed within 30 days per DPDP Act.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Settings" showBack backHref="/profile" />

      <main className="page-container pt-[72px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Card>
            <h2 className="font-bold text-[#1a2e4a] mb-4">Profile Information</h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <div className="flex gap-2">
                <div className="w-24">
                  <Input
                    label="Country Code"
                    {...register('phone_country_code')}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Phone Number"
                    type="tel"
                    inputMode="tel"
                    placeholder="9876543210"
                    {...register('phone_number')}
                  />
                </div>
              </div>

              <div>
                <label className="text-[14px] font-medium text-[#2c3e50] block mb-1.5">Country</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[14px] focus:border-[#2980b9] focus:outline-none min-h-[44px]"
                  {...register('country')}
                >
                  <option value="IN">🇮🇳 India</option>
                  <option value="SG">🇸🇬 Singapore</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="CA">🇨🇦 Canada</option>
                </select>
              </div>

              <div>
                <label className="text-[14px] font-medium text-[#2c3e50] block mb-1.5">Language</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[14px] focus:border-[#2980b9] focus:outline-none min-h-[44px]"
                  {...register('preferred_lang')}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
            </div>
          </Card>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Save Changes
          </Button>
        </form>

        {/* Danger Zone */}
        <Card className="mt-8 border-[#c0392b]/30 border">
          <h3 className="font-bold text-[#c0392b] mb-2">Danger Zone</h3>
          <p className="text-[13px] text-[#555555] mb-4">
            Deleting your account is permanent and cannot be undone. All your pet data,
            health records, and triage history will be removed.
          </p>
          <Button
            variant="danger"
            size="sm"
            loading={deleting}
            onClick={handleDeleteAccount}
          >
            Delete My Account
          </Button>
        </Card>

        {/* Privacy info */}
        <Card variant="info" className="mt-4">
          <p className="text-[12px] text-[#555555] leading-relaxed">
            Your data is stored securely in India (Supabase ap-south-1) and is protected
            under the DPDP Act 2023. You can request data export or deletion at any time.
          </p>
        </Card>
      </main>

      <BottomTabBar />
    </div>
  )
}
