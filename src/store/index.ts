import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Pet, Subscription, TriageSession } from '@/types'

// ==========================================
// AUTH STORE
// ==========================================
interface AuthState {
  profile: Profile | null
  subscription: Subscription | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setSubscription: (sub: Subscription | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      subscription: null,
      isLoading: true,
      setProfile: (profile) => set({ profile }),
      setSubscription: (subscription) => set({ subscription }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ profile: null, subscription: null, isLoading: false }),
    }),
    {
      name: 'petvetta-auth',
      partialize: (state) => ({
        profile: state.profile,
        subscription: state.subscription,
      }),
    }
  )
)

// ==========================================
// PET STORE
// ==========================================
interface PetState {
  pets: Pet[]
  activePet: Pet | null
  setPets: (pets: Pet[]) => void
  setActivePet: (pet: Pet | null) => void
  addPet: (pet: Pet) => void
  updatePet: (pet: Pet) => void
  removePet: (petId: string) => void
}

export const usePetStore = create<PetState>()(
  persist(
    (set) => ({
      pets: [],
      activePet: null,
      setPets: (pets) => set({ pets }),
      setActivePet: (activePet) => set({ activePet }),
      addPet: (pet) => set((s) => ({ pets: [...s.pets, pet] })),
      updatePet: (pet) =>
        set((s) => ({ pets: s.pets.map((p) => (p.id === pet.id ? pet : p)) })),
      removePet: (petId) =>
        set((s) => ({
          pets: s.pets.filter((p) => p.id !== petId),
          activePet: s.activePet?.id === petId ? null : s.activePet,
        })),
    }),
    {
      name: 'petvetta-pets',
    }
  )
)

// ==========================================
// UI STORE
// ==========================================
interface Toast {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  duration?: number
}

interface UIState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? (toast.type === 'error' ? 0 : toast.type === 'warning' ? 4000 : 3000)
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))

// ==========================================
// TRIAGE STORE
// ==========================================
interface TriageState {
  recentSessions: TriageSession[]
  currentSession: Partial<TriageSession> | null
  setRecentSessions: (sessions: TriageSession[]) => void
  setCurrentSession: (session: Partial<TriageSession> | null) => void
}

export const useTriageStore = create<TriageState>((set) => ({
  recentSessions: [],
  currentSession: null,
  setRecentSessions: (recentSessions) => set({ recentSessions }),
  setCurrentSession: (currentSession) => set({ currentSession }),
}))
