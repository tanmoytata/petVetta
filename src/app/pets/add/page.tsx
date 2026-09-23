'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'

const petSchema = z.object({
  name: z.string().min(1, 'Pet name is required').max(50),
  species: z.enum(['dog', 'cat'], { required_error: 'Select species' }),
  breed: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  weight_kg: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
  notes: z.string().max(500).optional(),
})
type PetForm = z.infer<typeof petSchema>

function AddPetContent() {
  const router = useRouter()
  const params = useSearchParams()
  const isOnboarding = params.get('onboarding') === 'true'
  const toast = useToast()
  const { addPet } = usePetStore()
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PetForm>({ resolver: zodResolver(petSchema) })

  const selectedSpecies = watch('species')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: PetForm) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      let photoUrl: string | undefined
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `pets/${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('pet-photos')
          .upload(path, photoFile)
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('pet-photos').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }

      const petData = {
        user_id: user.id,
        name: data.name,
        species: data.species,
        breed: data.breed || undefined,
        date_of_birth: data.date_of_birth || undefined,
        gender: data.gender,
        weight_kg: typeof data.weight_kg === 'number' ? data.weight_kg : undefined,
        notes: data.notes || undefined,
        photo_url: photoUrl,
        is_active: true,
      }

      const { data: newPet, error } = await supabase
        .from('pets')
        .insert(petData)
        .select()
        .single()

      if (error) {
        toast.error(error.message)
        return
      }

      addPet(newPet)
      toast.success(`${data.name} added! 🐾`)

      if (isOnboarding) {
        router.push('/')
      } else {
        router.push(`/pets/${newPet.id}`)
      }
    } catch {
      toast.error('Failed to add pet. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <TopHeader title="Add Pet" showBack backHref="/pets" />

      <main className="page-container pt-[72px] pb-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Photo Upload */}
          <div className="flex flex-col items-center py-4">
            <label htmlFor="pet-photo" className="cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-[#ecf0f1] border-2 border-dashed border-[#2980b9] flex flex-col items-center justify-center overflow-hidden hover:bg-blue-50 transition-colors">
                {photoPreview ? (
                  <img src={photoPreview} alt="Pet photo" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={28} className="text-[#2980b9]" />
                    <span className="text-[10px] text-[#2980b9] mt-1">Add Photo</span>
                  </>
                )}
              </div>
            </label>
            <input
              id="pet-photo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
              aria-label="Upload pet photo"
            />
          </div>

          {/* Species */}
          <div>
            <p className="text-[14px] font-medium text-[#2c3e50] mb-2">Species *</p>
            <Controller
              name="species"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3" role="radiogroup" aria-label="Species">
                  {[
                    { value: 'dog', label: '🐕 Dog' },
                    { value: 'cat', label: '🐈 Cat' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === opt.value}
                      onClick={() => field.onChange(opt.value)}
                      className={`flex-1 py-3 rounded-xl border-2 font-semibold text-[14px] transition-colors min-h-[44px] ${
                        field.value === opt.value
                          ? 'border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]'
                          : 'border-gray-200 text-[#555555]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.species && (
              <p className="text-[12px] text-[#c0392b] mt-1">{errors.species.message}</p>
            )}
          </div>

          <Input label="Pet Name *" placeholder="Bruno" error={errors.name?.message} {...register('name')} />

          <Input label="Breed" placeholder={selectedSpecies === 'cat' ? 'Persian, Siamese...' : 'Labrador, Golden Retriever...'} {...register('breed')} />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date of Birth"
              type="date"
              {...register('date_of_birth')}
              max={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="5.5"
              {...register('weight_kg')}
            />
          </div>

          {/* Gender */}
          <div>
            <p className="text-[14px] font-medium text-[#2c3e50] mb-2">Gender</p>
            <Controller
              name="gender"
              control={control}
              defaultValue="unknown"
              render={({ field }) => (
                <div className="flex gap-2" role="radiogroup" aria-label="Gender">
                  {[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'unknown', label: 'Unknown' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === opt.value}
                      onClick={() => field.onChange(opt.value)}
                      className={`flex-1 py-2.5 rounded-lg border-2 text-[13px] font-medium transition-colors min-h-[44px] ${
                        field.value === opt.value
                          ? 'border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]'
                          : 'border-gray-200 text-[#555555]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div>
            <label className="text-[14px] font-medium text-[#2c3e50] block mb-1.5">Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[14px] focus:border-[#2980b9] focus:outline-none resize-none"
              rows={3}
              placeholder="Any special conditions, allergies..."
              {...register('notes')}
            />
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {isOnboarding ? 'Add Pet & Continue' : 'Save Pet'}
          </Button>
        </form>
      </main>
    </div>
  )
}

export default function AddPetPage() {
  return (
    <Suspense>
      <AddPetContent />
    </Suspense>
  )
}
