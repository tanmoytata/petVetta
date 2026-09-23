'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { FoodSafetyResult, Species } from '@/types'

const safetyColors: Record<FoodSafetyResult, string> = {
  SAFE:    '#27ae60',
  CAUTION: '#e67e22',
  TOXIC:   '#c0392b',
  UNKNOWN: '#555555',
}

const safetyBg: Record<FoodSafetyResult, string> = {
  SAFE:    'bg-[#27ae60]/10 border-[#27ae60]',
  CAUTION: 'bg-[#e67e22]/10 border-[#e67e22]',
  TOXIC:   'bg-[#c0392b]/10 border-[#c0392b]',
  UNKNOWN: 'bg-gray-50 border-gray-300',
}

const safetyEmoji: Record<FoodSafetyResult, string> = {
  SAFE: '✅', CAUTION: '⚠️', TOXIC: '🚨', UNKNOWN: '❓',
}

interface FoodResult {
  safetyResult: FoodSafetyResult
  aiResponse: string
  foodItem: string
  species: Species
}

const schema = z.object({
  foodItem: z.string().min(1, 'Enter a food item').max(100),
  species: z.enum(['dog', 'cat']),
})
type FoodForm = z.infer<typeof schema>

export default function FoodSafetyPage() {
  const router = useRouter()
  const { pets } = usePetStore()
  const [result, setResult] = useState<FoodResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<FoodResult[]>([])

  const defaultSpecies: Species = pets[0]?.species ?? 'dog'

  const { register, handleSubmit, control, formState: { errors } } = useForm<FoodForm>({
    resolver: zodResolver(schema),
    defaultValues: { species: defaultSpecies },
  })

  const onSubmit = async (data: FoodForm) => {
    setLoading(true)
    setResult(null)
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/food-safety`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            foodItem: data.foodItem,
            species: data.species,
            petId: pets.find((p) => p.species === data.species)?.id,
          }),
        }
      )

      const json = await res.json()
      if (!res.ok) { throw new Error(json.error) }

      const newResult: FoodResult = {
        safetyResult: json.safetyResult,
        aiResponse: json.aiResponse,
        foodItem: data.foodItem,
        species: data.species,
      }
      setResult(newResult)
      setHistory((prev) => [newResult, ...prev.slice(0, 4)])
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Food Safety" showBack backHref="/health" />

      <main className="page-container pt-[72px]">
        <div className="mb-5">
          <h1 className="section-heading">Is This Food Safe?</h1>
          <p className="text-[13px] text-[#555555]">
            Check whether a food is safe for your dog or cat.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6" noValidate>
          {/* Species toggle */}
          <div>
            <Controller
              name="species"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2" role="radiogroup" aria-label="Pet species">
                  {([['dog', '🐕 Dog'], ['cat', '🐈 Cat']] as [Species, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      role="radio"
                      aria-checked={field.value === val}
                      onClick={() => field.onChange(val)}
                      className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-[14px] transition-colors min-h-[44px] ${
                        field.value === val
                          ? 'border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]'
                          : 'border-gray-200 text-[#555555] bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="e.g. grapes, chicken, mango..."
                error={errors.foodItem?.message}
                {...register('foodItem')}
              />
            </div>
            <Button type="submit" size="md" loading={loading} className="flex-shrink-0">
              <Search size={18} />
            </Button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`rounded-2xl border-2 overflow-hidden mb-5 ${safetyBg[result.safetyResult]}`}
            role="region"
            aria-label={`Food safety result: ${result.safetyResult}`}
            aria-live="polite"
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: safetyColors[result.safetyResult] }}>
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-hidden="true">
                  {safetyEmoji[result.safetyResult]}
                </span>
                <div>
                  <p className="font-bold text-[16px]" style={{ color: safetyColors[result.safetyResult] }}>
                    {result.safetyResult}
                  </p>
                  <p className="text-[12px] text-[#555555]">
                    {result.foodItem} for {result.species}s
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-white">
              {result.aiResponse.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-bold text-[#2c3e50] mt-2 mb-1">{line.slice(2, -2)}</p>
                }
                return line.trim() ? (
                  <p key={i} className="text-[13px] text-[#2c3e50] leading-relaxed mb-1">{line}</p>
                ) : <div key={i} className="h-1" />
              })}
            </div>
            <div className="px-4 pb-3 bg-white">
              <p className="text-[11px] text-gray-400 italic border-t pt-2">
                AI-generated — Not a substitute for veterinary advice.
              </p>
            </div>
          </div>
        )}

        {/* Recent searches */}
        {history.length > 1 && (
          <section>
            <h2 className="section-heading">Recent Searches</h2>
            <div className="space-y-2">
              {history.slice(1).map((item, i) => (
                <Card key={i} className="flex items-center gap-3 py-2.5">
                  <span className="text-lg">{safetyEmoji[item.safetyResult]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-[#2c3e50]">{item.foodItem}</span>
                    <span className="text-[12px] text-[#555555]"> · {item.species}</span>
                  </div>
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: safetyColors[item.safetyResult] }}
                  >
                    {item.safetyResult}
                  </span>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Common Toxic Foods Warning */}
        <Card variant="info" className="mt-5">
          <h3 className="font-bold text-[#c0392b] mb-2 text-[14px]">⚠️ Common Toxic Foods</h3>
          <div className="flex flex-wrap gap-2">
            {['Chocolate', 'Grapes', 'Onions', 'Garlic', 'Xylitol', 'Avocado', 'Alcohol', 'Caffeine'].map((food) => (
              <span key={food} className="text-[12px] bg-[#c0392b]/10 text-[#c0392b] px-2.5 py-1 rounded-full font-medium">
                {food}
              </span>
            ))}
          </div>
        </Card>
      </main>

      <BottomTabBar />
    </div>
  )
}
