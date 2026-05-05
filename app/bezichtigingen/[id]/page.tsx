'use client'

export const dynamic = 'force-dynamic'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  ExternalLink,
  Flag,
  GripVertical,
  Loader2,
  MapPin,
  Plus,
  Play,
  Printer,
  Route as RouteIcon,
  Sparkles,
  Trash2,
  User as UserIcon,
  Utensils,
  Zap,
} from 'lucide-react'
import {
  BzButton,
  BzEyebrow,
  BzHeader,
  CountPill,
  EmptyCard,
} from '@/components/bezichtigingen/atoms'

// ───────── Types ─────────
interface Trip {
  id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  trip_date: string
  start_time: string
  start_address: string | null
  lunch_time: string
  lunch_duration_minutes: number
  notes: string | null
  status: 'concept' | 'gepland' | 'afgerond'
  route_data: RouteData | null
}

interface Stop {
  id: string
  trip_id: string
  sort_order: number
  address: string
  property_title: string | null
  listing_url: string | null
  price: number | null
  viewing_duration_minutes: number
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
  travel_time_minutes: number | null
  estimated_arrival: string | null
}

interface RouteData {
  stops: Array<{
    stop_id: string
    sort_order: number
    estimated_arrival: string
    estimated_departure: string
    travel_time_to_next_minutes: number
  }>
  lunch: { after_stop_order: number; start_time: string; end_time: string }
  total_driving_minutes: number
  estimated_end_time: string
  route_summary: string
}

type SaveState = 'saved' | 'saving' | 'error'

// ───────── Utils ─────────
function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPrice(n: number | null): string {
  if (n == null) return ''
  return '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)
}

function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.substring(0, 5)
}

// Bezichtigings-tijden lopen op halve uren (06:00 t/m 22:00). Voorkomt dat
// consultants per ongeluk 09:17 of 10:42 invoeren waar de klant later
// over struikelt in de itinerary.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 6; h <= 22; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

function diffMinutes(a: string, b: string): number {
  if (!a || !b) return 0
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return Math.max(0, bh * 60 + bm - (ah * 60 + am))
}

