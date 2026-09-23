// ==========================================
// petVetta — Core Types
// ==========================================

export type TriageLevel = 'EMERGENCY' | 'VET_SOON' | 'MONITOR' | 'HOME_CARE'
export type Species = 'dog' | 'cat'
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'family'
export type PaymentProvider = 'razorpay' | 'stripe' | 'free'
export type FoodSafetyResult = 'SAFE' | 'CAUTION' | 'TOXIC' | 'UNKNOWN'

// ==========================================
// USER & AUTH
// ==========================================
export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  phone_country_code: string
  phone_number?: string
  country: string
  currency: string
  preferred_lang: string
  created_at: string
  updated_at: string
}

// ==========================================
// PETS
// ==========================================
export interface Pet {
  id: string
  user_id: string
  name: string
  species: Species
  breed?: string
  date_of_birth?: string
  gender: 'male' | 'female' | 'unknown'
  weight_kg?: number
  photo_url?: string
  microchip_id?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // computed
  age_years?: number
}

// ==========================================
// TRIAGE
// ==========================================
export interface TriageSession {
  id: string
  user_id: string
  pet_id: string
  symptoms_text: string
  duration_hours?: number
  severity_level: 'mild' | 'moderate' | 'severe'
  triage_level: TriageLevel
  ai_response: string
  ai_model_used?: string
  confidence_score?: number
  context_docs_used: number
  disclaimer_shown: boolean
  created_at: string
  // relations
  pet?: Pet
}

export interface TriageRequest {
  petId: string
  symptomsText: string
  durationHours?: number
  severityLevel: 'mild' | 'moderate' | 'severe'
}

export interface TriageResponse {
  triageLevel: TriageLevel
  aiResponse: string
  aiModelUsed: string
  confidenceScore: number
  contextDocsUsed: number
}

// ==========================================
// FOOD SAFETY
// ==========================================
export interface FoodSafetyQuery {
  id: string
  user_id: string
  pet_id?: string
  food_item: string
  species: Species
  safety_result: FoodSafetyResult
  ai_response: string
  ai_model_used?: string
  created_at: string
}

export interface FoodSafetyRequest {
  foodItem: string
  species: Species
  petId?: string
}

// ==========================================
// HEALTH RECORDS
// ==========================================
export type HealthRecordType = 'vet_visit' | 'illness' | 'surgery' | 'grooming' | 'other'

export interface HealthRecord {
  id: string
  pet_id: string
  user_id: string
  record_type: HealthRecordType
  visit_date: string
  vet_name?: string
  clinic_name?: string
  diagnosis?: string
  treatment?: string
  cost_amount?: number
  cost_currency: string
  notes?: string
  follow_up_date?: string
  attachments?: string[]
  created_at: string
  updated_at: string
}

// ==========================================
// MEDICATIONS
// ==========================================
export interface Medication {
  id: string
  pet_id: string
  user_id: string
  medication_name: string
  dosage?: string
  frequency?: string
  start_date?: string
  end_date?: string
  prescribed_by?: string
  notes?: string
  is_active: boolean
  created_at: string
}

// ==========================================
// WEIGHT TRACKING
// ==========================================
export interface WeightEntry {
  id: string
  pet_id: string
  user_id: string
  weight_kg: number
  measured_date: string
  notes?: string
  created_at: string
}

// ==========================================
// VACCINATIONS
// ==========================================
export type VaccineType = 'core' | 'non-core' | 'deworming'

export interface Vaccination {
  id: string
  pet_id: string
  user_id: string
  vaccine_name: string
  vaccine_type: VaccineType
  administered_date?: string
  next_due_date?: string
  administered_by?: string
  batch_number?: string
  clinic_name?: string
  reminder_sent: boolean
  notes?: string
  created_at: string
}

// ==========================================
// VET LOCATIONS
// ==========================================
export interface VetLocation {
  id: string
  user_id: string
  google_place_id?: string
  name: string
  address?: string
  phone?: string
  latitude?: number
  longitude?: number
  rating?: number
  is_emergency_clinic?: boolean
  is_my_primary_vet: boolean
  saved_at: string
}

// ==========================================
// SUBSCRIPTIONS & PAYMENTS
// ==========================================
export interface Subscription {
  id: string
  user_id: string
  plan_type: SubscriptionPlan
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  currency: string
  amount_paid?: number
  payment_provider: PaymentProvider
  provider_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface PaymentTransaction {
  id: string
  user_id: string
  subscription_id?: string
  payment_provider: string
  provider_order_id?: string
  provider_payment_id?: string
  amount: number
  currency: string
  status: 'created' | 'captured' | 'failed' | 'refunded'
  payment_method?: string
  failure_reason?: string
  receipt_sent: boolean
  created_at: string
}

// ==========================================
// PLAN LIMITS
// ==========================================
export const PLAN_LIMITS: Record<SubscriptionPlan, { dailyQueries: number; pets: number; label: string; priceINR: number; priceUSD: number }> = {
  free:    { dailyQueries: 3,   pets: 1,  label: 'Free',    priceINR: 0,   priceUSD: 0    },
  basic:   { dailyQueries: 15,  pets: 3,  label: 'Basic',   priceINR: 199, priceUSD: 9.99  },
  premium: { dailyQueries: 50,  pets: 5,  label: 'Premium', priceINR: 499, priceUSD: 19.99 },
  family:  { dailyQueries: 100, pets: 10, label: 'Family',  priceINR: 799, priceUSD: 29.99 },
}

// ==========================================
// TRIAGE UI HELPERS
// ==========================================
export const TRIAGE_CONFIG: Record<TriageLevel, { color: string; bgColor: string; label: string; action: string; textColor: string }> = {
  EMERGENCY: { color: '#c0392b', bgColor: 'bg-[#c0392b]', label: 'EMERGENCY',  action: 'Call Vet NOW',           textColor: 'text-white'         },
  VET_SOON:  { color: '#e67e22', bgColor: 'bg-[#e67e22]', label: 'VET SOON',   action: 'See vet within 24 hours', textColor: 'text-white'         },
  MONITOR:   { color: '#f1c40f', bgColor: 'bg-[#f1c40f]', label: 'MONITOR',    action: 'Watch at home',           textColor: 'text-[#2c3e50]'    },
  HOME_CARE: { color: '#27ae60', bgColor: 'bg-[#27ae60]', label: 'HOME CARE',  action: 'Manageable at home',      textColor: 'text-white'         },
}

// ==========================================
// ANALYTICS EVENTS
// ==========================================
export type AnalyticsEvent =
  | 'user_signup'
  | 'pet_added'
  | 'triage_query'
  | 'triage_result'
  | 'food_check'
  | 'vet_search'
  | 'record_upload'
  | 'upgrade_click'
  | 'payment_attempt'
  | 'payment_success'
  | 'feature_used'
  | 'support_contact'
