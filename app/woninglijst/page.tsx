'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bath,
  Bed,
  Bell,
  BellOff,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  Link2,
  Loader2,
  MapPin,
  Maximize2,
  PenLine,
  Plus,
  Star,
  Trash2,
  Users,
  X,
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

  // Alert state per geselecteerde shortlist
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertQueryText, setAlertQueryText] = useState('')
  const [alertSaving, setAlertSaving] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<Array<{ id: string; query_text: string; created_at: string }>>([])
  const [alertToast, setAlertToast] = useState<string | null>(null)

  // ─── Load overview ─────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/woninglijst', { credentials: 'include' })
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
      const res = await fetch(`/api/woninglijst/${id}`, { credentials: 'include' })
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
      const res = await fetch(`/api/woninglijst/${id}/alert`, { credentials: 'include' })
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
    })
    loadOverview()
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Weet je zeker dat je deze klant en alle woningen wilt verwijderen?')) return
    await fetch(`/api/woninglijst/${id}`, { method: 'DELETE' })
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
    })
  }

  async function saveNote(itemId: string, text: string) {
    if (!selectedId) return
    await fetch(`/api/woninglijst/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, item_notities: text }),
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
        className="flex flex-col bg-marble"
        style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}
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

  return (
    <>
      {/* Header */}
      <WlHeader>
        <div className="min-w-0">
          <WlEyebrow>Dashboard</WlEyebrow>
          <h1
            className="font-heading font-bold text-deepsea"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
          >
            Woninglijsten
            <CountPill>
              {shortlists.length} klant{shortlists.length === 1 ? '' : 'en'}
            </CountPill>
          </h1>
          <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', margin: 0 }}>
            Beheer shortlists voor je klanten
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <WlButton variant="primary" onClick={() => setShowNewForm(!showNewForm)}>
            <Plus size={14} strokeWidth={2.2} /> Nieuwe klant
          </WlButton>
        </div>
      </WlHeader>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1040, padding: '22px 36px 60px' }}>
          {showNewForm && (
            <InlineForm>
              <div className="grid grid-cols-1" style={{ gap: 8, marginBottom: 10 }}>
                <WlInput
                  autoFocus
                  placeholder="Naam van de klant..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submit()
                    if (e.key === 'Escape') setShowNewForm(false)
                  }}
                />
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <WlButton variant="primary" disabled={!name.trim()} onClick={submit}>
                  Aanmaken
                </WlButton>
                <WlButton
                  variant="subtle"
                  onClick={() => {
                    setName('')
                    setShowNewForm(false)
                  }}
                >
                  Annuleren
                </WlButton>
              </div>
            </InlineForm>
          )}

          {loading ? (
            <div
              className="flex items-center justify-center"
              style={{ padding: '60px 0', color: '#7A8C8B' }}
            >
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : isEmpty ? (
            <EmptyCard
              icon={<Users size={26} strokeWidth={1.5} />}
              title="Nog geen klanten"
              text="Maak een nieuwe klant aan om hun shortlist samen te stellen."
              cta={
                <WlButton variant="primary" onClick={() => setShowNewForm(true)}>
                  <Plus size={14} strokeWidth={2.2} /> Nieuwe klant
                </WlButton>
              }
            />
          ) : (
            <div
              className="flex flex-col bg-white overflow-hidden"
              style={{
                border: '1px solid rgba(0,75,70,0.12)',
                borderRadius: 14,
              }}
            >
              {shortlists.map((s, i) => (
                <CustomerRow
                  key={s.id}
                  customer={s}
                  isFirst={i === 0}
                  onOpen={() => onOpen(s.id)}
                  onDelete={() => onDelete(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CustomerRow({
  customer,
  isFirst,
  onOpen,
  onDelete,
}: {
  customer: ShortlistSummary
  isFirst: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center cursor-pointer transition-colors relative"
      style={{
        gap: 16,
        padding: '16px 20px',
        borderTop: isFirst ? 'none' : '1px solid rgba(0,75,70,0.08)',
        background: hovered ? '#E6F0EF' : 'transparent',
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 font-heading font-bold text-deepsea"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#FFE5BD',
          fontSize: 14,
          letterSpacing: '0.02em',
        }}
      >
        {initials(customer.klant_naam)}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-heading font-bold truncate"
          style={{
            fontSize: 15.5,
            color: '#004B46',
            letterSpacing: '-0.005em',
            marginBottom: 3,
          }}
        >
          {customer.klant_naam}
        </div>
        <div
          className="flex items-center flex-wrap font-body"
          style={{ fontSize: 11.5, color: '#7A8C8B', gap: 8 }}
        >
          <span>
            Bijgewerkt <b style={{ color: '#5F7472', fontWeight: 600 }}>{formatDate(customer.updated_at)}</b>
          </span>
          {customer.notities && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '40ch',
                }}
              >
                {customer.notities}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        className="shrink-0 font-heading font-bold"
        style={{
          padding: '6px 12px',
          background: '#E6F0EF',
          color: '#004B46',
          fontSize: 12,
          borderRadius: 999,
        }}
      >
        {customer.item_count} {customer.item_count === 1 ? 'woning' : 'woningen'}
      </div>
      <button
        onClick={e => {
          e.stopPropagation()
          onDelete()
        }}
        title="Verwijderen"
        className="flex items-center justify-center shrink-0 cursor-pointer transition-all"
        style={{
          opacity: hovered ? 1 : 0,
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'transparent',
          color: '#7A8C8B',
          border: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(224,82,82,0.12)'
          e.currentTarget.style.color = '#c24040'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#7A8C8B'
        }}
      >
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
      <div
        className="shrink-0 flex items-center transition-colors"
        style={{ color: hovered ? '#004B46' : '#7A8C8B' }}
      >
        <ChevronRight size={16} strokeWidth={2} />
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
  onToggleFav: (id: string, current: boolean) => void
  onSaveNote: (id: string, text: string) => void
  onDeleteItem: (id: string) => void
  onBulkDelete: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
  onOpenDossier: (item: DossierModalItem) => void
  activeAlerts: Array<{ id: string; query_text: string; created_at: string }>
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
  const [addNote, setAddNote] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const items = useMemo(() => detail?.shortlist_items ?? [], [detail?.shortlist_items])
  const hasFavorites = items.some(i => i.is_favorite)

  const filtered = useMemo(() => {
    const arr = favOnly ? items.filter(i => i.is_favorite) : [...items]
    arr.sort((a, b) => (b.is_favorite === a.is_favorite ? 0 : b.is_favorite ? 1 : -1))
    return arr
  }, [items, favOnly])

  const allVisibleSelected =
    filtered.length > 0 && filtered.every(i => selectedItems.has(i.id))

  function toggleSelectAll() {
    const nx = new Set(selectedItems)
    if (allVisibleSelected) filtered.forEach(i => nx.delete(i.id))
    else filtered.forEach(i => nx.add(i.id))
    setSelectedItems(nx)
  }

  function toggleOne(id: string) {
    const nx = new Set(selectedItems)
    if (nx.has(id)) nx.delete(id)
    else nx.add(id)
    setSelectedItems(nx)
  }

  async function submitAdd() {
    if (!addUrl.trim()) return
    setAddLoading(true)
    await onAddItem(addUrl, addTitle, addNote)
    setAddUrl('')
    setAddTitle('')
    setAddNote('')
    setShowAddUrl(false)
    setAddLoading(false)
  }

  const title = detail?.klant_naam || 'Laden...'
  const subtitle =
    detail?.notities || 'Shortlist — beheer, markeer favorieten en genereer dossiers.'

  return (
    <>
      <WlHeader>
        <div className="min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center font-body font-semibold uppercase cursor-pointer transition-colors"
            style={{
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 11.5,
              color: '#7A8C8B',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#004B46')}
            onMouseLeave={e => (e.currentTarget.style.color = '#7A8C8B')}
          >
            <ArrowLeft size={13} strokeWidth={2} /> Terug naar overzicht
          </button>
          <WlEyebrow>Woninglijst</WlEyebrow>
          <h1
            className="font-heading font-bold text-deepsea"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
          >
            {title}
            <CountPill>
              {items.length} woning{items.length === 1 ? '' : 'en'}
            </CountPill>
          </h1>
          <p
            className="font-body truncate"
            style={{ fontSize: 13, color: '#7A8C8B', margin: 0, maxWidth: 600 }}
          >
            {subtitle}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <WlButton variant="ghost" onClick={() => setShowAlertModal(true)}>
            {activeAlerts.length > 0 ? (
              <>
                <Bell size={14} strokeWidth={2} fill="#004B46" /> Alert actief ({activeAlerts.length})
              </>
            ) : (
              <>
                <Bell size={14} strokeWidth={2} /> Alert aanzetten
              </>
            )}
          </WlButton>
          <WlButton
            variant="ghost"
            disabled={items.length === 0 || pdfLoading}
            onClick={onDownloadPdf}
          >
            {pdfLoading ? (
              <Loader2 size={14} className="animate-spin" strokeWidth={2} />
            ) : (
              <Download size={14} strokeWidth={2} />
            )}{' '}
            Download overzicht
          </WlButton>
          <WlButton variant="primary" onClick={() => setShowAddUrl(!showAddUrl)}>
            <Link2 size={14} strokeWidth={2} /> Woning toevoegen
          </WlButton>
        </div>
      </WlHeader>

      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1040, padding: '22px 36px 60px' }}>
          {showAddUrl && (
            <InlineForm>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <WlInput
                  autoFocus
                  placeholder="URL van de woning (Idealista, Costa Select, ...)"
                  value={addUrl}
                  onChange={e => setAddUrl(e.target.value)}
                />
                <WlInput
                  placeholder="Titel (optioneel)"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                />
                <WlInput
                  placeholder="Notitie (optioneel)"
                  value={addNote}
                  onChange={e => setAddNote(e.target.value)}
                />
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <WlButton
                  variant="primary"
                  disabled={!addUrl.trim() || addLoading}
                  onClick={submitAdd}
                >
                  {addLoading ? (
                    <>
                      <span
                        className="wl-spinner inline-block"
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: '2px solid rgba(255,250,239,0.3)',
                          borderTopColor: '#FFFAEF',
                        }}
                      />
                      Ophalen...
                    </>
                  ) : (
                    <>
                      <Plus size={14} strokeWidth={2.2} /> Toevoegen
                    </>
                  )}
                </WlButton>
                <WlButton
                  variant="subtle"
                  onClick={() => {
                    setShowAddUrl(false)
                    setAddUrl('')
                    setAddTitle('')
                    setAddNote('')
                  }}
                >
                  <X size={14} strokeWidth={2.2} /> Annuleren
                </WlButton>
                <span
                  className="font-body"
                  style={{ fontSize: 11, color: '#7A8C8B', marginLeft: 'auto' }}
                >
                  Scraper haalt foto, prijs en metadata op.
                </span>
              </div>
            </InlineForm>
          )}

          {items.length > 0 && (
            <div
              className="flex items-center flex-wrap"
              style={{ gap: 18, padding: '10px 4px 14px' }}
            >
              <label
                className="inline-flex items-center font-body cursor-pointer"
                style={{ gap: 8, fontSize: 12.5, color: '#5F7472', userSelect: 'none' }}
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                  style={{ width: 16, height: 16, accentColor: '#004B46' }}
                />
                Alles selecteren
              </label>
              {hasFavorites && (
                <label
                  className="inline-flex items-center font-body cursor-pointer"
                  style={{ gap: 8, fontSize: 12.5, color: '#5F7472', userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={favOnly}
                    onChange={e => setFavOnly(e.target.checked)}
                    className="cursor-pointer"
                    style={{ width: 16, height: 16, accentColor: '#004B46' }}
                  />
                  Alleen favorieten
                </label>
              )}
              {selectedItems.size > 0 && (
                <div
                  className="wl-anim-fade-in flex items-center font-body font-semibold"
                  style={{
                    marginLeft: 'auto',
                    gap: 10,
                    padding: '7px 8px 7px 14px',
                    background: '#FEF6E4',
                    border: '1px solid rgba(212,146,26,0.35)',
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#D4921A',
                  }}
                >
                  <span>
                    <span
                      className="font-heading font-bold"
                      style={{ color: '#D4921A' }}
                    >
                      {selectedItems.size}
                    </span>{' '}
                    geselecteerd
                  </span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <button
                    onClick={onBulkDelete}
                    className="cursor-pointer font-body font-semibold"
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#D4921A',
                      borderRadius: 6,
                    }}
                  >
                    Verwijderen
                  </button>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="cursor-pointer font-body font-semibold"
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#D4921A',
                      borderRadius: 6,
                    }}
                  >
                    Wissen
                  </button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div
              className="flex items-center justify-center"
              style={{ padding: '60px 0', color: '#7A8C8B' }}
            >
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <EmptyCard
              icon={<Inbox size={26} strokeWidth={1.5} />}
              title="Nog geen woningen toegevoegd"
              text="Plak een URL om te beginnen — de scraper vult de metadata automatisch aan."
              cta={
                <WlButton variant="primary" onClick={() => setShowAddUrl(true)}>
                  <Link2 size={14} strokeWidth={2} /> Woning toevoegen
                </WlButton>
              }
            />
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {filtered.map(item => (
                <PropertyRow
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
          )}
        </div>
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
                {activeAlerts.map(a => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between"
                    style={{ gap: 10, marginBottom: 6 }}
                  >
                    <div className="font-body" style={{ fontSize: 13, color: '#1A2E2C', flex: 1 }}>
                      &ldquo;{a.query_text}&rdquo;
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
                      }}
                    >
                      <BellOff size={12} strokeWidth={2} /> stoppen
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label
              className="font-body"
              style={{ fontSize: 12, color: '#1A2E2C', fontWeight: 600, display: 'block', marginBottom: 6 }}
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

// ═════════ PROPERTY ROW ═════════
function PropertyRow({
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
  const [hovered, setHovered] = useState(false)

  const kk = item.price ? Math.round(item.price * 0.1) : null
  const hasTitle = !!item.title
  const hasMeta =
    !!item.location ||
    item.price != null ||
    item.bedrooms != null ||
    item.bathrooms != null ||
    item.size_m2 != null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex bg-white transition-all"
      style={{
        gap: 16,
        padding: 14,
        borderRadius: 14,
        border: selected ? '1px solid #F5AF40' : '1px solid rgba(0,75,70,0.12)',
        boxShadow: selected
          ? '0 0 0 2px rgba(245,175,64,0.25), 0 4px 12px rgba(7,42,36,0.06)'
          : hovered
          ? '0 4px 12px rgba(7,42,36,0.06)'
          : 'none',
        background: selected ? '#FFFCF5' : '#FFFFFF',
      }}
    >
      <div className="shrink-0" style={{ paddingTop: 4 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="cursor-pointer"
          style={{ width: 18, height: 18, accentColor: '#F5AF40' }}
        />
      </div>

      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: 176,
          height: 128,
          borderRadius: 10,
          position: 'relative',
        }}
      >
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-full"
            style={{ objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #E6F0EF, #FFE5BD)',
              color: 'rgba(0,75,70,0.35)',
            }}
          >
            <ImageIcon size={36} strokeWidth={1.4} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 6 }}>
        <div className="flex items-start" style={{ gap: 10 }}>
          {item.is_favorite && (
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{ width: 22, height: 22 }}
            >
              <Star
                size={15}
                fill="#F5AF40"
                stroke="#D4921A"
                strokeWidth={1.5}
              />
            </span>
          )}
          <h4
            className={
              hasTitle
                ? 'font-heading font-bold truncate'
                : 'font-body truncate'
            }
            style={
              hasTitle
                ? {
                    fontSize: 17,
                    color: '#004B46',
                    lineHeight: 1.2,
                    letterSpacing: '-0.005em',
                    margin: 0,
                    flex: 1,
                    minWidth: 0,
                  }
                : {
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: '#5F7472',
                    margin: 0,
                    flex: 1,
                    minWidth: 0,
                  }
            }
          >
            {hasTitle ? item.title : item.url}
          </h4>
          {item.source && (
            <span
              className="shrink-0 font-body font-bold uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.12em',
                color: '#7A8C8B',
                opacity: 0.7,
                alignSelf: 'center',
              }}
            >
              {item.source}
            </span>
          )}
        </div>

        {hasMeta && (
          <div
            className="flex flex-wrap items-center font-body"
            style={{ gap: 12, fontSize: 12.5, color: '#5F7472', lineHeight: 1.4 }}
          >
            {item.location && (
              <span className="inline-flex items-center" style={{ gap: 5 }}>
                <MapPin size={12} strokeWidth={1.8} /> {item.location}
              </span>
            )}
            {item.price != null && (
              <>
                <span
                  className="font-heading font-bold"
                  style={{
                    fontSize: 15.5,
                    color: '#004B46',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {formatPrice(item.price)}
                </span>
                {kk != null && (
                  <span
                    style={{
                      fontSize: 11.5,
                      color: '#7A8C8B',
                      marginLeft: -6,
                    }}
                  >
                    k.k. ~{formatPrice(kk)}
                  </span>
                )}
              </>
            )}
            {item.bedrooms != null && (
              <span className="inline-flex items-center" style={{ gap: 5 }}>
                <Bed size={13} strokeWidth={1.8} color="#7A8C8B" />
                <b style={{ fontWeight: 600, color: '#004B46' }}>{item.bedrooms}</b> slpk
              </span>
            )}
            {item.bathrooms != null && (
              <span className="inline-flex items-center" style={{ gap: 5 }}>
                <Bath size={13} strokeWidth={1.8} color="#7A8C8B" />
                <b style={{ fontWeight: 600, color: '#004B46' }}>{item.bathrooms}</b> badk
              </span>
            )}
            {item.size_m2 != null && (
              <span className="inline-flex items-center" style={{ gap: 5 }}>
                <Maximize2 size={13} strokeWidth={1.8} color="#7A8C8B" />
                <b style={{ fontWeight: 600, color: '#004B46' }}>{item.size_m2}</b> m²
              </span>
            )}
          </div>
        )}

        {isEditingNote ? (
          <NoteEditor
            initial={item.notities || ''}
            onSave={onSaveNote}
            onCancel={onCancelEditNote}
          />
        ) : item.notities ? (
          <div
            className="font-body italic"
            style={{
              fontSize: 12.5,
              color: '#5F7472',
              padding: '8px 12px',
              background: '#E6F0EF',
              borderRadius: 8,
              borderLeft: '2px solid #004B46',
              marginTop: 2,
            }}
          >
            {item.notities}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 flex items-start" style={{ gap: 6 }}>
        <button
          onClick={onOpenDossier}
          className="inline-flex items-center font-body font-bold uppercase cursor-pointer transition-colors"
          style={{
            gap: 6,
            padding: '7px 12px',
            borderRadius: 8,
            background: '#004B46',
            color: '#FFFAEF',
            border: '1px solid #004B46',
            fontSize: 11.5,
            letterSpacing: '0.03em',
            marginRight: 4,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0A6B63')}
          onMouseLeave={e => (e.currentTarget.style.background = '#004B46')}
        >
          <FileText size={12} strokeWidth={2} /> Dossier
        </button>
        <IconAction
          title="Favoriet"
          onClick={onToggleFav}
          active={item.is_favorite}
          variant="fav"
        >
          <Star
            size={14}
            strokeWidth={1.8}
            fill={item.is_favorite ? '#F5AF40' : 'none'}
            stroke={item.is_favorite ? '#D4921A' : 'currentColor'}
          />
        </IconAction>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in nieuw tabblad"
            className="flex items-center justify-center shrink-0 cursor-pointer transition-all"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(0,75,70,0.12)',
              background: '#FFFFFF',
              color: '#5F7472',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#E6F0EF'
              e.currentTarget.style.color = '#004B46'
              e.currentTarget.style.borderColor = '#004B46'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FFFFFF'
              e.currentTarget.style.color = '#5F7472'
              e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)'
            }}
          >
            <ExternalLink size={14} strokeWidth={1.8} />
          </a>
        )}
        <IconAction title="Notitie" onClick={onStartEditNote}>
          <PenLine size={14} strokeWidth={1.8} />
        </IconAction>
        <IconAction title="Verwijderen" onClick={onDelete} variant="delete">
          <Trash2 size={14} strokeWidth={1.8} />
        </IconAction>
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
    <div className="flex items-center" style={{ gap: 8, marginTop: 2 }}>
      <WlInput
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Notitie..."
        style={{ padding: '8px 12px', fontSize: 12.5 }}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(draft)
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button
        onClick={() => onSave(draft)}
        className="font-body font-bold cursor-pointer shrink-0 transition-colors"
        style={{
          background: 'none',
          border: 'none',
          color: '#004B46',
          fontSize: 12,
          padding: '8px 10px',
          borderRadius: 8,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#E6F0EF')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        Opslaan
      </button>
    </div>
  )
}

// ═════════ SMALL ATOMS ═════════
function WlHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex justify-between items-end bg-marble shrink-0"
      style={{
        gap: 24,
        padding: '26px 36px 22px',
        borderBottom: '1px solid rgba(0,75,70,0.12)',
      }}
    >
      {children}
    </div>
  )
}

function WlEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-body font-bold uppercase text-sun-dark"
      style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10 }}
    >
      {children}
    </div>
  )
}

function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center font-body font-bold text-deepsea"
      style={{
        gap: 6,
        padding: '3px 10px',
        background: '#E6F0EF',
        fontSize: 11,
        borderRadius: 999,
        letterSpacing: '0.02em',
        marginLeft: 10,
        verticalAlign: 4,
      }}
    >
      {children}
    </span>
  )
}

function InlineForm({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="wl-anim-slide-down bg-white"
      style={{
        border: '1px solid rgba(0,75,70,0.16)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(7,42,36,0.04)',
      }}
    >
      {children}
    </div>
  )
}

function WlInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full font-body bg-marble outline-none transition-all focus:bg-white focus:border-deepsea ${className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '10px 14px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13.5,
        color: '#004B46',
        ...style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#004B46'
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.16)'
        e.currentTarget.style.background = '#FFFAEF'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function WlButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: 'primary' | 'ghost' | 'subtle'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const styles = {
    primary: {
      background: '#004B46',
      color: '#FFFAEF',
      border: '1.5px solid #004B46',
      fontWeight: 600,
    },
    ghost: {
      background: '#FFFFFF',
      color: '#004B46',
      border: '1.5px solid rgba(0,75,70,0.18)',
      fontWeight: 600,
    },
    subtle: {
      background: 'transparent',
      color: '#5F7472',
      border: '1.5px solid transparent',
      fontWeight: 500,
    },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center font-body cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
      style={{
        padding: '9px 14px',
        borderRadius: 10,
        fontSize: 12,
        letterSpacing: '0.02em',
        gap: 7,
        ...styles,
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary') {
          e.currentTarget.style.background = '#0A6B63'
          e.currentTarget.style.borderColor = '#0A6B63'
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.borderColor = '#004B46'
        } else if (variant === 'subtle') {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        if (variant === 'primary') {
          e.currentTarget.style.background = '#004B46'
          e.currentTarget.style.borderColor = '#004B46'
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.18)'
        } else if (variant === 'subtle') {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#5F7472'
        }
      }}
    >
      {children}
    </button>
  )
}

function EmptyCard({
  icon,
  title,
  text,
  cta,
}: {
  icon: React.ReactNode
  title: string
  text: string
  cta?: React.ReactNode
}) {
  return (
    <div
      className="text-center bg-white"
      style={{
        border: '1px dashed rgba(0,75,70,0.2)',
        borderRadius: 14,
        padding: '48px 24px',
      }}
    >
      <div
        className="inline-flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: '#E6F0EF',
          color: '#004B46',
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <h3
        className="font-heading font-bold text-deepsea"
        style={{ fontSize: 18, margin: '0 0 6px' }}
      >
        {title}
      </h3>
      <p
        className="font-body"
        style={{ fontSize: 13, color: '#5F7472', margin: '0 0 14px' }}
      >
        {text}
      </p>
      {cta}
    </div>
  )
}

function IconAction({
  title,
  onClick,
  active,
  variant,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  variant?: 'fav' | 'delete'
  children: React.ReactNode
}) {
  const base = {
    default: { bg: '#FFFFFF', color: '#5F7472', border: 'rgba(0,75,70,0.12)' },
    favActive: { bg: '#FEF6E4', color: '#D4921A', border: '#F5AF40' },
  }
  const state = active && variant === 'fav' ? base.favActive : base.default
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center shrink-0 cursor-pointer transition-all"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${state.border}`,
        background: state.bg,
        color: state.color,
      }}
      onMouseEnter={e => {
        if (variant === 'delete') {
          e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
          e.currentTarget.style.color = '#c24040'
          e.currentTarget.style.borderColor = 'rgba(224,82,82,0.3)'
        } else if (variant === 'fav') {
          e.currentTarget.style.background = '#FEF6E4'
          e.currentTarget.style.color = '#D4921A'
          e.currentTarget.style.borderColor = '#F5AF40'
        } else {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
          e.currentTarget.style.borderColor = '#004B46'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = state.bg
        e.currentTarget.style.color = state.color
        e.currentTarget.style.borderColor = state.border
      }}
    >
      {children}
    </button>
  )
}
