'use client'

import Link from 'next/link'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Route as RouteIcon,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'check-square': CheckSquare,
  'check-circle': CheckCircle2,
  'circle-check': CheckCircle2,
  'calendar-days': CalendarDays,
  users: Users,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'message-square': MessageSquare,
  compass: Compass,
  'layout-dashboard': LayoutDashboard,
  'file-text': FileText,
  'file-plus-2': FileText,
  zap: Zap,
  'user-plus': UserPlus,
  'trending-up': TrendingUp,
  route: RouteIcon,
  sparkles: Sparkles,
  'map-pin': MapPin,
  'arrow-right': ArrowRight,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  clock: Clock,
}

function Icon({ name, size }: { name: string; size?: number }) {
  const Cmp = ICON_MAP[name] ?? Sparkles
  return <Cmp size={size} />
}

/* ── Hero pill ───────────────────────────────────────── */
export interface HmPill {
  kind: string
  label: string
  meta?: string
  tone: 'sun' | 'deepsea'
  href?: string
}

/* ── Hero ────────────────────────────────────────────── */
export interface HmSummaryParts {
  before: string
  numA: string
  middle: string
  numB: string
  end: string
}

export function HmHero({
  greeting,
  name,
  dateLabel,
  summary,
  pills,
  isAdmin,
}: {
  greeting: string
  name: string
  dateLabel: string
  summary: HmSummaryParts
  pills: HmPill[]
  isAdmin: boolean
}) {
  return (
    <header className="hm-hero">
      <div className="hm-utility">
        <div className="hm-eyebrow">
          <span>Costa Select</span>
          <span className="sep">·</span>
          <span className="date">{dateLabel}</span>
        </div>
        {isAdmin && (
          <Link className="hm-admin-link" href="/dashboard">
            <Icon name="layout-dashboard" size={13} />
            Financieel Dashboard
            <span className="badge">Admin</span>
          </Link>
        )}
      </div>

      <h1 style={{ marginTop: 22 }}>
        {greeting}, <span className="name">{name}</span>
        <span className="punct">.</span>
      </h1>

      <p className="hm-hero-lede">
        {summary.before}
        <span className="num">{summary.numA}</span>
        {summary.middle}
        <span className="accent">{summary.numB}</span>
        {summary.end}
      </p>

      <ul className="hm-pills">
        {pills.map((p, i) => {
          const inner = (
            <>
              <span className="dot" />
              <span>{p.label}</span>
              {p.meta && <span className="meta">{p.meta}</span>}
            </>
          )
          if (p.href) {
            return (
              <li key={i} style={{ display: 'contents' }}>
                <Link className={`hm-pill ${p.tone}`} href={p.href}>
                  {inner}
                </Link>
              </li>
            )
          }
          return (
            <li key={i} style={{ display: 'contents' }}>
              <span className={`hm-pill ${p.tone}`}>{inner}</span>
            </li>
          )
        })}
      </ul>
    </header>
  )
}

/* ── Action row (workflow) ───────────────────────────── */
export interface HmTodoLite {
  id: string
  title: string
  overdue: boolean
  flagLabel?: string
}

export interface HmTripLite {
  id: string
  client: string
  dateLabel: string
  timeLabel: string
  region: string
  city?: string
  stops: number
  duration?: string
}