// ───────── Page ─────────
export default function BezichtigingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [optimizing, setOptimizing] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [error, setError] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Load ─────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [tripRes, stopsRes] = await Promise.allSettled([
        fetch(`/api/bezichtigingen?id=${id}`, { credentials: 'include', cache: 'no-store' }),
        fetch(`/api/bezichtigingen/stops?trip_id=${id}`, { credentials: 'include', cache: 'no-store' }),
      ])
      if (tripRes.status === 'fulfilled' && tripRes.value.ok) {
        const trips = await tripRes.value.json()
        const found = Array.isArray(trips) ? trips.find((t: Trip) => t.id === id) : null
        setTrip(found ?? null)
      }
      if (stopsRes.status === 'fulfilled' && stopsRes.value.ok) {
        const data = await stopsRes.value.json()
        setStops(Array.isArray(data) ? data : [])
      }
    } catch (e) {
      console.error('[loadData] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ─── Save (debounced) ─────────────────────────
  function pingSave(updates: Partial<Trip>) {
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/bezichtigingen', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
          cache: 'no-store',
        })
        setSaveState(res.ok ? 'saved' : 'error')
      } catch {
        setSaveState('error')
      }
    }, 500)
  }

  function updateTrip(patch: Partial<Trip>) {
    if (!trip) return
    setTrip({ ...trip, ...patch })
    pingSave(patch)
  }

  function changeStatus(status: 'concept' | 'gepland' | 'afgerond') {
    updateTrip({ status })
  }

  // ─── Stop CRUD ────────────────────────────────
  async function addStop(draft: {
    address: string
    property_title: string
    listing_url: string
    price: string
    viewing_duration_minutes: number
    contact_name: string
    contact_phone: string
    notes: string
  }) {
    const res = await fetch('/api/bezichtigingen/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: id,
        address: draft.address.trim(),
        property_title: draft.property_title.trim() || null,
        listing_url: draft.listing_url.trim() || null,
        price: draft.price ? Number(draft.price) : null,
        viewing_duration_minutes: draft.viewing_duration_minutes || 30,
        contact_name: draft.contact_name.trim() || null,
        contact_phone: draft.contact_phone.trim() || null,
        notes: draft.notes.trim() || null,
      }),
      cache: 'no-store',
    })
    if (res.ok) {
      const stop = await res.json()
      setStops(prev => [...prev, stop])
      // Adding a stop invalidates the route
      if (trip?.route_data) {
        setTrip({ ...trip, route_data: null })
      }
    }
  }

  async function deleteStop(stopId: string) {
    await fetch('/api/bezichtigingen/stops', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stopId }),
      cache: 'no-store',
    })
    setStops(prev => prev.filter(s => s.id !== stopId))
    if (trip?.route_data) {
      setTrip({ ...trip, route_data: null })
    }
  }

  // Drag-and-drop reorder: verplaats stop fromIdx → toIdx en persisteer
  // ALLE veranderde sort_orders (een drag kan meerdere posities skippen).
  async function reorderStop(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    if (fromIdx >= stops.length || toIdx >= stops.length) return

    const reordered = [...stops]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const withOrder = reordered.map((s, k) => ({ ...s, sort_order: k + 1 }))
    setStops(withOrder)
    if (trip?.route_data) {
      setTrip({ ...trip, route_data: null })
    }

    // Persist alleen de sort_orders die wijzigen.
    const changed = withOrder.filter((s, k) => s.sort_order !== stops[k]?.sort_order || s.id !== stops[k]?.id)
    await Promise.all(changed.map(s =>
      fetch('/api/bezichtigingen/stops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, sort_order: s.sort_order }),
        cache: 'no-store',
      }),
    ))
  }

  async function moveStop(stopId: string, dir: -1 | 1) {
    const i = stops.findIndex(s => s.id === stopId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= stops.length) return

    const reordered = [...stops]
    ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
    const withOrder = reordered.map((s, k) => ({ ...s, sort_order: k + 1 }))
    setStops(withOrder)
    if (trip?.route_data) {
      setTrip({ ...trip, route_data: null })
    }

    // Persist new sort_order for the two swapped stops in parallel
    await Promise.all([
      fetch('/api/bezichtigingen/stops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: withOrder[i].id, sort_order: withOrder[i].sort_order }),
        cache: 'no-store',
      }),
      fetch('/api/bezichtigingen/stops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: withOrder[j].id, sort_order: withOrder[j].sort_order }),
        cache: 'no-store',
      }),
    ])
  }

  // ─── Route optimize ───────────────────────────
  const canOptimize =
    !!trip &&
    stops.length >= 1 &&
    !!trip.start_address &&
    !!trip.start_time &&
    !!trip.trip_date

  async function optimize() {
    if (!trip || !canOptimize) return
    setOptimizing(true)
    setError('')
    try {
      const res = await fetch('/api/bezichtigingen/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: trip.id,
          start_address: trip.start_address,
          start_time: trip.start_time,
          lunch_time: trip.lunch_time,
          lunch_duration_minutes: trip.lunch_duration_minutes,
          stops: stops.map(s => ({
            id: s.id,
            address: s.address,
            viewing_duration_minutes: s.viewing_duration_minutes,
          })),
        }),
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Mislukt' }))
        throw new Error(data.error || 'Route optimalisatie mislukt')
      }
      const routeData: RouteData = await res.json()
      setTrip(prev => (prev ? { ...prev, route_data: routeData } : null))

      // Update stops with new sort_order + estimated_arrival
      const updated = [...stops]
      for (const rs of routeData.stops) {
        const stop = updated.find(s => s.id === rs.stop_id)
        if (stop) {
          stop.sort_order = rs.sort_order
          stop.estimated_arrival = rs.estimated_arrival
          stop.travel_time_minutes = rs.travel_time_to_next_minutes
        }
      }
      updated.sort((a, b) => a.sort_order - b.sort_order)
      setStops(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route optimalisatie mislukt')
    } finally {
      setOptimizing(false)
    }
  }

  // ─── Render ───────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-marble"
        style={{ height: '100vh', color: '#7A8C8B' }}
      >
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-marble"
        style={{ height: '100vh' }}
      >
        <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', marginBottom: 12 }}>
          Bezichtigingsdag niet gevonden.
        </p>
        <BzButton variant="ghost" onClick={() => router.push('/bezichtigingen')}>
          <ArrowLeft size={14} strokeWidth={2} /> Terug naar overzicht
        </BzButton>
      </div>
    )
  }

  const route = trip.route_data
  const subtitle = route
    ? `Geoptimaliseerde route · eindigt om ${route.estimated_end_time}`
    : 'Vul de details in en optimaliseer de route om reistijden en aankomsttijden te berekenen.'

  return (
    <div
      className="bz-print-page flex flex-col bg-marble"
      style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}
    >
      <BzHeader>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => router.push('/bezichtigingen')}
            className="bz-print-hide inline-flex items-center font-body font-semibold uppercase cursor-pointer transition-colors"
            style={{
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 11.5,
              color: '#7A8C8B',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#004B46')}
            onMouseLeave={e => (e.currentTarget.style.color = '#7A8C8B')}
          >
            <ArrowLeft size={13} strokeWidth={2} /> Bezichtigingsdagen
          </button>
          <BzEyebrow>
            {formatDate(trip.trip_date)} · {formatTime(trip.start_time)}
          </BzEyebrow>
          <h1
            className="font-heading font-bold text-deepsea"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
          >
            {trip.client_name || 'Nieuwe bezichtigingsdag'}
            <CountPill>
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
            </CountPill>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 13, color: '#7A8C8B', margin: 0, maxWidth: 700 }}
          >
            {subtitle}
          </p>
        </div>
        <div className="bz-print-hide flex items-center" style={{ gap: 10 }}>
          <SaveIndicator state={saveState} />
          <StatusSelect status={trip.status} onChange={changeStatus} />
        </div>
      </BzHeader>

      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: '22px 36px 60px' }}>
          <div
            className="bz-print-grid grid"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {/* LEFT COLUMN — form + stops */}
            <div className="bz-print-hide">
              <TripForm trip={trip} onChange={updateTrip} />
              <StopsCard
                stops={stops}
                customerName={trip.client_name}
                onAdd={addStop}
                onDelete={deleteStop}
                onMove={moveStop}
                onReorder={reorderStop}
              />
            </div>

            {/* RIGHT COLUMN — actions + timeline */}
            <div>
              <div
                className="bz-print-hide flex flex-wrap"
                style={{ gap: 8, marginBottom: 16 }}
              >
                <BzButton
                  variant="sun"
                  disabled={!canOptimize || optimizing}
                  onClick={optimize}
                  className="flex-1"
                >
                  {optimizing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" strokeWidth={2} /> Route berekenen…
                    </>
                  ) : (
                    <>
                      <Zap size={14} strokeWidth={2} /> {route ? 'Opnieuw optimaliseren' : 'Optimaliseer route'}
                    </>
                  )}
                </BzButton>
                <BzButton
                  variant="ghost"
                  disabled={!route}
                  onClick={() => window.print()}
                  className="flex-1"
                >
                  <Printer size={14} strokeWidth={2} /> Print
                </BzButton>
              </div>

              {!canOptimize && (
                <div
                  className="bz-print-hide flex items-center"
                  style={{
                    marginBottom: 14,
                    padding: '10px 14px',
                    background: 'rgba(224,82,82,0.1)',
                    border: '1px solid rgba(224,82,82,0.25)',
                    borderRadius: 10,
                    fontSize: 12.5,
                    color: '#c24040',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                  Vul klantnaam, datum, starttijd, startadres en minstens 1 stop in om te optimaliseren.
                </div>
              )}

              {error && (
                <div
                  className="bz-print-hide flex items-center"
                  style={{
                    marginBottom: 14,
                    padding: '10px 14px',
                    background: 'rgba(224,82,82,0.1)',
                    border: '1px solid rgba(224,82,82,0.25)',
                    borderRadius: 10,
                    fontSize: 12.5,
                    color: '#c24040',
                    gap: 8,
                  }}
                >
                  <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
                  {error}
                </div>
              )}

              <Timeline trip={trip} stops={stops} route={route} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═════════ Save indicator ═════════
function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      className="inline-flex items-center font-body"
      style={{
        gap: 5,
        fontSize: 11,
        color: state === 'error' ? '#c24040' : '#7A8C8B',
      }}
    >
      {state === 'saving' ? (
        <>
          <Loader2 size={12} className="animate-spin" strokeWidth={2.4} />
          Opslaan…
        </>
      ) : state === 'error' ? (
        <>
          <AlertCircle size={12} strokeWidth={2.4} /> Niet opgeslagen
        </>
      ) : (
        <>
          <Check size={12} strokeWidth={2.4} color="#10b981" />
          <span style={{ color: '#7A8C8B' }}>Opgeslagen</span>
        </>
      )}
    </span>
  )
}

