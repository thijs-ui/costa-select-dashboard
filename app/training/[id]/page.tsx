'use client'

import Image from 'next/image'
import Link from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { use, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  Play,
  PlayCircle,
  Sparkles,
} from 'lucide-react'
import {
  TR_CATEGORIES,
  TR_DEFAULT_LEARNINGS,
  TR_RELATED_DOCS,
  TR_VIDEOS,
  trFmtDuration,
  trFmtDurationLong,
  trYtThumb,
} from '@/lib/training/data'
import { useTrainingState } from '@/lib/training/storage'

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const video = TR_VIDEOS.find(v => v.id === id)
  if (!video) notFound()

  const category = TR_CATEGORIES.find(c => c.key === video.category)
  if (!category) notFound()

  const {
    watchedMap,
    bookmarks,
    notesMap,
    toggleWatched,
    toggleBookmark,
    setNotesFor,
    recordActivity,
  } = useTrainingState()

  const isWatched = !!watchedMap[video.id]?.watched
  const isBookmarked = !!bookmarks[video.id]
  const notes = notesMap[video.id] ?? ''

  // Track last activity on open
  useEffect(() => {
    recordActivity({
      videoId: video.id,
      videoTitle: video.title,
      date: new Date().toISOString().slice(0, 10),
    })
  }, [video.id, video.title, recordActivity])

  // Aanbevolen vervolg
  const recommended = useMemo(() => {
    const sameCat = TR_VIDEOS.filter(v => v.category === video.category && v.id !== video.id)
    if (video.is_required && video.order_in_category) {
      const after = sameCat.filter(
        v => v.is_required && (v.order_in_category ?? 0) > (video.order_in_category ?? 0)
      )
      if (after.length > 0) {
        return [...after, ...sameCat.filter(v => !after.includes(v))].slice(0, 3)
      }
    }
    return sameCat.slice(0, 3)
  }, [video])

  // Volgende verplichte video in onboarding
  const totalRequired = TR_VIDEOS.filter(v => v.is_required).length
  const nextInOnboarding = useMemo(() => {
    if (!video.is_required) return null
    const ordered = TR_VIDEOS.filter(v => v.is_required).sort(
      (a, b) => (a.order_in_category ?? 0) - (b.order_in_category ?? 0)
    )
    const idx = ordered.findIndex(v => v.id === video.id)
    return idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null
  }, [video])

  const learnings = TR_DEFAULT_LEARNINGS[video.id] ?? [
    'Je krijgt overzicht van het onderwerp',
    'Praktische voorbeelden uit ons werk',
    'Wat je hierna kunt toepassen',
  ]

  const relatedDocs = (video.related_doc_slugs ?? [])
    .map(slug => ({ slug, doc: TR_RELATED_DOCS[slug] }))
    .filter(x => x.doc)

  return (
    <div className="tr-page">
      <div className="tr-shell">
        <button className="tr-detail-back" onClick={() => router.push('/training')} type="button">
          <ArrowLeft /> Terug naar academie
        </button>

        <div className="tr-detail-layout">
          <article>
            <nav className="tr-breadcrumb">
              <Link href="/training">Training</Link>
              <span className="sep">›</span>
              <Link href="/training">{category.label}</Link>
              <span className="sep">›</span>
              <span className="current">{video.title}</span>
            </nav>

            <div className="tr-detail-eyebrow">
              <span>{category.label}</span>
              {video.is_required && <span className="req-tag">Verplicht</span>}
            </div>

            <h1 className="tr-detail-title">{video.title}</h1>

            <div className="tr-detail-meta">
              <span className="tr-detail-meta-item">
                <Clock /> {trFmtDurationLong(video.duration_seconds)}
              </span>
              <span className="tr-detail-meta-item">
                <LayoutGrid /> {category.label}
              </span>
              {video.is_required && video.order_in_category && (
                <span className="tr-detail-meta-item">
                  <GraduationCap /> Aanbevolen volgorde: {video.order_in_category} van {totalRequired}
                </span>
              )}
            </div>

            <div className="tr-player">
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="tr-actionrow">
              <button
                type="button"
                className={`tr-actionbtn ${isWatched ? 'active' : 'primary'}`}
                onClick={() => toggleWatched(video.id, video.duration_seconds)}
              >
                {isWatched ? <CheckCircle2 /> : <Circle />}
                {isWatched ? 'Gezien' : 'Markeer als gezien'}
              </button>
              <button
                type="button"
                className={`tr-actionbtn ${isBookmarked ? 'active' : ''}`}
                onClick={() => toggleBookmark(video.id)}
              >
                <Bookmark />
                {isBookmarked ? 'Opgeslagen' : 'Opslaan voor later'}
              </button>
              <a
                className="tr-actionbtn"
                href={`https://youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink /> Open in YouTube
              </a>
            </div>

            {nextInOnboarding && (
              <div className="tr-next-onboarding">
                <div>
                  <div className="tr-next-onboarding-eyebrow">Volgende in onboarding</div>
                  <h3 className="tr-next-onboarding-title">{nextInOnboarding.title}</h3>
                  <div className="tr-next-onboarding-meta">
                    Stap {nextInOnboarding.order_in_category} van {totalRequired} ·{' '}
                    {trFmtDurationLong(nextInOnboarding.duration_seconds)}
                  </div>
                </div>
                <div className="tr-next-onboarding-thumb">
                  <Image
                    src={trYtThumb(nextInOnboarding.youtubeId)}
                    alt=""
                    width={320}
                    height={180}
                    unoptimized
                  />
                  <div className="pp">
                    <span>
                      <Play />
                    </span>
                  </div>
                </div>
                <Link href={`/training/${nextInOnboarding.id}`} className="tr-next-onboarding-cta">
                  Verder kijken <ArrowRight />
                </Link>
              </div>
            )}
          </article>

          <aside className="tr-aside">
            <div className="tr-aside-card">
              <div className="tr-aside-label">
                <Sparkles /> Wat ga je leren
              </div>
              <ul className="tr-learnings">
                {learnings.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>

            {recommended.length > 0 && (
              <div className="tr-aside-card">
                <div className="tr-aside-label">
                  <PlayCircle /> Aanbevolen vervolg
                </div>
                <div className="tr-related-list">
                  {recommended.map(rv => {
                    const cat = TR_CATEGORIES.find(c => c.key === rv.category)
                    return (
                      <Link key={rv.id} className="tr-related-card" href={`/training/${rv.id}`}>
                        <div className="tr-related-thumb">
                          <Image
                            src={trYtThumb(rv.youtubeId)}
                            alt=""
                            width={152}
                            height={86}
                            unoptimized
                            loading="lazy"
                          />
                          <span className="tr-related-duration">{trFmtDuration(rv.duration_seconds)}</span>
                        </div>
                        <div className="tr-related-info">
                          <div className="tr-related-cat">{cat?.label}</div>
                          <div className="tr-related-title">{rv.title}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {relatedDocs.length > 0 && (
              <div className="tr-aside-card">
                <div className="tr-aside-label">
                  <BookOpen /> Bijbehorende kennisbank
                </div>
                <div className="tr-doclinks">
                  {relatedDocs.map(({ slug, doc }) => (
                    <Link key={slug} className="tr-doclink" href={`/kennisbank/${slug}`}>
                      <span className="tr-doclink-code">{doc.code}</span>
                      <span className="tr-doclink-title">{doc.title}</span>
                      <span className="tr-doclink-arrow">
                        <ArrowRight />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="tr-aside-card">
              <div className="tr-aside-label">
                <Bookmark /> Notities
              </div>
              <textarea
                className="tr-notes"
                placeholder="Schrijf hier je eigen aantekeningen…"
                value={notes}
                onChange={e => setNotesFor(video.id, e.target.value)}
              />
              {notes && (
                <div className="tr-notes-saved">
                  <CheckCircle2 /> Automatisch opgeslagen
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