export function HmActionRow({
  todos,
  trip,
  totalTodos,
  overdueCount,
}: {
  todos: HmTodoLite[]
  trip: HmTripLite | null
  totalTodos: number
  overdueCount: number
}) {
  const [askValue, setAskValue] = useState('')

  function submitAsk(e: FormEvent) {
    e.preventDefault()
    if (!askValue.trim()) return
    const url = `/kennisbank?ask=${encodeURIComponent(askValue.trim())}`
    window.location.href = url
  }

  return (
    <section className="hm-workflow">
      {/* AI ask */}
      <div className="hm-action ai">
        <div className="hm-action-head">
          <p className="hm-action-eyebrow">
            <Icon name="sparkles" size={12} />
            Kennisbank · AI
          </p>
        </div>
        <h3 className="hm-action-title">
          Vraag de kennisbank<span style={{ color: 'var(--sun)' }}>.</span>
        </h3>
        <p className="hm-action-sub">
          Stel een vraag in natuurlijke taal — Claude doorzoekt 59 docs en geeft een
          onderbouwd antwoord met bronnen.
        </p>
        <form className="hm-ai-form" onSubmit={submitAsk}>
          <span className="hm-ai-icon">
            <Icon name="sparkles" size={16} />
          </span>
          <input
            className="hm-ai-input"
            type="text"
            placeholder="Bijv. Hoe lang duurt een NIE-aanvraag?"
            value={askValue}
            onChange={e => setAskValue(e.target.value)}
          />
          <button type="submit" className="hm-ai-submit" aria-label="Versturen">
            <Icon name="arrow-right" size={14} />
          </button>
        </form>
      </div>

      {/* Todos */}
      <Link className="hm-action todos" href="/dashboard/todos">
        <div className="hm-action-head">
          <p className="hm-action-eyebrow deepsea">
            <Icon name="check-square" size={12} />
            Vandaag te doen
          </p>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 26,
              lineHeight: 1,
              color: 'var(--deepsea)',
              letterSpacing: '-0.01em',
            }}
          >
            {totalTodos}
          </span>
        </div>
        {todos.length === 0 ? (
          <p
            style={{
              color: 'var(--fg-muted)',
              fontSize: 13,
              lineHeight: 1.5,
              margin: 'auto 0',
            }}
          >
            Geen openstaande taken — een rustige dag.
          </p>
        ) : (
          <ul className="hm-todo-list">
            {todos.slice(0, 3).map(t => (
              <li key={t.id} className="hm-todo-item">
                <span className="hm-todo-checkbox" />
                <span className="hm-todo-text">{t.title}</span>
                {t.overdue ? (
                  <span className="hm-todo-flag">Over deadline</span>
                ) : (
                  <span className="hm-todo-flag muted">{t.flagLabel ?? ''}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <span className="hm-action-cta">
          Alle {totalTodos} taken
          {overdueCount > 0 && (
            <span style={{ color: 'var(--sun-dark)', fontWeight: 800 }}>
              · {overdueCount} over deadline
            </span>
          )}
          <Icon name="arrow-right" size={12} />
        </span>
      </Link>

      {/* Next trip */}
      <Link
        className="hm-action trip"
        href={trip ? `/bezichtigingen/${trip.id}` : '/bezichtigingen'}
      >
        <div className="hm-action-head">
          <p className="hm-action-eyebrow deepsea">
            <Icon name="calendar-days" size={12} />
            Volgende afspraak
          </p>
        </div>
        {trip ? (
          <>
            <p className="hm-trip-date">
              <span className="hm-trip-day">{trip.dateLabel}</span>
              <span className="hm-trip-time">{trip.timeLabel}</span>
            </p>
            <ul className="hm-trip-meta">
              <li className="hm-trip-meta-row">
                <Icon name="users" size={13} />
                <span>
                  <b>{trip.client}</b>
                </span>
              </li>
              <li className="hm-trip-meta-row">
                <Icon name="map-pin" size={13} />
                <span>
                  {trip.region}
                  {trip.city ? ` · ${trip.city}` : ''}
                </span>
              </li>
              <li className="hm-trip-meta-row">
                <Icon name="route" size={13} />
                <span>
                  <b>{trip.stops} stops</b>
                  {trip.duration ? ` · ${trip.duration}` : ''}
                </span>
              </li>
            </ul>
            <span className="hm-action-cta">
              Bekijk route
              <Icon name="arrow-right" size={12} />
            </span>
          </>
        ) : (
          <p
            style={{
              color: 'var(--fg-muted)',
              fontSize: 13,
              lineHeight: 1.5,
              margin: 'auto 0',
            }}
          >
            Geen afspraken deze week. Plan een nieuwe bezichtiging.
          </p>
        )}
      </Link>
    </section>
  )
}

/* ── Spotlight ───────────────────────────────────────── */
export interface HmSpotlightItem {
  code: string
  category: string
  title: string
  summary: string
  readMinutes?: number
  addedLabel: string
  href: string
}

export function HmSpotlight({ item }: { item: HmSpotlightItem | null }) {
  if (!item) return null
  return (
    <Link className="hm-spotlight" href={item.href}>
      <div className="hm-spotlight-thumb">
        <span className="hm-spotlight-doccode">{item.code}</span>
        <span className="hm-spotlight-icon">
          <Icon name="file-text" size={26} />
        </span>
        <span className="hm-spotlight-cat">{item.category}</span>
      </div>
      <div className="hm-spotlight-body">
        <p className="hm-spotlight-eyebrow">
          <Icon name="zap" size={12} />
          Voor jou — nieuw deze week
          <span className="added">{item.addedLabel}</span>
        </p>
        <h3 className="hm-spotlight-title">{item.title}</h3>
        <p className="hm-spotlight-summary">{item.summary}</p>
        <div className="hm-spotlight-foot">
          {item.readMinutes != null && (
            <span className="hm-spotlight-meta">
              <Icon name="clock" size={12} /> {item.readMinutes} min lezen
            </span>
          )}
          <span className="hm-spotlight-meta">
            <Icon name="book-open" size={12} /> Kennisbank
          </span>
          <span className="hm-spotlight-cta">
            Open document <Icon name="arrow-right" size={13} />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Platform grid ───────────────────────────────────── */
export interface HmPlatformHero {
  label: string
  tagline: string
  description: string
  iconName: string
  href: string
  lastUsed?: string
  statValue: string
  statLabel: string
  ctaLabel: string
}

export interface HmPlatformTile {
  key: string
  label: string
  iconName: string
  href: string
  hint: string
}

export function HmPlatformGrid({
  hero,
  tiles,
}: {
  hero: HmPlatformHero
  tiles: HmPlatformTile[]
}) {
  return (
    <section>
      <div className="hm-section-head">
        <h2 className="hm-section-title">Platform</h2>
        <p className="hm-section-sub">Sneltoegang tot je tools</p>
      </div>
      <div className="hm-platform">
        <Link className="hm-tile-hero" href={hero.href}>
          <span className="hm-tile-hero-bg" aria-hidden="true" />
          <div className="hm-tile-hero-head">
            <span className="hm-tile-hero-icon">
              <Icon name={hero.iconName} size={22} />
            </span>
            <div className="hm-tile-hero-titles">
              <span className="hm-tile-hero-tag">{hero.tagline}</span>
              <span className="hm-tile-hero-name">{hero.label}</span>
            </div>
          </div>
          <p className="hm-tile-hero-desc">{hero.description}</p>
          <div className="hm-tile-hero-foot">
            {hero.lastUsed && (
              <>
                <div className="hm-tile-hero-stat">
                  <span className="hm-tile-hero-stat-value">{hero.lastUsed}</span>
                  <span className="hm-tile-hero-stat-label">laatst gebruikt</span>
                </div>
                <div className="hm-tile-hero-divider" />
              </>
            )}
            <div className="hm-tile-hero-stat">
              <span className="hm-tile-hero-stat-value">{hero.statValue}</span>
              <span className="hm-tile-hero-stat-label">{hero.statLabel}</span>
            </div>
            <span className="hm-tile-hero-cta">
              {hero.ctaLabel} <Icon name="arrow-right" size={13} />
            </span>
          </div>
        </Link>

        <div className="hm-tile-column">
          {tiles.map(t => (
            <Link key={t.key} className="hm-tile" href={t.href}>
              <span className="hm-tile-icon">
                <Icon name={t.iconName} size={17} />
              </span>
              <span className="hm-tile-main">
                <span className="hm-tile-name">{t.label}</span>
                <span className="hm-tile-hint">{t.hint}</span>
              </span>
              <span className="hm-tile-arrow">
                <Icon name="chevron-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Dossiers col ────────────────────────────────────── */
export interface HmDossierItem {
  id: string
  client: string
  initials: string
  region: string
  activity: string
  stage: string
  stageKind: 'hot' | 'warm' | 'neutral'
  updatedLabel: string
  href: string
}

export function HmDossiersCol({ dossiers }: { dossiers: HmDossierItem[] }) {
  return (
    <section>
      <div className="hm-section-head">
        <h2 className="hm-section-title">Recente presentaties</h2>
        <p className="hm-section-sub" style={{ marginLeft: 'auto' }}>
          {dossiers.length} presentaties · gesorteerd op activiteit
        </p>
      </div>
      {dossiers.length === 0 ? (
        <p
          style={{
            padding: '24px 0',
            color: 'var(--fg-subtle)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Nog geen presentaties.
        </p>
      ) : (
        <ul className="hm-doss-list">
          {dossiers.map(d => (
            <Link key={d.id} className="hm-doss-row" href={d.href}>
              <span className="hm-doss-avatar">{d.initials}</span>
              <span className="hm-doss-main">
                <span className="hm-doss-toprow">
                  <span className="hm-doss-client">{d.client}</span>
                  <span className="hm-doss-id">{d.region}</span>
                </span>
                <span className="hm-doss-activity">{d.activity}</span>
              </span>
              <span className="hm-doss-meta">
                <span className={`hm-doss-stage ${d.stageKind}`}>
                  <span className="stage-dot" />
                  {d.stage}
                </span>
                <span className="hm-doss-time">{d.updatedLabel}</span>
              </span>
            </Link>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ── Activity feed ───────────────────────────────────── */
export interface HmActivityEvent {
  id: string
  iconName: string
  actor: string
  text: ReactNode
  timeLabel: string
  href: string
}

export function HmActivityFeed({ events }: { events: HmActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? events : events.slice(0, 4)
  return (
    <section>
      <div className="hm-section-head">
        <h2 className="hm-section-title">Activiteit</h2>
        <p className="hm-section-sub" style={{ marginLeft: 'auto' }}>
          laatste events
        </p>
      </div>
      {events.length === 0 ? (
        <p
          style={{
            padding: '24px 0',
            color: 'var(--fg-subtle)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          Nog geen activiteit.
        </p>
      ) : (
        <ul className="hm-feed">
          {visible.map(ev => (
            <Link key={ev.id} className="hm-feed-item" href={ev.href}>
              <span className="hm-feed-icon">
                <Icon name={ev.iconName} size={14} />
              </span>
              <span className="hm-feed-main">
                <p className="hm-feed-text">
                  <b>{ev.actor}</b> {ev.text}
                </p>
                <span className="hm-feed-time">{ev.timeLabel}</span>
              </span>
            </Link>
          ))}
        </ul>
      )}
      {!expanded && events.length > 4 && (
        <button
          type="button"
          className="hm-feed-more"
          onClick={() => setExpanded(true)}
        >
          Toon meer <Icon name="chevron-down" size={12} />
        </button>
      )}
    </section>
  )
}
