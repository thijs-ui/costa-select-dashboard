'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  PjHeader, PjStats, PjFilters, PjProjectCard, PjProjectRow,
  PjAttention, PjArchive, PjEmpty,
  computeProject,
  type PjProjectComputed, type PjProjectDetail, type PjUser,
  type PjFilter, type PjView, type PjSort, type PjStatTile,
} from '@/components/projecten/parts'

export default function ProjectenPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [projects, setProjects] = useState<PjProjectComputed[]>([])
  const [users, setUsers] = useState<PjUser[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<PjFilter>('alles')
  const [view, setView] = useState<PjView>('kanban')
  const [sort, setSort] = useState<PjSort>('deadline')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [projRes, usersRes] = await Promise.allSettled([
          fetch('/api/projecten', { cache: 'no-store' }),
          fetch('/api/todos/users', { cache: 'no-store' }),
        ])
        if (cancelled) return
        if (projRes.status === 'fulfilled' && projRes.value.ok) {
          const raw: PjProjectDetail[] = await projRes.value.json()
          setProjects(raw.map(computeProject))
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          const data = await usersRes.value.json()
          setUsers(data.users ?? [])
        }
      } catch (e) {
        console.error('[load] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function open(id: string) {
    router.push(`/projecten/${id}`)
  }

  function getOwner(id: string | null) {
    if (!id) return null
    return users.find(u => u.id === id) || null
  }

  async function onAdd() {
    setCreating(true)
    const res = await fetch('/api/projecten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nieuw project', owner_id: user?.id }),
      cache: 'no-store',
    })
    if (res.ok) {
      const proj = await res.json()
      router.push(`/projecten/${proj.id}`)
    }
    setCreating(false)
  }

  const counts = useMemo<Record<PjFilter, number>>(() => ({
    alles: projects.length,
    actief: projects.filter(p => p.status === 'actief').length,
    'on hold': projects.filter(p => p.status === 'on hold').length,
    afgerond: projects.filter(p => p.status === 'afgerond').length,
  }), [projects])

  const totalActief = counts.actief
  const weekFocusTotal = projects.reduce((s, p) => s + p.weekFocus, 0)
  const lateCount = projects.filter(p => p.status === 'actief' && p.health === 'late').length

  const monthStart = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const doneThisMonth = projects.reduce((s, p) =>
    s + p.todos.filter(t => t.status === 'afgerond' && t.completed_at && new Date(t.completed_at) >= monthStart).length
  , 0)

  const monthLabel = new Date().toLocaleDateString('nl-NL', { month: 'long' })
  const focusProjectCount = projects.filter(p => p.weekFocus > 0).length

  const tiles: PjStatTile[] = [
    {
      label: 'Actieve projecten',
      value: totalActief,
      sub: `van ${projects.length} totaal`,
      variant: 'accent',
    },
    {
      label: 'Week-focus taken',
      value: weekFocusTotal,
      sub: focusProjectCount === 1 ? 'verdeeld over 1 project' : `verdeeld over ${focusProjectCount} projecten`,
    },
    {
      label: `Afgerond ${monthLabel}`,
      value: doneThisMonth,
      sub: 'taken deze maand',
    },
    {
      label: 'Loopt achter',
      value: lateCount,
      sub: lateCount === 1 ? 'project over deadline' : 'projecten over deadline',
      variant: 'warn',
    },
  ]

  const filtered = useMemo(() => {
    let list = projects.slice()
    if (filter === 'actief') list = list.filter(p => p.status === 'actief')
    if (filter === 'on hold') list = list.filter(p => p.status === 'on hold')
    if (filter === 'afgerond') list = list.filter(p => p.status === 'afgerond')
    if (sort === 'deadline') list.sort((a, b) => {
      const av = a.target_date ? new Date(a.target_date).getTime() : Number.POSITIVE_INFINITY
      const bv = b.target_date ? new Date(b.target_date).getTime() : Number.POSITIVE_INFINITY
      return av - bv
    })
    if (sort === 'naam') list.sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'voortgang') list.sort((a, b) => {
      const ap = a.total > 0 ? a.done / a.total : 0
      const bp = b.total > 0 ? b.done / b.total : 0
      return bp - ap
    })
    return list
  }, [filter, sort, projects])

  const showArchiveSplit = filter === 'alles'
  const activeList = showArchiveSplit ? filtered.filter(p => p.status === 'actief') : filtered
  const archiveList = showArchiveSplit ? filtered.filter(p => p.status !== 'actief') : []
  const attention = activeList.filter(p => p.health === 'late' || p.health === 'at_risk')
  const onTrack = activeList.filter(p => !attention.includes(p))

  if (loading) {
    return (
      <div className="pj-page">
        <div className="pj-shell">
          <div style={{ color: 'var(--pj-fg-subtle)', fontSize: 13 }}>Laden…</div>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="pj-page">
        <div className="pj-shell">
          <PjHeader activeCount={0} weekFocus={0} lateCount={0} onAdd={onAdd} creating={creating} />
          <PjEmpty onAdd={onAdd} />
        </div>
      </div>
    )
  }

  return (
    <div className="pj-page">
      <div className="pj-shell">
        <PjHeader activeCount={totalActief} weekFocus={weekFocusTotal} lateCount={lateCount} onAdd={onAdd} creating={creating} />
        <PjStats tiles={tiles} />
        <PjFilters
          filter={filter} onFilter={setFilter}
          view={view} onView={setView}
          sort={sort} onSort={setSort}
          counts={counts}
        />

        {showArchiveSplit && attention.length > 0 && (
          <PjAttention projects={attention} getOwner={getOwner} onOpen={open} />
        )}

        {showArchiveSplit ? (
          <>
            <div className="pj-section-head">
              <h2 className="pj-section-title">Op koers</h2>
              <span className="pj-section-meta">{onTrack.length} projecten</span>
            </div>
            {view === 'kanban' ? (
              <div className="pj-grid">
                {onTrack.map(p => <PjProjectCard key={p.id} p={p} owner={getOwner(p.owner_id)} onOpen={open} />)}
              </div>
            ) : (
              <div className="pj-grid pj-grid--compact">
                {onTrack.map(p => <PjProjectRow key={p.id} p={p} owner={getOwner(p.owner_id)} onOpen={open} />)}
              </div>
            )}
            <PjArchive projects={archiveList} getOwner={getOwner} onOpen={open} />
          </>
        ) : (
          view === 'kanban' ? (
            <div className="pj-grid">
              {filtered.map(p => <PjProjectCard key={p.id} p={p} owner={getOwner(p.owner_id)} onOpen={open} />)}
            </div>
          ) : (
            <div className="pj-grid pj-grid--compact">
              {filtered.map(p => <PjProjectRow key={p.id} p={p} owner={getOwner(p.owner_id)} onOpen={open} />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
