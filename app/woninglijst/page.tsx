'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Bed,
  Bell,
  BellOff,
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
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DossierModal, type DossierModalItem } from '@/components/woninglijst/DossierModal'
import { PageHeader } from '@/components/page-header'

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
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Dossier modal
  const [dossierItem, setDossierItem] = useState<DossierModalItem | null>(null)

  // Alert state per geselecteerde shortlist
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertQueryText, setAlertQueryText] = useState('')
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<Array<{
    id: string
    query_text: string
    created_at: string
    last_checked_at: string | null
    location: string | null
    max_price: number | null
    min_rooms: number | null
  }>>([])
  const [alertToast, setAlertToast] = useState<string | null>(null)

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

  // ─── Alerts: load + create + deactivate ────────────────────
  const loadAlerts = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/woninglijst/${id}/alert`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setActiveAlerts(Array.isArray(data) ? data : [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadAlerts(selectedId)
    else setActiveAlerts([])
  }, [selectedId, loadAlerts])

  async function submitAlert() {
    if (!selectedId || !alertQueryText.trim()) return
    setAlertSaving(true)
    setAlertError(null)
    try {
      const res = await fetch(`/api/woninglijst/${selectedId}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query_text: alertQueryText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAlertError(data.error || `Fout (${res.status})`)
      } else {
        setAlertToast('Alert aangemaakt — je krijgt elke ochtend een Slack-DM bij nieuwe matches.')
        setAlertQueryText('')
        setShowAlertModal(false)
        await loadAlerts(selectedId)
        setTimeout(() => setAlertToast(null), 4000)
      }
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : 'Onbekende fout')
    }
    setAlertSaving(false)
  }

  async function deactivateAlert(alertId: string) {
    if (!selectedId) return
    if (!confirm('Alert deactiveren?')) return
    try {
      const res = await fetch(
        `/api/woninglijst/${selectedId}/alert?alert_id=${encodeURIComponent(alertId)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (res.ok) {
        await loadAlerts(selectedId)
        setAlertToast('Alert gedeactiveerd.')
        setTimeout(() => setAlertToast(null), 3000)
      }
    } catch {
      /* ignore */
    }
  }

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

  // Consultant-edit van de titel — overschrijft de auto-scraped titel uit
  // Idealista/Supabase die er soms slordig uitziet. Lege waarde resets
  // (server zet 'm op null en de UI valt dan terug op de URL).
  async function saveTitle(itemId: string, text: string) {
    if (!selectedId) return
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, item_title: text }),
      cache: 'no-store',
    })
    setEditingTitleId(null)
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
      a.download = `shortlist-${detail.klant_naam.replace(/\s+/g, '-').toLowerCase()}.pdf`
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
            editingTitleId={editingTitleId}
            setEditingTitleId={setEditingTitleId}
            onToggleFav={toggleFavorite}
            onSaveNote={saveNote}
            onSaveTitle={saveTitle}
            onDeleteItem={deleteItem}
            onBulkDelete={bulkDelete}
            onDownloadPdf={downloadPdf}
            pdfLoading={pdfLoading}
            onOpenDossier={setDossierItem}
            activeAlerts={activeAlerts}
            showAlertModal={showAlertModal}
            setShowAlertModal={setShowAlertModal}
            alertQueryText={alertQueryText}
            setAlertQueryText={setAlertQueryText}
            alertSaving={alertSaving}
            alertError={alertError}
            onSubmitAlert={submitAlert}
            onDeactivateAlert={deactivateAlert}
            alertToast={alertToast}
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
    <>
      <PageHeader
        eyebrow="Costa Select · Shortlists"
        title="Shortlists"
        subtitle="Beheer shortlists voor je klanten — voeg woningen toe via URL, markeer favorieten, genereer presentaties."
        badge={!isEmpty && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              background: 'rgba(0,75,70,0.08)',
              color: '#004B46',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              letterSpacing: '0.02em',
            }}
          >
            {shortlists.length} {shortlists.length === 1 ? 'klant' : 'klanten'}
          </span>
        )}
        actions={
          <button
            type="button"
            className="a-btn a-btn-primary"
            onClick={() => setShowNewForm(!showNewForm)}
          >
            <UserPlus size={14} strokeWidth={2} /> Nieuwe klant
          </button>
        }
      />
      <div className="a-page" style={{ paddingTop: 24 }}>

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
    </>
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
  editingTitleId,
  setEditingTitleId,
  onToggleFav,
  onSaveNote,
  onSaveTitle,
  onDeleteItem,
  onBulkDelete,
  onDownloadPdf,
  pdfLoading,
  onOpenDossier,
  activeAlerts,
  showAlertModal,
  setShowAlertModal,
  alertQueryText,
  setAlertQueryText,
  alertSaving,
  alertError,
  onSubmitAlert,
  onDeactivateAlert,
  alertToast,
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
  editingTitleId: string | null
  setEditingTitleId: (id: string | null) => void
  onToggleFav: (id: string, current: boolean) => void
  onSaveNote: (id: string, text: string) => void
  onSaveTitle: (id: string, text: string) => void
  onDeleteItem: (id: string) => void
  onBulkDelete: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
  onOpenDossier: (item: DossierModalItem) => void
  activeAlerts: Array<{
    id: string
    query_text: string
    created_at: string
    last_checked_at: string | null
    location: string | null
    max_price: number | null
    min_rooms: number | null
  }>
  showAlertModal: boolean
  setShowAlertModal: (v: boolean) => void
  alertQueryText: string
  setAlertQueryText: (v: string) => void
  alertSaving: boolean
  alertError: string | null
  onSubmitAlert: () => void
  onDeactivateAlert: (id: string) => void
  alertToast: string | null
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
  const subtitle = detail?.notities || 'Shortlist — beheer, markeer favorieten en genereer presentaties.'

  return (
    <>
      <PageHeader
        eyebrow={`Costa Select · Shortlist · ${title}`}
        title={title}
        titlePeriod={false}
        subtitle={subtitle}
        badge={detail && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              background: 'rgba(0,75,70,0.08)',
              color: '#004B46',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              letterSpacing: '0.02em',
            }}
          >
            {items.length} {items.length === 1 ? 'woning' : 'woningen'}
          </span>
        )}
        actions={
          <>
            <button
              type="button"
              className="a-btn a-btn-ghost"
              onClick={() => setShowAlertModal(true)}
            >
              {activeAlerts.length > 0 ? (
                <>
                  <Bell size={14} strokeWidth={2} fill="#004B46" /> Alert actief ({activeAlerts.length})
                </>
              ) : (
                <>
                  <Bell size={14} strokeWidth={2} /> Alert aanzetten
                </>
              )}
            </button>
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
          </>
        }
      />
    <div className="a-page" style={{ paddingTop: 16 }}>
      <button
        type="button"
        className="c-back-link"
        onClick={onBack}
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={13} strokeWidth={2} /> Terug naar overzicht
      </button>

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
                    isEditingTitle={editingTitleId === item.id}
                    onStartEditTitle={() => setEditingTitleId(item.id)}
                    onCancelEditTitle={() => setEditingTitleId(null)}
                    onSaveTitle={text => onSaveTitle(item.id, text)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>

    {/* ── Alert toast ── */}
    {alertToast && (
      <div
        className="font-body"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#004B46',
          color: 'white',
          padding: '12px 18px',
          borderRadius: 8,
          fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          zIndex: 60,
          maxWidth: 360,
        }}
      >
        {alertToast}
      </div>
    )}

    {/* ── Alert modal ── */}
    {showAlertModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,32,30,.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 70,
          padding: 20,
        }}
        onClick={() => setShowAlertModal(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: 12,
            maxWidth: 560,
            width: '100%',
            padding: 28,
            boxShadow: '0 12px 48px rgba(0,0,0,.25)',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <h2
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 20, margin: 0 }}
            >
              Alert voor {detail?.klant_naam}
            </h2>
            <button
              onClick={() => setShowAlertModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8C8B' }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
          <p
            className="font-body"
            style={{ fontSize: 13, color: '#7A8C8B', margin: '0 0 18px', lineHeight: 1.55 }}
          >
            Beschrijf de zoekcriteria voor deze klant. De woningbot checkt elke ochtend of er
            nieuwe matches zijn en stuurt je een Slack-DM bij hits.
          </p>

          {activeAlerts.length > 0 && (
            <div
              style={{
                background: '#F4F7F6',
                borderRadius: 8,
                padding: 14,
                marginBottom: 18,
              }}
            >
              <div
                className="font-body"
                style={{ fontSize: 11, color: '#7A8C8B', marginBottom: 8, fontWeight: 600 }}
              >
                ACTIEVE ALERT{activeAlerts.length > 1 ? 'S' : ''}
              </div>
              {activeAlerts.map(a => {
                const filterParts: string[] = []
                if (a.location) filterParts.push(a.location)
                if (a.max_price)
                  filterParts.push(`max €${Number(a.max_price).toLocaleString('nl-NL')}`)
                if (a.min_rooms) filterParts.push(`${a.min_rooms}+ slpk`)

                const lastCheckText = a.last_checked_at
                  ? `Laatst gecheckt: ${new Date(a.last_checked_at).toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'short',
                    })}`
                  : 'Nog niet gecheckt — eerste run komende ochtend'

                return (
                  <div
                    key={a.id}
                    className="flex items-start justify-between"
                    style={{
                      gap: 10,
                      marginBottom: 10,
                      paddingBottom: 8,
                      borderBottom: '1px solid #E8EEED',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="font-body"
                        style={{ fontSize: 13, color: '#1A2E2C', marginBottom: 2 }}
                      >
                        &ldquo;{a.query_text}&rdquo;
                      </div>
                      {filterParts.length > 0 && (
                        <div
                          className="font-body"
                          style={{ fontSize: 11, color: '#7A8C8B', marginBottom: 2 }}
                        >
                          {filterParts.join(' • ')}
                        </div>
                      )}
                      <div
                        className="font-body"
                        style={{ fontSize: 10, color: '#9CA9A8' }}
                      >
                        {lastCheckText}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeactivateAlert(a.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#B14747',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <BellOff size={12} strokeWidth={2} /> stoppen
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <label
            className="font-body"
            style={{
              fontSize: 12,
              color: '#1A2E2C',
              fontWeight: 600,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Nieuwe alert — zoekcriteria
          </label>
          <textarea
            value={alertQueryText}
            onChange={e => setAlertQueryText(e.target.value)}
            placeholder="bv. villa Estepona max 700k, 3+ slaapkamers, zicht op zee, instapklaar"
            className="font-body"
            style={{
              width: '100%',
              minHeight: 90,
              padding: 12,
              fontSize: 13,
              border: '1px solid #D4DDDB',
              borderRadius: 8,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />

          {alertError && (
            <div
              className="font-body"
              style={{ marginTop: 10, fontSize: 12, color: '#B14747' }}
            >
              {alertError}
            </div>
          )}

          <div className="flex items-center justify-end" style={{ gap: 10, marginTop: 18 }}>
            <button
              onClick={() => setShowAlertModal(false)}
              className="font-body"
              style={{
                background: 'none',
                border: '1px solid #D4DDDB',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                color: '#1A2E2C',
                cursor: 'pointer',
              }}
            >
              Annuleren
            </button>
            <button
              onClick={onSubmitAlert}
              disabled={!alertQueryText.trim() || alertSaving}
              className="font-body"
              style={{
                background: '#004B46',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                cursor: alertSaving || !alertQueryText.trim() ? 'not-allowed' : 'pointer',
                opacity: alertSaving || !alertQueryText.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {alertSaving ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={2} />
              ) : (
                <Bell size={14} strokeWidth={2} />
              )}
              Alert aanmaken
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
  isEditingTitle,
  onStartEditTitle,
  onCancelEditTitle,
  onSaveTitle,
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
  isEditingTitle: boolean
  onStartEditTitle: () => void
  onCancelEditTitle: () => void
  onSaveTitle: (text: string) => void
}) {
  const kk = item.price ? Math.round(item.price * 0.1) : null
  const hasTitle = !!item.title
  const cardClass = 'c-card' + (item.is_favorite ? ' fav' : '')

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
      </div>

      <div className="c-body">
        {item.location && (
          <div className="c-loc">
            <MapPin size={11} strokeWidth={2} /> {item.location}
          </div>
        )}
        <div className="c-title-row">
          {isEditingTitle ? (
            <input
              autoFocus
              defaultValue={hasTitle ? (item.title ?? '') : ''}
              placeholder="Titel voor deze woning"
              onBlur={e => onSaveTitle(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSaveTitle(e.currentTarget.value)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  onCancelEditTitle()
                }
              }}
              className="c-title"
              style={{
                background: 'transparent',
                border: '1px dashed rgba(0,75,70,0.35)',
                borderRadius: 4,
                padding: '2px 6px',
                margin: '-2px -6px',
                outline: 'none',
                width: '100%',
                color: '#004B46',
              }}
            />
          ) : (
            <h3
              className="c-title"
              onClick={onStartEditTitle}
              title="Klik om te bewerken"
              style={{
                cursor: 'text',
                ...(hasTitle
                  ? null
                  : { fontFamily: 'var(--font-body)', fontSize: 13.5, fontWeight: 500, color: '#5F7472' }),
              }}
            >
              {hasTitle ? item.title : item.url}
            </h3>
          )}
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
          <FileText size={12} strokeWidth={2} /> Presentatie
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
