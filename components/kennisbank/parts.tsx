'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Search,
  SearchX,
  Sparkles,
  X,
} from 'lucide-react'
import {
  CATEGORY_META,
  categories,
  getReadingMinutes,
  getSummary,
  isNew,
  type Category,
  type KennisbankDoc,
} from '@/lib/kennisbank-docs'
import { CategoryIcon } from './CategoryIcon'

/* ── Hero ────────────────────────────────────────────── */
export function KbHero({
  value,
  onChange,
  onSubmit,
  suggestions,
  onPickSuggestion,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: (q: string) => void
  suggestions: string[]
  onPickSuggestion: (s: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement === inputRef.current ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      if (e.key === '/' && !isInputFocused) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  return (
    <section className="kb-hero">
      <div className="kb-shell">
        <div className="kb-hero-eyebrow">Costa Select · Kennisbank</div>
        <h1 className="kb-hero-title">
          Vraag de kennisbank <span className="accent">alles.</span>
        </h1>
        <p className="kb-hero-sub">
          Eén AI-vraag of blader door alle Costa Select kennis — op je vingertoppen.
        </p>

        <form className="kb-ai-form" onSubmit={handleSubmit}>
          <span className="kb-ai-icon">
            <Sparkles size={20} strokeWidth={1.8} />
          </span>
          <input
            ref={inputRef}
            className="kb-ai-input"
            type="text"
            placeholder="Stel een vraag aan de kennisbank…"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <span className="kb-ai-kbd">/</span>
          <button type="submit" className="kb-ai-submit" disabled={!value.trim()}>
            Vraag <ArrowRight size={14} strokeWidth={2} />
          </button>
        </form>

        <div className="kb-ai-suggestions">
          <span className="kb-ai-sugg-label">Probeer</span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="kb-ai-sugg"
              onClick={() => onPickSuggestion(s)}
            >
              <Sparkles size={11} strokeWidth={2} /> {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Answer panel ────────────────────────────────────── */
export interface KbAnswerSource {
  slug: string
  code: string
  title: string
}

export function KbAnswerPanel({
  question,
  loading,
  answer,
  sources,
  onClose,
}: {
  question: string
  loading: boolean
  answer: string
  sources: KbAnswerSource[]
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Render markdown-light: split paragraphs on blank lines, parse **bold**
  const paragraphs = useMemo(() => {
    if (!answer) return []
    return answer.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  }, [answer])

  function renderInline(text: string, key: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={key}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    )
  }

  return (
    <div className="kb-answer-wrap">
      <div className="kb-shell">
        <div className="kb-answer-card" role="region" aria-label="Antwoord uit de kennisbank">
          <div className="kb-answer-head">
            <div className="kb-answer-head-main">
              <div className="kb-answer-eyebrow">
                <Sparkles size={12} strokeWidth={2} /> Antwoord uit de kennisbank
              </div>
              <h2 className="kb-answer-question">{question}</h2>
            </div>
            <button
              type="button"
              className="kb-answer-close"
              onClick={onClose}
              aria-label="Sluiten"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="kb-answer-body">
            {loading ? (
              <p style={{ color: 'var(--fg-subtle)' }}>De kennisbank denkt na…</p>
            ) : paragraphs.length === 0 ? (
              <p style={{ color: 'var(--fg-subtle)' }}>Geen antwoord ontvangen.</p>
            ) : (
              paragraphs.map((p, i) => renderInline(p, String(i)))
            )}
          </div>

          {sources.length > 0 && (
            <div className="kb-answer-sources">
              <div className="kb-answer-sources-label">Bronnen</div>
              <div className="kb-source-chips">
                {sources.map(s => (
                  <Link key={s.slug} href={`/kennisbank/${s.slug}`} className="kb-source-chip">
                    <span className="kb-source-chip-code">{s.code}</span>
                    <span className="kb-source-chip-title">{s.title}</span>
                    <span className="kb-source-chip-arrow">
                      <ArrowRight size={12} strokeWidth={2} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Category rail ───────────────────────────────────── */
export function KbCategoryRail({
  docs,
  activeCategory,
  onPickCategory,
}: {
  docs: KennisbankDoc[]
  activeCategory: Category | null
  onPickCategory: (c: Category | null) => void
}) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    docs.forEach(d => {
      map[d.category] = (map[d.category] ?? 0) + 1
    })
    return map
  }, [docs])

  return (
    <div className="kb-category-rail">
      <div className="kb-cat-grid">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat]
          const isActive = activeCategory === cat
          const count = counts[cat] ?? 0
          return (
            <button
              key={cat}
              type="button"
              className={`kb-cat-tile ${isActive ? 'active' : ''}`}
              onClick={() => onPickCategory(isActive ? null : cat)}
            >
              <div className="kb-cat-icon">
                <CategoryIcon name={meta.iconName} size={17} />
              </div>
              <div className="kb-cat-label">{cat}</div>
              <div className="kb-cat-count">
                {count} {count === 1 ? 'document' : 'documenten'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Toolbar ─────────────────────────────────────────── */
export function KbToolbar({
  search,
  onSearch,
  totalCount,
  filteredCount,
}: {
  search: string
  onSearch: (v: string) => void
  totalCount: number
  filteredCount: number
}) {
  return (
    <div className="kb-toolbar">
      <div className="kb-search">
        <Search />
        <input
          type="text"
          placeholder="Zoek op titel, code (CS-027), of trefwoord…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="kb-search-clear"
            onClick={() => onSearch('')}
            aria-label="Wissen"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="kb-result-meta">
        {filteredCount === totalCount ? (
          <>
            <strong>{totalCount}</strong> documenten
          </>
        ) : (
          <>
            <strong>{filteredCount}</strong> van {totalCount} documenten
          </>
        )}
      </div>
    </div>
  )
}

/* ── Doc card ────────────────────────────────────────── */
export function KbDocCard({ doc }: { doc: KennisbankDoc }) {
  const reading = getReadingMinutes(doc)
  const summary = getSummary(doc)
  const _new = isNew(doc)
  // Pseudo-random "updated" datum binnen laatste 90 dagen
  const hash = doc.slug.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const daysAgo = hash % 90
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const updatedDate = new Date(nowMs - daysAgo * 24 * 3600 * 1000)
  const updatedLabel = updatedDate.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <Link href={`/kennisbank/${doc.slug}`} className="kb-doc-card">
      <div className="kb-doc-card-head">
        <span className="kb-doc-code">{doc.code}</span>
        {_new && <span className="kb-doc-newbadge">Nieuw</span>}
        <span className="kb-doc-arrow">
          <ArrowRight size={14} strokeWidth={2} />
        </span>
      </div>
      <h3 className="kb-doc-title">{doc.title}</h3>
      <p className="kb-doc-summary">{summary}</p>
      <div className="kb-doc-meta">
        <span className="kb-doc-meta-item">
          <Clock size={12} strokeWidth={2} /> {reading} min lezen
        </span>
        <span className="kb-doc-meta-item">
          <Calendar size={12} strokeWidth={2} /> Bijgewerkt {updatedLabel}
        </span>
      </div>
    </Link>
  )
}

/* ── Section ─────────────────────────────────────────── */
export function KbSection({
  category,
  docs,
  initialLimit = 4,
  forceExpanded = false,
}: {
  category: Category
  docs: KennisbankDoc[]
  initialLimit?: number
  forceExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = CATEGORY_META[category]
  const visible = forceExpanded || expanded ? docs : docs.slice(0, initialLimit)
  const hasMore = !forceExpanded && docs.length > initialLimit

  return (
    <section className="kb-section">
      <div className="kb-section-head">
        <span className="kb-section-icon">
          <CategoryIcon name={meta.iconName} size={14} />
        </span>
        <h2 className="kb-section-title">{category}</h2>
        <span className="kb-section-count">· {docs.length}</span>
        <span className="kb-section-desc">{meta.desc}</span>
      </div>
      <div className="kb-doc-grid">
        {visible.map(doc => (
          <KbDocCard key={doc.slug} doc={doc} />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="kb-section-toggle"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? (
            <>
              Toon minder <ChevronUp size={13} strokeWidth={2} />
            </>
          ) : (
            <>
              Toon alle {docs.length} <ChevronDown size={13} strokeWidth={2} />
            </>
          )}
        </button>
      )}
    </section>
  )
}

/* ── Search results section (flat, niet gegroepeerd) ─── */
export function KbSearchResults({ docs }: { docs: KennisbankDoc[] }) {
  return (
    <section className="kb-section">
      <div className="kb-section-head">
        <span className="kb-section-icon">
          <Search size={14} />
        </span>
        <h2 className="kb-section-title">Zoekresultaten</h2>
        <span className="kb-section-count">· {docs.length}</span>
      </div>
      <div className="kb-doc-grid">
        {docs.map(doc => (
          <KbDocCard key={doc.slug} doc={doc} />
        ))}
      </div>
    </section>
  )
}

/* ── Empty ───────────────────────────────────────────── */
export function KbEmpty({ search }: { search: string }) {
  return (
    <div className="kb-empty">
      <div className="kb-empty-icon">
        <SearchX size={24} strokeWidth={1.6} />
      </div>
      <div className="kb-empty-title">Geen documenten gevonden</div>
      <p className="kb-empty-text">
        {search ? (
          <>
            Geen resultaten voor &quot;<strong>{search}</strong>&quot;. Probeer een andere term of code.
          </>
        ) : (
          'Geen documenten in deze categorie.'
        )}
      </p>
    </div>
  )
}
