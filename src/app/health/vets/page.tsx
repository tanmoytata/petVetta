'use client'

import { useEffect, useState, useRef } from 'react'
import { MapPin, Phone, Star, Bookmark, Navigation } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface VetPlace {
  place_id: string
  name: string
  vicinity: string
  rating?: number
  user_ratings_total?: number
  opening_hours?: { open_now: boolean }
  geometry: { location: { lat: number; lng: number } }
  is_emergency?: boolean
  phone?: string
}

export default function VetFinderPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [vets, setVets] = useState<VetPlace[]>([])
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const getLocation = () => {
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLoading(false)
        searchVets(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        toast.error('Unable to get your location. Please enter a city name.')
        setLocationLoading(false)
      },
      { timeout: 10000 }
    )
  }

  const searchVets = async (lat?: number, lng?: number, cityQuery?: string) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const params = new URLSearchParams()
      if (lat && lng) { params.set('lat', String(lat)); params.set('lng', String(lng)) }
      if (cityQuery) params.set('query', cityQuery)
      params.set('type', 'veterinary_care')
      params.set('radius', '5000')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vet-search?${params}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      )

      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setVets(data.results ?? [])
    } catch {
      toast.error('Could not find vets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) searchVets(undefined, undefined, query)
  }

  const saveVet = async (vet: VetPlace) => {
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('vet_locations').insert({
        user_id: user.id,
        google_place_id: vet.place_id,
        name: vet.name,
        address: vet.vicinity,
        latitude: vet.geometry.location.lat,
        longitude: vet.geometry.location.lng,
        rating: vet.rating,
        is_emergency_clinic: vet.is_emergency ?? false,
        is_my_primary_vet: false,
      })
      setSavedIds((prev) => new Set([...prev, vet.place_id]))
      toast.success(`${vet.name} saved to your vet list!`)
    } catch {
      toast.error('Failed to save vet.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Find a Vet" showBack backHref="/health" />

      <main className="page-container pt-[72px]">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by city or area..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="md" loading={loading && !!query} className="flex-shrink-0">
              Search
            </Button>
          </div>
        </form>

        <Button
          variant="secondary"
          fullWidth
          size="md"
          onClick={getLocation}
          loading={locationLoading}
          className="gap-2 mb-5"
        >
          <Navigation size={16} /> Use My Location
        </Button>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : vets.length === 0 && !loading ? (
          <Card className="text-center py-10">
            <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-[#555555] text-sm">
              {userLocation
                ? 'No vets found nearby. Try a wider search.'
                : 'Search for vets by location or use GPS.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {vets.map((vet) => (
              <Card key={vet.place_id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[14px] text-[#1a2e4a]">{vet.name}</h3>
                      {vet.is_emergency && (
                        <span className="text-[10px] bg-[#c0392b] text-white px-1.5 py-0.5 rounded font-bold">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#555555] flex items-start gap-1 mt-0.5">
                      <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                      {vet.vicinity}
                    </p>
                    {vet.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={12} className="text-[#f1c40f] fill-[#f1c40f]" />
                        <span className="text-[12px] text-[#555555]">
                          {vet.rating} ({vet.user_ratings_total ?? 0} reviews)
                        </span>
                      </div>
                    )}
                    {vet.opening_hours && (
                      <span className={`text-[11px] font-semibold ${vet.opening_hours.open_now ? 'text-[#27ae60]' : 'text-[#c0392b]'}`}>
                        {vet.opening_hours.open_now ? '● Open Now' : '● Closed'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => saveVet(vet)}
                    disabled={savedIds.has(vet.place_id)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
                    aria-label={savedIds.has(vet.place_id) ? 'Saved' : 'Save vet'}
                  >
                    <Bookmark
                      size={18}
                      className={savedIds.has(vet.place_id) ? 'text-[#2980b9] fill-[#2980b9]' : 'text-gray-400'}
                    />
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  {vet.phone && (
                    <a href={`tel:${vet.phone}`} className="flex-1">
                      <Button variant="secondary" size="sm" fullWidth className="gap-1">
                        <Phone size={14} /> Call
                      </Button>
                    </a>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${vet.geometry.location.lat},${vet.geometry.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="ghost" size="sm" fullWidth className="gap-1">
                      <MapPin size={14} /> Directions
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </div>
  )
}
