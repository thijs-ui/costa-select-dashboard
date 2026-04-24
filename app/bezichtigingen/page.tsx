'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2, Plus, Route, Trash2 } from 'lucide-react'
import {
  BzButton,
  BzEyebrow,
  BzHeader,
  CountPill,
  EmptyCard,
} from '@/components/bezichtigingen/atoms'

interface Trip {
  id: string
  client_name: string
  trip_date: string
  start_time: string
  status: 'concept' | 'gepland' | 'afgerond'
  stop_count: number
  created_at: string
}

type FilterKey = 'all' | 'concept' | 'gepland' | 'afgerond'

const FILTER_OPTIONS: { k: FilterKey; label: string }[] = [
  { k: 'all', label: 'Alle' },
  { k: 'concept', label: 'Concept' },
  { k: 'gepland', label: 'Gepland' },
  { k: 'afgerond', label: 'Afgerond' },
]

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function BezichtigingenPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')

  const loadTrips = useCallback(async () => {
    try {
      const res = await fetch('/api/bezichtigingen', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setTrips(data)
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTrips()
  }, [loadTrips])

  async function createTrip() {
    setCreating(true)
    const res = await fetch('/api/bezichtigingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: '',
        trip_date: new Date().toISOString().split('T')[0],
        created_by: user?.id,
      }),
    })
    if (res.ok) {
      const { id } = await res.json()
      router.push(`/bezichtigingen/${id}`)
    } else {
      setCreating(false)
    }
  }

  async function deleteTrip(id: string) {
    if (!confirm('Weet je zeker dat je deze bezichtigingsdag wilt verwijderen?')) return
    await fetch('/api/bezichtigingen', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTrips(prev => prev.filter(t => t.id !== id))
  }

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: trips.length, concept: 0, gepland: 0, afgerond: 0 }
    trips.forEach(t => {
      if (t.status in c) c[t.status as FilterKey]++
    })
    return c
  }, [trips])

  const filtered = useMemo(
    () => (filter === 'all' ? trips : trips.filter(t => t.status === filter)),
    [trips, filter]
  )

  return (
    <div
      className="flex flex-col bg-marble"
      style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}
    >
      {/* Header */}
      <BzHeader>
        <div className="min-w-0 flex-1">
          <BzEyebrow>Costa Select Bezichtigingen</BzEyebrow>
          <h1
            className="font-heading font-bold text-deepsea"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
          >
            Bezichtigingsdagen
            <CountPill>{trips.length}</CountPill>
          </h1>
          <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', margin: 0 }}>
            Plan routes, bereken reistijden met Google Maps en stuur een itinerary naar je klant.
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <BzButton variant="primary" disabled={creating} onClick={createTrip}>
            {creating ? (
              <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            ) : (
              <Plus size={14} strokeWidth={2.2} />
            )}{' '}
            Nieuwe bezichtigingsdag
          </BzButton>
        </div>
      </BzHeader>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: '22px 36px 60px' }}>
          {/* Filter chips */}
          <div
            className="inline-flex items-center bg-white"
            style={{
              gap: 6,
              padding: 4,
              border: '1px solid rgba(0,75,70,0.14)',
              borderRadius: 12,
            }}
          >
            {FILTER_OPTIONS.map(o => (
              <FilterChip
                key={o.k}
                active={filter === o.k}
                showDot={o.k !== 'all'}
                count={counts[o.k]}
                onClick={() => setFilter(o.k)}
              >
                {o.label}
              </FilterChip>
            ))}
          </div>

          {/* Body */}
          {loading ? (
            <div
              className="flex items-center justify-center"
              style={{ padding: '60px 0', color: '#7A8C8B' }}
            >
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ marginTop: 14 }}>
              <EmptyCard
                icon={<Route size={26} strokeWidth={1.5} />}
                title={filter === 'all' ? 'Nog geen bezichtigingsdagen' : 'Geen resultaten in dit filter'}
                text={
                  filter === 'all'
                    ? 'Plan een nieuwe dag om stops, reistijden en een itinerary voor je klant te genereren.'
                    : 'Selecteer een ander filter of plan een nieuwe bezichtigingsdag.'
                }
                cta={
                  <BzButton variant="primary" disabled={creating} onClick={createTrip}>
                    {creating ? (
                      <Loader2 size={14} className="animate-spin" strokeWidth={2} />
                    ) : (
                      <Plus size={14} strokeWidth={2.2} />
                    )}{' '}
                    Nieuwe bezichtigingsdag
                  </BzButton>
                }
              />
            </div>
          ) : (
            <div
              className="bg-white overflow-hidden"
              style={{
                border: '1px solid rgba(0,75,70,0.12)',
                borderRadius: 14,
                marginTop: 14,
              }}
            >
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    className="bg-marble"
                    style={{ borderBottom: '1px solid rgba(0,75,70,0.12)' }}
                  >
                    <Th>Klant</Th>
                    <Th>Datum</Th>
                    <Th>Stops</Th>
                    <Th>Status</Th>
                    <th style={{ width: 56 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <TripRow
                      key={t.id}
                      trip={t}
                      isFirst={idx === 0}
                      onOpen={() => router.push(`/bezichtigingen/${t.id}`)}
                      onDelete={() => deleteTrip(t.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ───────── Trip row ─────────
function TripRow({
  trip,
  isFirst,
  onOpen,
  onDelete,
}: {
  trip: Trip
  isFirst: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <tr
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer transition-colors"
      style={{
        borderTop: isFirst ? 'none' : '1px solid rgba(0,75,70,0.08)',
        background: hovered ? '#E6F0EF' : 'transparent',
      }}
    >
      <Td>
        <span
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 14, letterSpacing: '-0.005em' }}
        >
          {trip.client_name || 'Nieuwe bezichtigingsdag'}
        </span>
      </Td>
      <Td>
        <span className="font-body" style={{ fontSize: 12.5, color: '#5F7472' }}>
          {formatDate(trip.trip_date)} · {trip.start_time?.substring(0, 5) ?? '09:00'}
        </span>
      </Td>
      <Td>
        <span className="font-body" style={{ fontSize: 12.5, color: '#5F7472' }}>
          {trip.stop_count} {trip.stop_count === 1 ? 'stop' : 'stops'}
        </span>
      </Td>
      <Td>
        <StatusBadge status={trip.status} />
      </Td>
      <Td style={{ textAlign: 'right', width: 56 }}>
        <button
          onClick={e => {
            e.stopPropagation()
            onDelete()
          }}
          title="Verwijderen"
          className="inline-flex items-center justify-center cursor-pointer transition-all"
          style={{
            opacity: hovered ? 1 : 0,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'transparent',
            color: '#7A8C8B',
            border: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(224,82,82,0.12)'
            e.currentTarget.style.color = '#c24040'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#7A8C8B'
          }}
        >
          <Trash2 size={14} strokeWidth={1.8} />
        </button>
      </Td>
    </tr>
  )
}

// ───────── Status badge ─────────
export function StatusBadge({ status }: { status: 'concept' | 'gepland' | 'afgerond' }) {
  const styles = {
    concept: {
      bg: '#f5f0e4',
      color: '#70593a',
      border: 'rgba(126,95,55,0.2)',
      dot: '#a68856',
    },
    gepland: {
      bg: '#E6F0EF',
      color: '#004B46',
      border: 'rgba(0,75,70,0.2)',
      dot: '#004B46',
    },
    afgerond: {
      bg: 'rgba(16,185,129,0.13)',
      color: '#0d7456',
      border: 'rgba(16,185,129,0.3)',
      dot: '#10b981',
    },
  }[status]

  return (
    <span
      className="inline-flex items-center font-body font-bold uppercase"
      style={{
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 10.5,
        letterSpacing: '0.08em',
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
      }}
    >
      <span
        className="inline-block"
        style={{ width: 6, height: 6, borderRadius: 999, background: styles.dot }}
      />
      {status}
    </span>
  )
}

// ───────── Filter chip ─────────
function FilterChip({
  active,
  showDot,
  count,
  onClick,
  children,
}: {
  active: boolean
  showDot: boolean
  count: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center font-body font-semibold cursor-pointer transition-colors"
      style={{
        padding: '6px 12px',
        fontSize: 12,
        borderRadius: 8,
        gap: 6,
        background: active ? '#004B46' : 'transparent',
        color: active ? '#FFFAEF' : '#5F7472',
        border: 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#5F7472'
        }
      }}
    >
      {showDot && (
        <span
          className="inline-block"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: active ? '#F5AF40' : '#7A8C8B',
          }}
        />
      )}
      {children}
      <span
        className="font-body font-semibold"
        style={{ fontSize: 10.5, opacity: 0.7, marginLeft: 2 }}
      >
        {count}
      </span>
    </button>
  )
}


function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="font-body font-bold uppercase text-left"
      style={{
        fontSize: 10.5,
        letterSpacing: '0.12em',
        color: '#7A8C8B',
        padding: '13px 18px',
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <td
      style={{
        padding: '14px 18px',
        fontSize: 13,
        color: '#004B46',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  )
}
