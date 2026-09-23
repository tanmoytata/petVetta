'use client'

import { useRouter } from 'next/navigation'
import { Stethoscope } from 'lucide-react'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { TopHeader } from '@/components/layout/TopHeader'
import { Button } from '@/components/ui/Button'
import { usePetStore } from '@/store'

export default function TriagePage() {
  const router = useRouter()
  const { pets } = usePetStore()

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader />
      <main className="page-container pt-[72px] flex flex-col items-center justify-center min-h-[70vh] text-center gap-6">
        <div className="w-24 h-24 bg-[#2980b9]/10 rounded-full flex items-center justify-center">
          <Stethoscope size={48} className="text-[#2980b9]" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-[#1a2e4a] mb-2">AI Symptom Triage</h1>
          <p className="text-[#555555] text-sm leading-relaxed max-w-[280px] mx-auto">
            Describe your pet's symptoms and get an expert-level assessment in seconds.
          </p>
        </div>
        <Button size="lg" onClick={() => router.push('/triage/symptoms')}>
          Check Symptoms Now
        </Button>
        <p className="text-[12px] text-gray-400">
          {pets.length === 0
            ? 'Add a pet first to get started'
            : `${pets.length} pet${pets.length !== 1 ? 's' : ''} in your account`}
        </p>
      </main>
      <BottomTabBar />
    </div>
  )
}
