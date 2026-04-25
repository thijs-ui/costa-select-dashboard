'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Filter,
  GraduationCap,
  LayoutGrid,
  List,
  Play,
  Search,
  SearchX,
  Sparkles,
  Star,
  X,
} from 'lucide-react'
import { CategoryIcon } from './CategoryIcon'
import {
  trFmtDuration,
  trFmtDurationLong,
  trIsVideoNew,
  trYtThumb,
  type TrCategory,
  type TrCategoryKey,
  type TrainingVideo,
  type WatchEntry,
  type WatchedMap,
} from '@/lib/training/data'

export type TrFilter = 'all' | TrCategoryKey | 'required' | 'new'
export type TrSort = 'order' | 'recent' | 'duration'
export type TrView = 'grid' | 'list'

/* ── Page header ─────────────────────────────────────── */
export function TrPageHead({ totalCount }: { totalCount: number }) {
  return (
    <div className="tr-pagehead">
      <div className="tr-shell">
        <div className="eyebrow">Costa Select · Academie</div>
        <h1>Training</h1>
        <p className="subtitle">
          Video-trainingen voor consultants — onboarding, tools, processen. {totalCount} video&apos;s beschikbaar.
        </p>
      </div>
    </div>
  )
}

/* ── Hero ────────────────────────────────────────────── */
export function TrHero({
  onboardingDone,
  onboardingTotal,
  nextVideo,
  started,
  onSkip,
}: {
  onboardingDone: number
  onboardingTotal: number
  nextVideo: TrainingVideo
  started: boolean
  onSkip: () => void
}) {
  const pct = onboardingTotal > 0 ? Math.round((onboardingDone / onboardingTotal) * 100) : 0
  const headline = started ? 'Verder waar je was gebleven' : 'Welkom in de academie'

  return (
    <section className="tr-hero">
      <div className="tr-hero-grid">
        <div>
          <div className="tr-hero-eyebrow">
            <GraduationCap /> Onboarding
          </div>
          <h2>{headline}</h2>
          <p className="lead">
            {started
              ? `Je hebt ${onboardingDone} van de ${onboardingTotal} verplichte video's afgerond. Nog even doorzetten — daarna ben je klaar voor je eerste klanten.`
              : `Vijf korte video's brengen je in twee weken op snelheid. Begin met "${nextVideo.title}" — daarna leidt de academie je vanzelf verder.`}
          </p>

          <div className="tr-hero-progress">
            <div className="tr-hero-progress-meta">
              <span className="tr-hero-progress-label">Onboarding-pad</span>
              <span className="tr-hero-progress-stat">
                <strong>{onboardingDone}</strong> van {onboardingTotal} video&apos;s · {pct}%
              </span>
            </div>
            <div className="tr-hero-progress-bar">
              <div className="tr-hero-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="tr-hero-actions">
            <Link className="tr-hero-cta" href={`/training/${nextVideo.id}`}>
              <Play />
              <span className="tr-hero-cta-title">
                <span className="tr-hero-cta-eyebrow">{started ? 'Hervat' : 'Start hier'}</span>
                <span className="tr-hero-cta-text">{nextVideo.title}</span>
              </span>
            </Link>
            <button className="tr-hero-skip" onClick={onSkip} type="button">
              Sla onboarding over
            </button>
          </div>
        </div>

        <Link href={`/training/${nextVideo.id}`} className="tr-hero-next">
          <div className="tr-hero-next-thumb">
            <Image
              src={trYtThumb(nextVideo.youtubeId)}
              alt=""
              width={480}
              height={270}
              unoptimized
            />
            <div className="play">
              <span>
                <Play />
              </span>
            </div>
          </div>
          <div className="tr-hero-next-eyebrow">
            Volgende · {nextVideo.order_in_category} van {onboardingTotal}
          </div>
          <div className="tr-hero-next-title">{nextVideo.title}</div>
          <div className="tr-hero-next-meta">
            <span>
              <Clock /> {trFmtDurationLong(nextVideo.duration_seconds)}
            </span>
            <span>·</span>
            <span>Verplicht</span>
          </div>
        </Link>
      </div>
    </section>
  )
}

/* ── Stats ──────────────────────────────────────────── */
export interface TrStatsData {
  total: number
  watched: number
  watchedPct: number
  totalDurationLabel: string
  remainingLabel: string
  lastActivityLabel: string
  lastActivityVideo: string
}

