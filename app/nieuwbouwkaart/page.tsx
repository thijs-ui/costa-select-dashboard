// ============================================================================
// app/dashboard/nieuwbouwkaart/page.tsx
//
// Volledige pagina: topbar, filterbar, Google Map met pins, detail-sidebar.
// Leest listings + units uit Supabase (costa-select-nieuwbouw schema).
// Amenities zijn verwacht mee te komen per listing — pas `fetchListings()` aan
// als jouw backend daar een andere route voor heeft.
// ============================================================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import NieuwbouwFilterbar from '@/components/nieuwbouw-filterbar'
import NieuwbouwDetail from '@/components/nieuwbouw-detail'
import NieuwbouwMap, { LoadingCard } from '@/components/nieuwbouw-map'
import { CircleCheck, TrendingUp } from 'lucide-react'
import type { Amenity, Listing, ListingFilters } from '@/components/nieuwbouw-types'
import { DossierModal, type DossierModalItem } from '@/components/woninglijst/DossierModal'

// nearby_amenities gebruikt NL-keys in de DB. We mappen naar EN-kinds voor de icon-lookup
// in amenityMeta() en zetten `name` op basis van NL-labels.
const AMENITY_KIND_MAP: Record<string, string> = {
  strand: 'beach', supermarkt: 'supermarket', restaurant: 'restaurant', bar: 'bar',
  luchthaven: 'airport', treinstation: 'train', ziekenhuis: 'hospital',
  school: 'school', apotheek: 'pharmacy', golfbaan: 'golf',
}
const AMENITY_NAMES: Record<string, string> = {
  strand: 'Strand', supermarkt: 'Supermarkt', restaurant: 'Restaurant', bar: 'Bar / café',
  luchthaven: 'Luchthaven', treinstation: 'Treinstation', ziekenhuis: 'Ziekenhuis',
  school: 'School', apotheek: 'Apotheek', golfbaan: 'Golfbaan',
}

function mapAmenities(raw: unknown): Amenity[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw as Record<string, { distance_km: number; distance_min: number } | null>)
    .filter(([, v]) => v != null)
    .map(([rawKey, v]) => ({
      kind: AMENITY_KIND_MAP[rawKey] ?? rawKey,
      name: AMENITY_NAMES[rawKey] ?? rawKey,
      distance_km: v!.distance_km,
      travel_min: v!.distance_min,
    }))
}

const emptyFilters: ListingFilters = {
  search: '', region: '', propertyType: '',
  priceMin: null, priceMax: null, roomsMin: null, roomsMax: null,
}

// Vaste volgorde van regio's in de filter-dropdown — alfabetisch op
// stringvergelijking zou 'Costa Cálida' boven 'Costa Blanca' zetten;
// ophalen-volgorde houden we aan voor leesbaarheid.
const REGION_ORDER = [
  'Costa del Sol',
  'Costa Blanca Noord',
  'Costa Blanca Zuid',
  'Costa Cálida',
  'Valencia',
]

// Module-level in-memory cache — overleeft SPA-navigatie binnen één session
// maar wordt geleegd bij een full page reload. TTL houdt 'm vers genoeg
// (idealista-sync draait dagelijks; 10 min is ruim binnen die window).
const LISTINGS_CACHE_TTL_MS = 10 * 60 * 1000
let listingsCache: { data: Listing[]; ts: number } | null = null
function getCachedListings(): Listing[] | null {
  if (!listingsCache) return null
  if (Date.now() - listingsCache.ts > LISTINGS_CACHE_TTL_MS) {
    listingsCache = null
    return null
  }
  return listingsCache.data
}

