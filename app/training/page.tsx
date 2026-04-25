'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  TR_CATEGORIES,
  TR_VIDEOS,
  trFmtTimeRemaining,
  trIsVideoNew,
  type TrCategory,
  type TrCategoryKey,
  type TrainingVideo,
} from '@/lib/training/data'
import { useTrainingState } from '@/lib/training/storage'
import {
  TrEmpty,
  TrHero,
  TrPageHead,
  TrSection,
  TrStats,
  TrToolbar,
  type TrFilter,
  type TrSort,
  type TrStatsData,
  type TrView,
} from '@/components/training/parts'

export default function TrainingPage() {
  const {
    hydrated,
    watchedMap,
    skipped,
    lastActivity,
    skipOnboarding,
  } = useTrainingState()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<TrFilter>('all')
  const [sort, setSort] = useState<TrSort>('order')
  const [view, setView] = useState<TrView>('grid')

  // Restore view from localStorage (cosmetic, geen sync naar backend)
  useEffect(() => {
    try {
      const v = localStorage.getItem('cs_tr_view')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === 'grid' || v === 'list') setView(v)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('cs_tr_view', view) } catch { /* ignore */ }
  }, [view])

  const onboardingVideos = useMemo(
    () =>
      TR_VIDEOS.filter(v => v.is_required).sort(
        (a, b) => (a.order_in_category ?? 0) - (b.order_in_category ?? 0)
      ),
    []
  )
  const onboardingDone = onboardingVideos.filter(v => watchedMap[v.id]?.watched).length
  const onboardingTotal = onboardingVideos.length
  const nextOnboardingVideo = onboardingVideos.find(v => !watchedMap[v.id]?.watched) ?? null
  const onboardingStarted = onboardingDone > 0
  const showHero = hydrated && !skipped && nextOnboardingVideo !== null && onboardingDone < onboardingTotal

  const filtered = useMemo(() => {
    let out: TrainingVideo[] = TR_VIDEOS
    if (activeFilter !== 'all') {
      if (activeFilter === 'required') out = out.filter(v => v.is_required)
      else if (activeFilter === 'new') out = out.filter(trIsVideoNew)
      else out = out.filter(v => v.category === (activeFilter as TrCategoryKey))
    }
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(
        v =>
          v.title.toLowerCase().includes(q) ||
          (v.description ?? '').toLowerCase().includes(q)
      )
    }
    const sorted = [...out]
    if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    } else if (sort === 'duration') {
      sorted.sort((a, b) => (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0))
    } else {
      sorted.sort((a, b) => (a.order_in_category ?? 99) - (b.order_in_category ?? 99))
    }
    return sorted
  }, [activeFilter, search, sort])

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<TrFilter, number>> = {
      all: TR_VIDEOS.length,
      required: 0,
      new: 0,
    }
    TR_CATEGORIES.forEach(c => {
      counts[c.key] = 0
    })
    TR_VIDEOS.forEach(v => {
      counts[v.category] = (counts[v.category] ?? 0) + 1
      if (v.is_required) counts.required = (counts.required ?? 0) + 1
      if (trIsVideoNew(v)) counts.new = (counts.new ?? 0) + 1
    })
    return counts
  }, [])

  const stats: TrStatsData = useMemo(() => {
    const total = TR_VIDEOS.length
    const totalSeconds = TR_VIDEOS.reduce((s, v) => s + (v.duration_seconds ?? 0), 0)
    const watched = TR_VIDEOS.filter(v => watchedMap[v.id]?.watched).length
    const watchedPct = total > 0 ? Math.round((watched / total) * 100) : 0
    const remainingSeconds = TR_VIDEOS.filter(v => !watchedMap[v.id]?.watched).reduce(
      (s, v) => s + (v.duration_seconds ?? 0),
      0
    )
    let lastActivityLabel = '—'
    let lastActivityVideo = ''
    if (lastActivity?.date) {
      const d = new Date(lastActivity.date)
      lastActivityLabel = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
      lastActivityVideo = lastActivity.videoTitle ?? ''
    }
    return {
      total,
      watched,
      watchedPct,
      totalDurationLabel: trFmtTimeRemaining(totalSeconds),
      remainingLabel: trFmtTimeRemaining(remainingSeconds),
      lastActivityLabel,
      lastActivityVideo,
    }
  }, [watchedMap, lastActivity])

  const sections = useMemo(
    () =>
      TR_CATEGORIES.map(cat => ({
        category: cat as TrCategory,
        videos: filtered.filter(v => v.category === cat.key),
      })).filter(s => s.videos.length > 0),
    [filtered]
  )

  return (
    <div className="tr-page">
      <TrPageHead totalCount={TR_VIDEOS.length} />
      <div className="tr-shell">
        {showHero && nextOnboardingVideo && (
          <TrHero
            onboardingDone={onboardingDone}
            onboardingTotal={onboardingTotal}
            nextVideo={nextOnboardingVideo}
            started={onboardingStarted}
            onSkip={skipOnboarding}
          />
        )}

        <TrStats stats={stats} />

        <TrToolbar
          search={search}
          onSearch={setSearch}
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
          filterCounts={filterCounts}
          categories={TR_CATEGORIES}
          sort={sort}
          onSort={setSort}
          view={view}
          onView={setView}
        />

        {filtered.length === 0 ? (
          <TrEmpty search={search} />
        ) : (
          sections.map(s => (
            <TrSection
              key={s.category.key}
              category={s.category}
              videos={s.videos}
              watchedMap={watchedMap}
              view={view}
            />
          ))
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