export function TrStats({ stats }: { stats: TrStatsData }) {
  return (
    <div className="tr-stats">
      <div className="tr-stat">
        <span className="tr-stat-label">Totaal video&apos;s</span>
        <span className="tr-stat-value">{stats.total}</span>
        <span className="tr-stat-foot">
          <LayoutGrid /> {stats.totalDurationLabel} aan content
        </span>
      </div>
      <div className="tr-stat accent">
        <span className="tr-stat-label">Bekeken</span>
        <span className="tr-stat-value">
          {stats.watched}
          <span className="small"> van {stats.total}</span>
        </span>
        <span className="tr-stat-foot">
          <CheckCircle2 /> {stats.watchedPct}% afgerond
        </span>
      </div>
      <div className="tr-stat">
        <span className="tr-stat-label">Nog te gaan</span>
        <span className="tr-stat-value">{stats.remainingLabel}</span>
        <span className="tr-stat-foot">
          <Clock /> geschatte tijd
        </span>
      </div>
      <div className="tr-stat">
        <span className="tr-stat-label">Laatste activiteit</span>
        <span className="tr-stat-value" style={{ fontSize: 18 }}>
          {stats.lastActivityLabel}
        </span>
        <span className="tr-stat-foot">
          <Sparkles /> {stats.lastActivityVideo || 'nog geen activiteit'}
        </span>
      </div>
    </div>
  )
}

