'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MbCalendar, MbContentCard, MbEmpty, MbFilters, MbHero,
  MbPlanModal, MbSidePanel, MbSubBar, MbToast,
  type CategoryFilter, type ContentItem, type LanguageFilter, type ViewMode,
} from '@/components/bibliotheek/parts'

export default function BibliotheekPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [language, setLanguage] = useState<LanguageFilter>('all')
  const [favOnly, setFavOnly] = useState(false)

  const [view, setView] = useState<ViewMode>('list')
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelVisible, setPanelVisible] = useState(false)
  const [planVisible, setPlanVisible] = useState(false)

  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: string }>({
    visible: false, message: '', icon: 'check-circle',
  })
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle')

  const showToast = useCallback((message: string, icon = 'check-circle') => {
    setToast({ visible: true, message, icon })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 1900)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/marketing')
      if (cancelled) return
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(it => {
      if (favOnly && !it.is_favorite) return false
      if (category !== 'all' && it.category !== category) return false
      if (language !== 'all' && it.language !== language) return false
      if (q) {
        const inTitle = it.title.toLowerCase().includes(q)
        const inBody = it.content.toLowerCase().includes(q)
        const inTags = (it.tags || []).some(t => t.toLowerCase().includes(q))
        if (!inTitle && !inBody && !inTags) return false
      }
      return true
    })
  }, [items, search, category, language, favOnly])

  const hasFilter = Boolean(search) || category !== 'all' || language !== 'all' || favOnly
  const clearFilters = () => { setSearch(''); setCategory('all'); setLanguage('all'); setFavOnly(false) }

  const selectedItem = items.find(i => i.id === selectedId) || null
  const totalCount = items.length
  const scheduledCount = items.filter(i => i.publish_status === 'scheduled').length
  const favoriteCount = items.filter(i => i.is_favorite).length

  const onOpen = useCallback((id: string) => {
    setSelectedId(id)
    setPanelVisible(true)
  }, [])

  const onClosePanel = useCallback(() => {
    setPanelVisible(false)
    setTimeout(() => setSelectedId(null), 280)
  }, [])

  async function onToggleFav(id: string) {
    const target = items.find(i => i.id === id)
    if (!target) return
    const next = !target.is_favorite
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_favorite: next } : i))
    try {
      const res = await fetch('/api/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_favorite: next }),
      })
      if (!res.ok) throw new Error('toggle failed')
    } catch {
      setItems(prev => prev.map(i => i.id === id ? { ...i, is_favorite: !next } : i))
      showToast('Bijwerken mislukt', 'x')
    }
  }

  async function onCopy(item: ContentItem) {
    try { await navigator.clipboard.writeText(item.content) } catch { /* ignore */ }
    setCopyState('success')
    showToast('Tekst gekopieerd naar klembord', 'copy')
    setTimeout(() => setCopyState('idle'), 1700)
  }

  const onPlan = useCallback(() => setPlanVisible(true), [])
  const onClosePlan = useCallback(() => setPlanVisible(false), [])

  async function onSubmitPlan({ scheduled_date, platform_label }: { scheduled_date: string; platform_label: string }) {
    if (!selectedId) return
    const target = items.find(i => i.id === selectedId)
    if (!target) return
    const newStatus = target.publish_status === 'published' ? 'published' : 'scheduled'
    setItems(prev => prev.map(i => i.id === selectedId
      ? { ...i, scheduled_date, platform_label, publish_status: newStatus }
      : i))
    setPlanVisible(false)
    try {
      const res = await fetch('/api/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedId,
          scheduled_date,
          platform_label,
          publish_status: newStatus,
        }),
      })
      if (!res.ok) throw new Error('plan failed')
      showToast('Ingepland in kalender', 'check-circle')
    } catch {
      // revert
      setItems(prev => prev.map(i => i.id === selectedId
        ? { ...i, scheduled_date: target.scheduled_date, platform_label: target.platform_label, publish_status: target.publish_status }
        : i))
      showToast('Inplannen mislukt', 'x')
    }
  }

  async function onDelete(item: ContentItem) {
    if (!confirm('Content verwijderen?')) return
    const snapshot = items
    setItems(prev => prev.filter(i => i.id !== item.id))
    onClosePanel()
    try {
      const res = await fetch('/api/marketing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) throw new Error('delete failed')
      showToast('Verwijderd uit bibliotheek', 'trash')
    } catch {
      setItems(snapshot)
      showToast('Verwijderen mislukt', 'x')
    }
  }

  const onPrevMonth = () => setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n })
  const onNextMonth = () => setMonthDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n })
  const onToday = () => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setMonthDate(d)
  }

  if (loading) {
    return (
      <div className="mb-page">
        <div className="mb-shell">
          <div style={{ color: 'var(--mb-fg-subtle)', fontSize: 13 }}>Laden…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-page">
      <div className="mb-shell">
        <MbHero
          totalCount={totalCount}
          scheduledCount={scheduledCount}
          favoriteCount={favoriteCount}
        />

        <MbFilters
          search={search} onSearch={setSearch}
          category={category} onCategory={setCategory}
          language={language} onLanguage={setLanguage}
          favOnly={favOnly} onFavOnly={setFavOnly}
        />

        <MbSubBar
          count={filtered.length}
          totalCount={totalCount}
          view={view}
          onView={setView}
          hasFilter={hasFilter}
          onClearFilters={clearFilters}
        />

        {view === 'list' && (
          filtered.length === 0
            ? <MbEmpty kind={hasFilter ? 'no-results' : 'empty'} />
            : (
              <div className="mb-grid">
                {filtered.map(it => (
                  <MbContentCard
                    key={it.id}
                    item={it}
                    isSelected={selectedId === it.id && panelVisible}
                    onOpen={onOpen}
                    onToggleFav={onToggleFav}
                  />
                ))}
              </div>
            )
        )}

        {view === 'calendar' && (
          <MbCalendar
            items={filtered}
            monthDate={monthDate}
            onPrev={onPrevMonth}
            onNext={onNextMonth}
            onToday={onToday}
            onOpen={onOpen}
          />
        )}

        <MbSidePanel
          item={selectedItem}
          visible={panelVisible}
          onClose={onClosePanel}
          onCopy={onCopy}
          onPlan={onPlan}
          onDelete={onDelete}
          onToggleFav={onToggleFav}
          copyState={copyState}
        />

        <MbPlanModal
          visible={planVisible}
          item={selectedItem}
          onClose={onClosePlan}
          onSubmit={onSubmitPlan}
        />

        <MbToast message={toast.message} visible={toast.visible} icon={toast.icon} />
      </div>
    </div>
  )
}
