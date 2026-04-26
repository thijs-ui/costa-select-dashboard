'use client'

import { useEffect, useMemo, useState } from 'react'
import { MC_CATEGORIES } from '@/lib/marketing-config'

// ============================================================
// Types
// ============================================================
export interface ContentItem {
  id: string
  category: string
  subcategory: string | null
  language: string
  title: string
  prompt_used: string
  content: string
  is_favorite: boolean
  tags: string[] | null
  scheduled_date: string | null
  publish_status: string
  platform_label: string | null
  notes: string | null
  created_at: string
}

export interface MbPlatform {
  id: string
  label: string
  dot: string
  tint: string
  text: string
}

export interface MbLanguage {
  id: 'nl' | 'en' | 'es'
  label: string
  name: string
}

export type ViewMode = 'list' | 'calendar'
export type CategoryFilter = 'all' | string
export type LanguageFilter = 'all' | 'nl' | 'en' | 'es'

// ============================================================
// Constants
// ============================================================
export const MB_LANGUAGES: MbLanguage[] = [
  { id: 'nl', label: 'NL', name: 'Nederlands' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'es', label: 'ES', name: 'Español' },
]

export const MB_PLATFORMS: MbPlatform[] = [
  { id: 'instagram', label: 'Instagram', dot: '#C24040', tint: 'rgba(194,64,64,0.10)', text: '#8B2E2E' },
  { id: 'linkedin', label: 'LinkedIn', dot: '#004B46', tint: 'rgba(0,75,70,0.10)', text: '#003734' },
  { id: 'facebook', label: 'Facebook', dot: '#9B8BC4', tint: 'rgba(155,139,196,0.16)', text: '#5C4F85' },
  { id: 'youtube', label: 'YouTube', dot: '#D4921A', tint: 'rgba(245,175,64,0.18)', text: '#8C5E10' },
  { id: 'email', label: 'Email', dot: '#0EAE96', tint: 'rgba(14,174,150,0.12)', text: '#076B5C' },
  { id: 'blog', label: 'Blog', dot: '#0A6B63', tint: 'rgba(10,107,99,0.12)', text: '#054340' },
  { id: 'brochure', label: 'Brochure', dot: '#B5841F', tint: 'rgba(245,175,64,0.10)', text: '#7A5810' },
]

export const MB_CATEGORIES = [
  { id: 'social_media', label: 'Social Media', short: 'Social', icon: 'share', slug: 'social-media' },
  { id: 'advertenties', label: 'Advertenties', short: 'Ads', icon: 'megaphone', slug: 'advertenties' },
  { id: 'website_blog', label: 'Website & Blog', short: 'Web', icon: 'globe', slug: 'website-blog' },
  { id: 'email', label: 'Email', short: 'Email', icon: 'mail', slug: 'email' },
  { id: 'video', label: 'Video', short: 'Video', icon: 'video', slug: 'video' },
  { id: 'brochures', label: 'Brochures', short: 'Brochures', icon: 'book', slug: 'brochures' },
] as const

const SUBCAT_LABELS: Record<string, string> = {
  // social
  linkedin: 'LinkedIn', instagram: 'Instagram', facebook: 'Facebook',
  // ads
  meta_ads: 'Meta Ads', google_ads: 'Google Ads', linkedin_ads: 'LinkedIn Ads',
  // email
  nieuwsbrief: 'Nieuwsbrief', project_aankondiging: 'Project-aankondiging',
  followup: 'Follow-up', drip: 'Drip campagne',
  // website
  blogartikel: 'Blogartikel', regiopagina: 'Regiopagina',
  landingspagina: 'Landingspagina', faq: 'FAQ',
  // video
  youtube: 'YouTube video', short: 'YouTube Short',
  script_lang: 'Videoscript (lang)', script_kort: 'Videoscript (kort)',
  // brochures
  nieuwbouw: 'Nieuwbouwproject', regio: 'Regio-brochure', corporate: 'Corporate',
}

export function mbPrettySubcat(id: string | null): string {
  if (!id) return ''
  return SUBCAT_LABELS[id] || id
}

export function mbGetCategory(id: string) {
  return MB_CATEGORIES.find(c => c.id === id) || null
}

export function mbGetLanguage(id: string): MbLanguage {
  return MB_LANGUAGES.find(l => l.id === id) || MB_LANGUAGES[0]
}