/* ── Toolbar ────────────────────────────────────────── */
export function TrToolbar({
  search,
  onSearch,
  activeFilter,
  onFilter,
  filterCounts,
  categories,
  sort,
  onSort,
  view,
  onView,
}: {
  search: string
  onSearch: (v: string) => void
  activeFilter: TrFilter
  onFilter: (v: TrFilter) => void
  filterCounts: Partial<Record<TrFilter, number>>
  categories: TrCategory[]
  sort: TrSort
  onSort: (v: TrSort) => void
  view: TrView
  onView: (v: TrView) => void
}) {
  const chips: { key: TrFilter; label: string; iconName?: string; lucide?: 'star' | 'sparkles' | 'layout-grid'; variant?: 'req' | 'new' }[] = [
    { key: 'all', label: 'Alles', lucide: 'layout-grid' },
    ...categories.map(c => ({ key: c.key, label: c.label, iconName: c.iconName })),
    { key: 'required', label: 'Verplicht', lucide: 'star', variant: 'req' as const },
    { key: 'new', label: 'Nieuw', lucide: 'sparkles', variant: 'new' as const },
  ]

  return (
    <div className="tr-toolbar">
      <div className="tr-search">
        <Search />
        <input
          type="text"
          placeholder="Zoek op titel of beschrijving…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button className="tr-search-clear" onClick={() => onSearch('')} aria-label="Wissen" type="button">
            <X />
          </button>
        )}
      </div>

      <div className="tr-chips">
        {chips.map(chip => {
          const isActive = activeFilter === chip.key
          const count = filterCounts[chip.key]
          const cls = `tr-chip ${isActive ? `active ${chip.variant ?? ''}`.trim() : ''}`
          return (
            <button key={chip.key} type="button" className={cls} onClick={() => onFilter(chip.key)}>
              {chip.lucide === 'layout-grid' ? (
                <LayoutGrid />
              ) : chip.lucide === 'star' ? (
                <Star />
              ) : chip.lucide === 'sparkles' ? (
                <Sparkles />
              ) : chip.iconName ? (
                <CategoryIcon name={chip.iconName} size={12} />
              ) : null}
              {chip.label}
              {count != null && <span className="tr-chip-count">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="tr-toolbar-right">
        <div className="tr-sort">
          <Filter />
          <select value={sort} onChange={e => onSort(e.target.value as TrSort)}>
            <option value="order">Volgorde</option>
            <option value="recent">Recentst</option>
            <option value="duration">Lengte</option>
          </select>
        </div>
        <div className="tr-view-toggle">
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => onView('grid')}
            aria-label="Rasterweergave"
            type="button"
          >
            <LayoutGrid />
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => onView('list')}
            aria-label="Lijstweergave"
            type="button"
          >
            <List />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Video card (grid) ──────────────────────────────── */
export function TrVideoCard({
  video,
  watchState,
  categoryLabel,
}: {
  video: TrainingVideo
  watchState?: WatchEntry
  categoryLabel: string
}) {
  const isWatched = watchState?.watched
  const partialPct =
    watchState?.progress && video.duration_seconds
      ? Math.min(99, Math.round((watchState.progress / video.duration_seconds) * 100))
      : 0
  const isPartial = !isWatched && partialPct > 5
  const isNew = trIsVideoNew(video)

  return (
    <Link className="tr-card" href={`/training/${video.id}`}>
      <div className="tr-card-thumb">
        <Image
          src={trYtThumb(video.youtubeId)}
          alt=""
          width={480}
          height={270}
          unoptimized
          loading="lazy"
        />
        <div className="tr-card-thumb-overlay" />
        <span className="tr-card-cat">{categoryLabel}</span>
        <span className="tr-card-duration">{trFmtDuration(video.duration_seconds)}</span>
        <div className="tr-card-play">
          <span>
            <Play />
          </span>
        </div>
        <span className={`tr-card-status ${isWatched ? 'watched' : isPartial ? 'partial' : ''}`}>
          {isWatched ? (
            <>
              <CheckCircle2 /> Gezien
            </>
          ) : isPartial ? (
            <>
              <span className="progressbar">
                <span className="fill" style={{ width: `${partialPct}%` }} />
              </span>
              {partialPct}%
            </>
          ) : (
            <>
              <Circle /> Nog niet gezien
            </>
          )}
        </span>
      </div>
      <div className="tr-card-body">
        <div className="tr-card-titlerow">
          <h3 className="tr-card-title">{video.title}</h3>
          {video.is_required && <span className="tr-badge req">Verplicht</span>}
          {isNew && !video.is_required && <span className="tr-badge new">Nieuw</span>}
        </div>
        {video.description && <p className="tr-card-desc">{video.description}</p>}
      </div>
    </Link>
  )
}

/* ── Video list row ─────────────────────────────────── */
export function TrVideoListRow({
  video,
  watchState,
  categoryLabel,
}: {
  video: TrainingVideo
  watchState?: WatchEntry
  categoryLabel: string
}) {
  const isWatched = watchState?.watched
  const partialPct =
    watchState?.progress && video.duration_seconds
      ? Math.min(99, Math.round((watchState.progress / video.duration_seconds) * 100))
      : 0
  const isPartial = !isWatched && partialPct > 5

  return (
    <Link className="tr-listrow" href={`/training/${video.id}`}>
      <div className="tr-listrow-thumb">
        <Image
          src={trYtThumb(video.youtubeId)}
          alt=""
          width={320}
          height={180}
          unoptimized
          loading="lazy"
        />
        <span className="duration">{trFmtDuration(video.duration_seconds)}</span>
      </div>
      <div className="tr-listrow-body">
        <div className="tr-listrow-meta">
          <span>{categoryLabel}</span>
          {video.is_required && (
            <>
              <span className="dot" />
              <span>Verplicht</span>
            </>
          )}
          {trIsVideoNew(video) && (
            <>
              <span className="dot" />
              <span>Nieuw</span>
            </>
          )}
        </div>
        <h3 className="tr-listrow-title">{video.title}</h3>
        {video.description && <p className="tr-listrow-desc">{video.description}</p>}
      </div>
      <div className="tr-listrow-status">
        <span className={`tr-listrow-status-pill ${isWatched ? 'watched' : isPartial ? 'partial' : ''}`}>
          {isWatched ? (
            <>
              <CheckCircle2 /> Gezien
            </>
          ) : isPartial ? (
            <>
              <CircleDot /> {partialPct}%
            </>
          ) : (
            <>
              <Circle /> Niet gezien
            </>
          )}
        </span>
      </div>
    </Link>
  )
}

/* ── Section ────────────────────────────────────────── */
export function TrSection({
  category,
  videos,
  watchedMap,
  view,
}: {
  category: TrCategory
  videos: TrainingVideo[]
  watchedMap: WatchedMap
  view: TrView
}) {
  const watchedCount = videos.filter(v => watchedMap[v.id]?.watched).length
  const pct = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0

  return (
    <section className="tr-section">
      <div className="tr-section-head">
        <span className="tr-section-icon">
          <CategoryIcon name={category.iconName} size={16} />
        </span>
        <h2 className="tr-section-title">{category.label}</h2>
        <span className="tr-section-count">· {videos.length}</span>
        <div className="tr-section-progress">
          <div className="tr-section-progress-bar">
            <div className="tr-section-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>
            <strong>{watchedCount}</strong> van {videos.length} gezien
          </span>
        </div>
      </div>
      {view === 'grid' ? (
        <div className="tr-grid">
          {videos.map(v => (
            <TrVideoCard
              key={v.id}
              video={v}
              watchState={watchedMap[v.id]}
              categoryLabel={category.label}
            />
          ))}
        </div>
      ) : (
        <div className="tr-list">
          {videos.map(v => (
            <TrVideoListRow
              key={v.id}
              video={v}
              watchState={watchedMap[v.id]}
              categoryLabel={category.label}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ── Empty ──────────────────────────────────────────── */
export function TrEmpty({ search }: { search: string }) {
  return (
    <div className="tr-empty">
      <div className="tr-empty-icon">
        <SearchX />
      </div>
      <div className="tr-empty-title">Geen video&apos;s gevonden</div>
      <p>
        {search ? (
          <>
            Geen resultaten voor &quot;<strong>{search}</strong>&quot;. Probeer een andere term of categorie.
          </>
        ) : (
          "Geen video's in deze categorie."
        )}
      </p>
    </div>
  )
}
