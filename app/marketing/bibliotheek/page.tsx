'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { Search, Star, Copy, Trash2, Check, X, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight } from 'lucide-react'

interface ContentItem {
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

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'bg-pink-100 text-pink-700',
  LinkedIn: 'bg-blue-100 text-blue-700',
  Facebook: 'bg-indigo-100 text-indigo-700',
  YouTube: 'bg-red-100 text-red-700',
  Email: 'bg-purple-100 text-purple-700',
  Blog: 'bg-emerald-100 text-emerald-700',
  Brochure: 'bg-amber-100 text-amber-700',
}

const CAT_LABELS: Record<string, string> = {
  social_media: 'Social Media', advertenties: 'Advertenties', website_blog: 'Website & Blog',
  email: 'Email', video: 'Video', brochures: 'Brochures',
}

export default function BibliotheekPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterLang, setFilterLang] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [selected, setSelected] = useState<ContentItem | null>(null)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [planItem, setPlanItem] = useState<ContentItem | null>(null)
  const [planDate, setPlanDate] = useState('')
  const [planPlatform, setPlanPlatform] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const params = new URLSearchParams()
    if (filterCat) params.set('category', filterCat)
    if (filterLang) params.set('language', filterLang)
    if (filterFav) params.set('favorite', 'true')
    const res = await fetch(`/api/marketing?${params}`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [filterCat, filterLang, filterFav])

  async function toggleFavorite(id: string, current: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, is_favorite: !current } : i))
    await fetch('/api/marketing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_favorite: !current }) })
  }

  async function deleteItem(id: string) {
    if (!confirm('Content verwijderen?')) return
    await fetch('/api/marketing', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function schedulePlan() {
    if (!planItem || !planDate) return
    await fetch('/api/marketing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: planItem.id,
        scheduled_date: planDate,
        platform_label: planPlatform || null,
        publish_status: 'scheduled',
      }),
    })
    setItems(prev => prev.map(i => i.id === planItem.id
      ? { ...i, scheduled_date: planDate, platform_label: planPlatform || null, publish_status: 'scheduled' } : i))
    setPlanItem(null)
    setPlanDate('')
    setPlanPlatform('')
  }

  function prevMonth() { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const filtered = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q))
  })

  if (loading) return <PageLayout title="Bibliotheek"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Bibliotheek" subtitle={`${filtered.length} opgeslagen items`}>
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('list')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer ${view === 'list' ? 'bg-[#004B46] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          <List size={14} /> Lijst
        </button>
        <button onClick={() => setView('calendar')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer ${view === 'calendar' ? 'bg-[#004B46] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          <CalendarIcon size={14} /> Kalender
        </button>
      </div>

      {view === 'calendar' && (
        <CalendarView items={filtered} month={calendarMonth} onPrev={prevMonth} onNext={nextMonth} onItemClick={setSelected} />
      )}

      {view === 'list' && <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek in titel, content of tags..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004B46]" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="">Alle categorieën</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterLang} onChange={e => setFilterLang(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="">Alle talen</option>
          <option value="nl">NL</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={filterFav} onChange={e => setFilterFav(e.target.checked)} className="rounded border-gray-300" />
          Favorieten
        </label>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-slate-400 text-sm">Nog geen content opgeslagen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div key={item.id} onClick={() => setSelected(item)}
              className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${selected?.id === item.id ? 'border-[#004B46]' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-[#004B46] truncate flex-1">{item.title}</h3>
                <button onClick={e => { e.stopPropagation(); toggleFavorite(item.id, item.is_favorite) }}
                  className={`shrink-0 cursor-pointer ${item.is_favorite ? 'text-[#F5AF40]' : 'text-gray-300 hover:text-[#F5AF40]'}`}>
                  <Star size={14} fill={item.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{CAT_LABELS[item.category] || item.category}</span>
                {item.subcategory && <span className="text-[10px] bg-[#004B46]/10 text-[#004B46] px-1.5 py-0.5 rounded">{item.subcategory}</span>}
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.language.toUpperCase()}</span>
                <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{item.content.substring(0, 150)}</p>
              {item.tags && item.tags.length > 0 && (
                <div className="flex gap-1 mt-2">{item.tags.map(t => <span key={t} className="text-[9px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      </>}

      {/* Plan in calendar modal */}
      {planItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setPlanItem(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Plan in kalender</h3>
              <p className="text-xs text-slate-500 mb-4">{planItem.title}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Datum + tijd</label>
                  <input type="datetime-local" value={planDate} onChange={e => setPlanDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Platform</label>
                  <select value={planPlatform} onChange={e => setPlanPlatform(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]">
                    <option value="">Kies platform...</option>
                    {Object.keys(PLATFORM_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setPlanItem(null)} className="text-sm text-slate-500 px-3 py-2 cursor-pointer">Annuleren</button>
                <button onClick={schedulePlan} disabled={!planDate}
                  className="bg-[#004B46] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] disabled:opacity-50 cursor-pointer">
                  Inplannen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Zijpaneel */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{CAT_LABELS[selected.category]}</span>
                <span className="text-[10px] bg-[#004B46]/10 text-[#004B46] px-1.5 py-0.5 rounded">{selected.language.toUpperCase()}</span>
              </div>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.content}</div>
              {selected.prompt_used && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Originele prompt</div>
                  <p className="text-xs text-slate-500 italic">{selected.prompt_used}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
              <button onClick={() => copyContent(selected.content)}
                className="flex items-center gap-1.5 bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] cursor-pointer">
                {copied ? <><Check size={13} /> Gekopieerd!</> : <><Copy size={13} /> Kopiëren</>}
              </button>
              <button onClick={() => { setPlanItem(selected); setPlanDate(selected.scheduled_date?.substring(0, 16) || ''); setPlanPlatform(selected.platform_label || ''); setSelected(null) }}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer">
                <CalendarIcon size={13} /> Plan in kalender
              </button>
              <button onClick={() => deleteItem(selected.id)}
                className="text-slate-300 hover:text-red-500 p-2 cursor-pointer ml-auto"><Trash2 size={15} /></button>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  )
}

function CalendarView({ items, month, onPrev, onNext, onItemClick }: {
  items: ContentItem[]
  month: Date
  onPrev: () => void
  onNext: () => void
  onItemClick: (item: ContentItem) => void
}) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  const lastDay = new Date(year, m + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = (firstDay.getDay() + 6) % 7 // Maandag = 0

  const scheduled = items.filter(i => i.scheduled_date)
  const byDate = new Map<string, ContentItem[]>()
  for (const item of scheduled) {
    const dateKey = item.scheduled_date!.substring(0, 10)
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(item)
  }

  const cells: Array<{ day: number | null; items: ContentItem[] }> = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, items: [] })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, items: byDate.get(dateKey) ?? [] })
  }

  const monthName = month.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><ChevronLeft size={16} /></button>
        <h3 className="text-base font-semibold text-[#004B46] capitalize">{monthName}</h3>
        <button onClick={onNext} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase mb-1">
        {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          <div key={i} className={`min-h-[80px] p-1.5 border border-gray-100 rounded ${cell.day ? 'bg-white' : 'bg-gray-50'}`}>
            {cell.day && (
              <>
                <div className="text-[10px] text-slate-400 mb-1">{cell.day}</div>
                <div className="space-y-1">
                  {cell.items.map(item => {
                    const color = PLATFORM_COLORS[item.platform_label ?? ''] || 'bg-slate-100 text-slate-600'
                    const time = item.scheduled_date!.substring(11, 16)
                    return (
                      <button key={item.id} onClick={() => onItemClick(item)}
                        className={`block w-full text-left ${color} rounded px-1.5 py-0.5 text-[10px] cursor-pointer hover:opacity-80 truncate`}>
                        <span className="font-semibold">{time}</span> {item.title.substring(0, 20)}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
