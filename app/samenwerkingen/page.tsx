'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  SamAgencyTable,
  SamCardView,
  SamEmpty,
  SamHeader,
  SamPartnerTable,
  SamRegionStrip,
  SamStats,
  SamTeamTable,
  SamToolbar,
  SamTypeToggle,
} from '@/components/samenwerkingen/parts'
import { SamModal } from '@/components/samenwerkingen/Modal'
import {
  REGIONS_AGENCY,
  REGIONS_PARTNER,
  REGIONS_TEAM,
  TYPE_LABELS,
  type Agency,
  type Lang,
  type Partner,
  type SamType,
  type SamView,
  type SortKey,
  type SortState,
  type TeamMember,
} from '@/components/samenwerkingen/types'

type AnyItem = Agency | Partner | TeamMember

interface RawAgency extends Omit<Agency, 'is_preferred' | 'languages' | 'last_contact_days'> {
  is_preferred?: boolean
  languages?: Lang[]
  last_contact_days?: number | null
}

interface RawPartner extends Omit<Partner, 'is_preferred' | 'languages' | 'last_contact_days' | 'is_active'> {
  is_active?: boolean
  is_preferred?: boolean
  languages?: Lang[]
  last_contact_days?: number | null
  reliability_score?: number | null
}

interface RawTeamMember extends Omit<TeamMember, 'is_preferred' | 'last_contact_days' | 'is_active'> {
  is_active?: boolean
  is_preferred?: boolean
  last_contact_days?: number | null
}

function normalizeAgency(a: RawAgency): Agency {
  return {
    ...a,
    is_active: a.is_active ?? true,
    is_preferred: a.is_preferred ?? false,
    languages: a.languages ?? [],
    last_contact_days: a.last_contact_days ?? null,
  }
}

function normalizePartner(p: RawPartner): Partner {
  return {
    ...p,
    is_active: p.is_active ?? true,
    is_preferred: p.is_preferred ?? false,
    languages: p.languages ?? [],
    last_contact_days: p.last_contact_days ?? null,
    reliability_score: p.reliability_score ?? null,
  }
}

function normalizeTeamMember(m: RawTeamMember): TeamMember {
  return {
    ...m,
    is_active: m.is_active ?? true,
    is_preferred: m.is_preferred ?? false,
    last_contact_days: m.last_contact_days ?? null,
    reliability_score: m.reliability_score ?? null,
  }
}

function getSortValue(item: AnyItem, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return item.name.toLowerCase()
    case 'region':
      return (item.region ?? '').toLowerCase()
    case 'type':
      // Partner heeft 'type' enum, TeamMember heeft 'role' string. Beide
      // sorteerbaar via dezelfde key voor UI-consistency.
      if ('type' in item) return (item as Partner).type
      if ('role' in item) return ((item as TeamMember).role ?? '').toLowerCase()
      return ''
    case 'reliability_score':
      return item.reliability_score ?? -1
    case 'last_contact_days':
      return item.last_contact_days ?? Number.POSITIVE_INFINITY
    default:
      return ''
  }
}

