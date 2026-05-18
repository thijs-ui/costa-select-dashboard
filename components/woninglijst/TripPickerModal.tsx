'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Loader2, Route as RouteIcon, Calendar } from 'lucide-react'

interface Trip {
  id: string
  client_name: string
  trip_date: string
  start_time: string
  status: 'concept' | 'gepland' | 'afgerond'
  stop_count: number
}

// Shape van shortlist_items zoals doorgestuurd vanuit /woninglijst.
export interface ShortlistItemForTrip {
  id: string
  title: string
  url: string | null
  price: number | null
  location: string | null
  notities: string | null
}

interface Props {
  items: ShortlistItemForTrip[] | null
  klantNaam: string
  onClose: () => void
}

// Map shortlist_item → viewing_stop. address is verplicht voor geocoding
// dus we vallen terug op title + location als location leeg is. Consultant
// kan adres daarna via EditStopModal scherpstellen.
function mapToStopBody(item: ShortlistItemForTrip, tripId: string) {
  const address = item.location?.trim() || item.title?.trim() || 'Onbekend adres'
  return {
    trip_id: tripId,
    address,
    property_title: item.title || null,
    listing_url: item.url || null,
    price: item.price ?? null,
    viewing_duration_minutes: 30,
    contact_name: null,
    contact_phone: null,
    notes: item.notities || null,
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TripPickerModal({ items, klantNaam, onClose }: Props) {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [newDate, setNewDate] = useState<string>(todayISO())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!items || items.length === 0) return
    setError('')
    setSaving(null)
    setNewDate(todayISO())
    setLoading(true)
    fetch('/api/bezichtigingen', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(data => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [items])

  if (!items || items.length === 0) return null

  async function pushItems(tripId: string) {
    if (!items) return
    // Stops worden sequentieel toegevoegd zodat sort_order strikt loopt
    // (POST /stops bepaalt next via max(sort_order)+1). Parallel zou
    // hetzelfde nummer kunnen toekennen.
    for (const item of items) {
      const res = await fetch('/api/bezichtigingen/stops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapToStopBody(item, tripId)),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Stop toevoegen mislukt')
      }
    }
  }

  async function addToExisting(tripId: string) {
    setSaving(tripId)
    setError('')
    try {
      await pushItems(tripId)
      onClose()
      router.push(`/bezichtigingen/${tripId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mislukt')
      setSaving(null)
    }
  }

  async function createAndPush() {
    if (!newDate) return
    setSaving('__new')
    setError('')
    try {
      const tripRes = await fetch('/api/bezichtigingen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: klantNaam,
          trip_date: newDate,
        }),
      })
      if (!tripRes.ok) {
        const d = await tripRes.json().catch(() => ({}))
        throw new Error(d.error || 'Trip aanmaken mislukt')
      }
      const { id } = await tripRes.json()
      if (!id) throw new Error('Geen trip-id terug')
      await pushItems(id)
      onClose()
      router.push(`/bezichtigingen/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mislukt')
      setSaving(null)
    }
  }

  return (
    <div
      className="wl-anim-fade-in fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(7,42,36,0.38)', backdropFilter: 'blur(3px)', padding: 24 }}
      onClick={onClose}
    >
      <div
        className="wl-anim-modal-in bg-white w-full overflow-hidden"
        style={{
          maxWidth: 560, borderRadius: 16, boxShadow: '0 20px 60px rgba(7,42,36,0.3)',
          display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex justify-between items-start"
          style={{ padding: '22px 24px 14px', borderBottom: '1px solid rgba(0,75,70,0.08)' }}
        >
          <div className="min-w-0">
            <div
              className="font-body font-bold uppercase text-sun-dark"
              style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 6 }}
            >
              Bezichtigingsdag
            </div>
            <h3
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px' }}
            >
              Plan voor {klantNaam}
            </h3>
            <div
              className="font-body"
              style={{ fontSize: 12.5, color: '#5F7472' }}
            >
              {items.length} woning{items.length === 1 ? '' : 'en'} uit shortlist worden als stops toegevoegd
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-colors"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', color: '#7A8C8B' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E6F0EF'; e.currentTarget.style.color = '#004B46' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7A8C8B' }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 6px', minHeight: 120 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5F7472', fontSize: 13, padding: '8px 0' }}>
              <Loader2 size={14} className="animate-spin" /> Bezichtigingsdagen laden…
            </div>
          )}

          {!loading && trips.length === 0 && (
            <div style={{ padding: '14px 0 6px', fontSize: 13, color: '#5F7472', lineHeight: 1.5 }}>
              Nog geen bezichtigingsdagen. Maak hieronder een nieuwe aan.
            </div>
          )}

          {!loading && trips.length > 0 && (
            <>
              <div style={{
                fontSize: 10, letterSpacing: '0.18em', color: '#7A8C8B',
                textTransform: 'uppercase', marginBottom: 8, fontWeight: 700,
              }}>
                Bestaande dag
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {trips.map(t => {
                  const isSaving = saving === t.id
                  const disabled = saving !== null
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => addToExisting(t.id)}
                        disabled={disabled}
                        className="w-full flex items-center cursor-pointer transition-colors disabled:cursor-not-allowed"
                        style={{
                          gap: 12, padding: '10px 12px', borderRadius: 10,
                          border: '1px solid rgba(0,75,70,0.12)', background: '#fff',
                          textAlign: 'left', opacity: disabled && !isSaving ? 0.45 : 1, fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#E6F0EF'; e.currentTarget.style.borderColor = 'rgba(0,75,70,0.28)' } }}
                        onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)' } }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, background: '#E6F0EF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004B46', flexShrink: 0,
                        }}>
                          <RouteIcon size={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: '#004B46', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.client_name || 'Naamloos'} · {formatDate(t.trip_date)}
                          </div>
                          <div style={{ fontSize: 11, color: '#7A8C8B', marginTop: 1, textTransform: 'capitalize' }}>
                            {t.status} · {t.stop_count} stop{t.stop_count === 1 ? '' : 's'}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, color: '#0A6B5E' }}>
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.25)',
              borderRadius: 8, fontSize: 12.5, color: '#c24040',
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px 18px', borderTop: '1px solid rgba(0,75,70,0.08)', background: '#FAFBFB' }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.18em', color: '#7A8C8B',
            textTransform: 'uppercase', marginBottom: 8, fontWeight: 700,
          }}>
            Nieuwe bezichtigingsdag
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, border: '1px solid rgba(0,75,70,0.18)', borderRadius: 10, padding: '0 11px', background: '#fff' }}>
              <Calendar size={14} strokeWidth={1.8} color="#7A8C8B" />
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                disabled={saving !== null}
                style={{
                  flex: 1, border: 'none', outline: 'none', padding: '9px 0',
                  fontSize: 13, color: '#004B46', background: 'transparent', fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              onClick={createAndPush}
              disabled={!newDate || saving !== null}
              className="inline-flex items-center cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                letterSpacing: '0.02em', gap: 6,
                background: '#004B46', color: '#FFFAEF', border: '1.5px solid #004B46', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#0A6B63'; e.currentTarget.style.borderColor = '#0A6B63' } }}
              onMouseLeave={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#004B46'; e.currentTarget.style.borderColor = '#004B46' } }}
            >
              {saving === '__new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Aanmaken & openen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
