'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Settings, CreditCard, Bell, Shield, LogOut, ChevronRight, Camera } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore, usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getInitials, formatDate } from '@/lib/utils'
import { PLAN_LIMITS } from '@/types'

const menuItems = [
  { icon: Settings,   label: 'Account Settings',   href: '/settings',          },
  { icon: CreditCard, label: 'Subscription & Billing', href: '/subscribe',     },
  { icon: Bell,       label: 'Notifications',       href: '/settings/notifications', },
  { icon: Shield,     label: 'Privacy & Data',      href: '/settings/privacy',  },
]

export default function ProfilePage() {
  const router = useRouter()
  const toast = useToast()
  const { profile, subscription, reset: resetAuth } = useAuthStore()
  const { pets, setPets } = usePetStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) return
    setLoggingOut(true)
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      resetAuth()
      setPets([])
      router.push('/auth/login')
    } catch {
      toast.error('Logout failed.')
    } finally {
      setLoggingOut(false)
    }
  }

  const plan = subscription?.plan_type ?? 'free'
  const planInfo = PLAN_LIMITS[plan]

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader />
      <main className="page-container pt-[72px]">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center py-6 mb-4">
          <div className="w-20 h-20 rounded-full bg-[#1a2e4a] flex items-center justify-center text-white text-2xl font-bold relative mb-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name ?? 'Profile'} className="w-full h-full rounded-full object-cover" />
            ) : (
              profile?.full_name ? getInitials(profile.full_name) : <User size={32} />
            )}
          </div>
          <h1 className="text-[20px] font-bold text-[#1a2e4a]">
            {profile?.full_name ?? 'Your Name'}
          </h1>
          <p className="text-[13px] text-[#555555]">{profile?.email}</p>
          <div className="mt-3 px-4 py-1.5 bg-[#2980b9]/10 rounded-full border border-[#2980b9]/30">
            <span className="text-[13px] font-semibold text-[#2980b9]">
              {planInfo.label} Plan
            </span>
          </div>
        </div>

        {/* Plan Summary */}
        <Card className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1a2e4a]">Your Plan</h2>
            <Link href="/subscribe" className="text-[#2980b9] text-[13px] font-semibold">
              Upgrade →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#ecf0f1] rounded-xl py-3">
              <p className="text-[18px] font-bold text-[#2980b9]">{planInfo.dailyQueries}</p>
              <p className="text-[11px] text-[#555555]">queries/day</p>
            </div>
            <div className="bg-[#ecf0f1] rounded-xl py-3">
              <p className="text-[18px] font-bold text-[#2980b9]">{pets.length}</p>
              <p className="text-[11px] text-[#555555]">of {planInfo.pets} pets</p>
            </div>
            <div className="bg-[#ecf0f1] rounded-xl py-3">
              <p className="text-[18px] font-bold text-[#2980b9]">
                {subscription?.status === 'active' ? '✓' : '—'}
              </p>
              <p className="text-[11px] text-[#555555]">
                {subscription?.current_period_end
                  ? `Renews ${formatDate(subscription.current_period_end)}`
                  : 'Free'}
              </p>
            </div>
          </div>
        </Card>

        {/* Menu */}
        <div className="space-y-1 mb-6">
          {menuItems.map(({ icon: Icon, label, href }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-4 py-3 px-4 bg-white rounded-xl hover:bg-gray-50 transition-colors min-h-[52px]">
                <Icon size={20} className="text-[#555555] flex-shrink-0" />
                <span className="flex-1 text-[14px] text-[#2c3e50] font-medium">{label}</span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        {/* Log Out */}
        <Button
          variant="ghost"
          fullWidth
          size="lg"
          loading={loggingOut}
          onClick={handleLogout}
          className="gap-2 text-[#c0392b] hover:bg-[#c0392b]/10"
        >
          <LogOut size={18} /> Log Out
        </Button>

        {/* App Version */}
        <p className="text-center text-[11px] text-gray-400 mt-6 mb-4">
          petVetta v1.0.0 · Made with ❤️ for pet parents
        </p>
      </main>
      <BottomTabBar />
    </div>
  )
}
