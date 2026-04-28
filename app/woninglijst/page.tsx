'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  Link2,
  Loader2,
  MapPin,
  PenLine,
  Plus,
  Ruler,
  Star,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DossierModal, type DossierModalItem } from '@/components/woninglijst/DossierModal'

// ───────── Types ─────────
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

// ───────── Utils ─────────
function formatPrice(n: number | null): string | null {
  if (n == null) return null
  return '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  if (days < 7) return `${days} dagen geleden`
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function sourceFromUrl(url: string, fallback: string): string {
  if (!url) return fallback || ''
  try {
    const host = new URL(url).host.replace(/^www\./, '')
    return host
  } catch {
    return fallback || ''
  }
}

// ───────── Page ─────────
export default function WoninglijstPage() {
  const { user } = useAuth()
  const [view, setView] = useState<'overview' | 'detail'>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Overview data
  const [shortlists, setShortlists] = useState<ShortlistSummary[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)

  // Detail data
  const [detail, setDetail] = useState<ShortlistDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Overview form
  const [showNewForm, setShowNewForm] = useState(false)

  // Detail forms/filters
  const [showAddUrl, setShowAddUrl] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Dossier modal
  const [dossierItem, setDossierItem] = useState<DossierModalItem | null>(null)

  // ─── Load overview ─────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/woninglijst', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setShortlists(data)
      }
    } catch {
      /* ignore */
    }
    setOverviewLoading(false)
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // ─── Load detail on selectedId change ──────────────────────
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/woninglijst/${id}`, { credentials: 'include', cache: 'no-store' })
      if (res.ok) setDetail(await res.json())
    } catch {
      /* ignore */
    }
    setDetailLoading(false)
  }, [])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  // ─── CRUD ──────────────────────────────────────────────────
  async function createCustomer(name: string) {
    await fetch('/api/woninglijst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ klant_naam: name, created_by: user?.id }),
      cache: 'no-store',
    })
    loadOverview()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Weet je zeker dat je deze klant en alle woningen wilt verwijderen?')) return
    await fetch(`/api/woninglijst/${id}`, { method: 'DELETE', cache: 'no-store' })
    if (selectedId === id) {
      setSelectedId(null)
      setView('overview')
    }
    loadOverview()
  }

  async function addItem(url: string, title: string, notities: string) {
    if (!selectedId) return
    const trimmedTitle = title.trim()
    await fetch(`/api/woninglijst/${selectedId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ url: url.trim(), ...(trimmedTitle ? { title: trimmedTitle } : {}), notities: notities.trim() }],
      }),
      cache: 'no-store',
    })
    loadDetail(selectedId)
    loadOverview()
  }

  async function toggleFavorite(itemId: string, current: boolean) {
    if (!detail || !selectedId) return
    setDetail(prev =>
      prev
        ? {
            ...prev,
            shortlist_items: prev.shortlist_items.map(i =>
              i.id === itemId ? { ...i, is_favorite: !current } : i
            ),
          }
        : null
    )
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, is_favorite: !current }),
      cache: 'no-store',
    })
  }

  async function saveNote(itemId: string, text: string) {
    if (!selectedId) return
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, item_notities: text }),
      cache: 'no-store',
    })
    setEditingNoteId(null)
    loadDetail(selectedId)
  }

  async function deleteItem(itemId: string) {
    if (!selectedId) return
    await fetch(`/api/woninglijst/${selectedId}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
      cache: 'no-store',
    })
    loadDetail(selectedId)
    loadOverview()
  }

  async function bulkDelete() {
    if (!selectedId || selectedItems.size === 0) return
    if (
      !confirm(
        `Weet je zeker dat je ${selectedItems.size} woningen wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
      )
    )
      return
    await fetch(`/api/woninglijst/${selectedId}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: Array.from(selectedItems) }),
      cache: 'no-store',
    })
    setSelectedItems(new Set())
    loadDetail(selectedId)
    loadOverview()
  }

  async function downloadPdf() {
    if (!detail) return
    setPdfLoading(true)
    try {
      const items = favOnly
        ? detail.shortlist_items.filter(i => i.is_favorite)
        : detail.shortlist_items
      const res = await fetch('/api/woninglijst/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klant_naam: detail.klant_naam, items }),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `woningoverzicht-${detail.klant_naam.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
    setPdfLoading(false)
  }

  // ─── View-switch helpers ───────────────────────────────────
  function openDetail(id: string) {
    setSelectedId(id)
    setView('detail')
    setSelectedItems(new Set())
    setFavOnly(false)
    setEditingNoteId(null)
    setShowAddUrl(false)
  }

  function backToOverview() {
    setView('overview')
    setSelectedId(null)
    setSelectedItems(new Set())
    setShowAddUrl(false)
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <>
      <div
        className="dirA"
        style={{ minHeight: '100vh', minWidth: 0 }}
      >
        {view === 'overview' ? (
          <OverviewView
            shortlists={shortlists}
            loading={overviewLoading}
            showNewForm={showNewForm}
            setShowNewForm={setShowNewForm}
            onCreate={createCustomer}
            onOpen={openDetail}
            onDelete={deleteCustomer}
          />
        ) : (
          <DetailView
            detail={detail}
            loading={detailLoading}
            onBack={backToOverview}
            showAddUrl={showAddUrl}
            setShowAddUrl={setShowAddUrl}
            onAddItem={addItem}
            favOnly={favOnly}
            setFavOnly={setFavOnly}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            editingNoteId={editingNoteId}
            setEditingNoteId={setEditingNoteId}
            onToggleFav={toggleFavorite}
            onSaveNote={saveNote}
            onDeleteItem={deleteItem}
            onBulkDelete={bulkDelete}
            onDownloadPdf={downloadPdf}
            pdfLoading={pdfLoading}
            onOpenDossier={setDossierItem}
          />
        )}
      </div>

      <DossierModal item={dossierItem} onClose={() => setDossierItem(null)} />
    </>
  )
}