// ═════════ Status select ═════════
function StatusSelect({
  status,
  onChange,
}: {
  status: 'concept' | 'gepland' | 'afgerond'
  onChange: (status: 'concept' | 'gepland' | 'afgerond') => void
}) {
  return (
    <div className="relative inline-block">
      <select
        value={status}
        onChange={e => onChange(e.target.value as 'concept' | 'gepland' | 'afgerond')}
        className="font-body font-semibold cursor-pointer transition-colors"
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: '#FFFFFF',
          border: '1.5px solid rgba(0,75,70,0.18)',
          borderRadius: 10,
          padding: '8px 36px 8px 14px',
          fontSize: 12,
          color: '#004B46',
        }}
      >
        <option value="concept">Concept</option>
        <option value="gepland">Gepland</option>
        <option value="afgerond">Afgerond</option>
      </select>
      <span
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          width: 8,
          height: 8,
          borderRight: '1.8px solid #004B46',
          borderBottom: '1.8px solid #004B46',
          transform: 'translateY(-75%) rotate(45deg)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

// ═════════ Trip form ═════════
function TripForm({
  trip,
  onChange,
}: {
  trip: Trip
  onChange: (patch: Partial<Trip>) => void
}) {
  return (
    <Card>
      <CardTitle icon={<UserIcon size={16} strokeWidth={1.8} />}>
        <span>Klant & dag</span>
      </CardTitle>
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}
      >
        <Field label="Klantnaam" required colFull>
          <BzInput
            value={trip.client_name || ''}
            onChange={e => onChange({ client_name: e.target.value })}
          />
        </Field>
        <Field label="E-mail">
          <BzInput
            type="email"
            value={trip.client_email || ''}
            placeholder="klant@email.com"
            onChange={e => onChange({ client_email: e.target.value })}
          />
        </Field>
        <Field label="Telefoon">
          <BzInput
            value={trip.client_phone || ''}
            placeholder="+31 ..."
            onChange={e => onChange({ client_phone: e.target.value })}
          />
        </Field>
        <Field label="Datum" required>
          <BzInput
            type="date"
            value={trip.trip_date || ''}
            onChange={e => onChange({ trip_date: e.target.value })}
          />
        </Field>
        <Field label="Starttijd">
          <BzSelect
            value={formatTime(trip.start_time)}
            onChange={e => onChange({ start_time: e.target.value })}
          >
            {!TIME_OPTIONS.includes(formatTime(trip.start_time)) && trip.start_time && (
              <option value={formatTime(trip.start_time)}>{formatTime(trip.start_time)}</option>
            )}
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </BzSelect>
        </Field>
        <Field label="Startadres / hotel" colFull>
          <BzInput
            value={trip.start_address || ''}
            placeholder="Adres of hotel waar de klant verblijft"
            onChange={e => onChange({ start_address: e.target.value })}
          />
        </Field>
        <Field label="Lunchpauze">
          <BzSelect
            value={formatTime(trip.lunch_time)}
            onChange={e => onChange({ lunch_time: e.target.value })}
          >
            {!TIME_OPTIONS.includes(formatTime(trip.lunch_time)) && trip.lunch_time && (
              <option value={formatTime(trip.lunch_time)}>{formatTime(trip.lunch_time)}</option>
            )}
            {TIME_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </BzSelect>
        </Field>
        <Field label="Lunchduur">
          <BzSelect
            value={String(trip.lunch_duration_minutes || 60)}
            onChange={e =>
              onChange({ lunch_duration_minutes: Number(e.target.value) })
            }
          >
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </BzSelect>
        </Field>
        <Field label="Interne notities" colFull>
          <BzTextarea
            value={trip.notes || ''}
            placeholder="Wensen, budget, type woning..."
            onChange={e => onChange({ notes: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  )
}

// ═════════ Stops card ═════════
interface StopDraft {
  address: string
  property_title: string
  listing_url: string
  price: string
  viewing_duration_minutes: number
  contact_name: string
  contact_phone: string
  notes: string
}

const EMPTY_DRAFT: StopDraft = {
  address: '',
  property_title: '',
  listing_url: '',
  price: '',
  viewing_duration_minutes: 30,
  contact_name: '',
  contact_phone: '',
  notes: '',
}

function StopsCard({
  stops,
  customerName,
  onAdd,
  onDelete,
  onMove,
  onReorder,
}: {
  stops: Stop[]
  customerName: string
  onAdd: (draft: StopDraft) => Promise<void>
  onDelete: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onReorder: (fromIdx: number, toIdx: number) => void
}) {
  const [draft, setDraft] = useState<StopDraft>(EMPTY_DRAFT)
  const [showExtra, setShowExtra] = useState(false)
  const [adding, setAdding] = useState(false)

  async function submit() {
    if (!draft.address.trim()) return
    setAdding(true)
    await onAdd(draft)
    setDraft(EMPTY_DRAFT)
    setShowExtra(false)
    setAdding(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <CardTitle icon={<MapPin size={16} strokeWidth={1.8} />} noMargin>
          <span>Stops</span>
          <span
            className="font-body font-semibold"
            style={{ fontSize: 11, color: '#7A8C8B', marginLeft: 4 }}
          >
            {stops.length} {stops.length === 1 ? 'adres' : 'adressen'}
          </span>
        </CardTitle>
        {customerName && (
          <Link
            href="/woninglijst"
            className="inline-flex items-center font-body font-semibold transition-colors"
            style={{
              gap: 6,
              fontSize: 11,
              color: '#004B46',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: 8,
              background: '#E6F0EF',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,75,70,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E6F0EF')}
          >
            <ClipboardList size={11} strokeWidth={2} /> Uit shortlist
          </Link>
        )}
      </div>

      {stops.length === 0 ? (
        <div
          className="text-center font-body"
          style={{ padding: '18px 0', fontSize: 12.5, color: '#7A8C8B' }}
        >
          Voeg hieronder het eerste adres toe.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {stops.map((s, idx) => (
            <StopRow
              key={s.id}
              stop={s}
              index={idx}
              total={stops.length}
              onMove={onMove}
              onReorder={onReorder}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <Divider>Nieuwe stop toevoegen</Divider>

      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}
      >
        <Field label="Adres" required colFull>
          <BzInput
            value={draft.address}
            placeholder="Straat, nummer, plaats"
            onChange={e => setDraft({ ...draft, address: e.target.value })}
          />
        </Field>
        <Field label="Titel woning">
          <BzInput
            value={draft.property_title}
            placeholder="Villa Mirador"
            onChange={e => setDraft({ ...draft, property_title: e.target.value })}
          />
        </Field>
        <Field label="Prijs (€)">
          <BzInput
            type="number"
            value={draft.price}
            placeholder="795000"
            onChange={e => setDraft({ ...draft, price: e.target.value })}
          />
        </Field>
        {showExtra && (
          <>
            <Field label="Listing URL" colFull>
              <BzInput
                value={draft.listing_url}
                placeholder="https://..."
                onChange={e => setDraft({ ...draft, listing_url: e.target.value })}
              />
            </Field>
            <Field label="Duur bezichtiging">
              <BzSelect
                value={String(draft.viewing_duration_minutes)}
                onChange={e =>
                  setDraft({ ...draft, viewing_duration_minutes: Number(e.target.value) })
                }
              >
                <option value="20">20 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </BzSelect>
            </Field>
            <Field label="Contactpersoon">
              <BzInput
                value={draft.contact_name}
                placeholder="Verkoper / makelaar"
                onChange={e => setDraft({ ...draft, contact_name: e.target.value })}
              />
            </Field>
            <Field label="Telefoon contact" colFull>
              <BzInput
                value={draft.contact_phone}
                placeholder="+34 ..."
                onChange={e => setDraft({ ...draft, contact_phone: e.target.value })}
              />
            </Field>
            <Field label="Opmerkingen" colFull>
              <BzTextarea
                value={draft.notes}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>
          </>
        )}
        <div
          className="flex items-center"
          style={{ gridColumn: '1 / -1', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}
        >
          {!showExtra && (
            <BzButton variant="subtle" onClick={() => setShowExtra(true)}>
              <Plus size={14} strokeWidth={2.2} /> Meer details
            </BzButton>
          )}
          <BzButton variant="primary" disabled={!draft.address.trim() || adding} onClick={submit}>
            {adding ? (
              <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            ) : (
              <Plus size={14} strokeWidth={2.2} />
            )}{' '}
            Stop toevoegen
          </BzButton>
        </div>
      </div>
    </Card>
  )
}

function StopRow({
  stop,
  index,
  total,
  onMove,
  onReorder,
  onDelete,
}: {
  stop: Stop
  index: number
  total: number
  onMove: (id: string, dir: -1 | 1) => void
  onReorder: (fromIdx: number, toIdx: number) => void
  onDelete: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index))
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const fromIdx = Number(e.dataTransfer.getData('text/plain'))
        if (!Number.isNaN(fromIdx) && fromIdx !== index) onReorder(fromIdx, index)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-start bg-white transition-all"
      style={{
        gap: 12,
        padding: 12,
        border: dragOver
          ? '1px dashed #0EAE96'
          : hovered
          ? '1px solid rgba(0,75,70,0.24)'
          : '1px solid rgba(0,75,70,0.12)',
        borderRadius: 12,
        boxShadow: hovered ? '0 4px 10px rgba(7,42,36,0.05)' : 'none',
        opacity: dragging ? 0.45 : 1,
        cursor: 'grab',
      }}
    >
      <div
        title="Sleep om te verplaatsen"
        className="flex items-center shrink-0"
        style={{
          color: '#7A8C8B',
          padding: 2,
        }}
      >
        <GripVertical size={14} strokeWidth={2} />
      </div>
      <div
        className="flex items-center justify-center shrink-0 font-heading font-bold text-marble"
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: '#004B46',
          fontSize: 12.5,
          letterSpacing: '-0.02em',
        }}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-heading font-bold truncate"
          style={{
            fontSize: 14,
            color: '#004B46',
            letterSpacing: '-0.005em',
            marginBottom: 2,
          }}
        >
          {stop.property_title || stop.address}
        </div>
        {stop.property_title && (
          <div
            className="font-body truncate"
            style={{ fontSize: 11.5, color: '#7A8C8B', marginBottom: 4 }}
          >
            {stop.address}
          </div>
        )}
        <div
          className="flex items-center flex-wrap font-body"
          style={{ gap: 10, fontSize: 11.5, color: '#5F7472' }}
        >
          {stop.price != null && (
            <span
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 11.5 }}
            >
              {formatPrice(stop.price)}
            </span>
          )}
          <span className="inline-flex items-center" style={{ gap: 4 }}>
            <Clock size={11} strokeWidth={1.8} color="#7A8C8B" />
            {stop.viewing_duration_minutes}m
          </span>
          {stop.contact_name && (
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <UserIcon size={11} strokeWidth={1.8} color="#7A8C8B" />
              {stop.contact_name}
            </span>
          )}
          {stop.listing_url && (
            <a
              href={stop.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open listing"
              className="inline-flex items-center transition-colors"
              style={{ color: '#5F7472' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#004B46')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5F7472')}
            >
              <ExternalLink size={11} strokeWidth={1.8} />
            </a>
          )}
        </div>
      </div>
      <div className="flex items-start shrink-0" style={{ gap: 4 }}>
        <SmallIconButton
          title="Omhoog"
          disabled={index === 0}
          onClick={() => onMove(stop.id, -1)}
        >
          <ChevronUp size={13} strokeWidth={1.8} />
        </SmallIconButton>
        <SmallIconButton
          title="Omlaag"
          disabled={index === total - 1}
          onClick={() => onMove(stop.id, 1)}
        >
          <ChevronDown size={13} strokeWidth={1.8} />
        </SmallIconButton>
        <SmallIconButton title="Verwijder" variant="delete" onClick={() => onDelete(stop.id)}>
          <Trash2 size={13} strokeWidth={1.8} />
        </SmallIconButton>
      </div>
    </div>
  )
}

function SmallIconButton({
  title,
  onClick,
  disabled,
  variant,
  children,
}: {
  title: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'delete'
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        border: 'none',
        background: 'transparent',
        color: '#7A8C8B',
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'delete') {
          e.currentTarget.style.background = 'rgba(224,82,82,0.12)'
          e.currentTarget.style.color = '#c24040'
        } else {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = '#7A8C8B'
      }}
    >
      {children}
    </button>
  )
}

// ═════════ TIMELINE ═════════
type TimelineItem =
  | { kind: 'start'; time: string; title: string; subtitle: string }
  | { kind: 'segment'; minutes: number; isLunchSegment: boolean }
  | {
      kind: 'stop'
      sortOrder: number
      time: string
      endTime: string
      stop: Stop
    }
  | { kind: 'lunch'; time: string; endTime: string; subtitle: string }
  | { kind: 'end'; time: string; title: string; subtitle: string }

function Timeline({
  trip,
  stops,
  route,
}: {
  trip: Trip
  stops: Stop[]
  route: RouteData | null
}) {
  const items: TimelineItem[] = useMemo(() => {
    if (!route) return []
    const list: TimelineItem[] = []
    list.push({
      kind: 'start',
      time: formatTime(trip.start_time),
      title: 'Vertrek',
      subtitle: trip.start_address || '—',
    })
    const rs = route.stops || []
    const lunchAfter = route.lunch?.after_stop_order
    rs.forEach((r, idx) => {
      const prevTravel = idx === 0 ? null : rs[idx - 1].travel_time_to_next_minutes
      if (prevTravel != null) {
        list.push({ kind: 'segment', minutes: prevTravel, isLunchSegment: false })
      } else if (idx === 0) {
        list.push({
          kind: 'segment',
          minutes: diffMinutes(formatTime(trip.start_time), r.estimated_arrival),
          isLunchSegment: false,
        })
      }
      const stop = stops.find(s => s.id === r.stop_id)
      if (stop) {
        list.push({
          kind: 'stop',
          sortOrder: r.sort_order,
          time: r.estimated_arrival,
          endTime: r.estimated_departure,
          stop,
        })
      }
      if (lunchAfter === r.sort_order && route.lunch) {
        list.push({
          kind: 'segment',
          minutes: diffMinutes(r.estimated_departure, route.lunch.start_time),
          isLunchSegment: true,
        })
        list.push({
          kind: 'lunch',
          time: route.lunch.start_time,
          endTime: route.lunch.end_time,
          subtitle: `${trip.lunch_duration_minutes} min · klant krijgt frisse energie`,
        })
      }
    })
    list.push({
      kind: 'end',
      time: route.estimated_end_time,
      title: 'Einde bezichtigingsdag',
      subtitle: trip.start_address
        ? `Terug bij ${trip.start_address.split(',')[0]}`
        : 'Afronding',
    })
    return list
  }, [trip, stops, route])

  if (!route) {
    return (
      <Card>
        <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 10 }}>
          <h3
            className="font-heading font-bold text-deepsea"
            style={{
              fontSize: 16,
              margin: 0,
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <RouteIcon size={16} strokeWidth={1.8} /> Route
          </h3>
        </div>
        <EmptyCard
          icon={<MapPin size={26} strokeWidth={1.5} />}
          title="Nog geen geoptimaliseerde route"
          text="Klik op Optimaliseer route om reistijden en aankomsttijden te berekenen."
        />
      </Card>
    )
  }

  const drivingH = Math.floor(route.total_driving_minutes / 60)
  const drivingM = route.total_driving_minutes % 60
  const drivingStr = `${drivingH > 0 ? drivingH + 'u ' : ''}${drivingM}m`

  return (
    <Card className="bz-print-card">
      <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 10 }}>
        <h3
          className="font-heading font-bold text-deepsea"
          style={{
            fontSize: 16,
            margin: 0,
            letterSpacing: '-0.005em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RouteIcon size={16} strokeWidth={1.8} /> Route
        </h3>
        <div
          className="flex font-body"
          style={{ gap: 14, fontSize: 11.5, color: '#5F7472' }}
        >
          <div>
            <span>Totaal rijden</span>{' '}
            <b
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 13, letterSpacing: '-0.005em' }}
            >
              {drivingStr}
            </b>
          </div>
          <div>
            <span>Einde</span>{' '}
            <b
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 13, letterSpacing: '-0.005em' }}
            >
              {route.estimated_end_time}
            </b>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col">
        {items.map((item, idx) => {
          if (item.kind === 'segment') {
            return (
              <Segment
                key={`seg-${idx}`}
                minutes={item.minutes}
                isLunch={item.isLunchSegment}
              />
            )
          }
          if (item.kind === 'lunch') {
            return (
              <Node
                key={`node-${idx}`}
                kind="lunch"
                time={item.time}
                endTime={item.endTime}
                title="Lunchpauze"
                subtitle={item.subtitle}
              />
            )
          }
          if (item.kind === 'stop') {
            return (
              <StopNode
                key={`node-${idx}`}
                sortOrder={item.sortOrder}
                time={item.time}
                endTime={item.endTime}
                stop={item.stop}
              />
            )
          }
          return (
            <Node
              key={`node-${idx}`}
              kind={item.kind}
              time={item.time}
              title={item.title}
              subtitle={item.subtitle}
            />
          )
        })}
      </div>

      {route.route_summary && (
        <div
          className="flex items-start"
          style={{
            marginTop: 16,
            padding: '14px 16px',
            background: '#FEF6E4',
            border: '1px solid rgba(212,146,26,0.3)',
            borderRadius: 12,
            gap: 10,
          }}
        >
          <Sparkles
            size={16}
            strokeWidth={2}
            color="#D4921A"
            className="shrink-0"
            style={{ marginTop: 1 }}
          />
          <div>
            <div
              className="font-body font-bold uppercase text-sun-dark"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                marginBottom: 3,
              }}
            >
              Route-logica
            </div>
            <div
              className="font-body italic"
              style={{ fontSize: 12.5, color: '#5F7472', lineHeight: 1.5 }}
            >
              {route.route_summary}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function Segment({ minutes, isLunch }: { minutes: number; isLunch: boolean }) {
  const color = isLunch ? '#10b981' : '#0A6B63'
  return (
    <div className="flex items-center" style={{ gap: 14 }}>
      <div style={{ width: 58 }} />
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 36, padding: '6px 0' }}
      >
        <div
          style={{
            width: 6,
            height: 44,
            borderRadius: 3,
            background: `repeating-linear-gradient(180deg, ${color} 0 4px, transparent 4px 8px)`,
            opacity: isLunch ? 0.7 : 0.65,
          }}
        />
      </div>
      <div
        className="flex items-center flex-1 font-body"
        style={{ fontSize: 11.5, color: '#7A8C8B', gap: 7 }}
      >
        <Car size={12} strokeWidth={1.8} style={{ opacity: 0.65 }} />
        <span>
          <b style={{ fontWeight: 600, color: '#5F7472' }}>{minutes}m</b> rijden
        </span>
      </div>
    </div>
  )
}

function Node({
  kind,
  time,
  endTime,
  title,
  subtitle,
}: {
  kind: 'start' | 'lunch' | 'end'
  time: string
  endTime?: string
  title: string
  subtitle?: string
}) {
  const dotColors = {
    start: { bg: '#004B46', color: '#FFFFFF' },
    lunch: { bg: '#10b981', color: '#FFFFFF' },
    end: { bg: '#004B46', color: '#FFFFFF' },
  }
  const dotIcons = {
    start: <Play size={15} strokeWidth={2.2} />,
    lunch: <Utensils size={15} strokeWidth={2.2} />,
    end: <Flag size={15} strokeWidth={2.2} />,
  }
  return (
    <div className="flex items-start" style={{ gap: 14, padding: '6px 0', position: 'relative' }}>
      <div
        className="font-heading font-bold text-deepsea shrink-0 text-right"
        style={{ width: 58, paddingTop: 10, fontSize: 14, letterSpacing: '-0.01em' }}
      >
        {time}
        {endTime && (
          <span
            className="block font-body"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: '#7A8C8B',
              marginTop: 1,
              letterSpacing: 0,
            }}
          >
            → {endTime}
          </span>
        )}
      </div>
      <div
        className="shrink-0 flex flex-col items-center"
        style={{ width: 36, paddingTop: 6 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: dotColors[kind].bg,
            color: dotColors[kind].color,
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 0 0 3px #fff, 0 1px 4px rgba(7,42,36,0.18)',
          }}
        >
          {dotIcons[kind]}
        </div>
      </div>
      <div className="flex-1 min-w-0" style={{ padding: '6px 2px 14px' }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 2 }}>
          <div
            className="font-heading font-bold"
            style={{
              fontSize: 15,
              color: '#004B46',
              letterSpacing: '-0.005em',
            }}
          >
            {title}
          </div>
        </div>
        {subtitle && (
          <div
            className="font-body truncate"
            style={{ fontSize: 11.5, color: '#7A8C8B' }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

function StopNode({
  sortOrder,
  time,
  endTime,
  stop,
}: {
  sortOrder: number
  time: string
  endTime: string
  stop: Stop
}) {
  return (
    <div className="flex items-start" style={{ gap: 14, padding: '6px 0', position: 'relative' }}>
      <div
        className="font-heading font-bold text-deepsea shrink-0 text-right"
        style={{ width: 58, paddingTop: 10, fontSize: 14, letterSpacing: '-0.01em' }}
      >
        {time}
        {endTime && (
          <span
            className="block font-body"
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: '#7A8C8B',
              marginTop: 1,
              letterSpacing: 0,
            }}
          >
            → {endTime}
          </span>
        )}
      </div>
      <div
        className="shrink-0 flex flex-col items-center"
        style={{ width: 36, paddingTop: 6 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#F5AF40',
            color: '#004B46',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 0 0 3px #fff, 0 1px 4px rgba(7,42,36,0.18)',
          }}
        >
          <MapPin size={15} strokeWidth={2.2} />
        </div>
      </div>
      <div className="flex-1 min-w-0" style={{ padding: '6px 2px 14px' }}>
        <div
          className="font-heading font-bold"
          style={{
            fontSize: 15,
            color: '#004B46',
            letterSpacing: '-0.005em',
            marginBottom: 2,
          }}
        >
          <span style={{ color: '#D4921A', marginRight: 6 }}>{sortOrder}.</span>
          {stop.property_title || stop.address}
        </div>
        <div
          className="font-body truncate"
          style={{ fontSize: 11.5, color: '#7A8C8B', marginBottom: 6 }}
        >
          {stop.address}
        </div>
        <div
          className="flex flex-wrap font-body"
          style={{ gap: 10, fontSize: 11.5, color: '#5F7472' }}
        >
          {stop.price != null && (
            <span
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 12 }}
            >
              {formatPrice(stop.price)}
            </span>
          )}
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            <Clock size={12} strokeWidth={1.8} color="#7A8C8B" />
            {stop.viewing_duration_minutes}m bezichtiging
          </span>
          {stop.contact_name && (
            <span className="inline-flex items-center" style={{ gap: 5 }}>
              <UserIcon size={12} strokeWidth={1.8} color="#7A8C8B" />
              {stop.contact_name}
            </span>
          )}
          {stop.listing_url && (
            <a
              href={stop.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center transition-colors"
              style={{ color: '#5F7472', gap: 4, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#004B46')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5F7472')}
            >
              <ExternalLink size={12} strokeWidth={1.8} /> listing
            </a>
          )}
        </div>
        {stop.notes && (
          <div
            className="font-body italic"
            style={{ fontSize: 11.5, color: '#7A8C8B', marginTop: 6 }}
          >
            {stop.notes}
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════ Atoms ═════════
function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-white ${className ?? ''}`}
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(7,42,36,0.04)',
      }}
    >
      {children}
    </div>
  )
}

function CardTitle({
  icon,
  noMargin,
  children,
}: {
  icon: React.ReactNode
  noMargin?: boolean
  children: React.ReactNode
}) {
  return (
    <h2
      className="font-heading font-bold text-deepsea flex items-center"
      style={{
        fontSize: 16,
        margin: noMargin ? 0 : '0 0 14px',
        letterSpacing: '-0.005em',
        gap: 8,
      }}
    >
      {icon}
      {children}
    </h2>
  )
}

function Field({
  label,
  required,
  colFull,
  children,
}: {
  label: string
  required?: boolean
  colFull?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col min-w-0"
      style={{ gap: 5, ...(colFull ? { gridColumn: '1 / -1' } : {}) }}
    >
      <label
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10.5,
          color: '#7A8C8B',
          letterSpacing: '0.1em',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#c24040', marginLeft: 2 }}>*</span>
        )}
      </label>
      {children}
    </div>
  )
}

function BzInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...props.style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#004B46'
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.16)'
        e.currentTarget.style.background = '#FFFAEF'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function BzTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        minHeight: 60,
        resize: 'vertical',
        lineHeight: 1.4,
        ...props.style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#004B46'
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.16)'
        e.currentTarget.style.background = '#FFFAEF'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function BzSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all cursor-pointer ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...props.style,
      }}
    />
  )
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center"
      style={{ margin: '10px 4px', gap: 8 }}
    >
      <div style={{ flex: 1, height: 1, background: 'rgba(0,75,70,0.1)' }} />
      <span
        className="font-body font-bold uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.16em',
          color: '#7A8C8B',
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,75,70,0.1)' }} />
    </div>
  )
}
