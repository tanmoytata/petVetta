'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, Syringe, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Vaccination, Pet } from '@/types'
import { formatDate } from '@/lib/utils'

const DOG_VACCINES = ['Rabies', 'DHPPiL', 'Bordetella', 'Leptospirosis', 'Deworming']
const CAT_VACCINES = ['Rabies', 'FVRCP', 'FeLV', 'Deworming']

const vacSchema = z.object({
  petId: z.string().min(1),
  vaccineName: z.string().min(1, 'Vaccine name required'),
  vaccineType: z.enum(['core', 'non-core', 'deworming']),
  administeredDate: z.string().optional(),
  nextDueDate: z.string().optional(),
  administeredBy: z.string().optional(),
  clinicName: z.string().optional(),
  batchNumber: z.string().optional(),
})
type VacForm = z.infer<typeof vacSchema>

export default function VaccinationsPage() {
  const router = useRouter()
  const toast = useToast()
  const { pets } = usePetStore()
  const [selectedPet, setSelectedPet] = useState<Pet | null>(pets[0] ?? null)
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VacForm>({
    resolver: zodResolver(vacSchema),
    defaultValues: { petId: selectedPet?.id, vaccineType: 'core' },
  })

  useEffect(() => {
    if (!selectedPet) return
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('pet_id', selectedPet.id)
        .order('next_due_date', { ascending: true })
      setVaccinations(data ?? [])
    }
    load()
  }, [selectedPet])

  const onSubmit = async (data: VacForm) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: newVac, error } = await supabase
        .from('vaccinations')
        .insert({
          pet_id: data.petId,
          user_id: user?.id,
          vaccine_name: data.vaccineName,
          vaccine_type: data.vaccineType,
          administered_date: data.administeredDate || undefined,
          next_due_date: data.nextDueDate || undefined,
          administered_by: data.administeredBy || undefined,
          clinic_name: data.clinicName || undefined,
          batch_number: data.batchNumber || undefined,
        })
        .select()
        .single()

      if (error) throw error
      setVaccinations((prev) => [...prev, newVac].sort((a, b) =>
        (a.next_due_date ?? '').localeCompare(b.next_due_date ?? '')
      ))
      reset()
      setShowForm(false)
      toast.success('Vaccination record added!')
    } catch {
      toast.error('Failed to add vaccination.')
    } finally {
      setLoading(false)
    }
  }

  const isDue = (v: Vaccination) => {
    if (!v.next_due_date) return false
    return new Date(v.next_due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  const suggestedVaccines = selectedPet?.species === 'dog' ? DOG_VACCINES : CAT_VACCINES

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Vaccinations" showBack backHref="/health" />

      <main className="page-container pt-[72px]">
        {/* Pet Selector */}
        {pets.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {pets.map((pet) => (
              <button
                key={pet.id}
                onClick={() => setSelectedPet(pet)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium border-2 min-h-[36px] transition-colors ${
                  selectedPet?.id === pet.id
                    ? 'border-[#16a085] bg-[#16a085]/10 text-[#16a085]'
                    : 'border-gray-200 text-[#555555]'
                }`}
              >
                {pet.species === 'dog' ? '🐕' : '🐈'} {pet.name}
              </button>
            ))}
          </div>
        )}

        {!selectedPet ? (
          <Card className="text-center py-8">
            <p className="text-[#555555] text-sm">Add a pet first to track vaccinations.</p>
            <Button size="sm" className="mt-3" onClick={() => router.push('/pets/add')}>Add Pet</Button>
          </Card>
        ) : (
          <>
            {/* Due Soon Alert */}
            {vaccinations.some(isDue) && (
              <Card className="mb-4 flex items-start gap-3 border-[#e67e22] border">
                <AlertCircle size={20} className="text-[#e67e22] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-[#e67e22]">Vaccination Due Soon</p>
                  <p className="text-[12px] text-[#555555]">
                    {vaccinations.filter(isDue).map((v) => v.vaccine_name).join(', ')} — Schedule now
                  </p>
                </div>
              </Card>
            )}

            {/* Vaccination List */}
            <h2 className="section-heading">{selectedPet.name}'s Vaccinations</h2>

            {vaccinations.length === 0 ? (
              <Card className="text-center py-8 mb-4">
                <Syringe size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-[#555555] text-sm">No vaccination records yet.</p>
              </Card>
            ) : (
              <div className="space-y-2 mb-4">
                {vaccinations.map((v) => (
                  <Card key={v.id} className={isDue(v) ? 'border-[#e67e22] border-2' : ''}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[14px] text-[#2c3e50]">{v.vaccine_name}</p>
                        <p className="text-[12px] text-[#555555]">
                          {v.vaccine_type} · {v.clinic_name ?? v.administered_by ?? '—'}
                        </p>
                        {v.administered_date && (
                          <p className="text-[12px] text-[#555555]">
                            Given: {formatDate(v.administered_date)}
                          </p>
                        )}
                      </div>
                      {v.next_due_date && (
                        <div className={`text-right flex-shrink-0 ml-3 ${isDue(v) ? 'text-[#e67e22]' : 'text-[#16a085]'}`}>
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <p className="text-[11px] font-semibold">
                              {isDue(v) ? 'DUE' : 'Next:'}
                            </p>
                          </div>
                          <p className="text-[12px] font-semibold">{formatDate(v.next_due_date)}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Suggested vaccines */}
            <Card variant="info" className="mb-4">
              <p className="text-[13px] font-semibold text-[#1a2e4a] mb-2">
                Recommended for {selectedPet.species === 'dog' ? 'Dogs' : 'Cats'}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedVaccines.map((vac) => (
                  <span key={vac} className="text-[12px] bg-white border border-[#16a085] text-[#16a085] px-2.5 py-1 rounded-full">
                    {vac}
                  </span>
                ))}
              </div>
            </Card>

            {/* Add Form */}
            {showForm ? (
              <Card className="mb-4">
                <h3 className="font-bold text-[#1a2e4a] mb-4">Add Vaccination</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                  <input type="hidden" value={selectedPet.id} {...register('petId')} />

                  <Input label="Vaccine Name *" error={errors.vaccineName?.message} {...register('vaccineName')} />

                  <div>
                    <p className="text-[14px] font-medium text-[#2c3e50] mb-2">Type</p>
                    <div className="flex gap-2">
                      {['core', 'non-core', 'deworming'].map((t) => (
                        <label key={t} className="flex-1">
                          <input type="radio" value={t} className="sr-only" {...register('vaccineType')} />
                          <div className="py-2 border rounded-lg text-center text-[13px] cursor-pointer hover:border-[#16a085]">
                            {t}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Date Given" type="date" {...register('administeredDate')} />
                    <Input label="Next Due" type="date" {...register('nextDueDate')} />
                  </div>

                  <Input label="Vet / Clinic" {...register('clinicName')} />

                  <div className="flex gap-2">
                    <Button type="submit" size="md" loading={loading} className="flex-1">Save</Button>
                    <Button type="button" variant="ghost" size="md" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Button fullWidth variant="secondary" onClick={() => setShowForm(true)}>
                <Plus size={16} /> Add Vaccination Record
              </Button>
            )}
          </>
        )}
      </main>
      <BottomTabBar />
    </div>
  )
}
