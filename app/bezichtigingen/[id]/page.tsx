'use client'

import { useEffect, useState, use } from 'react'
import { PageLayout } from '@/components/page-layout'
import {
  ArrowLeft, Plus, Trash2, MapPin, Clock, Navigation, Loader2,
  ExternalLink, Phone, Save, Utensils, CheckCircle2, Home, Flag,
  Mail, MessageCircle, Download,
} from 'lucide-react'
import Link from 'next/link'

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
  route_data: RouteData | null
  status: string
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
  stops: Array<{ stop_id: string; sort_order: number; estimated_arrival: string; estimated_departure: string; travel_time_to_next_minutes: number }>
  lunch: { after_stop_order: number; start_time: string; end_time: string }
  total_driving_minutes: number
  estimated_end_time: string
  route_summary: string
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20'

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState('')

  // New stop form
  const [newAddress, setNewAddress] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUrl, setNewUrl] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [tripRes, stopsRes] = await Promise.all([
      fetch(`/api/bezichtigingen?id=${id}`),
      fetch(`/api/bezichtigingen/stops?trip_id=${id}`),
    ])

    // Trips endpoint returns array, find by id
    if (tripRes.ok) {
      const trips = await tripRes.json()
      const found = Array.isArray(trips) ? trips.find((t: Trip) => t.id === id) : null
      setTrip(found ?? null)
    }
    if (stopsRes.ok) setStops(await stopsRes.json())
    setLoading(false)
  }

  async function saveTrip(updates: Partial<Trip>) {
    if (!trip) return
    setSaving(true)
    await fetch('/api/bezichtigingen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: trip.id, ...updates }),
    })
    setTrip(prev => prev ? { ...prev, ...updates } as Trip : null)
    setSaving(false)
  }

  async function addStop() {
    if (!newAddress.trim()) return
    const res = await fetch('/api/bezichtigingen/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip_id: id,
        address: newAddress.trim(),
        property_title: newTitle.trim() || null,
        price: newPrice ? Number(newPrice) : null,
        listing_url: newUrl.trim() || null,
      }),
    })
    if (res.ok) {
      const stop = await res.json()
      setStops(prev => [...prev, stop])
      setNewAddress('')
      setNewTitle('')
      setNewPrice('')
      setNewUrl('')
    }
  }

  async function deleteStop(stopId: string) {
    await fetch('/api/bezichtigingen/stops', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stopId }),
    })
    setStops(prev => prev.filter(s => s.id !== stopId))
  }

  async function optimizeRoute() {
    if (!trip || stops.length < 2) return
    setOptimizing(true)
    setError('')
    try {
      const res = await fetch('/api/bezichtigingen/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: trip.id,
          start_address: trip.start_address || stops[0]?.address,
          start_time: trip.start_time,
          lunch_time: trip.lunch_time,
          lunch_duration_minutes: trip.lunch_duration_minutes,
          stops: stops.map(s => ({
            id: s.id,
            address: s.address,
            viewing_duration_minutes: s.viewing_duration_minutes,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Route optimalisatie mislukt')
      }

      const routeData: RouteData = await res.json()
      setTrip(prev => prev ? { ...prev, route_data: routeData } : null)

      // Update stops met nieuwe volgorde en tijden
      const updatedStops = [...stops]
      for (const rs of routeData.stops) {
        const stop = updatedStops.find(s => s.id === rs.stop_id)
        if (stop) {
          stop.sort_order = rs.sort_order
          stop.estimated_arrival = rs.estimated_arrival
          stop.travel_time_minutes = rs.travel_time_to_next_minutes
        }
      }
      updatedStops.sort((a, b) => a.sort_order - b.sort_order)
      setStops(updatedStops)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route optimalisatie mislukt')
    } finally {
      setOptimizing(false)
    }
  }

  function getGoogleMapsLink() {
    if (!trip) return ''
    const waypoints = [trip.start_address || '', ...stops.map(s => s.address)].filter(Boolean)
    return `https://www.google.com/maps/dir/${waypoints.map(w => encodeURIComponent(w)).join('/')}`
  }

  function getWhatsAppLink() {
    if (!trip) return ''
    const msg = `Hoi ${trip.client_name}, hierbij de planning voor onze bezichtigingsdag op ${new Date(trip.trip_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}. We bekijken ${stops.length} woningen. Ik neem binnenkort contact met je op voor de details!`
    const phone = trip.client_phone?.replace(/[^0-9+]/g, '') || ''
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  function getEmailLink() {
    if (!trip) return ''
    const datum = new Date(trip.trip_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const subject = `Bezichtigingsplanning ${datum} — Costa Select`
    const body = `Beste ${trip.client_name},\n\nHierbij de planning voor onze bezichtigingsdag op ${datum}.\n\nWe bekijken ${stops.length} woningen. De dag begint om ${trip.start_time?.substring(0, 5) ?? '09:00'}${trip.start_address ? ` bij ${trip.start_address}` : ''}.\n\nMet vriendelijke groet,\nCosta Select`
    return `mailto:${trip.client_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (loading) return <PageLayout title="Bezichtiging"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>
  if (!trip) return <PageLayout title="Niet gevonden"><div className="text-slate-400 text-sm">Trip niet gevonden.</div></PageLayout>

  const routeData = trip.route_data

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bezichtigingen" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-900">Bezichtiging: {trip.client_name}</h1>
          <p className="text-sm text-slate-500">{new Date(trip.trip_date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={trip.status} onChange={e => saveTrip({ status: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400">
            <option value="concept">Concept</option>
            <option value="gepland">Gepland</option>
            <option value="afgerond">Afgerond</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== LINKER KOLOM: Trip-gegevens + Stops ===== */}
        <div className="space-y-6">
          {/* Trip-gegevens */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Trip-gegevens</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Klantnaam *</label>
                <input value={trip.client_name} onChange={e => setTrip({ ...trip, client_name: e.target.value })}
                  onBlur={() => saveTrip({ client_name: trip.client_name })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input value={trip.client_email ?? ''} onChange={e => setTrip({ ...trip, client_email: e.target.value })}
                  onBlur={() => saveTrip({ client_email: trip.client_email })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Telefoon</label>
                <input value={trip.client_phone ?? ''} onChange={e => setTrip({ ...trip, client_phone: e.target.value })}
                  onBlur={() => saveTrip({ client_phone: trip.client_phone })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Datum *</label>
                <input type="date" value={trip.trip_date} onChange={e => { setTrip({ ...trip, trip_date: e.target.value }); saveTrip({ trip_date: e.target.value }) }} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Starttijd</label>
                <input type="time" value={trip.start_time?.substring(0, 5) ?? '09:00'}
                  onChange={e => { setTrip({ ...trip, start_time: e.target.value }); saveTrip({ start_time: e.target.value }) }} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Vertrekpunt</label>
                <input value={trip.start_address ?? ''} onChange={e => setTrip({ ...trip, start_address: e.target.value })}
                  onBlur={() => saveTrip({ start_address: trip.start_address })} placeholder="Hotel, luchthaven of adres" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Lunchtijd</label>
                <input type="time" value={trip.lunch_time?.substring(0, 5) ?? '13:00'}
                  onChange={e => { setTrip({ ...trip, lunch_time: e.target.value }); saveTrip({ lunch_time: e.target.value }) }} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Lunchpauze (min)</label>
                <input type="number" value={trip.lunch_duration_minutes}
                  onChange={e => { setTrip({ ...trip, lunch_duration_minutes: Number(e.target.value) }); saveTrip({ lunch_duration_minutes: Number(e.target.value) }) }} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Notities</label>
                <textarea value={trip.notes ?? ''} onChange={e => setTrip({ ...trip, notes: e.target.value })}
                  onBlur={() => saveTrip({ notes: trip.notes })} rows={2} className={`${inp} resize-none`} />
              </div>
            </div>
          </div>

          {/* Stops */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Woningen ({stops.length})</h2>

            {/* Bestaande stops */}
            <div className="space-y-2 mb-4">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#004B46] bg-[#004B46]/10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{stop.property_title || stop.address}</p>
                        <p className="text-xs text-slate-400 truncate">{stop.address}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {stop.price && <span className="text-xs text-slate-500">€ {Number(stop.price).toLocaleString('nl-NL')}</span>}
                          <span className="text-xs text-slate-400">{stop.viewing_duration_minutes} min</span>
                          {stop.listing_url && (
                            <a href={stop.listing_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#004B46]" onClick={e => e.stopPropagation()}>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => deleteStop(stop.id)} className="text-slate-300 hover:text-red-500 p-1 cursor-pointer shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Nieuwe stop toevoegen */}
            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Stop toevoegen</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Adres *"
                    onKeyDown={e => { if (e.key === 'Enter') addStop() }} className={inp} />
                </div>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titel (optioneel)" className={inp} />
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Prijs (optioneel)" type="number" className={inp} />
                <div className="col-span-2">
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="Listing URL (optioneel)" className={inp} />
                </div>
              </div>
              <button onClick={addStop} disabled={!newAddress.trim()}
                className="flex items-center gap-1 text-sm text-[#004B46] hover:text-[#0A6B63] font-medium cursor-pointer disabled:opacity-30">
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>

        {/* ===== RECHTER KOLOM: Route & Tijdlijn ===== */}
        <div className="space-y-4">
          {/* Actieknoppen */}
          <div className="flex flex-wrap gap-2">
            <button onClick={optimizeRoute} disabled={optimizing || stops.length < 2}
              className="bg-[#004B46] text-[#FFFAEF] font-semibold px-4 py-2.5 rounded-xl hover:bg-[#0A6B63] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm">
              {optimizing ? <><Loader2 size={14} className="animate-spin" /> Route berekenen...</> : <><Navigation size={14} /> Route optimaliseren</>}
            </button>
            {stops.length > 0 && (
              <a href={getGoogleMapsLink()} target="_blank" rel="noopener noreferrer"
                className="bg-white text-slate-700 border border-slate-200 font-medium px-4 py-2.5 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm">
                <MapPin size={14} /> Google Maps
              </a>
            )}
            {trip.client_phone && (
              <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer"
                className="bg-[#25D366] text-white font-medium px-4 py-2.5 rounded-xl hover:bg-[#20BD5A] flex items-center gap-2 text-sm">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {trip.client_email && (
              <a href={getEmailLink()}
                className="bg-blue-600 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 flex items-center gap-2 text-sm">
                <Mail size={14} /> Email
              </a>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">{error}</div>
          )}

          {/* Tijdlijn */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              {routeData ? 'Route & Tijdlijn' : 'Tijdlijn'}
            </h2>

            {stops.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-400 text-sm">Voeg woningen toe om een route te plannen</p>
              </div>
            ) : (
              <div className="relative pl-8">
                {/* Verticale lijn */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200" />

                {/* Vertrekpunt */}
                {trip.start_address && (
                  <TimelineNode icon={<Flag size={12} />} color="bg-[#004B46]"
                    time={trip.start_time?.substring(0, 5) ?? '09:00'}
                    title={`Vertrek: ${trip.start_address}`}
                  />
                )}

                {/* Stops */}
                {stops.map((stop, idx) => {
                  const routeStop = routeData?.stops.find(rs => rs.stop_id === stop.id)
                  const isAfterLunch = routeData?.lunch && idx === routeData.lunch.after_stop_order

                  return (
                    <div key={stop.id}>
                      {/* Reistijd indicator */}
                      {(stop.travel_time_minutes || routeStop?.travel_time_to_next_minutes) && idx > 0 && (
                        <div className="ml-4 py-1 text-[10px] text-slate-400 flex items-center gap-1">
                          <span>↓ {stop.travel_time_minutes ?? '?'} min rijden</span>
                        </div>
                      )}

                      <TimelineNode
                        icon={<Home size={12} />}
                        color="bg-[#F5AF40]"
                        time={routeStop?.estimated_arrival ?? stop.estimated_arrival?.substring(0, 5) ?? ''}
                        title={stop.property_title || stop.address}
                        subtitle={stop.address !== (stop.property_title || stop.address) ? stop.address : undefined}
                        meta={[
                          stop.price ? `€ ${Number(stop.price).toLocaleString('nl-NL')}` : null,
                          `${stop.viewing_duration_minutes} min bezichtiging`,
                          stop.contact_name ? `📞 ${stop.contact_name}` : null,
                        ].filter(Boolean) as string[]}
                        listingUrl={stop.listing_url}
                      />

                      {/* Lunch na deze stop */}
                      {isAfterLunch && routeData?.lunch && (
                        <>
                          <div className="ml-4 py-1 text-[10px] text-slate-400">↓</div>
                          <TimelineNode
                            icon={<Utensils size={12} />}
                            color="bg-emerald-500"
                            time={routeData.lunch.start_time}
                            title={`Lunchpauze (${trip.lunch_duration_minutes} min)`}
                          />
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Einde */}
                {routeData && (
                  <>
                    <div className="ml-4 py-1 text-[10px] text-slate-400">↓</div>
                    <TimelineNode
                      icon={<CheckCircle2 size={12} />}
                      color="bg-emerald-600"
                      time={routeData.estimated_end_time}
                      title="Einde dag"
                      meta={[`Totaal ${routeData.total_driving_minutes} min rijden`]}
                    />
                  </>
                )}
              </div>
            )}

            {routeData?.route_summary && (
              <p className="mt-4 text-xs text-slate-500 italic border-t border-slate-100 pt-3">{routeData.route_summary}</p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

function TimelineNode({ icon, color, time, title, subtitle, meta, listingUrl }: {
  icon: React.ReactNode
  color: string
  time: string
  title: string
  subtitle?: string
  meta?: string[]
  listingUrl?: string | null
}) {
  return (
    <div className="relative flex items-start gap-3 py-2">
      <div className={`absolute left-[-20px] w-6 h-6 rounded-full ${color} text-white flex items-center justify-center z-10`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {time && <span className="text-xs font-semibold text-[#004B46] tabular-nums">{time}</span>}
          <span className="text-sm font-medium text-slate-800 truncate">{title}</span>
          {listingUrl && (
            <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#004B46] shrink-0">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        {meta && meta.length > 0 && (
          <div className="flex items-center gap-3 mt-0.5">
            {meta.map((m, i) => <span key={i} className="text-[10px] text-slate-500">{m}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}