export default function NieuwbouwkaartPage() {
  // Initialiseer met cache-hit zodat de eerste render al data heeft — geen
  // loading-spinner meer bij terug-navigeren binnen TTL.
  const cached = typeof window !== 'undefined' ? getCachedListings() : null
  const [listings, setListings] = useState<Listing[]>(cached ?? [])
  const [loading, setLoading] = useState(cached === null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filters, setFilters] = useState<ListingFilters>(emptyFilters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [presentatieTarget, setPresentatieTarget] = useState<
    | (DossierModalItem & { listing_id: string })
    | null
  >(null)

  // Listings komen uit het Bots-Supabase project via /api/nieuwbouw.
  // nearby_amenities (JSONB) → amenities[] client-side. Cache-hit slaat
  // de fetch over; cache-miss vult 'm voor de volgende navigatie.
  useEffect(() => {
    if (getCachedListings()) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const res = await fetch('/api/nieuwbouw')
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}${body ? ' — ' + body.slice(0, 240) : ''}`)
        }
        const data = (await res.json()) as (Listing & { nearby_amenities?: unknown })[]
        const processed = data.map(l => ({ ...l, amenities: mapAmenities(l.nearby_amenities) }))
        if (cancelled) return
        listingsCache = { data: processed, ts: Date.now() }
        setListings(processed)
      } catch (err) {
        console.error('[NIEUWBOUW]', err)
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : String(err))
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Derived: region + type options. Regions in vaste volgorde (zie REGION_ORDER).
  const regions = useMemo(() => {
    const present = new Set(listings.map(l => l.region).filter(Boolean) as string[])
    const ordered = REGION_ORDER.filter(r => present.has(r))
    const extras = [...present].filter(r => !REGION_ORDER.includes(r)).sort()
    return [...ordered, ...extras]
  }, [listings])
  const propertyTypes = useMemo(
    () => [...new Set(listings.map(l => l.property_type).filter(Boolean))].sort() as string[],
    [listings]
  )

  // Filtered listings — used for pins + stats
  const filtered = useMemo(() => listings.filter(l => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${l.title ?? ''} ${l.municipality ?? ''} ${l.region ?? ''} ${l.province ?? ''} ${l.address ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (filters.region && l.region !== filters.region) return false
    if (filters.propertyType && l.property_type !== filters.propertyType) return false
    if (filters.priceMin != null && (l.price ?? 0) < filters.priceMin) return false
    if (filters.priceMax != null && (l.price ?? Infinity) > filters.priceMax) return false
    return true
  }), [listings, filters])

  const selected = selectedId ? filtered.find(l => l.id === selectedId) ?? null : null

  function openPresentatieModal(listing: Listing) {
    setPresentatieTarget({
      title: listing.title || 'Nieuwbouwproject',
      url: '',
      listing_id: listing.id,
    })
  }

  async function generateNewbuildPresentatie(): Promise<{ id: string | null }> {
    if (!presentatieTarget) return { id: null }
    const res = await fetch('/api/dossier/generate-from-newbuild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: presentatieTarget.listing_id, mode: 'presentatie' }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Genereren mislukt')
    }
    const data = await res.json()
    return { id: data.id ?? null }
  }

  return (
    <PageLayout title="Nieuwbouwkaart">
      {/* Topbar meta */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    gap: 16, marginTop: -16, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#7A8C8B' }}>
          {filtered.length} actieve projecten · bron: Idealista · laatst bijgewerkt{' '}
          {listings[0]?.last_seen_at
            ? new Date(listings[0].last_seen_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatChip icon={<CircleCheck size={14} color="#0EAE96" />} label={`${filtered.length} actief`} />
          <StatChip icon={<TrendingUp size={14} color="#F5AF40" />} label="+4 deze week" />
        </div>
      </div>

      <NieuwbouwFilterbar
        filters={filters}
        setFilters={setFilters}
        regions={regions}
        propertyTypes={propertyTypes}
      />

      <div style={{
        position: 'relative', minHeight: 960, borderRadius: 14, overflow: 'hidden',
        border: '1px solid rgba(0,75,70,0.12)', background: '#DDE9E6', margin: '0 32px 32px',
      }}>
        <NieuwbouwMap
          listings={filtered}
          selectedId={selectedId}
          onSelect={setSelectedId}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ''}
        />

        {selected && (
          <NieuwbouwDetail
            listing={selected}
            onClose={() => setSelectedId(null)}
            onGenerateDossier={openPresentatieModal}
          />
        )}

        <DossierModal
          item={presentatieTarget}
          onClose={() => setPresentatieTarget(null)}
          onGenerate={generateNewbuildPresentatie}
        />

        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none',
            background: 'rgba(238,245,243,0.55)', backdropFilter: 'blur(1px)',
          }}>
            <LoadingCard label="Projecten laden…" />
          </div>
        )}

        {errorMsg && !loading && (
          <div style={{
            position: 'absolute', top: 14, left: 14, right: 14, zIndex: 5,
            background: '#FFFAEF', border: '1px solid #C84B36', borderRadius: 10,
            padding: '12px 14px', color: '#7A2E20', fontSize: 12, lineHeight: 1.5,
            boxShadow: '0 8px 24px rgba(122,46,32,.18)',
          }}>
            <b style={{ display: 'block', marginBottom: 4 }}>Listings konden niet geladen worden</b>
            <code style={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{errorMsg}</code>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,75,70,0.12)', borderRadius: 10,
      padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, color: '#004B46',
    }}>
      {icon}{label}
    </div>
  )
}
