'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageLayout } from '@/components/page-layout'
import {
  Users, Plus, ArrowLeft, Trash2, ExternalLink, Loader2,
  Bed, Bath, Maximize2, PenLine, Link2, X, Star, Download,
} from 'lucide-react'

interface ShortlistSummary {
  id: string
  klant_naam: string
  notities: string
  item_count: number
  updated_at: string
}

interface ShortlistItem {
  id: string
  title: string
  url: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  thumbnail: string | null
  source: string
  notities: string
  is_favorite: boolean
  created_at: string
}

interface ShortlistDetail {
  id: string
  klant_naam: string
  notities: string
  shortlist_items: ShortlistItem[]
}

function formatPrice(price: number | null): string {
  if (!price) return ''
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

export default function WoninglijstPage() {
  const { user } = useAuth()
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ShortlistDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // New client form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')

  // Add URL form
  const [showAddUrl, setShowAddUrl] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addNote, setAddNote] = useState('')

  // Edit note
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function downloadPdf() {
    if (!detail) return
    setPdfLoading(true)
    try {
      const items = showFavoritesOnly ? detail.shortlist_items.filter(i => i.is_favorite) : detail.shortlist_items
      const res = await fetch('/api/woninglijst/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klant_naam: detail.klant_naam, items }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `woningoverzicht-${detail.klant_naam.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    setPdfLoading(false)
  }

  async function toggleFavorite(itemId: string, current: boolean) {
    if (!detail || !selectedId) return
    // Optimistic update
    setDetail(prev => prev ? {
      ...prev,
      shortlist_items: prev.shortlist_items.map(item =>
        item.id === itemId ? { ...item, is_favorite: !current } : item
      ),
    } : null)
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, is_favorite: !current }),
    })
  }

  const fetchShortlists = useCallback(async () => {
    try {
      const res = await fetch('/api/woninglijst', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setShortlists(data)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/woninglijst/${id}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDetail(data)
      }
    } catch { /* ignore */ }
    setDetailLoading(false)
  }, [])

  useEffect(() => { fetchShortlists() }, [fetchShortlists])

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
    else setDetail(null)
  }, [selectedId, fetchDetail])

  async function handleCreateClient() {
    if (!newName.trim()) return
    await fetch('/api/woninglijst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klant_naam: newName.trim(), created_by: user?.id }),
    })
    setNewName('')
    setShowNewForm(false)
    fetchShortlists()
  }

  async function handleDeleteShortlist(id: string) {
    if (!confirm('Weet je zeker dat je deze klant en alle woningen wilt verwijderen?')) return
    await fetch(`/api/woninglijst/${id}`, { method: 'DELETE' })
    if (selectedId === id) { setSelectedId(null); setDetail(null) }
    fetchShortlists()
  }

  const [addLoading, setAddLoading] = useState(false)

  async function handleAddUrl() {
    if (!selectedId || !addUrl.trim()) return
    setAddLoading(true)
    // Don't send title if empty — lets the backend auto-enrich from URL
    const title = addTitle.trim()
    await fetch(`/api/woninglijst/${selectedId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ url: addUrl.trim(), ...(title ? { title } : {}), notities: addNote.trim() }],
      }),
    })
    setAddUrl('')
    setAddTitle('')
    setAddNote('')
    setShowAddUrl(false)
    setAddLoading(false)
    fetchDetail(selectedId)
    fetchShortlists()
  }

  async function handleDeleteItem(itemId: string) {
    if (!selectedId) return
    await fetch(`/api/woninglijst/${selectedId}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    })
    fetchDetail(selectedId)
    fetchShortlists()
  }

  async function handleSaveNote(itemId: string) {
    if (!selectedId) return
    const supabaseUrl = '/api/woninglijst/' + selectedId + '/items'
    // Update note via a PATCH-style approach: delete and re-add would be messy.
    // Instead, use a direct update endpoint. For now, we update the item inline.
    // We'll use the shortlist PATCH endpoint pattern
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, item_notities: editingNoteText }),
    })
    setEditingNoteId(null)
    fetchDetail(selectedId)
  }

  // ─── OVERVIEW ───────────────────────────────────────────
  if (!selectedId) {
    return (
      <PageLayout title="Woninglijsten" subtitle="Beheer shortlists voor je klanten">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">{shortlists.length} klant{shortlists.length !== 1 ? 'en' : ''}</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#004B46] text-[#FFFAEF] text-sm font-medium rounded-xl hover:bg-[#0A6B63] transition-colors cursor-pointer"
          >
            <Plus size={15} /> Nieuwe klant
          </button>
        </div>

        {showNewForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateClient()}
              placeholder="Naam van de klant..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]"
            />
            <button onClick={handleCreateClient} className="px-4 py-2 bg-[#004B46] text-white text-sm rounded-lg cursor-pointer">Aanmaken</button>
            <button onClick={() => { setShowNewForm(false); setNewName('') }} className="px-3 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : shortlists.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">Nog geen klanten. Maak een nieuwe klant aan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shortlists.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 hover:shadow-sm transition-shadow cursor-pointer group text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-[#004B46]">{s.klant_naam}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.item_count} woning{s.item_count !== 1 ? 'en' : ''}
                    {' · '}
                    {new Date(s.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteShortlist(s.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </PageLayout>
    )
  }

  // ─── DETAIL ─────────────────────────────────────────────
  return (
    <PageLayout title={detail?.klant_naam || 'Laden...'} subtitle="Woninglijst">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#004B46] transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} /> Terug naar overzicht
        </button>
        <button
          onClick={() => setShowAddUrl(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#004B46] text-[#FFFAEF] text-sm font-medium rounded-xl hover:bg-[#0A6B63] transition-colors cursor-pointer"
        >
          <Link2 size={15} /> Woning toevoegen
        </button>
      </div>

      {showAddUrl && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 space-y-3">
          <input
            autoFocus
            value={addUrl}
            onChange={e => setAddUrl(e.target.value)}
            placeholder="URL van de woning (Idealista, CostaSelect, ...)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]"
          />
          <input
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            placeholder="Titel (optioneel)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]"
          />
          <input
            value={addNote}
            onChange={e => setAddNote(e.target.value)}
            placeholder="Notitie (optioneel)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#004B46]"
          />
          <div className="flex gap-2">
            <button onClick={handleAddUrl} disabled={addLoading} className="flex items-center gap-1.5 px-4 py-2 bg-[#004B46] text-white text-sm rounded-lg cursor-pointer disabled:opacity-50">
              {addLoading ? <><Loader2 size={14} className="animate-spin" /> Ophalen...</> : 'Toevoegen'}
            </button>
            <button onClick={() => { setShowAddUrl(false); setAddUrl(''); setAddTitle(''); setAddNote('') }} className="px-3 py-2 text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
          </div>
        </div>
      )}

      {detailLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : !detail?.shortlist_items?.length ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">Nog geen woningen toegevoegd.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Filters + Download */}
          <div className="flex items-center gap-3 mb-2">
            {detail.shortlist_items.some(i => i.is_favorite) && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={showFavoritesOnly} onChange={e => setShowFavoritesOnly(e.target.checked)} className="rounded border-gray-300" />
                Alleen favorieten
              </label>
            )}
            <button onClick={downloadPdf} disabled={pdfLoading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#004B46] text-[#FFFAEF] text-xs font-medium rounded-lg hover:bg-[#0A6B63] transition-colors cursor-pointer disabled:opacity-50">
              {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Download overzicht
            </button>
          </div>
          {[...detail.shortlist_items]
            .sort((a, b) => (a.is_favorite === b.is_favorite ? 0 : a.is_favorite ? -1 : 1))
            .filter(item => !showFavoritesOnly || item.is_favorite)
            .map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex group">
              {item.thumbnail && (
                <div className="w-32 h-24 shrink-0">
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#004B46] truncate">{item.title || item.url}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      {item.location && <span>{item.location}</span>}
                      {item.price && (
                        <>
                          <span className="text-[#0EAE96] font-medium">{formatPrice(item.price)}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-400">k.k. ~{Math.round(item.price * 0.1).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                        </>
                      )}
                      {item.bedrooms && <span className="flex items-center gap-0.5"><Bed size={10} /> {item.bedrooms}</span>}
                      {item.bathrooms && <span className="flex items-center gap-0.5"><Bath size={10} /> {item.bathrooms}</span>}
                      {item.size_m2 && <span className="flex items-center gap-0.5"><Maximize2 size={10} /> {item.size_m2}m2</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleFavorite(item.id, item.is_favorite)}
                      className={`p-1 cursor-pointer transition-colors ${item.is_favorite ? 'text-[#F5AF40]' : 'text-gray-300 hover:text-[#F5AF40]'}`}
                    >
                      <Star size={13} fill={item.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-300 hover:text-[#004B46]">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => { setEditingNoteId(item.id); setEditingNoteText(item.notities || '') }}
                      className="p-1 text-gray-300 hover:text-[#004B46] cursor-pointer"
                    >
                      <PenLine size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {editingNoteId === item.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      autoFocus
                      value={editingNoteText}
                      onChange={e => setEditingNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(item.id); if (e.key === 'Escape') setEditingNoteId(null) }}
                      placeholder="Notitie..."
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#004B46]"
                    />
                    <button onClick={() => handleSaveNote(item.id)} className="text-xs text-[#004B46] font-medium cursor-pointer">Opslaan</button>
                  </div>
                ) : item.notities ? (
                  <p className="text-xs text-gray-400 mt-1 italic">{item.notities}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
