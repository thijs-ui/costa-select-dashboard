// ============================================================================
// components/nieuwbouw-filterbar.tsx
// ============================================================================
'use client'

import { Search } from 'lucide-react'
import { humanizePropertyType, type ListingFilters } from '@/components/nieuwbouw-types'

interface Props {
  filters: ListingFilters
  setFilters: (next: ListingFilters) => void
  regions: string[]
  propertyTypes: string[]
}

const inpBase: React.CSSProperties = {
  border: '1px solid rgba(0,75,70,0.15)',
  borderRadius: 8, padding: '7px 10px', fontSize: 12,
  background: '#fff', color: '#004B46', fontFamily: 'inherit',
}

export default function NieuwbouwFilterbar({ filters, setFilters, regions, propertyTypes }: Props) {
  const upd = <K extends keyof ListingFilters>(k: K, v: ListingFilters[K]) =>
    setFilters({ ...filters, [k]: v })

  return (
    <div
      style={{
        margin: '0 32px 14px', display: 'flex', gap: 10, alignItems: 'center',
        flexWrap: 'wrap', background: '#fff',
        border: '1px solid rgba(0,75,70,0.12)', borderRadius: 12, padding: '10px 14px',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,75,70,0.04)', borderRadius: 8, padding: '7px 11px',
        flex: 1, minWidth: 220,
      }}>
        <Search size={14} color="#7A8C8B" />
        <input
          value={filters.search}
          onChange={(e) => upd('search', e.target.value)}
          placeholder="Zoek op project, gemeente of regio"
          style={{
            border: 'none', outline: 'none', fontSize: 13, background: 'transparent',
            color: '#004B46', flex: 1, fontFamily: 'inherit',
          }}
        />
      </div>

      <select value={filters.region} onChange={(e) => upd('region', e.target.value)} style={inpBase}>
        <option value="">Alle regio&apos;s</option>
        {regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <select value={filters.propertyType} onChange={(e) => upd('propertyType', e.target.value)} style={inpBase}>
        <option value="">Alle types</option>
        {propertyTypes.map(t => (
          <option key={t} value={t}>{humanizePropertyType(t) ?? t}</option>
        ))}
      </select>

      <div style={{ ...inpBase, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          placeholder="Min €" type="number"
          value={filters.priceMin ?? ''}
          onChange={(e) => upd('priceMin', e.target.value === '' ? null : Number(e.target.value))}
          style={{ border: 'none', outline: 'none', width: 64, fontSize: 12, fontFamily: 'inherit', color: '#004B46', background: 'transparent' }}
        />
        <span style={{ color: '#B3BFBE' }}>–</span>
        <input
          placeholder="Max €" type="number"
          value={filters.priceMax ?? ''}
          onChange={(e) => upd('priceMax', e.target.value === '' ? null : Number(e.target.value))}
          style={{ border: 'none', outline: 'none', width: 64, fontSize: 12, fontFamily: 'inherit', color: '#004B46', background: 'transparent' }}
        />
      </div>

    </div>
  )
}
