'use client'

import { useState, useMemo, type CSSProperties, type ReactNode, type FormEvent } from 'react'

// ============================================================
// Types
// ============================================================
export interface PjUser {
  id: string
  naam: string | null
  email: string
}

export interface PjPhase {
  id: string
  project_id: string
  name: string
  sort_order: number
}

export interface PjTodo {
  id: string
  project_id: string | null
  phase_id: string | null
  title: string
  status: string
  completed_at: string | null
  is_week_focus: boolean
  assigned_to: string | null
  due_date: string | null
  created_at?: string
}

export interface PjProjectBase {
  id: string
  name: string
  description: string | null
  owner_id: string | null
  target_date: string | null
  status: string
  color: string
  sort_order?: number | null
}

export interface PjProjectDetail extends PjProjectBase {
  phases: PjPhase[]
  todos: PjTodo[]
}

export type PjHealth = 'on_track' | 'at_risk' | 'late' | 'on_hold' | 'done'

export interface PjProjectComputed extends PjProjectBase {
  phases: PjPhase[]
  todos: PjTodo[]
  total: number
  done: number
  open: number
  weekFocus: number
  overdue: number
  velocityPerWeek: number
  estimatedDate: string | null
  currentPhase: PjPhase | null
  daysToDeadline: number
  health: PjHealth
  weekOwner: { user: PjUser; count: number } | null
}

// ============================================================
// Color mapping
// ============================================================
const COLOR_KEYS: Record<string, string> = {
  deepsea: 'var(--pj-deepsea)',
  sun: 'var(--pj-sun)',
  sand: 'var(--pj-sand)',
  sea: 'var(--pj-sea)',
  lavender: 'var(--pj-lavender)',
  terracotta: 'var(--pj-terracotta)',
}

const HEX_TO_KEY: Record<string, string> = {
  '#004b46': 'deepsea',
  '#f5af40': 'sun',
  '#ffe5bd': 'sand',
  '#0eae96': 'sea',
  '#9b8bc4': 'lavender',
  '#c24040': 'terracotta',
}

export function projectColorVar(color: string | null | undefined): string {
  if (!color) return 'var(--pj-deepsea)'
  if (COLOR_KEYS[color]) return COLOR_KEYS[color]
  const key = HEX_TO_KEY[color.toLowerCase()]
  if (key) return COLOR_KEYS[key]
  return color
}

export function colorStyle(color: string | null | undefined): CSSProperties {
  return { ['--pj-card-color' as string]: projectColorVar(color) } as CSSProperties
}

