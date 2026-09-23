'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Stethoscope, Heart, Syringe, Scale, AlertCircle } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FullPageLoader } from '@/components/ui/Spinner'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Pet, TriageSession, HealthRecord } from '@/types'
import { TRIAGE_CONFIG } from '@/types'
import { calcAge, formatDate, timeAgo } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { usePetStore } from '@/store'

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { removePet } = usePetStore()
  const [pet, setPet] = useState<Pet | null>(null)
  const [recentSessions, setRecentSessions] = useState<TriageSession[]>([])
  const [recentRecords, setRecentRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const [petRes, sessionsRes, recordsRes] = await Promise.all([
        supabase.from('pets').select('*').eq('id', id).single(),
        supabase
          .from('triage_sessions')
          .select('*')
          .eq('pet_id', id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('health_records')
          .select('*')
          .eq('pet_id', id)
          .order('visit_date', { ascending: false })
          .limit(3),
      ])

      if (petRes.error || !petRes.data) {
        toast.error('Pet not found')
        router.push('/pets')
        return
      }

      setPet(petRes.data)
      setRecentSessions(sessionsRes.data ?? [])
      setRecentRecords(recordsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  const handleDeletePet = async () => {
    if (!confirm(`Remove ${pet?.name} from your account?`)) return
    const supabase = getSupabaseClient()
    await supabase.from('pets').update({ is_active: false }).eq('id', id)
    removePet(id)
    toast.success(`${pet?.name} removed.`)
    router.push('/pets')
  }

  if (loading) return <FullPageLoader />
  if (!pet) return null

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader
        title={pet.name}
        showBack
        backHref="/pets"
        rightSlot={
          <Link href={`/pets/${id}/edit`} className="p-2 rounded-full hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Edit2 size={18} className="text-[#2c3e50]" />
          </Link>
        }
      />

      <main className="page-container pt-[72px]">
        {/* Pet Hero */}
        <Card className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-[#ecf0f1] border-2 border-[#2980b9] overflow-hidden flex items-center justify-center text-4xl flex-shrink-0">
            {pet.photo_url ? (
              <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              pet.species === 'dog' ? '🐕' : '🐈'
            )}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#1a2e4a]">{pet.name}</h1>
            <p className="text-[13px] text-[#555555]">
              {pet.species === 'dog' ? 'Dog' : 'Cat'}
              {pet.breed ? ` · ${pet.breed}` : ''}
              {pet.gender !== 'unknown' ? ` · ${pet.gender}` : ''}
            </p>
            {pet.date_of_birth && (
              <p className="text-[13px] text-[#555555]">
                Age: {calcAge(pet.date_of_birth)}
                {' '} · Born {formatDate(pet.date_of_birth)}
              </p>
            )}
            {pet.weight_kg && (
              <p className="text-[13px] text-[#555555]">Weight: {pet.weight_kg} kg</p>
            )}
          </div>
        </Card>

        {/* Quick action buttons */}
        <div className="flex gap-2 mb-5">
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => router.push(`/triage/symptoms?petId=${id}`)}
          >
            <Stethoscope size={15} /> Check Symptoms
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 gap-1"
            onClick={() => router.push(`/health/${id}`)}
          >
            <Heart size={15} /> Health Records
          </Button>
        </div>

        {/* Recent Triage */}
        {recentSessions.length > 0 && (
          <section className="mb-4">
            <h2 className="section-heading">Recent Triage</h2>
            <div className="space-y-2">
              {recentSessions.map((s) => {
                const cfg = TRIAGE_CONFIG[s.triage_level]
                return (
                  <Card key={s.id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: cfg.color }}>
                        {cfg.label}
                      </p>
                      <p className="text-[12px] text-[#555555] truncate">{s.symptoms_text}</p>
                    </div>
                    <span className="text-[11px] text-gray-400">{timeAgo(s.created_at)}</span>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Recent Health Records */}
        {recentRecords.length > 0 && (
          <section className="mb-4">
            <h2 className="section-heading">Health Records</h2>
            <div className="space-y-2">
              {recentRecords.map((r) => (
                <Card key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#2980b9]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart size={16} className="text-[#2980b9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#2c3e50]">
                      {r.record_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-[12px] text-[#555555]">
                      {r.clinic_name ?? r.vet_name ?? 'No clinic info'} · {formatDate(r.visit_date)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {pet.notes && (
          <Card variant="info" className="mb-4">
            <p className="text-[13px] text-[#555555] italic">📝 {pet.notes}</p>
          </Card>
        )}

        {/* Delete */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleDeletePet}
            className="text-[#c0392b] text-sm font-medium min-h-[44px] flex items-center gap-2"
          >
            <AlertCircle size={16} /> Remove {pet.name} from account
          </button>
        </div>
      </main>
      <BottomTabBar />
    </div>
  )
}