function csvQuote(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCSV(filename: string, rows: string[][]): void {
  const bom = '﻿'
  const text = bom + rows.map(r => r.map(csvQuote).join(',')).join('\n')
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SamenwerkingenPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [agencies, setAgencies] = useState<Agency[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const [type, setType] = useState<SamType>('agencies')
  const [view, setView] = useState<SamView>('table')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [partnerType, setPartnerType] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [group, setGroup] = useState(false)
  const [sort, setSort] = useState<SortState>({ key: 'name', dir: 'asc' })
  const [opened, setOpened] = useState<AnyItem | null>(null)

  const load = useCallback(async () => {
    try {
      const [aRes, pRes, tRes] = await Promise.allSettled([
        fetch('/api/agentschappen', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/samenwerkingen', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/team', { credentials: 'include', cache: 'no-store' }),
      ])
      if (aRes.status === 'fulfilled' && aRes.value.ok) {
        const data: RawAgency[] = await aRes.value.json()
        setAgencies(data.map(normalizeAgency))
      }
      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const data: RawPartner[] = await pRes.value.json()
        setPartners(data.map(normalizePartner))
      }
      if (tRes.status === 'fulfilled' && tRes.value.ok) {
        const data: RawTeamMember[] = await tRes.value.json()
        setTeam(data.map(normalizeTeamMember))
      }
    } catch (e) {
      console.error('[load] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // When switching type, reset filters
  const handleTypeChange = useCallback((next: SamType) => {
    setType(next)
    setSearch('')
    setRegion('')
    setPartnerType('')
    setGroup(next === 'agencies')
  }, [])

  // Default grouping: agencies on, partners off (but user can change)
  useEffect(() => {
    setGroup(type === 'agencies')
  }, [type])

  const sourceItems: AnyItem[] =
    type === 'agencies' ? agencies :
    type === 'team'     ? team :
                          partners
  const regions =
    type === 'agencies' ? REGIONS_AGENCY :
    type === 'team'     ? REGIONS_TEAM :
                          REGIONS_PARTNER

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sourceItems.filter(i => {
      if (!showInactive && i.is_active === false) return false
      if (region && i.region !== region) return false
      if (type === 'partners' && partnerType && (i as Partner).type !== partnerType) return false
      if (!q) return true
      const haystack = [
        i.name,
        i.contact_name,
        i.contact_email,
        i.contact_phone,
        i.region,
        (i as Agency).city,
        (i as Partner).specialism,
        (i as TeamMember).role,
        (i as Agency).notes,
        (i as Partner).internal_notes,
        (i as TeamMember).internal_notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [sourceItems, search, region, partnerType, showInactive, type])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const av = getSortValue(a, sort.key)
      const bv = getSortValue(b, sort.key)
      let cmp = 0
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv), 'nl')
      return sort.dir === 'asc' ? cmp : -cmp
    })
    // Pin preferred when sorted by name asc
    if (sort.key === 'name' && sort.dir === 'asc') {
      list.sort((a, b) => Number(!!b.is_preferred) - Number(!!a.is_preferred))
    }
    return list
  }, [filtered, sort])

  const handleSort = useCallback(
    (key: SortKey) => {
      setSort(prev =>
        prev.key === key
          ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
          : { key, dir: 'asc' }
      )
    },
    []
  )

  const hasFilters = !!(search || region || partnerType || !showInactive)

  const onResetFilters = () => {
    setSearch('')
    setRegion('')
    setPartnerType('')
    setShowInactive(true)
  }

  const onOpen = (item: AnyItem) => setOpened(item)
  const onClose = () => setOpened(null)

  const onContact = (item: AnyItem, kind: 'email' | 'whatsapp') => {
    if (kind === 'email' && item.contact_email) {
      window.location.href = `mailto:${item.contact_email}`
    } else if (kind === 'whatsapp' && item.contact_phone) {
      window.open(`https://wa.me/${item.contact_phone.replace(/\D/g, '')}`, '_blank')
    }
  }

  const onCreate = () => {
    const label = type === 'agencies' ? 'makelaar' : type === 'team' ? 'teamlid' : 'partner'
    alert(`Nieuwe ${label} toevoegen — binnenkort beschikbaar.`)
  }
  const onEdit = (item: AnyItem) =>
    alert(`"${item.name}" bewerken — binnenkort beschikbaar.`)

  const onTogglePreferred = async (item: AnyItem) => {
    if (type === 'team') {
      alert('Team-leden zijn read-only — bewerk in Supabase.')
      return
    }
    const next = !item.is_preferred
    const path = type === 'agencies' ? '/api/agentschappen' : '/api/samenwerkingen'
    const res = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: item.id, is_preferred: next }),
      cache: 'no-store',
    })
    if (!res.ok) {
      alert('Kon voorkeur niet wijzigen (veld nog niet beschikbaar in database).')
      return
    }
    if (type === 'agencies') {
      setAgencies(prev => prev.map(a => (a.id === item.id ? { ...a, is_preferred: next } : a)))
    } else {
      setPartners(prev => prev.map(p => (p.id === item.id ? { ...p, is_preferred: next } : p)))
    }
    setOpened(prev => (prev && prev.id === item.id ? { ...prev, is_preferred: next } : prev))
  }

  const onToggleActive = async (item: AnyItem) => {
    if (type === 'team') {
      alert('Team-leden zijn read-only — bewerk in Supabase.')
      return
    }
    const next = !(item.is_active !== false)
    const path = type === 'agencies' ? '/api/agentschappen' : '/api/samenwerkingen'
    const res = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: item.id, is_active: next }),
      cache: 'no-store',
    })
    if (!res.ok) {
      alert('Kon status niet wijzigen.')
      return
    }
    if (type === 'agencies') {
      setAgencies(prev => prev.map(a => (a.id === item.id ? { ...a, is_active: next } : a)))
    } else {
      setPartners(prev => prev.map(p => (p.id === item.id ? { ...p, is_active: next } : p)))
    }
    setOpened(prev => (prev && prev.id === item.id ? { ...prev, is_active: next } : prev))
  }

  const onExport = () => {
    if (type === 'agencies') {
      const rows: string[][] = [
        [
          'Naam',
          'Regio',
          'Plaats',
          'Contact',
          'Telefoon',
          'E-mail',
          'Website',
          'Types',
          'Betrouwbaarheid',
          'Laatste contact (dagen)',
          'Preferred',
          'Actief',
        ],
      ]
      ;(sorted as Agency[]).forEach(a => {
        rows.push([
          a.name,
          a.region,
          a.city ?? '',
          a.contact_name ?? '',
          a.contact_phone ?? '',
          a.contact_email ?? '',
          a.website ?? '',
          (a.property_types ?? []).join(' / '),
          a.reliability_score?.toString() ?? '',
          a.last_contact_days?.toString() ?? '',
          a.is_preferred ? 'ja' : 'nee',
          a.is_active ? 'ja' : 'nee',
        ])
      })
      downloadCSV(`makelaars-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    } else {
      const rows: string[][] = [
        [
          'Naam',
          'Type',
          'Regio',
          'Contact',
          'Telefoon',
          'E-mail',
          'Website',
          'Specialisme',
          'Betrouwbaarheid',
          'Laatste contact (dagen)',
          'Preferred',
          'Actief',
        ],
      ]
      ;(sorted as Partner[]).forEach(p => {
        rows.push([
          p.name,
          TYPE_LABELS[p.type] ?? p.type,
          p.region ?? 'Heel Spanje',
          p.contact_name ?? '',
          p.contact_phone ?? '',
          p.contact_email ?? '',
          p.website ?? '',
          p.specialism ?? '',
          p.reliability_score?.toString() ?? '',
          p.last_contact_days?.toString() ?? '',
          p.is_preferred ? 'ja' : 'nee',
          p.is_active === false ? 'nee' : 'ja',
        ])
      })
      downloadCSV(`partners-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    }
    if (type === 'team') {
      const rows: string[][] = [
        [
          'Naam',
          'Rol',
          'Regio',
          'Contact',
          'Telefoon',
          'E-mail',
          'Betrouwbaarheid',
          'Laatste contact (dagen)',
          'Preferred',
          'Actief',
        ],
      ]
      ;(sorted as TeamMember[]).forEach(m => {
        rows.push([
          m.name,
          m.role ?? '',
          m.region ?? '',
          m.contact_name ?? '',
          m.contact_phone ?? '',
          m.contact_email ?? '',
          m.reliability_score?.toString() ?? '',
          m.last_contact_days?.toString() ?? '',
          m.is_preferred ? 'ja' : 'nee',
          m.is_active === false ? 'nee' : 'ja',
        ])
      })
      downloadCSV(`team-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    }
  }

  const activeCount =
    type === 'agencies' ? agencies.filter(a => a.is_active !== false).length :
    type === 'team'     ? team.filter(m => m.is_active !== false).length :
                          partners.filter(p => p.is_active !== false).length

  return (
    <div className="sam-page">
      <SamHeader
        count={activeCount}
        type={type}
        isAdmin={isAdmin}
        onCreate={onCreate}
        onExport={onExport}
      />

      <div className="sam-body">
        <div className="sam-inner">
          <div style={{ marginBottom: 16 }}>
            <SamTypeToggle
              value={type}
              onChange={handleTypeChange}
              agencyCount={agencies.filter(a => a.is_active !== false).length}
              partnerCount={partners.filter(p => p.is_active !== false).length}
              teamCount={team.filter(m => m.is_active !== false).length}
            />
          </div>

          <SamStats items={sorted} type={type} />

          <SamRegionStrip
            items={sourceItems}
            regions={regions}
            activeRegion={region}
            onRegionClick={setRegion}
            type={type}
          />

          <SamToolbar
            type={type}
            search={search}
            onSearch={setSearch}
            region={region}
            onRegion={setRegion}
            partnerType={partnerType}
            onPartnerType={setPartnerType}
            showInactive={showInactive}
            onShowInactive={setShowInactive}
            group={group}
            onGroup={setGroup}
            view={view}
            onView={setView}
            regions={regions}
          />

          {loading ? (
            <div style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '40px 0' }}>
              Laden…
            </div>
          ) : sorted.length === 0 ? (
            <SamEmpty type={type} hasFilters={hasFilters} onReset={onResetFilters} />
          ) : view === 'cards' ? (
            <SamCardView items={sorted} type={type} onOpen={onOpen} />
          ) : type === 'agencies' ? (
            <SamAgencyTable
              items={sorted as Agency[]}
              group={group}
              sort={sort}
              onSort={handleSort}
              onOpen={onOpen}
              onContact={onContact}
            />
          ) : type === 'team' ? (
            <SamTeamTable
              items={sorted as TeamMember[]}
              group={group}
              sort={sort}
              onSort={handleSort}
              onOpen={onOpen}
              onContact={onContact}
            />
          ) : (
            <SamPartnerTable
              items={sorted as Partner[]}
              group={group}
              sort={sort}
              onSort={handleSort}
              onOpen={onOpen}
              onContact={onContact}
            />
          )}
        </div>
      </div>

      {opened && (
        <SamModal
          item={opened}
          type={type}
          isAdmin={isAdmin}
          onClose={onClose}
          onContact={onContact}
          onEdit={onEdit}
          onTogglePreferred={onTogglePreferred}
          onToggleActive={onToggleActive}
        />
      )}
    </div>
  )
}
