'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { useAuth } from '@/lib/auth-context'
import { Plus, MapPin, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Trip {
  id: string
  client_name: string
  trip_date: string
  status: string
  stop_count: number
  created_at: string
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  concept: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Concept' },
  gepland: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Gepland' },
  afgerond: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Afgerond' },
}

export default function BezichtigingenPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    const res = await fetch('/api/bezichtigingen')
    if (res.ok) setTrips(await res.json())
    setLoading(false)
  }

  async function createTrip() {
    setCreating(true)
    const res = await fetch('/api/bezichtigingen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Nieuwe klant',
        trip_date: new Date().toISOString().split('T')[0],
        created_by: user?.id,
      }),
    })
    if (res.ok) {
      const { id } = await res.json()
      router.push(`/bezichtigingen/${id}`)
    }
    setCreating(false)
  }

  async function deleteTrip(id: string, name: string) {
    if (!confirm(`Trip "${name}" verwijderen?`)) return
    await fetch('/api/bezichtigingen', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTrips(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <PageLayout title="Bezichtigingen"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Bezichtigingen" subtitle="Plan bezichtigingsdagen voor je klanten">
      <button
        onClick={createTrip}
        disabled={creating}
        className="mb-6 bg-[#004B46] text-[#FFFAEF] font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0A6B63] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
      >
        {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Nieuwe trip plannen
      </button>

      {trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <MapPin size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400 text-sm">Nog geen bezichtigingen gepland</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Datum</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Klant</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Stops</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {trips.map(trip => {
                const badge = STATUS_BADGE[trip.status] ?? STATUS_BADGE.concept
                return (
                  <tr key={trip.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/bezichtigingen/${trip.id}`)}>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {new Date(trip.trip_date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#004B46]">{trip.client_name}</td>
                    <td className="px-4 py-3 text-slate-500">{trip.stop_count} {trip.stop_count === 1 ? 'woning' : 'woningen'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full font-semibold`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => deleteTrip(trip.id, trip.client_name)} className="text-slate-300 hover:text-red-500 p-1 cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}
