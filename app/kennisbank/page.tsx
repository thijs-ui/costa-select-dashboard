'use client'

import { useState } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { docs, categories, getDocsByCategory } from '@/lib/kennisbank-docs'
import { PageLayout } from '@/components/page-layout'

interface SearchResult {
  answer: string
  sources: { slug: string; code: string; title: string }[]
}

export default function KennisbankPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [aiQuery, setAiQuery] = useState('')
  const [aiResult, setAiResult] = useState<SearchResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const grouped = getDocsByCategory()

  const filtered = search.trim()
    ? docs.filter(d =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.code.toLowerCase().includes(search.toLowerCase()) ||
        d.category.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategory
      ? docs.filter(d => d.category === activeCategory)
      : null

  async function handleAiSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!aiQuery.trim() || aiLoading) return

    setAiLoading(true)
    setAiResult(null)

    try {
      const res = await fetch('/api/kennisbank/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery.trim() }),
      })
      const data = await res.json()
      setAiResult(data)
    } catch {
      setAiResult({ answer: 'Er ging iets mis bij het zoeken. Probeer het opnieuw.', sources: [] })
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <PageLayout title="Kennisbank" subtitle={`${docs.length} documenten — doorzoek alle Costa Select kennis`}>

      {/* AI Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} style={{ color: '#F5AF40' }} />
          <span className="text-sm font-medium" style={{ color: '#004B46' }}>
            Stel een vraag aan de kennisbank
          </span>
        </div>
        <form onSubmit={handleAiSearch} className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={e => setAiQuery(e.target.value)}
            placeholder="Bijv. wat zijn de kosten koper in Andalusië?"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-300"
            style={{ fontFamily: 'var(--font-body, sans-serif)' }}
          />
          <button
            type="submit"
            disabled={aiLoading || !aiQuery.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
            style={{ backgroundColor: '#004B46' }}
          >
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : 'Zoeken'}
          </button>
        </form>

        {aiResult && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#004B46', fontFamily: 'var(--font-body, sans-serif)' }}
            >
              {aiResult.answer}
            </div>
            {aiResult.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-xs" style={{ color: '#7A8C8B' }}>Bronnen:</span>
                {aiResult.sources.map(s => (
                  <Link
                    key={s.slug}
                    href={`/kennisbank/${s.slug}`}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#004B4610', color: '#004B46' }}
                  >
                    {s.code} — {s.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document search bar */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: '#7A8C8B' }}
        />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
          placeholder="Filter op titel, code of categorie..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300"
          style={{ fontFamily: 'var(--font-body, sans-serif)' }}
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setActiveCategory(null); setSearch('') }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: !activeCategory && !search ? '#004B46' : '#F5F5F5',
            color: !activeCategory && !search ? '#FFFFFF' : '#7A8C8B',
          }}
        >
          Alles
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSearch('') }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeCategory === cat ? '#004B46' : '#F5F5F5',
              color: activeCategory === cat ? '#FFFFFF' : '#7A8C8B',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-sm" style={{ color: '#7A8C8B' }}>
                Geen documenten gevonden voor &quot;{search}&quot;
              </p>
            </div>
          ) : (
            filtered.map(doc => (
              <Link
                key={doc.slug}
                href={`/kennisbank/${doc.slug}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm transition-shadow group"
              >
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: '#F5F5F5', color: '#7A8C8B' }}>
                  {doc.code}
                </span>
                <span className="text-sm font-medium group-hover:opacity-80" style={{ color: '#004B46' }}>
                  {doc.title}
                </span>
                <span className="ml-auto text-xs" style={{ color: '#7A8C8B' }}>
                  {doc.category}
                </span>
              </Link>
            ))
          )}
        </div>
      ) : (
        /* Grouped by category */
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <h2
                className="text-sm font-semibold mb-2"
                style={{ color: '#004B46', fontFamily: 'var(--font-heading, sans-serif)' }}
              >
                {cat}
                <span className="ml-2 text-xs font-normal" style={{ color: '#7A8C8B' }}>
                  ({grouped[cat].length})
                </span>
              </h2>
              <div className="space-y-1.5">
                {grouped[cat].map(doc => (
                  <Link
                    key={doc.slug}
                    href={`/kennisbank/${doc.slug}`}
                    className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-2.5 hover:shadow-sm transition-shadow group"
                  >
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: '#F5F5F5', color: '#7A8C8B' }}>
                      {doc.code}
                    </span>
                    <span className="text-sm group-hover:opacity-80" style={{ color: '#004B46' }}>
                      {doc.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
