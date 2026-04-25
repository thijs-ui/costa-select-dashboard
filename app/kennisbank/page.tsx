'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  categories,
  docs,
  type Category,
} from '@/lib/kennisbank-docs'
import {
  KbAnswerPanel,
  KbCategoryRail,
  KbEmpty,
  KbHero,
  KbSearchResults,
  KbSection,
  KbToolbar,
  type KbAnswerSource,
} from '@/components/kennisbank/parts'

const SUGGESTIONS = [
  'Wat zijn de kosten koper in Andalusië?',
  'Hoe vraag ik een NIE-nummer aan voor een klant?',
  'Verschil tussen ITP en AJD bij nieuwbouw?',
  'Wat staat er standaard in een arras-contract?',
]

export default function KennisbankPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="kb-page">
          <div className="kb-shell" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--fg-subtle)' }}>
            Laden…
          </div>
        </div>
      }
    >
      <KennisbankPage />
    </Suspense>
  )
}

function KennisbankPage() {
  const searchParams = useSearchParams()
  const [aiQuery, setAiQuery] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  // Answer-view state
  const [answerOpen, setAnswerOpen] = useState(false)
  const [answerLoading, setAnswerLoading] = useState(false)
  const [answerQuestion, setAnswerQuestion] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [answerSources, setAnswerSources] = useState<KbAnswerSource[]>([])

  async function handleAsk(question: string) {
    setAnswerOpen(true)
    setAnswerLoading(true)
    setAnswerQuestion(question)
    setAnswerText('')
    setAnswerSources([])
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    try {
      const res = await fetch('/api/kennisbank/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question }),
      })
      const data = await res.json()
      setAnswerText(data.answer ?? 'Geen antwoord ontvangen.')
      setAnswerSources(
        Array.isArray(data.sources)
          ? data.sources.map((s: KbAnswerSource) => ({
              slug: s.slug,
              code: s.code,
              title: s.title,
            }))
          : []
      )
    } catch {
      setAnswerText('Er ging iets mis bij het zoeken. Probeer het opnieuw.')
    } finally {
      setAnswerLoading(false)
    }
  }

  function closeAnswer() {
    setAnswerOpen(false)
    setAiQuery('')
  }

  // Auto-submit als URL ?ask=<query> bevat (binnenkomend vanuit homepage)
  useEffect(() => {
    const ask = searchParams.get('ask')
    if (!ask) return
    setAiQuery(ask)
    void handleAsk(ask)
  }, [searchParams])

  // Filter docs by search + active category
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = docs
    if (activeCategory) list = list.filter(d => d.category === activeCategory)
    if (q) {
      list = list.filter(
        d =>
          d.title.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [search, activeCategory])

  const isSearchActive = search.trim().length > 0
  const showCategoryRail = !answerOpen && !isSearchActive

  // Reset answer-state als de gebruiker een categorie of de search activeert
  useEffect(() => {
    if (answerOpen && (activeCategory !== null || isSearchActive)) {
      setAnswerOpen(false)
    }
  }, [activeCategory, isSearchActive, answerOpen])

  return (
    <div className="kb-page">
      <KbHero
        value={aiQuery}
        onChange={setAiQuery}
        onSubmit={handleAsk}
        suggestions={SUGGESTIONS}
        onPickSuggestion={s => {
          setAiQuery(s)
          void handleAsk(s)
        }}
      />

      {answerOpen ? (
        <KbAnswerPanel
          question={answerQuestion}
          loading={answerLoading}
          answer={answerText}
          sources={answerSources}
          onClose={closeAnswer}
        />
      ) : (
        <>
          {showCategoryRail && (
            <KbCategoryRail
              docs={docs}
              activeCategory={activeCategory}
              onPickCategory={setActiveCategory}
            />
          )}

          <div className="kb-shell">
            <KbToolbar
              search={search}
              onSearch={setSearch}
              totalCount={docs.length}
              filteredCount={filtered.length}
            />

            {filtered.length === 0 ? (
              <KbEmpty search={search} />
            ) : isSearchActive ? (
              <KbSearchResults docs={filtered} />
            ) : activeCategory ? (
              <KbSection
                category={activeCategory}
                docs={filtered}
                forceExpanded
              />
            ) : (
              categories
                .map(cat => ({
                  cat,
                  docs: filtered.filter(d => d.category === cat),
                }))
                .filter(({ docs }) => docs.length > 0)
                .map(({ cat, docs }) => (
                  <KbSection key={cat} category={cat} docs={docs} />
                ))
            )}

            <div style={{ height: 60 }} />
          </div>
        </>
      )}
    </div>
  )
}
