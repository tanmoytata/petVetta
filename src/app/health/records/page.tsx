'use client'

import { useEffect, useState } from 'react'
import { Plus, Heart, Pill, Scale, FileText, Trash2 } from 'lucide-react'
import { TopHeader } from '@/components/layout/TopHeader'
import { BottomTabBar } from '@/components/layout/BottomTabBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { usePetStore } from '@/store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { HealthRecord, Medication, WeightEntry, Pet } from '@/types'
import { formatDate } from '@/lib/utils'

type Tab = 'visits' | 'medications' | 'weight'

export default function HealthRecordsPage() {
  const toast = useToast()
  const { pets } = usePetStore()
  const [selectedPet, setSelectedPet] = useState<Pet | null>(pets[0] ?? null)
  const [activeTab, setActiveTab] = useState<Tab>('visits')
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (!selectedPet) return
    const load = async () => {
      const supabase = getSupabaseClient()
      const [recRes, medRes, wRes] = await Promise.all([
        supabase.from('health_records').select('*').eq('pet_id', selectedPet.id).order('visit_date', { ascending: false }),
        supabase.from('medications').select('*').eq('pet_id', selectedPet.id).order('created_at', { ascending: false }),
        supabase.from('weight_entries').select('*').eq('pet_id', selectedPet.id).order('measured_date', { ascending: false }),
      ])
      setRecords(recRes.data ?? [])
      setMedications(medRes.data ?? [])
      setWeights(wRes.data ?? [])
    }
    load()
  }, [selectedPet])

  const addWeight = async () => {
    if (!newWeight || !selectedPet) return
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('weight_entries')
        .insert({ pet_id: selectedPet.id, user_id: user?.id, weight_kg: parseFloat(newWeight), measured_date: weightDate })
        .select()
        .single()
      if (error) throw error
      setWeights((prev) => [data, ...prev])
      setNewWeight('')
      toast.success('Weight logged!')
    } catch {
      toast.error('Failed to log weight.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'visits',      label: 'Visits',      icon: Heart  },
    { id: 'medications', label: 'Medications',  icon: Pill   },
    { id: 'weight',      label: 'Weight',       icon: Scale  },
  ] as const

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <TopHeader title="Health Records" showBack backHref="/health" />
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
                    ? 'border-[#2980b9] bg-[#2980b9]/10 text-[#2980b9]'
                    : 'border-gray-200 text-[#555555]'
                }`}
              >
                {pet.species === 'dog' ? '🐕' : '🐈'} {pet.name}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold border-b-2 transition-colors min-h-[44px] ${
                activeTab === id
                  ? 'border-[#2980b9] text-[#2980b9]'
                  : 'border-transparent text-gray-400'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {!selectedPet ? (
          <Card className="text-center py-8">
            <p className="text-[#555555] text-sm">Add a pet first to manage health records.</p>
          </Card>
        ) : (
          <>
            {/* Vet Visits */}
            {activeTab === 'visits' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-heading !mb-0">Vet Visits</h2>
                  <Button size="sm" onClick={() => setShowForm(!showForm)}>
                    <Plus size={14} /> Add
                  </Button>
                </div>

                {showForm && (
                  <AddVisitForm
                    petId={selectedPet.id}
                    onSave={(rec) => {
                      setRecords((prev) => [rec, ...prev])
                      setShowForm(false)
                      toast.success('Visit record saved!')
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                )}

                {records.length === 0 ? (
                  <Card className="text-center py-8">
                    <FileText size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[#555555] text-sm">No vet visits recorded yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {records.map((r) => (
                      <Card key={r.id}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-[14px] text-[#2c3e50]">
                              {r.record_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </p>
                            <p className="text-[12px] text-[#555555]">{formatDate(r.visit_date)}</p>
                            {r.clinic_name && <p className="text-[12px] text-[#555555]">{r.clinic_name}</p>}
                            {r.diagnosis && <p className="text-[13px] text-[#2c3e50] mt-1">{r.diagnosis}</p>}
                          </div>
                          {r.cost_amount && (
                            <span className="text-[12px] font-semibold text-[#555555]">
                              ₹{r.cost_amount}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medications */}
            {activeTab === 'medications' && (
              <div>
                <h2 className="section-heading">Active Medications</h2>
                {medications.filter((m) => m.is_active).length === 0 ? (
                  <Card className="text-center py-8">
                    <Pill size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[#555555] text-sm">No active medications.</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {medications.filter((m) => m.is_active).map((med) => (
                      <Card key={med.id}>
                        <p className="font-semibold text-[14px] text-[#2c3e50]">{med.medication_name}</p>
                        {med.dosage && <p className="text-[12px] text-[#555555]">Dose: {med.dosage}</p>}
                        {med.frequency && <p className="text-[12px] text-[#555555]">Frequency: {med.frequency}</p>}
                        {med.prescribed_by && <p className="text-[12px] text-[#555555]">Vet: {med.prescribed_by}</p>}
                        {med.end_date && (
                          <p className="text-[12px] text-[#555555]">Until: {formatDate(med.end_date)}</p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Weight Tracking */}
            {activeTab === 'weight' && (
              <div>
                <h2 className="section-heading">Weight History</h2>

                <Card className="mb-4">
                  <p className="text-[13px] font-medium text-[#2c3e50] mb-2">Log Weight</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="kg"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] focus:border-[#2980b9] focus:outline-none min-h-[44px]"
                      aria-label="Weight in kg"
                    />
                    <input
                      type="date"
                      value={weightDate}
                      onChange={(e) => setWeightDate(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] focus:border-[#2980b9] focus:outline-none min-h-[44px]"
                    />
                    <Button size="sm" loading={loading} onClick={addWeight} className="flex-shrink-0">
                      Log
                    </Button>
                  </div>
                </Card>

                {weights.length === 0 ? (
                  <Card className="text-center py-8">
                    <Scale size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[#555555] text-sm">No weight entries yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {weights.map((w) => (
                      <Card key={w.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[15px] text-[#2c3e50]">{w.weight_kg} kg</p>
                          {w.notes && <p className="text-[12px] text-[#555555]">{w.notes}</p>}
                        </div>
                        <span className="text-[12px] text-[#555555]">{formatDate(w.measured_date)}</span>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <BottomTabBar />
    </div>
  )
}

// ---- Add Visit Form ----
function AddVisitForm({
  petId,
  onSave,
  onCancel,
}: {
  petId: string
  onSave: (rec: HealthRecord) => void
  onCancel: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    record_type: 'vet_visit' as HealthRecord['record_type'],
    visit_date: new Date().toISOString().split('T')[0],
    clinic_name: '',
    vet_name: '',
    diagnosis: '',
    treatment: '',
    cost_amount: '',
    follow_up_date: '',
    notes: '',
  })

  const save = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('health_records')
        .insert({
          pet_id: petId,
          user_id: user?.id,
          record_type: form.record_type,
          visit_date: form.visit_date,
          clinic_name: form.clinic_name || undefined,
          vet_name: form.vet_name || undefined,
          diagnosis: form.diagnosis || undefined,
          treatment: form.treatment || undefined,
          cost_amount: form.cost_amount ? parseFloat(form.cost_amount) : undefined,
          follow_up_date: form.follow_up_date || undefined,
          notes: form.notes || undefined,
        })
        .select()
        .single()
      if (error) throw error
      onSave(data)
    } catch {
      // handled by parent
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-4 space-y-3">
      <h3 className="font-bold text-[#1a2e4a]">New Visit Record</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[13px] font-medium text-[#2c3e50] block mb-1">Type</label>
          <select
            value={form.record_type}
            onChange={(e) => setForm({ ...form, record_type: e.target.value as HealthRecord['record_type'] })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[14px] focus:border-[#2980b9] focus:outline-none min-h-[44px]"
          >
            {['vet_visit', 'illness', 'surgery', 'grooming', 'other'].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <Input label="Visit Date" type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
      </div>
      <Input label="Clinic" value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} />
      <Input label="Diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
      <Input label="Treatment" value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Cost (₹)" type="number" value={form.cost_amount} onChange={(e) => setForm({ ...form, cost_amount: e.target.value })} />
        <Input label="Follow-up" type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <Button size="md" loading={loading} onClick={save} className="flex-1">Save Record</Button>
        <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </Card>
  )
}