// ═════════ OVERVIEW ═════════
function OverviewView({
  shortlists,
  loading,
  showNewForm,
  setShowNewForm,
  onCreate,
  onOpen,
  onDelete,
}: {
  shortlists: ShortlistSummary[]
  loading: boolean
  showNewForm: boolean
  setShowNewForm: (v: boolean) => void
  onCreate: (name: string) => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const isEmpty = !loading && shortlists.length === 0

  function submit() {
    if (!name.trim()) return
    onCreate(name.trim())
    setName('')
    setShowNewForm(false)
  }

  function cancel() {
    setShowNewForm(false)
    setName('')
  }

  return (
    <div className="a-page">
      <div className="a-header-row">
        <div>
          <div className="a-eyebrow">Dashboard / shortlists</div>
          <h1 className="a-h1">
            Woninglijsten
            {!isEmpty && (
              <span className="a-count">
                {shortlists.length} {shortlists.length === 1 ? 'klant' : 'klanten'}
              </span>
            )}
          </h1>
          <p className="a-sub">
            Beheer shortlists voor je klanten — voeg woningen toe via URL, markeer
            favorieten, genereer dossiers.
          </p>
        </div>
        <div className="a-actions">
          <button
            type="button"
            className="a-btn a-btn-primary"
            onClick={() => setShowNewForm(!showNewForm)}
          >
            <UserPlus size={14} strokeWidth={2} /> Nieuwe klant
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ padding: '60px 0', color: '#7A8C8B' }}
        >
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : isEmpty && !showNewForm ? (
        <div className="a-empty">
          <div className="empty-icon">
            <Users size={28} strokeWidth={1.6} />
          </div>
          <h3 className="empty-title">Nog geen klanten</h3>
          <p className="empty-text">
            Maak een klant aan om hun shortlist samen te stellen — voeg dan
            woningen toe via een URL.
          </p>
          <button
            type="button"
            className="a-btn a-btn-primary"
            style={{ margin: '0 auto' }}
            onClick={() => setShowNewForm(true)}
          >
            <Plus size={14} strokeWidth={2.2} /> Eerste klant aanmaken
          </button>
        </div>
      ) : (
        <div className="a-rows">
          {showNewForm && (
            <div className="a-newform">
              <div className="a-newform-icon">
                <Plus size={18} strokeWidth={2} />
              </div>
              <input
                autoFocus
                placeholder="Naam van de klant…"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submit()
                  if (e.key === 'Escape') cancel()
                }}
              />
              <div className="a-newform-actions">
                <button type="button" className="cancel" onClick={cancel}>
                  Annuleer
                </button>
                <button
                  type="button"
                  className="save"
                  onClick={submit}
                  disabled={!name.trim()}
                >
                  Aanmaken
                </button>
              </div>
            </div>
          )}
          {shortlists.map(s => (
            <CustomerRow
              key={s.id}
              shortlist={s}
              onOpen={() => onOpen(s.id)}
              onDelete={() => onDelete(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerRow({
  shortlist,
  onOpen,
  onDelete,
}: {
  shortlist: ShortlistSummary
  onOpen: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const note = shortlist.notities?.trim() ?? ''

  return (
    <div
      className="a-row"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="a-init">{initials(shortlist.klant_naam)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="a-name">{shortlist.klant_naam}</div>
        <div className="a-meta">
          <span>
            Bijgewerkt <b>{formatDate(shortlist.updated_at)}</b>
          </span>
          {note && (
            <>
              <span className="dot" />
              <span className="a-note-snippet">{note}</span>
            </>
          )}
        </div>
      </div>
      <div className="a-prop-count">
        {String(shortlist.item_count).padStart(2, '0')}
        <em>{shortlist.item_count === 1 ? 'woning' : 'woningen'}</em>
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        {hovered && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
            title="Verwijderen"
            className="flex items-center justify-center cursor-pointer transition-all"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(0,75,70,0.14)',
              color: '#7A8C8B',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(224,82,82,0.10)'
              e.currentTarget.style.borderColor = 'rgba(224,82,82,0.40)'
              e.currentTarget.style.color = '#c24040'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(0,75,70,0.14)'
              e.currentTarget.style.color = '#7A8C8B'
            }}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        )}
        <div className="a-arrow">
          <ArrowRight size={14} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

// ═════════ DETAIL ═════════
function DetailView({
  detail,
  loading,
  onBack,
  showAddUrl,
  setShowAddUrl,
  onAddItem,
  favOnly,
  setFavOnly,
  selectedItems,
  setSelectedItems,
  editingNoteId,
  setEditingNoteId,
  onToggleFav,
  onSaveNote,
  onDeleteItem,
  onBulkDelete,
  onDownloadPdf,
  pdfLoading,
  onOpenDossier,
}: {
  detail: ShortlistDetail | null
  loading: boolean
  onBack: () => void
  showAddUrl: boolean
  setShowAddUrl: (v: boolean) => void
  onAddItem: (url: string, title: string, note: string) => Promise<void>
  favOnly: boolean
  setFavOnly: (v: boolean) => void
  selectedItems: Set<string>
  setSelectedItems: (s: Set<string>) => void
  editingNoteId: string | null
  setEditingNoteId: (id: string | null) => void
  onToggleFav: (id: string, current: boolean) => void
  onSaveNote: (id: string, text: string) => void
  onDeleteItem: (id: string) => void
  onBulkDelete: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
  onOpenDossier: (item: DossierModalItem) => void
}) {
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const items = useMemo(() => detail?.shortlist_items ?? [], [detail?.shortlist_items])
  const favCount = items.filter(i => i.is_favorite).length

  const filtered = useMemo(() => {
    const arr = favOnly ? items.filter(i => i.is_favorite) : [...items]
    arr.sort((a, b) => (b.is_favorite === a.is_favorite ? 0 : b.is_favorite ? 1 : -1))
    return arr
  }, [items, favOnly])

  function toggleOne(id: string) {
    const nx = new Set(selectedItems)
    if (nx.has(id)) nx.delete(id)
    else nx.add(id)
    setSelectedItems(nx)
  }

  async function submitAdd() {
    if (!addUrl.trim()) return
    setAddLoading(true)
    await onAddItem(addUrl, addTitle, '')
    setAddUrl('')
    setAddTitle('')
    setShowAddUrl(false)
    setAddLoading(false)
  }

  function cancelAdd() {
    setShowAddUrl(false)
    setAddUrl('')
    setAddTitle('')
  }

  const title = detail?.klant_naam || 'Laden…'
  const subtitle = detail?.notities || 'Shortlist — beheer, markeer favorieten en genereer dossiers.'

  return (
    <div className="a-page">
      <div className="a-header-row">
        <div style={{ minWidth: 0 }}>
          <button type="button" className="c-back-link" onClick={onBack}>
            <ArrowLeft size={13} strokeWidth={2} /> Terug naar overzicht
          </button>
          <div className="a-eyebrow">Shortlist</div>
          <h1 className="a-h1">
            {title}
            {detail && (
              <span className="a-count">
                {items.length} {items.length === 1 ? 'woning' : 'woningen'}
              </span>
            )}
          </h1>
          <p className="a-sub">{subtitle}</p>
        </div>
        <div className="a-actions">
          <button
            type="button"
            className="a-btn a-btn-ghost"
            disabled={items.length === 0 || pdfLoading}
            onClick={onDownloadPdf}
          >
            {pdfLoading ? (
              <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            ) : (
              <Download size={14} strokeWidth={2} />
            )}
            Download PDF
          </button>
          <button
            type="button"
            className="a-btn a-btn-primary"
            onClick={() => setShowAddUrl(!showAddUrl)}
          >
            <Link2 size={14} strokeWidth={2} /> Voeg woning toe
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ padding: '60px 0', color: '#7A8C8B' }}
        >
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <>
          {showAddUrl && (
            <div className="c-add-form">
              <input
                autoFocus
                className="url-input"
                placeholder="https://idealista.com/inmueble/..."
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && addUrl.trim()) submitAdd()
                  if (e.key === 'Escape') cancelAdd()
                }}
              />
              <input
                placeholder="Titel-override (optioneel)"
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
              />
              <div className="c-add-actions">
                <button type="button" className="ghost" onClick={cancelAdd}>
                  Annuleer
                </button>
                <button
                  type="button"
                  className="sun"
                  disabled={!addUrl.trim() || addLoading}
                  onClick={submitAdd}
                >
                  <Plus size={13} strokeWidth={2.2} /> Toevoegen
                </button>
              </div>
              {addLoading && (
                <div className="c-add-status">
                  <span className="c-spin" />
                  Scraper haalt foto, prijs en metadata op…
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="a-empty">
              <div className="empty-icon">
                <Inbox size={28} strokeWidth={1.6} />
              </div>
              <h3 className="empty-title">Nog geen woningen</h3>
              <p className="empty-text">
                Plak een Costa Select of Idealista URL om de eerste woning toe
                te voegen — de scraper haalt foto, prijs en metadata op.
              </p>
              <button
                type="button"
                className="a-btn a-btn-primary"
                style={{ margin: '0 auto' }}
                onClick={() => setShowAddUrl(true)}
              >
                <Link2 size={14} strokeWidth={2} /> Eerste URL plakken
              </button>
            </div>
          ) : (
            <>
              <div className="c-toolbar">
                <div className="c-segmented">
                  <button
                    type="button"
                    className={!favOnly ? 'on' : ''}
                    onClick={() => setFavOnly(false)}
                  >
                    Alle ({items.length})
                  </button>
                  <button
                    type="button"
                    className={favOnly ? 'on' : ''}
                    onClick={() => setFavOnly(true)}
                    disabled={favCount === 0}
                  >
                    Favorieten ({favCount})
                  </button>
                </div>
                {selectedItems.size > 0 && (
                  <span style={{ fontSize: 11, color: '#7A8C8B' }}>
                    · {selectedItems.size}{' '}
                    {selectedItems.size === 1 ? 'woning' : 'woningen'} geselecteerd
                  </span>
                )}
                {selectedItems.size > 0 && (
                  <div className="c-bulk">
                    <span>{selectedItems.size} geselecteerd</span>
                    <button type="button" onClick={onBulkDelete}>
                      Verwijder
                    </button>
                  </div>
                )}
              </div>

              <div className="c-cards">
                {filtered.map(item => (
                  <PropertyCard
                    key={item.id}
                    item={item}
                    selected={selectedItems.has(item.id)}
                    onToggleSelect={() => toggleOne(item.id)}
                    onToggleFav={() => onToggleFav(item.id, item.is_favorite)}
                    onDelete={() => onDeleteItem(item.id)}
                    onOpenDossier={() =>
                      onOpenDossier({ title: item.title, url: item.url })
                    }
                    isEditingNote={editingNoteId === item.id}
                    onStartEditNote={() => setEditingNoteId(item.id)}
                    onCancelEditNote={() => setEditingNoteId(null)}
                    onSaveNote={text => onSaveNote(item.id, text)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ═════════ PROPERTY CARD ═════════
function PropertyCard({
  item,
  selected,
  onToggleSelect,
  onToggleFav,
  onDelete,
  onOpenDossier,
  isEditingNote,
  onStartEditNote,
  onCancelEditNote,
  onSaveNote,
}: {
  item: ShortlistItem
  selected: boolean
  onToggleSelect: () => void
  onToggleFav: () => void
  onDelete: () => void
  onOpenDossier: () => void
  isEditingNote: boolean
  onStartEditNote: () => void
  onCancelEditNote: () => void
  onSaveNote: (text: string) => void
}) {
  const kk = item.price ? Math.round(item.price * 0.1) : null
  const hasTitle = !!item.title
  const cardClass = 'c-card' + (item.is_favorite ? ' fav' : '')
  const sourceLabel = sourceFromUrl(item.url, item.source)

  return (
    <div className={cardClass}>
      <div className="c-check">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </div>

      <div className={'c-thumb' + (item.thumbnail ? '' : ' empty')}>
        {item.thumbnail ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.thumbnail} alt="" />
        ) : (
          <ImageIcon size={38} strokeWidth={1.4} />
        )}
        {sourceLabel && <span className="c-source-tag">{sourceLabel}</span>}
      </div>

      <div className="c-body">
        {item.location && (
          <div className="c-loc">
            <MapPin size={11} strokeWidth={2} /> {item.location}
          </div>
        )}
        <div className="c-title-row">
          <h3
            className={hasTitle ? 'c-title' : 'c-title'}
            style={
              hasTitle
                ? undefined
                : { fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: '#5F7472' }
            }
          >
            {hasTitle ? item.title : item.url}
          </h3>
          {item.is_favorite && (
            <span className="c-fav-icon">
              <Star size={18} fill="#F5AF40" stroke="#D4921A" strokeWidth={1.5} />
            </span>
          )}
        </div>

        <div className="c-specs">
          {item.price != null && (
            <span className="c-price">{formatPrice(item.price)}</span>
          )}
          <div className="c-spec-list">
            {item.bedrooms != null && (
              <span className="spec">
                <Bed size={13} strokeWidth={1.8} /> <b>{item.bedrooms}</b> slpk
              </span>
            )}
            {item.bathrooms != null && (
              <span className="spec">
                <Bath size={13} strokeWidth={1.8} /> <b>{item.bathrooms}</b> badk
              </span>
            )}
            {item.size_m2 != null && (
              <span className="spec">
                <Ruler size={13} strokeWidth={1.8} /> <b>{item.size_m2}</b> m²
              </span>
            )}
            {kk != null && (
              <span className="spec" style={{ color: '#7A8C8B' }}>
                k.k. ~{formatPrice(kk)}
              </span>
            )}
          </div>
        </div>

        {isEditingNote ? (
          <NoteEditor
            initial={item.notities || ''}
            onSave={onSaveNote}
            onCancel={onCancelEditNote}
          />
        ) : item.notities ? (
          <div className="c-note" onClick={onStartEditNote}>
            <span className="c-note-icon">
              <PenLine size={11} strokeWidth={1.8} />
            </span>
            <span className="c-note-text">{item.notities}</span>
            <span className="c-note-edit">Bewerk</span>
          </div>
        ) : null}
      </div>

      <div className="c-actions-stack">
        <button type="button" className="c-act-dossier" onClick={onOpenDossier}>
          <FileText size={12} strokeWidth={2} /> Dossier
        </button>
        <div className="c-iconrow">
          <button
            type="button"
            className={'c-icon-btn fav' + (item.is_favorite ? ' on' : '')}
            title="Favoriet"
            onClick={onToggleFav}
          >
            <Star
              size={13}
              strokeWidth={1.8}
              fill={item.is_favorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            className="c-icon-btn"
            title="Notitie"
            onClick={onStartEditNote}
          >
            <PenLine size={13} strokeWidth={1.8} />
          </button>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open op website"
              className="c-icon-btn"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={13} strokeWidth={1.8} />
            </a>
          )}
          <button
            type="button"
            className="c-icon-btn del"
            title="Verwijderen"
            onClick={onDelete}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════ NOTE EDITOR ═════════
function NoteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(initial)
  return (
    <div className="c-note editing">
      <span className="c-note-icon">
        <PenLine size={11} strokeWidth={1.8} />
      </span>
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Notitie…"
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(draft)
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="c-note-actions">
        <button type="button" className="cancel" onClick={onCancel}>
          Esc
        </button>
        <button type="button" onClick={() => onSave(draft)}>
          Opslaan
        </button>
      </div>
    </div>
  )
}