// ============================================================
// Date helpers — fixed reference today: 2026-04-25 in design seed.
// In production we use real today, but logic is identical.
// ============================================================
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function fmtDateNL(date: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateShort(date: string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function daysFrom(date: string | Date | null): number {
  if (!date) return 0
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

// ============================================================
// User helpers
// ============================================================
export function userInitials(u: PjUser | null | undefined): string {
  if (!u) return '··'
  const base = u.naam?.trim() || u.email
  if (!base) return '··'
  const parts = base.replace(/@.+$/, '').split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function userDisplayName(u: PjUser | null | undefined): string {
  if (!u) return '—'
  return u.naam || u.email.split('@')[0]
}

function userColor(u: PjUser): string {
  const palette = ['#0A6B63', '#D4921A', '#9B8BC4', '#0EAE96', '#C24040']
  let h = 0
  for (let i = 0; i < u.id.length; i++) h = (h * 31 + u.id.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

// ============================================================
// Compute project state (matches bundle algorithm)
// ============================================================
export function computeProject(p: PjProjectDetail): PjProjectComputed {
  const total = p.todos.length
  const done = p.todos.filter(t => t.status === 'afgerond').length
  const open = total - done
  const weekFocus = p.todos.filter(t => t.status === 'open' && t.is_week_focus).length
  const overdue = p.todos.filter(t => t.status === 'open' && t.due_date && daysFrom(t.due_date) < 0).length

  const fourteenAgo = new Date()
  fourteenAgo.setDate(fourteenAgo.getDate() - 14)
  const recentlyDone = p.todos.filter(t =>
    t.status === 'afgerond' && t.completed_at && new Date(t.completed_at) >= fourteenAgo
  ).length
  const velocityPerWeek = +(recentlyDone / 2).toFixed(1)

  let estimatedDate: string | null = null
  if (velocityPerWeek > 0 && open > 0) {
    const weeks = open / velocityPerWeek
    const d = new Date()
    d.setDate(d.getDate() + Math.round(weeks * 7))
    estimatedDate = d.toISOString().slice(0, 10)
  }

  let currentPhase: PjPhase | null = null
  for (const ph of p.phases) {
    if (p.todos.some(t => t.phase_id === ph.id && t.status === 'open')) {
      currentPhase = ph
      break
    }
  }
  if (!currentPhase && p.phases.length) currentPhase = p.phases[p.phases.length - 1]

  const daysToDeadline = p.target_date ? daysFrom(p.target_date) : 9999

  let health: PjHealth = 'on_track'
  if (p.status === 'afgerond') health = 'done'
  else if (p.status === 'on hold') health = 'on_hold'
  else if (p.target_date && daysToDeadline < 0) health = 'late'
  else if (estimatedDate && p.target_date && daysFrom(estimatedDate) > daysToDeadline + 3) health = 'at_risk'
  else if (p.target_date && daysToDeadline < 7 && open > velocityPerWeek + 1) health = 'at_risk'

  return {
    ...p,
    total, done, open, weekFocus, overdue,
    velocityPerWeek, estimatedDate, currentPhase, daysToDeadline,
    health,
    weekOwner: null,
  }
}

export function statusInfo(p: { health: PjHealth }): { pill: string; label: string } {
  if (p.health === 'done') return { pill: 'pj-pill--done', label: 'Afgerond' }
  if (p.health === 'on_hold') return { pill: 'pj-pill--hold', label: 'On hold' }
  if (p.health === 'late') return { pill: 'pj-pill--late', label: 'Deadline verstreken' }
  if (p.health === 'at_risk') return { pill: 'pj-pill--warn', label: 'Loopt achter' }
  return { pill: 'pj-pill--ok', label: 'Op schema' }
}

export function deadlineCopy(p: PjProjectComputed): { txt: ReactNode; cls: string } {
  const d = p.daysToDeadline
  if (p.health === 'done') return { txt: <span>Afgerond <strong>{fmtDateShort(p.target_date)}</strong></span>, cls: '' }
  if (p.health === 'on_hold') return { txt: <span>Geparkeerd · doel <strong>{fmtDateShort(p.target_date)}</strong></span>, cls: '' }
  if (!p.target_date) return { txt: <span>Geen deadline</span>, cls: '' }
  if (d < 0) return { txt: <span><strong>{Math.abs(d)} dagen</strong> over deadline</span>, cls: 'pj-deadline--late' }
  if (d <= 7) return { txt: <span>Nog <strong>{d} dagen</strong> tot deadline</span>, cls: 'pj-deadline--warn' }
  return { txt: <span>Deadline <strong>{fmtDateShort(p.target_date)}</strong> · over {d} dagen</span>, cls: '' }
}

// ============================================================
// Icon
// ============================================================
type IconName =
  | 'plus' | 'arrow-left' | 'arrow-right' | 'chevron-up' | 'chevron-down' | 'chevron-right'
  | 'check' | 'check-square' | 'check-check' | 'circle' | 'circle-check'
  | 'pin' | 'flag' | 'target' | 'clock' | 'calendar-days'
  | 'users' | 'user' | 'layers' | 'sparkles' | 'pencil' | 'trash-2'
  | 'grip' | 'more' | 'trending-up' | 'trending-down' | 'list' | 'grid' | 'rotate'

export function PjIcon({ name, size = 16, fill = 'none', strokeWidth = 2, className }: {
  name: IconName; size?: number; fill?: string; strokeWidth?: number; className?: string
}) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill, stroke: 'currentColor' as const, strokeWidth,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>
    case 'arrow-left': return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
    case 'arrow-right': return <svg {...props}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
    case 'chevron-up': return <svg {...props}><path d="M18 15l-6-6-6 6" /></svg>
    case 'chevron-down': return <svg {...props}><path d="M6 9l6 6 6-6" /></svg>
    case 'chevron-right': return <svg {...props}><path d="M9 18l6-6-6-6" /></svg>
    case 'check': return <svg {...props}><path d="M20 6L9 17l-5-5" /></svg>
    case 'check-square': return <svg {...props}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    case 'check-check': return <svg {...props}><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
    case 'circle': return <svg {...props}><circle cx="12" cy="12" r="10" /></svg>
    case 'circle-check': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
    case 'pin': return <svg {...props}><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>
    case 'flag': return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
    case 'target': return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    case 'calendar-days': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></svg>
    case 'users': return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'user': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    case 'layers': return <svg {...props}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
    case 'sparkles': return <svg {...props}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" /></svg>
    case 'pencil': return <svg {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
    case 'trash-2': return <svg {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
    case 'grip': return <svg {...props}><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></svg>
    case 'more': return <svg {...props}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
    case 'trending-up': return <svg {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
    case 'trending-down': return <svg {...props}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></svg>
    case 'list': return <svg {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
    case 'grid': return <svg {...props}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
    case 'rotate': return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /></svg>
    default: return null
  }
}

// ============================================================
// Avatar
// ============================================================
export function PjAvatar({ user, size = 'md' }: { user: PjUser | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  if (!user) return null
  const cls = size === 'sm' ? 'pj-avatar pj-avatar--sm' : size === 'lg' ? 'pj-avatar pj-avatar--lg' : 'pj-avatar'
  return (
    <span className={cls} style={{ background: userColor(user) }} title={userDisplayName(user)}>
      {userInitials(user)}
    </span>
  )
}

// ============================================================
// Header
// ============================================================
export function PjHeader({ activeCount, weekFocus, lateCount, onAdd, creating }: {
  activeCount: number; weekFocus: number; lateCount: number; onAdd: () => void; creating?: boolean
}) {
  return (
    <header className="pj-hero">
      <div>
        <div className="pj-hero-eyebrow"><span>Costa Select · Operationeel · Projecten</span></div>
        <h1 className="pj-hero-title">Projecten</h1>
        <p className="pj-hero-lede">
          <strong>{activeCount} actieve initiatieven</strong>
          {lateCount > 0 ? <>, {lateCount === 1 ? 'één' : lateCount} over deadline</> : null}
          {`, en `}<strong>{weekFocus} taken in focus deze week.</strong>{' '}
          Klik op een project om fases en taken te beheren.
        </p>
      </div>
      <div className="pj-hero-actions">
        <button className="pj-btn pj-btn--primary" onClick={onAdd} disabled={creating}>
          <PjIcon name="plus" size={15} /> {creating ? 'Bezig…' : 'Project toevoegen'}
        </button>
      </div>
    </header>
  )
}

// ============================================================
// Stats
// ============================================================
export interface PjStatTile {
  label: string
  value: ReactNode
  sub: ReactNode
  variant?: 'accent' | 'warn'
}

export function PjStats({ tiles }: { tiles: PjStatTile[] }) {
  return (
    <div className="pj-stats">
      {tiles.map((t, i) => (
        <div key={i} className={`pj-stat ${t.variant ? `pj-stat--${t.variant}` : ''}`}>
          <div className="pj-stat-label">{t.label}</div>
          <div className="pj-stat-value">{t.value}</div>
          <div className="pj-stat-sub">{t.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Filters / View toggle
// ============================================================
export type PjFilter = 'alles' | 'actief' | 'on hold' | 'afgerond'
export type PjView = 'kanban' | 'compact'
export type PjSort = 'deadline' | 'naam' | 'voortgang'

export function PjFilters({ filter, onFilter, view, onView, sort, onSort, counts }: {
  filter: PjFilter; onFilter: (f: PjFilter) => void
  view: PjView; onView: (v: PjView) => void
  sort: PjSort; onSort: (s: PjSort) => void
  counts: Record<PjFilter, number>
}) {
  const chips: { id: PjFilter; label: string }[] = [
    { id: 'alles', label: 'Alles' },
    { id: 'actief', label: 'Actief' },
    { id: 'on hold', label: 'On hold' },
    { id: 'afgerond', label: 'Afgerond' },
  ]
  return (
    <div className="pj-toolbar">
      <div className="pj-chips">
        {chips.map(c => (
          <button key={c.id}
            className={`pj-chip ${filter === c.id ? 'pj-chip--active' : ''}`}
            onClick={() => onFilter(c.id)}>
            {c.label} <span className="pj-chip-count">{counts[c.id]}</span>
          </button>
        ))}
      </div>
      <div className="pj-toolbar-right">
        <div className="pj-sort">
          Sorteer
          <select className="pj-select" value={sort} onChange={e => onSort(e.target.value as PjSort)}>
            <option value="deadline">Op deadline</option>
            <option value="naam">Op naam</option>
            <option value="voortgang">Op voortgang</option>
          </select>
        </div>
        <div className="pj-view-toggle">
          <button className={view === 'kanban' ? 'is-active' : ''} onClick={() => onView('kanban')}>
            <PjIcon name="grid" size={14} /> Kanban
          </button>
          <button className={view === 'compact' ? 'is-active' : ''} onClick={() => onView('compact')}>
            <PjIcon name="list" size={14} /> Compact
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Project card (kanban)
// ============================================================
export function PjProjectCard({ p, owner, onOpen }: {
  p: PjProjectComputed; owner: PjUser | null; onOpen: (id: string) => void
}) {
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
  const weekPct = p.total > 0 ? Math.round(((p.done + p.weekFocus) / p.total) * 100) - pct : 0
  const status = statusInfo(p)
  const dl = deadlineCopy(p)

  return (
    <article className="pj-card" style={colorStyle(p.color)} onClick={() => onOpen(p.id)}>
      <div className="pj-card-head">
        <div className="pj-card-titleblock">
          <div className={`pj-pill ${status.pill}`} style={{ marginBottom: 8 }}>{status.label}</div>
          <h3 className="pj-card-title">{p.name}</h3>
          {p.description && <p className="pj-card-desc">{p.description}</p>}
        </div>
        <div className="pj-card-owner"><PjAvatar user={owner} /></div>
      </div>

      {p.currentPhase && (
        <div className="pj-phase-track">
          <span className="pj-phase-current"><PjIcon name="layers" size={12} /> {p.currentPhase.name}</span>
        </div>
      )}

      <div className="pj-progress">
        <div className="pj-progress-bar">
          <div className="pj-progress-fill" style={{ width: pct + '%' }} />
          {weekPct > 0 && p.health !== 'done' && (
            <div className="pj-progress-week" style={{ left: pct + '%', width: weekPct + '%' }} />
          )}
        </div>
        <div className="pj-progress-meta">
          <span className="pj-progress-pct">{pct}% · {p.done}/{p.total} taken</span>
          {p.estimatedDate && p.health !== 'done' && p.health !== 'on_hold' && (
            <span>Prognose afronding {fmtDateShort(p.estimatedDate)}</span>
          )}
        </div>
      </div>

      <div className="pj-counts">
        <span className="pj-counts-l"><PjIcon name="check-square" size={14} /> <strong>{p.open}</strong> open</span>
        <span className={`pj-focus-pill ${p.weekFocus === 0 ? 'pj-focus-pill--off' : ''}`}>
          <PjIcon name="pin" size={11} /> {p.weekFocus} focus deze week
        </span>
      </div>

      <footer className="pj-card-foot">
        <span className={`pj-deadline ${dl.cls}`}>
          <PjIcon name="calendar-days" size={13} /> {dl.txt}
        </span>
        {p.velocityPerWeek > 0 && (
          <span className="pj-velocity">
            <PjIcon name="trending-up" size={13} /> {p.velocityPerWeek}/wk
          </span>
        )}
      </footer>
    </article>
  )
}

// ============================================================
// Compact row (list view)
// ============================================================
export function PjProjectRow({ p, owner, onOpen }: {
  p: PjProjectComputed; owner: PjUser | null; onOpen: (id: string) => void
}) {
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
  const status = statusInfo(p)
  const dl = deadlineCopy(p)
  return (
    <div className="pj-row" style={colorStyle(p.color)} onClick={() => onOpen(p.id)}>
      <div className="pj-row-name">
        {p.name}
        <span>{p.currentPhase?.name || '—'}</span>
      </div>
      <div className={`pj-pill ${status.pill}`}>{status.label}</div>
      <div className="pj-row-progress">
        <div className="pj-progress-bar"><div className="pj-progress-fill" style={{ width: pct + '%' }} /></div>
        <div className="pj-progress-meta"><span><strong>{pct}%</strong> · {p.done}/{p.total}</span></div>
      </div>
      <div className="pj-row-meta">
        <span className={`pj-deadline ${dl.cls}`}>{dl.txt}</span>
      </div>
      <span className={`pj-focus-pill ${p.weekFocus === 0 ? 'pj-focus-pill--off' : ''}`}>
        <PjIcon name="pin" size={11} /> {p.weekFocus}
      </span>
      <PjAvatar user={owner} size="sm" />
    </div>
  )
}

// ============================================================
// Attention band
// ============================================================
export function PjAttention({ projects, getOwner, onOpen }: {
  projects: PjProjectComputed[]
  getOwner: (id: string | null) => PjUser | null
  onOpen: (id: string) => void
}) {
  if (!projects.length) return null
  return (
    <section className="pj-attention">
      <div className="pj-attention-head">
        <span className="pj-attention-icon"><PjIcon name="flag" size={18} /></span>
        <div>
          <h3>Vraagt aandacht</h3>
          <div style={{ fontSize: 12.5, color: 'var(--pj-fg-muted)', marginTop: 2 }}>
            {projects.length === 1 ? 'Één project loopt' : `${projects.length} projecten lopen`} achter op planning of zijn over deadline.
          </div>
        </div>
      </div>
      <div className="pj-attention-rows">
        {projects.map(p => {
          const status = statusInfo(p)
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
          const owner = getOwner(p.owner_id)
          return (
            <div key={p.id} className="pj-att-row" style={colorStyle(p.color)} onClick={() => onOpen(p.id)}>
              <div className="pj-att-name">
                {p.name}
                <span>{p.currentPhase?.name}</span>
              </div>
              <div className={`pj-pill ${status.pill}`}>{status.label}</div>
              <div className="pj-att-meta">
                {p.daysToDeadline < 0
                  ? `${Math.abs(p.daysToDeadline)} dagen over deadline`
                  : `Prognose: ${fmtDateShort(p.estimatedDate || p.target_date)}`}
              </div>
              <div className="pj-att-progress">
                <div className="pj-progress-bar"><div className="pj-progress-fill" style={{ width: pct + '%' }} /></div>
              </div>
              <PjAvatar user={owner} size="sm" />
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ============================================================
// Archive
// ============================================================
export function PjArchive({ projects, getOwner, onOpen }: {
  projects: PjProjectComputed[]
  getOwner: (id: string | null) => PjUser | null
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (!projects.length) return null
  return (
    <section className="pj-archive">
      <button className="pj-archive-toggle" onClick={() => setOpen(o => !o)}>
        <PjIcon name={open ? 'chevron-down' : 'chevron-right'} size={18} />
        Afgerond &amp; on hold
        <span className="pj-arch-count">{projects.length}</span>
      </button>
      {open && (
        <div className="pj-archive-list">
          {projects.map(p => {
            const owner = getOwner(p.owner_id)
            const status = statusInfo(p)
            return (
              <div key={p.id} className="pj-archive-card" style={colorStyle(p.color)} onClick={() => onOpen(p.id)}>
                <div className="pj-archive-name">
                  {p.name}
                  <span>{p.done}/{p.total} taken · {fmtDateShort(p.target_date)}</span>
                </div>
                <div className="pj-archive-foot">
                  <span className={`pj-pill ${status.pill}`}>{status.label}</span>
                  <PjAvatar user={owner} size="sm" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ============================================================
// Empty state
// ============================================================
export function PjEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="pj-empty">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="14" width="48" height="40" rx="4" />
        <path d="M8 24h48" />
        <path d="M18 8v10M46 8v10" />
        <circle cx="22" cy="36" r="2" />
        <path d="M28 36h18M28 44h12" />
      </svg>
      <h3>Nog geen projecten</h3>
      <p>
        Costa Select projecten zijn interne initiatieven — een marketing-campagne,
        een team-training, een platform-feature. Maak je eerste project aan om de
        fases en taken erbij te plannen.
      </p>
      <button className="pj-btn pj-btn--primary" onClick={onAdd}>
        <PjIcon name="plus" size={15} /> Eerste project starten
      </button>
    </div>
  )
}

// ============================================================
// Detail — phase column + todo row
// ============================================================
export function PjPhaseColumn({ phase, todos, users, onToggle, onPin, onAddTodo, onRenamePhase, onDeletePhase }: {
  phase: PjPhase
  todos: PjTodo[]
  users: PjUser[]
  onToggle: (todoId: string) => void
  onPin: (todoId: string) => void
  onAddTodo: (phaseId: string) => void
  onRenamePhase: (phaseId: string, name: string) => void
  onDeletePhase: (phaseId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameValue, setNameValue] = useState(phase.name)
  const done = todos.filter(t => t.status === 'afgerond').length
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0

  function commitName() {
    setEditing(false)
    if (nameValue.trim() && nameValue.trim() !== phase.name) onRenamePhase(phase.id, nameValue.trim())
    else setNameValue(phase.name)
  }

  return (
    <div className="pj-phase">
      <div className="pj-phase-head">
        <span className="pj-phase-grip"><PjIcon name="grip" size={14} /></span>
        {editing ? (
          <input
            autoFocus
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') { setNameValue(phase.name); setEditing(false) }
            }}
            className="pj-phase-name"
            style={{
              background: 'transparent',
              border: '0 0 1px 0',
              borderBottom: '1px solid var(--pj-deepsea)',
              outline: 'none',
              padding: 0,
              flex: 1,
            }}
          />
        ) : (
          <h4 className="pj-phase-name" onDoubleClick={() => setEditing(true)} style={{ cursor: 'text' }}>
            {phase.name}
          </h4>
        )}
        <span className="pj-phase-counts"><strong>{done}</strong>/{todos.length}</span>
        <button className="pj-phase-collapse" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Uitklappen' : 'Inklappen'}>
          <PjIcon name={collapsed ? 'chevron-right' : 'chevron-down'} size={16} />
        </button>
        <button
          className="pj-phase-collapse"
          onClick={() => onDeletePhase(phase.id)}
          title="Fase verwijderen"
        >
          <PjIcon name="trash-2" size={14} />
        </button>
      </div>
      <div className="pj-phase-progress">
        <div className="pj-phase-progress-fill" style={{ width: pct + '%' }} />
      </div>
      {!collapsed && (
        <>
          <div className="pj-todos">
            {todos.map(t => (
              <PjTodoRow
                key={t.id}
                todo={t}
                assignee={users.find(u => u.id === t.assigned_to) || null}
                onToggle={() => onToggle(t.id)}
                onPin={() => onPin(t.id)}
              />
            ))}
          </div>
          <button className="pj-add-row" onClick={() => onAddTodo(phase.id)}>
            <PjIcon name="plus" size={14} /> Taak toevoegen aan {phase.name.toLowerCase()}
          </button>
        </>
      )}
    </div>
  )
}

export function PjTodoRow({ todo, assignee, onToggle, onPin }: {
  todo: PjTodo
  assignee: PjUser | null
  onToggle: () => void
  onPin: () => void
}) {
  const isDone = todo.status === 'afgerond'
  const days = todo.due_date ? daysFrom(todo.due_date) : null
  let cls = ''
  if (!isDone && days !== null) {
    if (days < 0) cls = 'pj-todo-deadline--late'
    else if (days <= 7) cls = 'pj-todo-deadline--warn'
  }
  return (
    <div className={`pj-todo ${isDone ? 'pj-todo--done' : ''}`}>
      <span className="pj-todo-grip"><PjIcon name="grip" size={12} /></span>
      <button className="pj-todo-check" onClick={onToggle} aria-label={isDone ? 'Markeer als open' : 'Markeer als afgerond'}>
        {isDone && <PjIcon name="check" size={14} />}
      </button>
      <div className="pj-todo-desc">{todo.title}</div>
      {todo.due_date && (
        <span className={`pj-todo-deadline ${cls}`}>
          <PjIcon name="calendar-days" size={11} />
          {isDone ? fmtDateShort(todo.completed_at) : fmtDateShort(todo.due_date)}
        </span>
      )}
      <PjAvatar user={assignee} size="sm" />
      <button
        className={`pj-todo-pin ${todo.is_week_focus ? 'pj-todo-pin--active' : ''}`}
        onClick={onPin}
        title={todo.is_week_focus ? 'Focus deze week — klik om uit te zetten' : 'Pin als focus deze week'}
      >
        <PjIcon name="pin" size={14} />
      </button>
    </div>
  )
}

// ============================================================
// Aside — quick add + week-owner
// ============================================================
export function PjAside({ project, users, onAdd }: {
  project: PjProjectComputed
  users: PjUser[]
  onAdd: (input: { title: string; phase_id: string; due_date: string | null; assigned_to: string | null }) => void
}) {
  const [desc, setDesc] = useState('')
  const [phaseId, setPhaseId] = useState(project.phases[0]?.id || '')
  const [deadline, setDeadline] = useState('')
  const [assignee, setAssignee] = useState(project.owner_id || users[0]?.id || '')

  const weekOwner = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of project.todos) {
      if (t.status !== 'open' || !t.assigned_to) continue
      counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (!top) return null
    const u = users.find(usr => usr.id === top[0])
    return u ? { user: u, count: top[1] } : null
  }, [project.todos, users])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!desc.trim() || !phaseId) return
    onAdd({
      title: desc.trim(),
      phase_id: phaseId,
      due_date: deadline || null,
      assigned_to: assignee || null,
    })
    setDesc('')
    setDeadline('')
  }

  return (
    <aside className="pj-aside">
      <div className="pj-aside-card">
        <h4 className="pj-aside-title"><PjIcon name="plus" size={14} /> Snel toevoegen</h4>
        <form className="pj-quick" onSubmit={submit}>
          <input
            className="pj-quick-input"
            placeholder="Wat moet er gebeuren?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <select className="pj-quick-select" value={phaseId} onChange={e => setPhaseId(e.target.value)}>
            {project.phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pj-quick-row">
            <input
              className="pj-quick-input"
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
            <select className="pj-quick-select" value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="">Niet toegewezen</option>
              {users.map(u => <option key={u.id} value={u.id}>{userDisplayName(u)}</option>)}
            </select>
          </div>
          <button type="submit" className="pj-btn pj-btn--primary" style={{ justifyContent: 'center' }}>
            Taak toevoegen
          </button>
        </form>
      </div>

      {weekOwner && (
        <div className="pj-aside-card">
          <h4 className="pj-aside-title"><PjIcon name="sparkles" size={14} /> Eigenaar van de week</h4>
          <div className="pj-week-owner">
            <PjAvatar user={weekOwner.user} size="lg" />
            <div className="pj-week-owner-meta">
              <div className="pj-week-owner-name">{userDisplayName(weekOwner.user)}</div>
              <div className="pj-week-owner-sub">Meest betrokken op dit project</div>
            </div>
            <div className="pj-week-owner-count">{weekOwner.count}</div>
          </div>
        </div>
      )}
    </aside>
  )
}
