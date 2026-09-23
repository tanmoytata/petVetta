'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, PawPrint, Stethoscope, TrendingUp, Activity, AlertCircle } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Card'
import { getSupabaseClient } from '@/lib/supabase/client'
import { TRIAGE_CONFIG } from '@/types'
import { formatDate } from '@/lib/utils'

interface AdminStats {
  totalUsers: number
  totalPets: number
  totalTriageSessions: number
  todayTriage: number
  emergencyCount: number
  activeSubscriptions: number
  recentSessions: Array<{
    id: string
    triage_level: string
    symptoms_text: string
    created_at: string
    pet_name?: string
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()

      // Verify admin role (check profile.role or email domain)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Admin emails (configure as needed)
      const adminEmails = ['tanmoy@petvetta.com', 'admin@petvetta.com']
      if (!adminEmails.includes(user.email ?? '')) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      try {
        // Note: Admin queries bypass RLS using service_role in production
        // Here we use regular client with RLS for demo
        const today = new Date().toISOString().split('T')[0]

        const [usersRes, petsRes, sessionsRes, todayRes, subsRes, recentRes] =
          await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('pets').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('triage_sessions').select('id', { count: 'exact', head: true }),
            supabase.from('triage_sessions').select('id', { count: 'exact', head: true }).gte('created_at', today),
            supabase.from('subscriptions').select('id', { count: 'exact', head: true }).neq('plan_type', 'free').eq('status', 'active'),
            supabase.from('triage_sessions')
              .select('id, triage_level, symptoms_text, created_at')
              .order('created_at', { ascending: false })
              .limit(10),
          ])

        const emergencyRes = await supabase
          .from('triage_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('triage_level', 'EMERGENCY')
          .gte('created_at', today)

        setStats({
          totalUsers: usersRes.count ?? 0,
          totalPets: petsRes.count ?? 0,
          totalTriageSessions: sessionsRes.count ?? 0,
          todayTriage: todayRes.count ?? 0,
          emergencyCount: emergencyRes.count ?? 0,
          activeSubscriptions: subsRes.count ?? 0,
          recentSessions: recentRes.data ?? [],
        })
      } catch {
        // Admin access may be restricted in demo
      }
      setLoading(false)
    }
    load()
  }, [])

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-[#c0392b] mb-4" />
        <h1 className="text-xl font-bold text-[#1a2e4a]">Access Denied</h1>
        <p className="text-[#555555] text-sm mt-2">You don't have admin permissions.</p>
      </div>
    )
  }

  const statCards = stats ? [
    { label: 'Total Users',    value: stats.totalUsers,          icon: Users,       color: '#2980b9' },
    { label: 'Total Pets',     value: stats.totalPets,           icon: PawPrint,    color: '#16a085' },
    { label: 'Triage Today',   value: stats.todayTriage,         icon: Stethoscope, color: '#e67e22' },
    { label: 'Emergencies Today', value: stats.emergencyCount,   icon: AlertCircle, color: '#c0392b' },
    { label: 'All Triage',     value: stats.totalTriageSessions, icon: Activity,    color: '#555555' },
    { label: 'Paid Plans',     value: stats.activeSubscriptions, icon: TrendingUp,  color: '#27ae60' },
  ] : []

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Admin Dashboard" showBack backHref="/profile" />

      <main className="max-w-[480px] mx-auto px-4 pt-[72px] pb-8">
        <h1 className="section-heading">Dashboard</h1>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {statCards.map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="text-center py-4">
                  <Icon size={24} className="mx-auto mb-2" style={{ color }} />
                  <p className="text-[24px] font-bold text-[#1a2e4a]">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-[12px] text-[#555555]">{label}</p>
                </Card>
              ))}
            </div>

            {/* Recent Triage */}
            {stats && stats.recentSessions.length > 0 && (
              <section>
                <h2 className="section-heading">Recent Triage Sessions</h2>
                <div className="space-y-2">
                  {stats.recentSessions.map((s) => {
                    const level = s.triage_level as keyof typeof TRIAGE_CONFIG
                    const cfg = TRIAGE_CONFIG[level] ?? TRIAGE_CONFIG.MONITOR
                    return (
                      <Card key={s.id} className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: cfg.color }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold" style={{ color: cfg.color }}>
                            {cfg.label}
                          </p>
                          <p className="text-[12px] text-[#555555] truncate">{s.symptoms_text}</p>
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {formatDate(s.created_at)}
                        </span>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Emergency Alert */}
            {stats && stats.emergencyCount > 0 && (
              <Card className="mt-4 border-[#c0392b] border-2">
                <div className="flex items-center gap-3">
                  <AlertCircle size={24} className="text-[#c0392b] flex-shrink-0" />
                  <div>
                    <p className="font-bold text-[#c0392b]">
                      {stats.emergencyCount} Emergency Case{stats.emergencyCount !== 1 ? 's' : ''} Today
                    </p>
                    <p className="text-[12px] text-[#555555]">
                      Review and follow up with affected users.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
