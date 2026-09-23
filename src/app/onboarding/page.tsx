'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const slides = [
  {
    emoji: '🐾',
    title: 'Pet Health at Your Fingertips',
    description:
      'Get instant AI-powered health guidance for your pet — any time, anywhere. No more guessing if a symptom is serious.',
  },
  {
    emoji: '🩺',
    title: 'AI-Powered Triage in 3 Taps',
    description:
      'Describe the symptoms, get an expert-level assessment in seconds. We tell you exactly what to do — from home care to emergency.',
  },
  {
    emoji: '🏥',
    title: 'Expert Guidance + Vet Connection',
    description:
      'Backed by veterinary knowledge. Seamlessly connects you to trusted vets nearby when your pet needs professional care.',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev < slides.length - 1 ? prev + 1 : prev))
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const handleNext = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1)
    } else {
      router.push('/auth/signup')
    }
  }

  const handleSkip = () => router.push('/auth/login')

  return (
    <div
      className="min-h-screen bg-[#1a2e4a] flex flex-col max-w-[480px] mx-auto"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (diff > 50 && current < slides.length - 1) setCurrent(current + 1)
        if (diff < -50 && current > 0) setCurrent(current - 1)
      }}
    >
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-gray-400 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-end pr-2"
        >
          Skip
        </button>
      </div>

      {/* Logo */}
      <div className="flex justify-center pt-4 pb-8">
        <span className="text-3xl font-bold text-white">
          pet<span className="text-[#16a085]">Vetta</span>
        </span>
      </div>

      {/* Slide */}
      <div className="flex-1 flex flex-col items-center px-8 text-center">
        <div className="text-8xl mb-8 select-none" role="img" aria-label={slides[current].title}>
          {slides[current].emoji}
        </div>
        <h2 className="text-[24px] font-bold text-white mb-4 leading-tight">
          {slides[current].title}
        </h2>
        <p className="text-[15px] text-gray-300 leading-relaxed max-w-xs">
          {slides[current].description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 py-8" role="tablist" aria-label="Slide indicators">
        {slides.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 min-w-[8px] min-h-[8px] ${
              i === current ? 'w-6 h-2.5 bg-[#16a085]' : 'w-2.5 h-2.5 bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-12 space-y-3">
        <Button
          variant="success"
          fullWidth
          size="lg"
          onClick={handleNext}
          className="bg-[#16a085] hover:bg-teal-700"
        >
          {current < slides.length - 1 ? (
            <>Next <ChevronRight size={18} /></>
          ) : (
            'Get Started'
          )}
        </Button>
        {current === slides.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full text-center text-gray-400 text-sm py-3 min-h-[44px]"
          >
            Already have an account? Log in
          </button>
        )}
      </div>
    </div>
  )
}