export function mbGetPlatform(label: string | null): MbPlatform | null {
  if (!label) return null
  const norm = label.toLowerCase().trim()
  return MB_PLATFORMS.find(p =>
    p.label.toLowerCase() === norm
    || p.id === norm
    || norm.includes(p.id),
  ) || null
}

// ============================================================
// Format helpers
// ============================================================
const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const MONTHS_NL_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const DAY_HEADS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_NL_SHORT[d.getMonth()]}`
}

export function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_NL[d.getMonth()]} ${d.getFullYear()}`
}

export function statusLabel(status: string): string {
  if (status === 'scheduled') return 'Ingepland'
  if (status === 'published') return 'Gepubliceerd'
  return 'Concept'
}

// ============================================================
// Icon
// ============================================================
type IconName =
  | 'megaphone' | 'mail' | 'share' | 'book' | 'video' | 'globe'
  | 'library' | 'sparkles' | 'search' | 'star' | 'list' | 'calendar'
  | 'x' | 'chevron-down' | 'chevron-left' | 'chevron-right'
  | 'copy' | 'trash' | 'clock' | 'check' | 'check-circle'

export function MbIcon({ name, size = 16, fill = 'none', strokeWidth = 2, className }: {
  name: IconName | string; size?: number; fill?: string; strokeWidth?: number; className?: string
}) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill, stroke: 'currentColor' as const, strokeWidth,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'megaphone': return <svg {...props}><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
    case 'mail': return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
    case 'share': return <svg {...props}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>
    case 'book': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
    case 'video': return <svg {...props}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    case 'library': return <svg {...props}><path d="M3 3v18" /><path d="M7 3v18" /><path d="M11 3h4l2 9-2 9h-4z" /><path d="M19 3l2 9-2 9" /></svg>
    case 'sparkles': return <svg {...props}><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" /><path d="M19 15l.8 2 2 .8-2 .8L19 21l-.8-2-2-.8 2-.8.8-2z" /></svg>
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
    case 'star': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
    case 'list': return <svg {...props}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></svg>
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
    case 'x': return <svg {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    case 'chevron-down': return <svg {...props}><path d="m6 9 6 6 6-6" /></svg>
    case 'chevron-left': return <svg {...props}><path d="m15 18-6-6 6-6" /></svg>
    case 'chevron-right': return <svg {...props}><path d="m9 18 6-6-6-6" /></svg>
    case 'copy': return <svg {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    case 'trash': return <svg {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></svg>
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    case 'check': return <svg {...props}><path d="M20 6 9 17l-5-5" /></svg>
    case 'check-circle': return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    default: return null
  }
}

// ============================================================
// Toast
// ============================================================
export function MbToast({ message, visible, icon = 'check-circle' }: {
  message: string; visible: boolean; icon?: string
}) {
  return (
    <div className={'mb-toast' + (visible ? ' is-visible' : '')} role="status" aria-live="polite">
      <MbIcon name={icon} size={16} />
      <span>{message}</span>
    </div>
  )
}

// ============================================================
// Hero
// ============================================================
export function MbHero({ totalCount, scheduledCount, favoriteCount }: {
  totalCount: number; scheduledCount: number; favoriteCount: number
}) {
  return (
    <header className="mb-hero">
      <div className="mb-hero-eyebrow">
        <span>Costa Select</span>
        <span>·</span>
        <span>Marketing</span>
        <span>·</span>
        <span>Bibliotheek</span>
      </div>
      <div className="mb-hero-row">
        <div>
          <h1 className="mb-hero-title">Bibliotheek</h1>
          <p className="mb-hero-lede">
            Het archief van alles wat via de marketing-generators is opgeslagen — drafts, ingeplande
            posts en gepubliceerde content. Doorzoek, favoriet, plan in of stuur opnieuw door.
          </p>
        </div>
        <div className="mb-hero-stats">
          <div className="mb-hero-stat">
            <div className="mb-hero-stat-num">{totalCount}</div>
            <div className="mb-hero-stat-label">Items</div>
          </div>
          <div className="mb-hero-stat">
            <div className="mb-hero-stat-num">{scheduledCount}</div>
            <div className="mb-hero-stat-label">Ingepland</div>
          </div>
          <div className="mb-hero-stat">
            <div className="mb-hero-stat-num">{favoriteCount}</div>
            <div className="mb-hero-stat-label">Favorieten</div>
          </div>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// Cat-nav (6 generator-pagina's + actieve Bibliotheek-knop)
// ============================================================
export function MbCatNav() {
  // Map naar de generator-pagina's via de marketing-config slug
  const links = MB_CATEGORIES.map(c => {
    const cfg = MC_CATEGORIES.find(mc => mc.apiCategory === c.id)
    return { ...c, href: `/marketing/${cfg?.slug ?? c.slug}` }
  })
  return (
    <nav className="mb-catnav" aria-label="Marketing categorieën">
      {links.map(c => (
        <a key={c.id} href={c.href}>
          <MbIcon name={c.icon} size={15} />
          <span>{c.short}</span>
        </a>
      ))}
      <button type="button" className="is-active" aria-current="page">
        <MbIcon name="library" size={15} />
        <span>Bibliotheek</span>
      </button>
    </nav>
  )
}

// ============================================================
// Filters bar
// ============================================================
export function MbFilters({ search, onSearch, category, onCategory, language, onLanguage, favOnly, onFavOnly }: {
  search: string; onSearch: (s: string) => void
  category: CategoryFilter; onCategory: (c: CategoryFilter) => void
  language: LanguageFilter; onLanguage: (l: LanguageFilter) => void
  favOnly: boolean; onFavOnly: (v: boolean) => void
}) {
  return (
    <div className="mb-filters">
      <label className="mb-search">
        <MbIcon name="search" size={16} />
        <input
          type="text"
          placeholder="Zoek in titel, content of tags…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          aria-label="Zoeken"
        />
        {search && (
          <button type="button" className="mb-search-clear" onClick={() => onSearch('')} aria-label="Wis zoekopdracht">
            <MbIcon name="x" size={14} />
          </button>
        )}
      </label>
      <div className={'mb-select' + (category !== 'all' ? ' is-active' : '')}>
        <select value={category} onChange={e => onCategory(e.target.value)} aria-label="Categorie">
          <option value="all">Alle categorieën</option>
          {MB_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span className="mb-select-icon"><MbIcon name="chevron-down" size={14} /></span>
      </div>
      <div className={'mb-select' + (language !== 'all' ? ' is-active' : '')}>
        <select value={language} onChange={e => onLanguage(e.target.value as LanguageFilter)} aria-label="Taal">
          <option value="all">Alle talen</option>
          {MB_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <span className="mb-select-icon"><MbIcon name="chevron-down" size={14} /></span>
      </div>
      <button
        type="button"
        className={'mb-fav-toggle' + (favOnly ? ' is-active' : '')}
        onClick={() => onFavOnly(!favOnly)}
        aria-pressed={favOnly}
      >
        <MbIcon name="star" size={14} />
        <span>Favorieten</span>
      </button>
    </div>
  )
}

// ============================================================
// Sub-bar (count + view-toggle)
// ============================================================
export function MbSubBar({ count, totalCount, view, onView, hasFilter, onClearFilters }: {
  count: number; totalCount: number
  view: ViewMode; onView: (v: ViewMode) => void
  hasFilter: boolean; onClearFilters: () => void
}) {
  return (
    <div className="mb-subbar">
      <div className="mb-count">
        <strong>{count}</strong> {count === 1 ? 'item' : 'items'}
        {count !== totalCount && <> / {totalCount}</>}
        {hasFilter && (
          <button type="button" className="mb-count-clear" onClick={onClearFilters}>
            wis filters
          </button>
        )}
      </div>
      <div className="mb-viewtoggle" role="tablist" aria-label="Weergave">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={view === 'list' ? 'is-active' : ''}
          onClick={() => onView('list')}
        >
          <MbIcon name="list" size={14} />
          <span>Lijst</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'calendar'}
          className={view === 'calendar' ? 'is-active' : ''}
          onClick={() => onView('calendar')}
        >
          <MbIcon name="calendar" size={14} />
          <span>Kalender</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Content card
// ============================================================
export function MbContentCard({ item, isSelected, onOpen, onToggleFav }: {
  item: ContentItem
  isSelected: boolean
  onOpen: (id: string) => void
  onToggleFav: (id: string) => void
}) {
  const cat = mbGetCategory(item.category)
  const lang = mbGetLanguage(item.language)
  const previewText = (item.content || '').replace(/\s+/g, ' ').trim().slice(0, 160)

  return (
    <div
      className={'mb-card' + (isSelected ? ' is-selected' : '')}
      onClick={() => onOpen(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item.id) } }}
    >
      <div className="mb-card-head">
        <h3 className="mb-card-title">{item.title}</h3>
        <button
          type="button"
          className={'mb-card-fav' + (item.is_favorite ? ' is-fav' : '')}
          onClick={e => { e.stopPropagation(); onToggleFav(item.id) }}
          aria-label={item.is_favorite ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}
          aria-pressed={item.is_favorite}
        >
          <MbIcon name="star" size={16} />
        </button>
      </div>

      <div className="mb-pills">
        <span className="mb-pill mb-pill--cat">{cat ? cat.label : item.category}</span>
        {item.subcategory && <span className="mb-pill mb-pill--sub">{mbPrettySubcat(item.subcategory)}</span>}
        <span className="mb-pill mb-pill--lang">{lang.label}</span>
        <span className={'mb-pill mb-pill--status mb-pill--' + item.publish_status}>
          {statusLabel(item.publish_status)}
        </span>
        <span className="mb-pill mb-pill--date">
          {item.scheduled_date ? formatShortDate(item.scheduled_date) : formatShortDate(item.created_at)}
        </span>
      </div>

      <div className="mb-card-body">{previewText}{previewText.length >= 160 ? '…' : ''}</div>

      {item.tags && item.tags.length > 0 && (
        <div className="mb-card-tags">
          {item.tags.slice(0, 4).map(t => <span key={t} className="mb-tag">{t}</span>)}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Empty state
// ============================================================
export function MbEmpty({ kind }: { kind: 'no-results' | 'empty' }) {
  if (kind === 'no-results') {
    return (
      <div className="mb-empty">
        <MbIcon name="search" size={36} />
        <h3>Geen content past bij deze filters</h3>
        <p>Probeer een ander zoekwoord of verbreed de filters. Wis alle filters om alles weer te zien.</p>
      </div>
    )
  }
  return (
    <div className="mb-empty">
      <MbIcon name="sparkles" size={36} />
      <h3>Nog niets in de bibliotheek</h3>
      <p>Zodra je iets opslaat vanuit een van de marketing-generators, verschijnt het hier — met filters, kalender en een doorzoekbaar archief.</p>
      <a className="mb-btn mb-btn--sun" href="/marketing/advertenties">
        <MbIcon name="sparkles" size={14} />
        <span>Genereer je eerste content</span>
      </a>
    </div>
  )
}

// ============================================================
// Calendar
// ============================================================
export function MbCalendar({ items, monthDate, onPrev, onNext, onToday, onOpen }: {
  items: ContentItem[]
  monthDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onOpen: (id: string) => void
}) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const cells: Date[] = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const offset = (firstDay.getDay() + 6) % 7
    const gridStart = new Date(year, month, 1 - offset)
    const list: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      list.push(d)
    }
    return list
  }, [year, month])

  const itemsByDay = useMemo(() => {
    const map: Record<string, ContentItem[]> = {}
    for (const it of items) {
      if (!it.scheduled_date) continue
      const d = new Date(it.scheduled_date)
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[k]) map[k] = []
      map[k].push(it)
    }
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime()),
    )
    return map
  }, [items])

  const today = new Date()
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()

  const usedPlatforms = new Set<string>()
  items.forEach(it => { if (it.scheduled_date && it.platform_label) usedPlatforms.add(it.platform_label) })

  return (
    <section className="mb-cal">
      <div className="mb-cal-head">
        <h2 className="mb-cal-title">{MONTHS_NL[month]} {year}</h2>
        <div className="mb-cal-nav">
          <button type="button" className="mb-cal-navbtn" onClick={onPrev} aria-label="Vorige maand">
            <MbIcon name="chevron-left" size={16} />
          </button>
          <button type="button" className="mb-cal-today" onClick={onToday}>Vandaag</button>
          <button type="button" className="mb-cal-navbtn" onClick={onNext} aria-label="Volgende maand">
            <MbIcon name="chevron-right" size={16} />
          </button>
        </div>
      </div>

      <div className="mb-cal-grid">
        {DAY_HEADS.map(d => <div key={d} className="mb-cal-dayhead">{d}</div>)}
        {cells.map((d, i) => {
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          const dayItems = itemsByDay[k] || []
          const otherMonth = d.getMonth() !== month
          return (
            <div
              key={i}
              className={
                'mb-cal-cell'
                + (otherMonth ? ' is-other-month' : '')
                + (isToday(d) ? ' is-today' : '')
              }
            >
              <div className="mb-cal-daynum">{d.getDate()}</div>
              <div className="mb-cal-bars">
                {dayItems.slice(0, 4).map(it => {
                  const plat = mbGetPlatform(it.platform_label) || { tint: 'var(--mb-marble)', text: 'var(--mb-fg)', dot: 'var(--mb-fg-subtle)' }
                  const titleSnip = (it.title || '').slice(0, 26)
                  return (
                    <button
                      key={it.id}
                      className="mb-cal-bar"
                      style={{ background: plat.tint, color: plat.text }}
                      onClick={() => onOpen(it.id)}
                      title={`${formatTime(it.scheduled_date)} · ${it.title} · ${it.platform_label || ''}`}
                    >
                      <span className="mb-cal-bar-dot" style={{ background: plat.dot }} />
                      <span className="mb-cal-bar-time">{formatTime(it.scheduled_date)}</span>
                      <span className="mb-cal-bar-title">{titleSnip}</span>
                    </button>
                  )
                })}
                {dayItems.length > 4 && (
                  <div style={{ fontSize: 10.5, color: 'var(--mb-fg-subtle)', fontFamily: 'JetBrains Mono, monospace', paddingLeft: 6 }}>
                    +{dayItems.length - 4} meer
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {usedPlatforms.size > 0 && (
        <div className="mb-cal-legend">
          {MB_PLATFORMS.filter(p => usedPlatforms.has(p.label)).map(p => (
            <div key={p.id} className="mb-cal-legend-item">
              <span className="mb-cal-bar-dot" style={{ background: p.dot }} />
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ============================================================
// Side panel
// ============================================================
export function MbSidePanel({ item, visible, onClose, onCopy, onPlan, onDelete, onToggleFav, copyState }: {
  item: ContentItem | null
  visible: boolean
  onClose: () => void
  onCopy: (item: ContentItem) => void
  onPlan: (item: ContentItem) => void
  onDelete: (item: ContentItem) => void
  onToggleFav: (id: string) => void
  copyState: 'idle' | 'success'
}) {
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  if (!item) {
    return (
      <>
        <div className={'mb-panel-overlay' + (visible ? ' is-visible' : '')} onClick={onClose} />
        <aside className={'mb-panel' + (visible ? ' is-visible' : '')} aria-hidden={!visible} />
      </>
    )
  }

  const cat = mbGetCategory(item.category)
  const lang = mbGetLanguage(item.language)

  return (
    <>
      <div className={'mb-panel-overlay' + (visible ? ' is-visible' : '')} onClick={onClose} />
      <aside
        className={'mb-panel' + (visible ? ' is-visible' : '')}
        aria-hidden={!visible}
        role="dialog"
        aria-label="Content details"
      >
        <div className="mb-panel-head">
          <div className="mb-panel-head-l">
            <div className="mb-panel-eyebrow">
              <span>{cat ? cat.label : item.category}</span>
              {item.subcategory && <><span>·</span><span>{mbPrettySubcat(item.subcategory)}</span></>}
            </div>
            <h2 className="mb-panel-title">{item.title}</h2>
            <div className="mb-pills">
              <span className={'mb-pill mb-pill--status mb-pill--' + item.publish_status}>{statusLabel(item.publish_status)}</span>
              <span className="mb-pill mb-pill--lang">{lang.name}</span>
              <button
                type="button"
                className={'mb-card-fav' + (item.is_favorite ? ' is-fav' : '')}
                onClick={() => onToggleFav(item.id)}
                style={{ width: 26, height: 26 }}
                aria-pressed={item.is_favorite}
                aria-label={item.is_favorite ? 'Verwijder uit favorieten' : 'Markeer als favoriet'}
              >
                <MbIcon name="star" size={13} />
              </button>
            </div>
          </div>
          <button type="button" className="mb-panel-close" onClick={onClose} aria-label="Sluit panel">
            <MbIcon name="x" size={16} />
          </button>
        </div>

        <div className="mb-panel-body">
          <div className="mb-panel-section">
            <div className="mb-panel-section-label">Content</div>
            <div className="mb-panel-content">{item.content}</div>
          </div>

          <div className="mb-panel-section">
            <div className="mb-panel-section-label">Details</div>
            <div className="mb-panel-meta-grid">
              <div className="mb-panel-meta-item">
                <span className="mb-panel-meta-key">Aangemaakt</span>
                <span className="mb-panel-meta-val">{formatLongDate(item.created_at)}</span>
              </div>
              <div className="mb-panel-meta-item">
                <span className="mb-panel-meta-key">Ingepland</span>
                <span className="mb-panel-meta-val">
                  {item.scheduled_date ? `${formatLongDate(item.scheduled_date)} · ${formatTime(item.scheduled_date)}` : '—'}
                </span>
              </div>
              <div className="mb-panel-meta-item">
                <span className="mb-panel-meta-key">Platform</span>
                <span className="mb-panel-meta-val">{item.platform_label || '—'}</span>
              </div>
              <div className="mb-panel-meta-item">
                <span className="mb-panel-meta-key">Taal</span>
                <span className="mb-panel-meta-val">{lang.name}</span>
              </div>
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="mb-panel-section">
              <div className="mb-panel-section-label">Tags</div>
              <div className="mb-card-tags">
                {item.tags.map(t => <span key={t} className="mb-tag">{t}</span>)}
              </div>
            </div>
          )}

          {item.notes && (
            <div className="mb-panel-section">
              <div className="mb-panel-section-label">Notities</div>
              <div className="mb-panel-notes">{item.notes}</div>
            </div>
          )}

          {item.prompt_used && (
            <div className="mb-panel-section">
              <div className="mb-panel-section-label">Originele prompt</div>
              <div className="mb-panel-prompt">{item.prompt_used}</div>
            </div>
          )}
        </div>

        <div className="mb-panel-foot">
          <button
            type="button"
            className={'mb-btn mb-btn--ghost' + (copyState === 'success' ? ' is-success' : '')}
            onClick={() => onCopy(item)}
          >
            <MbIcon name={copyState === 'success' ? 'check' : 'copy'} size={14} />
            <span>{copyState === 'success' ? 'Gekopieerd' : 'Kopiëren'}</span>
          </button>
          <button type="button" className="mb-btn mb-btn--sun" onClick={() => onPlan(item)}>
            <MbIcon name="calendar" size={14} />
            <span>{item.scheduled_date ? 'Wijzig planning' : 'Plan in kalender'}</span>
          </button>
          <button type="button" className="mb-btn mb-btn--del" onClick={() => onDelete(item)} aria-label="Verwijder">
            <MbIcon name="trash" size={14} />
          </button>
        </div>
      </aside>
    </>
  )
}

// ============================================================
// Plan modal
// ============================================================
export function MbPlanModal({ visible, item, onClose, onSubmit }: {
  visible: boolean
  item: ContentItem | null
  onClose: () => void
  onSubmit: (input: { scheduled_date: string; platform_label: string }) => void
}) {
  const [datetime, setDatetime] = useState('')
  const [platform, setPlatform] = useState('Instagram')

  useEffect(() => {
    if (!visible || !item) return
    const pad = (n: number) => String(n).padStart(2, '0')
    if (item.scheduled_date) {
      const d = new Date(item.scheduled_date)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDatetime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    } else {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(10, 0, 0, 0)
      setDatetime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
    }
    setPlatform(item.platform_label || 'Instagram')
  }, [visible, item])

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!datetime) return
    onSubmit({ scheduled_date: new Date(datetime).toISOString(), platform_label: platform })
  }

  return (
    <div className={'mb-modal-overlay' + (visible ? ' is-visible' : '')} onClick={onClose}>
      <form className="mb-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="mb-modal-head">
          <div className="mb-modal-eyebrow">Inplannen</div>
          <h3 className="mb-modal-title">{item && item.scheduled_date ? 'Wijzig planning' : 'Plan in kalender'}</h3>
          <p className="mb-modal-sub">Kies een datum, tijd en het platform waarop deze content gepubliceerd wordt.</p>
        </div>
        <div className="mb-modal-body">
          <div className="mb-field">
            <label className="mb-field-label" htmlFor="mb-plan-when">Datum &amp; tijd</label>
            <input
              id="mb-plan-when"
              type="datetime-local"
              className="mb-input"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              required
            />
          </div>
          <div className="mb-field">
            <label className="mb-field-label" htmlFor="mb-plan-plat">Platform</label>
            <div className="mb-select" style={{ display: 'block' }}>
              <select id="mb-plan-plat" value={platform} onChange={e => setPlatform(e.target.value)}>
                {MB_PLATFORMS.map(p => <option key={p.id} value={p.label}>{p.label}</option>)}
              </select>
              <span className="mb-select-icon" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <MbIcon name="chevron-down" size={14} />
              </span>
            </div>
          </div>
        </div>
        <div className="mb-modal-foot">
          <button type="button" className="mb-btn mb-btn--ghost" onClick={onClose}>Annuleren</button>
          <button type="submit" className="mb-btn mb-btn--primary">
            <MbIcon name="check" size={14} />
            <span>Inplannen</span>
          </button>
        </div>
      </form>
    </div>
  )
}
