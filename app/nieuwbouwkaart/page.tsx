'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { PageLayout } from '@/components/page-layout'
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api'
import { Search, X, ExternalLink, Bed, Bath, Maximize2, ChevronDown, ChevronUp, MapPin } from 'lucide-react'

interface Listing {
  id: string
  title: string | null
  latitude: number
  longitude: number
  price: number | null
  status: string | null
  property_type: string | null
  municipality: string | null
  province: string | null
  rooms: number | null
  bathrooms: number | null
  size_m2: number | null
  is_new_development: boolean
  main_image_url: string | null
  is_active: boolean
}

interface FullListing extends Listing {
  description: string | null
  url: string | null
  address: string | null
  images: string[] | null
  agency_name: string | null
  has_swimming_pool: boolean
  has_terrace: boolean
  has_parking: boolean
  units: Unit[]
}

interface Unit {
  id: string
  typology: string | null
  sub_typology: string | null
  price: number | null
  size_m2: number | null
  rooms: number | null
  floor: string | null
}

interface UnitGroup {
  label: string
  count: number
  priceMin: number | null
  priceMax: number | null
  sizeMin: number | null
  sizeMax: number | null
  rooms: number | null
}

function groupUnits(units: Unit[]): UnitGroup[] {
  const groups = new Map<string, Unit[]>()
  for (const u of units) {
    const key = `${u.typology || 'Onbekend'}|${u.rooms ?? '?'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(u)
  }
  return Array.from(groups.entries()).map(([key, items]) => {
    const [typology, rooms] = key.split('|')
    const prices = items.map(i => i.price).filter(Boolean) as number[]
    const sizes = items.map(i => i.size_m2).filter(Boolean) as number[]
    return {
      label: `${typology}${rooms !== '?' ? ` · ${rooms} slk` : ''}`,
      count: items.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      sizeMin: sizes.length ? Math.min(...sizes) : null,
      sizeMax: sizes.length ? Math.max(...sizes) : null,
      rooms: rooms !== '?' ? Number(rooms) : null,
    }
  }).sort((a, b) => (a.priceMin ?? Infinity) - (b.priceMin ?? Infinity))
}

const REGIOS = [
  { label: 'Costa del Sol', lat: 36.72, lng: -4.42, zoom: 10 },
  { label: 'Costa Blanca Noord', lat: 38.75, lng: 0.08, zoom: 11 },
  { label: 'Costa Brava', lat: 41.85, lng: 3.10, zoom: 10 },
  { label: 'Valencia', lat: 39.47, lng: -0.38, zoom: 11 },
]

const MAP_STYLES = [
  { featureType: 'water', stylers: [{ color: '#b3e6e0' }] },
  { featureType: 'landscape', stylers: [{ color: '#f5f0e8' }] },
  { featureType: 'road', stylers: [{ visibility: 'simplified' }, { color: '#e0d8cc' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
]

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: MAP_STYLES,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

const DEFAULT_CENTER = { lat: 38.5, lng: -1.5 }
const DEFAULT_ZOOM = 7

export default function NieuwbouwkaartPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FullListing | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterProvince, setFilterProvince] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  // Map ref — voorkomt re-renders
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/nieuwbouw')
      if (res.ok) setListings(await res.json())
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (search) {
        const q = search.toLowerCase()
        if (!(l.title?.toLowerCase().includes(q) || l.municipality?.toLowerCase().includes(q))) return false
      }
      if (filterProvince && l.province !== filterProvince) return false
      if (priceMin && (l.price ?? 0) < Number(priceMin)) return false
      if (priceMax && (l.price ?? 0) > Number(priceMax)) return false
      return true
    })
  }, [listings, search, filterProvince, priceMin, priceMax])

  const provinces = useMemo(() => {
    const set = new Set(listings.map(l => l.province).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [listings])

  async function selectListing(id: string) {
    setSelectedId(id)
    const res = await fetch(`/api/nieuwbouw?id=${id}`)
    if (res.ok) setSelected(await res.json())
  }

  function goToRegion(lat: number, lng: number, zoom: number) {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng })
      mapRef.current.setZoom(zoom)
    }
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const hasFilters = search || filterProvince || priceMin || priceMax
  function resetFilters() { setSearch(''); setFilterProvince(''); setPriceMin(''); setPriceMax('') }

  if (loading) return <PageLayout title="Nieuwbouwkaart"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Nieuwbouwkaart" subtitle={`${filtered.length}${hasFilters ? ` van ${listings.length}` : ''} projecten`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek project of stad..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004B46]" />
        </div>
        <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]">
          <option value="">Alle provincies</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Min €"
          className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]" />
        <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Max €"
          className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]" />
        {hasFilters && (
          <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">Reset</button>
        )}
        <div className="flex gap-1 ml-auto">
          {REGIOS.map(r => (
            <button key={r.label} onClick={() => goToRegion(r.lat, r.lng, r.zoom)}
              className="px-2.5 py-1.5 text-[10px] font-medium text-[#004B46] bg-[#004B46]/5 rounded-lg hover:bg-[#004B46]/10 cursor-pointer whitespace-nowrap">
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kaart */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 'calc(100vh - 280px)', minHeight: 500 }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
          >
            {filtered.map(l => (
              <MarkerF
                key={l.id}
                position={{ lat: l.latitude, lng: l.longitude }}
                onClick={() => selectListing(l.id)}
                title={`${l.title || 'Project'} — ${l.price ? `€${l.price.toLocaleString('nl-NL')}` : ''}`}
                icon={{
                  path: 0, // google.maps.SymbolPath.CIRCLE
                  scale: selectedId === l.id ? 9 : 7,
                  fillColor: selectedId === l.id ? '#004B46' : '#0EAE96',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: selectedId === l.id ? 3 : 2,
                }}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-sm text-gray-400">Kaart laden...</div>
          </div>
        )}
      </div>

      {/* Tabel toggle */}
      <button onClick={() => setShowTable(!showTable)}
        className="flex items-center gap-1.5 mt-4 text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
        {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showTable ? 'Lijst verbergen' : `Lijst tonen (${filtered.length})`}
      </button>

      {showTable && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Project', 'Stad', 'Provincie', 'Prijs', 'Type', 'Kamers', 'm²'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(l => (
                  <tr key={l.id} onClick={() => { selectListing(l.id); if (mapRef.current) { mapRef.current.panTo({ lat: l.latitude, lng: l.longitude }); mapRef.current.setZoom(14) } }}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${selectedId === l.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-2.5 font-medium text-[#004B46] truncate max-w-[200px]">{l.title || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{l.municipality || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.province || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{l.price ? `€ ${l.price.toLocaleString('nl-NL')}` : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.property_type || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.rooms || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.size_m2 ? `${l.size_m2} m²` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zijpaneel */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setSelected(null); setSelectedId(null) }} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200 z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{selected.title || 'Project'}</h2>
              <button onClick={() => { setSelected(null); setSelectedId(null) }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selected.main_image_url && (
                <img src={selected.main_image_url} alt="" className="w-full h-48 object-cover" />
              )}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-[#004B46]">{selected.title || 'Project'}</h3>
                  <p className="text-sm text-slate-500">{[selected.municipality, selected.province].filter(Boolean).join(', ')}</p>
                  {selected.address && <p className="text-xs text-slate-400 mt-0.5">{selected.address}</p>}
                </div>
                {selected.price && (
                  <div className="text-xl font-bold text-[#0EAE96]">€ {selected.price.toLocaleString('nl-NL')}</div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  {selected.rooms && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Bed size={14} /> {selected.rooms} slk</div>}
                  {selected.bathrooms && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Bath size={14} /> {selected.bathrooms} bdk</div>}
                  {selected.size_m2 && <div className="flex items-center gap-1.5 text-sm text-slate-600"><Maximize2 size={14} /> {selected.size_m2} m²</div>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.property_type && <Tag label={selected.property_type} />}
                  {selected.is_new_development && <Tag label="Nieuwbouw" />}
                  {selected.has_swimming_pool && <Tag label="Zwembad" />}
                  {selected.has_terrace && <Tag label="Terras" />}
                  {selected.has_parking && <Tag label="Parking" />}
                </div>
                {/* Units per type */}
                {selected.units?.length > 0 && (() => {
                  const groups = groupUnits(selected.units)
                  return (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Beschikbare units ({selected.units.length})
                      </div>
                      <div className="space-y-2">
                        {groups.map((g, i) => (
                          <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-[#004B46]">{g.label}</span>
                              <span className="text-[10px] bg-[#0EAE96]/10 text-[#0EAE96] px-2 py-0.5 rounded-full font-semibold">{g.count}x</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {g.priceMin && (
                                <span>
                                  {g.priceMin === g.priceMax
                                    ? `€ ${g.priceMin.toLocaleString('nl-NL')}`
                                    : `€ ${g.priceMin.toLocaleString('nl-NL')} — ${g.priceMax!.toLocaleString('nl-NL')}`}
                                </span>
                              )}
                              {g.sizeMin && (
                                <span>
                                  {g.sizeMin === g.sizeMax
                                    ? `${g.sizeMin} m²`
                                    : `${g.sizeMin} — ${g.sizeMax} m²`}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {selected.agency_name && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ontwikkelaar</div>
                    <p className="text-sm text-slate-700">{selected.agency_name}</p>
                  </div>
                )}
                {selected.description && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Beschrijving</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{selected.description.substring(0, 500)}{selected.description.length > 500 ? '...' : ''}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
              {selected.url && (
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63]">
                  <ExternalLink size={13} /> Bekijk listing
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </PageLayout>
  )
}

function Tag({ label }: { label: string }) {
  return <span className="text-[10px] bg-[#004B46]/10 text-[#004B46] px-2 py-0.5 rounded-full font-medium">{label}</span>
}
