'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, UtensilsCrossed, MapPin, Syringe, Plus, ChevronRight, Bell } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore, usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import { TRIAGE_CONFIG, type TriageSession, type Pet } from '@/types'
import { timeAgo, calcAge } from '@/lib/utils'
import { FullPageLoader } from '@/components/ui/Spinner'

function PetAvatar({ pet }: { pet: Pet }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <Link href={`/pets/${pet.id}`} className="block">
        <div className="w-16 h-16 rounded-full bg-[#ecf0f1] border-2 border-[#2980b9] overflow-hidden flex items-center justify-center text-2xl">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            pet.species === 'dog' ? '🐕' : '🐈'
          )}
        </div>
      </Link>
      <span className="text-[12px] font-semibold text-[#2c3e50] max-w-[72px] truncate text-center">
        {pet.name}
      </span>
      <span className="text-[11px] text-[#555555]">
        {pet.breed ? `${pet.breed.slice(0, 8)}` : pet.species}
        {pet.date_of_birth ? `, ${calcAge(pet.date_of_birth)}` : ''}
      </span>
    </div>
  )
}

function RecentActivity({ sessions }: { sessions: TriageSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-[13px] text-[#555555]">No recent activity. Run your first triage check!</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const cfg = TRIAGE_CONFIG[s.triage_level]
        return (
          <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cfg.color }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-medium text-[#2c3e50]">
                {s.pet?.name ?? 'Your pet'}&nbsp;—&nbsp;
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: cfg.color }}
                aria-label={`Triage level: ${cfg.label}`}
              >
                {cfg.label}
              </span>
            </div>
            <span className="text-[11px] text-[#555555] flex-shrink-0">{timeAgo(s.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { profile, subscription } = useAuthStore()
  const { pets, setPets } = usePetStore()
  const [sessions, setSessions] = useState<TriageSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Check auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
    })

    // Load pets
    const loadData = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [petsRes, sessionsRes] = await Promise.all([
        supabase.from('pets').select('*').eq('is_active', true).order('created_at'),
        supabase
          .from('triage_sessions')
          .select('*, pets(name, species, breed, date_of_birth)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      if (petsRes.data) setPets(petsRes.data)
      if (sessionsRes.data) {
        setSessions(
          sessionsRes.data.map((s) => ({
            ...s,
            pet: s.pets as unknown as Pet,
          }))
        )
      }
      setLoading(false)
    }

    loadData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  if (loading) return <FullPageLoader message="Loading your dashboard..." />

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader />

      <main className="page-container pt-[72px]">
        {/* Greeting */}
        <section className="mb-6">
          <h1 className="text-[22px] font-bold text-[#1a2e4a]">
            {getGreeting()}, {firstName}! 👋
          </h1>
          {subscription?.plan_type === 'free' && (
            <div className="mt-2 p-3 bg-[#f1c40f]/20 border border-[#f1c40f]/40 rounded-xl flex items-center justify-between">
              <span className="text-[13px] text-[#2c3e50]">
                Free plan — {3 - 0} queries left today
              </span>
              <Link href="/subscribe" className="text-[12px] font-semibold text-[#2980b9]">
                Upgrade →
              </Link>
            </div>
          )}
        </section>

        {/* Pets Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-heading !mb-0">Your Pets</h2>
            <Link
              href="/pets"
              className="text-sm text-[#2980b9] min-h-[44px] flex items-center gap-1"
            >
              See all <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {pets.map((pet) => (
              <PetAvatar key={pet.id} pet={pet} />
            ))}
            <Link href="/pets/add">
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#2980b9] flex items-center justify-center text-[#2980b9] hover:bg-blue-50 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="text-[12px] text-[#2980b9]">Add Pet</span>
              </div>
            </Link>
          </div>

          {pets.length === 0 && (
            <Card className="text-center py-8">
              <p className="text-4xl mb-3">🐾</p>
              <p className="text-[14px] text-[#555555] mb-4">
                Add your first pet to get started!
              </p>
              <Button onClick={() => router.push('/pets/add')} size="md">
                <Plus size={16} /> Add Pet
              </Button>
            </Card>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="section-heading">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/triage/symptoms">
              <Card className="flex flex-col items-center gap-2 py-5 text-center hover:border-[#2980b9] hover:border-2 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-[#2980b9]/10 rounded-xl flex items-center justify-center">
                  <Stethoscope size={24} className="text-[#2980b9]" />
                </div>
                <span className="text-[13px] font-semibold text-[#2c3e50]">Check Symptoms</span>
              </Card>
            </Link>

            <Link href="/health/food">
              <Card className="flex flex-col items-center gap-2 py-5 text-center hover:border-[#27ae60] hover:border-2 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-[#27ae60]/10 rounded-xl flex items-center justify-center">
                  <UtensilsCrossed size={24} className="text-[#27ae60]" />
                </div>
                <span className="text-[13px] font-semibold text-[#2c3e50]">Food Safety</span>
              </Card>
            </Link>

            <Link href="/health/vets">
              <Card className="flex flex-col items-center gap-2 py-5 text-center hover:border-[#e67e22] hover:border-2 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-[#e67e22]/10 rounded-xl flex items-center justify-center">
                  <MapPin size={24} className="text-[#e67e22]" />
                </div>
                <span className="text-[13px] font-semibold text-[#2c3e50]">Find a Vet</span>
              </Card>
            </Link>

            <Link href="/health/vaccinations">
              <Card className="flex flex-col items-center gap-2 py-5 text-center hover:border-[#16a085] hover:border-2 transition-all cursor-pointer">
                <div className="w-12 h-12 bg-[#16a085]/10 rounded-xl flex items-center justify-center">
                  <Syringe size={24} className="text-[#16a085]" />
                </div>
                <span className="text-[13px] font-semibold text-[#2c3e50]">Vaccinations</span>
              </Card>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-heading !mb-0">Recent Activity</h2>
            <Link href="/health" className="text-sm text-[#2980b9] min-h-[44px] flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <Card>
            <RecentActivity sessions={sessions} />
          </Card>
        </section>

        {/* Upgrade Banner (free plan) */}
        {subscription?.plan_type === 'free' && (
          <Card variant="premium" className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-[#1a2e4a] mb-1">Upgrade to Premium 🌟</h3>
                <p className="text-[13px] text-[#555555] mb-3">
                  50 queries/day, 5 pets, vaccination reminders & PDF exports
                </p>
                <Button size="sm" onClick={() => router.push('/subscribe')}>
                  See Plans
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>

      <BottomTabBar />
    </div>
  )
}
