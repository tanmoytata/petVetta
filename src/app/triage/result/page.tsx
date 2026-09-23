'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, MapPin, Bookmark, Share2, ChevronRight, AlertTriangle } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TRIAGE_CONFIG, type TriageLevel } from '@/types'
import { usePetStore } from '@/store'
import { timeAgo } from '@/lib/utils'

interface TriageResult {
  triageLevel: TriageLevel
  headline: string
  aiResponse: string
  aiModelUsed: string
  confidenceScore: number
  contextDocsUsed: number
  petId: string
}

const TRIAGE_ACTIONS: Record<TriageLevel, { primary: string; secondary?: string; icon: string }> = {
  EMERGENCY: { primary: 'Call Emergency Vet',  secondary: 'Find Emergency Clinic', icon: '🚨' },
  VET_SOON:  { primary: 'Find Nearby Vet',     secondary: 'Save to Records',       icon: '⚠️' },
  MONITOR:   { primary: 'Set Reminder',        secondary: 'Save to Records',       icon: '👁️' },
  HOME_CARE: { primary: 'Save to Records',     secondary: 'More Guidance',         icon: '🏠' },
}

export default function TriageResultPage() {
  const router = useRouter()
  const { pets } = usePetStore()
  const [result, setResult] = useState<TriageResult | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('triageResult')
    if (stored) {
      try {
        setResult(JSON.parse(stored))
      } catch {
        router.push('/triage/symptoms')
      }
    } else {
      router.push('/triage/symptoms')
    }
  }, [])

  if (!result) return null

  const cfg = TRIAGE_CONFIG[result.triageLevel]
  const actions = TRIAGE_ACTIONS[result.triageLevel]
  const pet = pets.find((p) => p.id === result.petId)

  const confidencePct = Math.round(result.confidenceScore * 100)

  // Format AI response (convert markdown-ish to readable blocks)
  const formatResponse = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-[#2c3e50] mt-3 mb-1">{line.slice(2, -2)}</p>
      }
      if (line.startsWith('• ')) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1">
            <span className="text-[#2980b9] mt-0.5 flex-shrink-0">•</span>
            <span className="text-[14px] text-[#2c3e50]">{line.slice(2)}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} className="h-2" />
      return <p key={i} className="text-[14px] text-[#2c3e50] leading-relaxed">{line}</p>
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Triage Result" showBack backHref="/triage/symptoms" />

      <main className="page-container pt-[72px]">
        {/* Triage Level Banner */}
        <div
          className={`rounded-2xl overflow-hidden shadow-md mb-4`}
          style={{ border: `2px solid ${cfg.color}` }}
          role="region"
          aria-label={`Triage level: ${cfg.label}`}
          aria-live="polite"
        >
          {/* Banner Header */}
          <div
            className="px-4 py-4 flex items-center gap-3"
            style={{ backgroundColor: cfg.color }}
          >
            <span className="text-3xl" role="img" aria-hidden="true">{actions.icon}</span>
            <div>
              <p className={`text-[22px] font-bold ${cfg.textColor}`}>{cfg.label}</p>
              <p className={`text-[13px] opacity-90 ${cfg.textColor}`}>{cfg.action}</p>
            </div>
          </div>

          {/* Pet Info */}
          {pet && (
            <div className="px-4 py-3 bg-white border-b border-gray-100">
              <p className="text-[13px] text-[#555555]">
                <strong>{pet.name}</strong>
                {pet.breed ? ` (${pet.breed})` : ''} · {result.headline}
              </p>
            </div>
          )}

          {/* AI Response */}
          <div className="px-4 py-4 bg-white">
            {formatResponse(result.aiResponse)}
          </div>

          {/* Confidence */}
          <div className="px-4 pb-3 bg-white flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${confidencePct}%`, backgroundColor: cfg.color }}
              />
            </div>
            <span className="text-[11px] text-[#555555]">{confidencePct}% confidence</span>
          </div>

          {/* Disclaimer */}
          <div className="px-4 pb-4 bg-white">
            <div className="flex items-start gap-2 border-t pt-3">
              <AlertTriangle size={14} className="text-[#e67e22] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-gray-500 italic leading-relaxed">
                AI-generated guidance — NOT a veterinary diagnosis. Always consult a licensed
                veterinarian for proper diagnosis and treatment.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-5">
          {result.triageLevel === 'EMERGENCY' && (
            <a href="tel:+911" className="block">
              <Button variant="danger" fullWidth size="lg" className="gap-2">
                <Phone size={18} /> Call Emergency Vet NOW
              </Button>
            </a>
          )}

          <Button
            fullWidth
            size="md"
            variant={result.triageLevel === 'EMERGENCY' ? 'secondary' : 'primary'}
            onClick={() => router.push('/health/vets')}
            className="gap-2"
          >
            <MapPin size={16} /> Find Nearby Vet
          </Button>

          {!saved && (
            <Button
              variant="secondary"
              fullWidth
              size="md"
              onClick={() => setSaved(true)}
              className="gap-2"
            >
              <Bookmark size={16} /> Save to Records
            </Button>
          )}

          {saved && (
            <Card variant="info" className="text-center py-2">
              <p className="text-[13px] text-[#27ae60] font-semibold">✓ Saved to health records</p>
            </Card>
          )}
        </div>

        {/* Start New Check */}
        <div className="text-center">
          <button
            onClick={() => {
              sessionStorage.removeItem('triageResult')
              router.push('/triage/symptoms')
            }}
            className="text-[#2980b9] text-sm font-semibold min-h-[44px] px-4"
          >
            + Start New Check
          </button>
        </div>
      </main>

      <BottomTabBar />
    </div>
  )
}
