'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, PawPrint, ChevronRight, Edit2 } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Card'
import { usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Pet } from '@/types'
import { calcAge } from '@/lib/utils'

export default function PetsPage() {
  const { pets, setPets } = usePetStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('is_active', true)
        .order('created_at')
      if (data) setPets(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="My Pets" />

      <main className="page-container pt-[72px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="section-heading !mb-0">Your Pets</h1>
          <Link href="/pets/add">
            <Button size="sm" className="gap-1.5">
              <Plus size={16} /> Add Pet
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : pets.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-5xl mb-4">🐾</div>
            <h2 className="text-[18px] font-bold text-[#1a2e4a] mb-2">No pets yet</h2>
            <p className="text-[#555555] text-sm mb-6">
              Add your pet's profile to start tracking their health.
            </p>
            <Link href="/pets/add">
              <Button><Plus size={16} /> Add Your First Pet</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {pets.map((pet) => (
              <Link key={pet.id} href={`/pets/${pet.id}`}>
                <Card className="flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-full bg-[#ecf0f1] border-2 border-[#2980b9] flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                    ) : (
                      pet.species === 'dog' ? '🐕' : '🐈'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1a2e4a] text-[15px]">{pet.name}</h3>
                    <p className="text-[13px] text-[#555555]">
                      {pet.species === 'dog' ? 'Dog' : 'Cat'}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {pet.date_of_birth ? ` · ${calcAge(pet.date_of_birth)}` : ''}
                      {pet.gender !== 'unknown' ? ` · ${pet.gender}` : ''}
                    </p>
                    {pet.weight_kg && (
                      <p className="text-[12px] text-[#555555]">{pet.weight_kg} kg</p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </div>
  )
}
