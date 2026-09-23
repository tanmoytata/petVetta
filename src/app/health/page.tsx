'use client'

import Link from 'next/link'
import { Heart, UtensilsCrossed, MapPin, Syringe } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'

const sections = [
  { label: 'Health Records',    icon: Heart,            href: '/health/records',      color: '#2980b9', description: 'Vet visits, medications, history' },
  { label: 'Food Safety',       icon: UtensilsCrossed,  href: '/health/food',         color: '#27ae60', description: 'Check if food is safe for your pet' },
  { label: 'Find a Vet',        icon: MapPin,           href: '/health/vets',         color: '#e67e22', description: 'Locate nearby veterinary clinics' },
  { label: 'Vaccinations',      icon: Syringe,          href: '/health/vaccinations', color: '#16a085', description: 'Track vaccination schedule & reminders' },
]

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader />
      <main className="page-container pt-[72px]">
        <h1 className="section-heading">Health</h1>
        <div className="space-y-3">
          {sections.map(({ label, icon: Icon, href, color, description }) => (
            <Link key={href} href={href}>
              <Card className="flex items-center gap-4 hover:shadow-md transition-shadow">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}1A` }}
                >
                  <Icon size={24} style={{ color }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-[#1a2e4a] text-[15px]">{label}</h2>
                  <p className="text-[12px] text-[#555555]">{description}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Card>
            </Link>
          ))}
        </div>
      </main>
      <BottomTabBar />
    </div>
  )
}
