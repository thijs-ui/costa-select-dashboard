'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  AlignLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Info,
  Link2,
  List,
  Loader2,
  Lock,
  Map as MapIcon,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'

// ───────── Constants ─────────
const REGIOS = [
  'Costa Brava', 'Costa Dorada', 'Costa de Valencia', 'Valencia stad',
  'Costa Blanca Noord', 'Costa Blanca Zuid', 'Costa Cálida', 'Costa del Sol',
  'Barcelona', 'Madrid', 'Balearen', 'Canarische Eilanden',
  'Costa Tropical', 'Costa de la Luz', 'Málaga',
]

const TYPES = [
  'appartement', 'woning', 'villa', 'nieuwbouw', 'penthouse', 'townhouse',
]

// ───────── Types ─────────
type BrochureType = 'presentatie' | 'pitch'
type Tab = 'new' | 'history'
type InputMode = 'url' | 'manual'

interface PitchContent {
  voordelen: string[]
  nadelen: string[]
  buurtcontext: string
  investering: string
  advies: string
}

interface DossierAnalyse {
  samenvatting: string
  prijsanalyse: string
  sterke_punten: string[]
  aandachtspunten: string[]
  juridische_risicos: string[]
  verhuurpotentieel: string
  advies_consultant: string
}

interface UnitRow {
  typology: string
  rooms: number | null
  size_m2: number | null
  price: number | null
}

interface DossierResult {
  property: {
    adres: string
    regio: string
    type: string
    vraagprijs: number
    oppervlakte: number
    slaapkamers: number
    badkamers: number
    omschrijving: string
    fotos: string[]
    url?: string
  }
  regioInfo: string
  analyse?: DossierAnalyse
  pitch_content?: PitchContent
  brochure_type: BrochureType
  generatedAt: string
  units_data?: UnitRow[]
  source?: string
}

interface HistoryItem {
  id: string
  adres: string
  regio: string
  type: string
  vraagprijs: number
  url: string
  brochure_type: BrochureType | null
  source: string | null
  created_at: string
}

interface ManualForm {
  adres: string
  regio: string
  type: string
  vraagprijs: string
  oppervlakte: string
  slaapkamers: string
  badkamers: string
  omschrijving: string
  fotos: string
}

const EMPTY_MANUAL: ManualForm = {
  adres: '', regio: '', type: 'appartement',
  vraagprijs: '', oppervlakte: '',
  slaapkamers: '', badkamers: '',
  omschrijving: '', fotos: '',
}

// ───────── Utils ─────────
function fmtPrice(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'vandaag'
  if (days === 1) return 'gisteren'
  if (days < 7) return `${days} dagen geleden`
  const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function sourceLabel(s: string | null | undefined): string {
  if (!s) return ''
  if (s === 'idealista' || s === 'idealista_newbuild') return 'Idealista'
  if (s === 'costa_select' || s === 'costaselect') return 'Costa Select'
  if (s === 'manual') return 'Handmatig'
  return s
}

// ───────── Page ─────────
export default function DossierPage() {
  return (
    <Suspense fallback={null}>
      <DossierPageInner />
    </Suspense>
  )
}

function DossierPageInner() {
  const searchParams = useSearchParams()
  const focusId = searchParams.get('id')
  const initialTab: Tab = searchParams.get('tab') === 'history' ? 'history' : 'new'
  const [tab, setTab] = useState<Tab>(initialTab)
  const focusedRef = useRef<string | null>(null)
  // Pitch is tijdelijk uitgeschakeld in de creatie-flow — alleen presentatie.
  // History toont nog wel oude pitches (filter onder Geschiedenis-tab).
  const [brochure] = useState<BrochureType>('presentatie')
  const [mode, setMode] = useState<InputMode>('url')
  const [urlValue, setUrlValue] = useState('')
  const [manualForm, setManualForm] = useState<ManualForm>(EMPTY_MANUAL)
  const [loading, setLoading] = useState(false)
  const [loadStep, setLoadStep] = useState(0)
  const [dossier, setDossier] = useState<DossierResult | null>(null)
  const [editAnalyse, setEditAnalyse] = useState<DossierAnalyse | null>(null)
  const [editPitch, setEditPitch] = useState<PitchContent | null>(null)
  const [editProperty, setEditProperty] = useState<DossierResult['property'] | null>(null)
  const [error, setError] = useState('')
  const [aiBusyKey, setAiBusyKey] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')

  // History
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pitch' | 'presentatie'>('all')
  const [historyPdfLoading, setHistoryPdfLoading] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState('')

  // History fetch
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/dossier/history', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setHistory(data)
      }
    } catch { /* ignore */ }
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  // ?id=<id> in de URL — na laden van history scrollen + tijdelijke pulse-
  // highlight op die rij. focusedRef voorkomt dat we 'm telkens opnieuw
  // afspelen bij elke history-refresh in dezelfde sessie.
  useEffect(() => {
    if (tab !== 'history' || !focusId || focusedRef.current === focusId) return
    if (history.length === 0) return
    const found = history.some(h => h.id === focusId)
    if (!found) return
    focusedRef.current = focusId
    const el = document.querySelector(`[data-history-id="${focusId}"]`) as HTMLElement | null
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('dossier-row-pulse')
    setTimeout(() => el.classList.remove('dossier-row-pulse'), 2400)
  }, [tab, focusId, history])

  function setManualField(k: keyof ManualForm, v: string) {
    setManualForm(prev => ({ ...prev, [k]: v }))
  }

  // Generate
  async function handleGenerate() {
    setLoading(true)
    setLoadStep(0)
    setError('')
    setDossier(null)
    setEditAnalyse(null)
    setEditPitch(null)
    setEditProperty(null)

    // Progress simulation
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setLoadStep(1), 900))
    timers.push(setTimeout(() => setLoadStep(2), 1800))

    const body = mode === 'url'
      ? { mode: 'url', url: urlValue, brochure_type: brochure }
      : {
          mode: 'manual',
          adres: manualForm.adres,
          regio: manualForm.regio,
          type: manualForm.type,
          vraagprijs: manualForm.vraagprijs,
          oppervlakte: manualForm.oppervlakte,
          slaapkamers: manualForm.slaapkamers,
          badkamers: manualForm.badkamers,
          omschrijving: manualForm.omschrijving,
          fotos: manualForm.fotos.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
          brochure_type: brochure,
        }

    try {
      const res = await fetch('/api/dossier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Er ging iets mis bij het genereren.')
      } else {
        setDossier(data)
        if (data.property) setEditProperty({ ...data.property })
        if (data.analyse) setEditAnalyse({ ...data.analyse })
        if (data.pitch_content) setEditPitch({ ...data.pitch_content })
      }
    } catch {
      setError('Kon geen verbinding maken met de server.')
    } finally {
      timers.forEach(clearTimeout)
      setLoading(false)
    }
  }

  async function regenerateSection(section: string) {
    if (!dossier) return
    setAiBusyKey(section)
    try {
      const res = await fetch('/api/dossier/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, property_data: dossier.property }),
      })
      if (!res.ok) throw new Error()
      const { content } = await res.json()
      setEditPitch(prev => (prev ? { ...prev, [section]: content } : null))
    } catch {
      setError('Sectie kon niet opnieuw worden gegenereerd.')
    }
    setAiBusyKey(null)
  }

  // PDF
  async function handleDownloadPdf() {
    if (!dossier) return
    setPdfLoading(true)
    try {
      const payload = {
        ...dossier,
        ...(editProperty ? { property: editProperty } : {}),
        ...(editAnalyse ? { analyse: editAnalyse } : {}),
        ...(editPitch ? { pitch_content: editPitch } : {}),
      }
      const res = await fetch('/api/dossier/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const slug = dossier.property.adres.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
      a.download = `costa-select-dossier-${slug || 'dossier'}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setError('PDF kon niet worden gegenereerd.')
    }
    setPdfLoading(false)
  }

  // History actions
  async function openFromHistory(id: string) {
    try {
      const res = await fetch(`/api/dossier/history/${id}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.dossier_data) return
      const units = data.units_data ?? []
      const full = { ...data.dossier_data, units_data: units }
      setDossier(full)
      if (data.dossier_data.property) setEditProperty({ ...data.dossier_data.property })
      if (data.dossier_data.analyse) setEditAnalyse({ ...data.dossier_data.analyse })
      if (data.dossier_data.pitch_content) setEditPitch({ ...data.dossier_data.pitch_content })
      setTab('new')
    } catch { /* ignore */ }
  }

  async function downloadHistoryPdf(id: string) {
    setHistoryPdfLoading(id)
    try {
      const res = await fetch(`/api/dossier/history/${id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const payload = { ...data.dossier_data, ...(data.units_data ? { units_data: data.units_data } : {}) }
      const pdfRes = await fetch('/api/dossier/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!pdfRes.ok) throw new Error()
      const blob = await pdfRes.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      const slug = (data.dossier_data.property?.adres || 'dossier')
        .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
      a.download = `costa-select-dossier-${slug}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setError('PDF kon niet worden gegenereerd.')
    }
    setHistoryPdfLoading(null)
  }

  async function renameHistory(id: string) {
    const trimmed = renamingValue.trim()
    if (!trimmed) {
      setRenamingId(null)
      return
    }
    try {
      await fetch(`/api/dossier/history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adres: trimmed }),
      })
      setHistory(prev => prev.map(h => (h.id === id ? { ...h, adres: trimmed } : h)))
    } catch { /* ignore */ }
    setRenamingId(null)
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-marble"
      style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}
    >
      {/* Header */}
      <Header tab={tab} onTab={setTab} histCount={history.length} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: '22px 36px 80px' }}>
          {tab === 'new' ? (
            <>
              <ConfigCard
                mode={mode}
                onMode={setMode}
                urlValue={urlValue}
                onUrlChange={setUrlValue}
                manualForm={manualForm}
                onManualChange={setManualField}
                onGenerate={handleGenerate}
                busy={loading}
              />

              {error && !loading && !dossier && <ErrorBar>{error}</ErrorBar>}

              {loading && <LoadingBlock brochure={brochure} step={loadStep} />}

              {dossier && !loading && (
                <ResultBlock
                  dossier={dossier}
                  editProperty={editProperty}
                  onPatchProperty={patch =>
                    setEditProperty(prev => (prev ? { ...prev, ...patch } : null))
                  }
                  editAnalyse={editAnalyse}
                  editPitch={editPitch}
                  onPatchPitch={patch =>
                    setEditPitch(prev => (prev ? { ...prev, ...patch } : null))
                  }
                  onPatchAnalyse={patch =>
                    setEditAnalyse(prev => (prev ? { ...prev, ...patch } : null))
                  }
                  onRegenerate={regenerateSection}
                  aiBusyKey={aiBusyKey}
                  onReset={() => {
                    setDossier(null)
                    setUrlValue('')
                    setEditAnalyse(null)
                    setEditPitch(null)
                    setEditProperty(null)
                    setInternalNotes('')
                  }}
                  onDownloadPdf={handleDownloadPdf}
                  pdfLoading={pdfLoading}
                  internalNotes={internalNotes}
                  onInternalNotes={setInternalNotes}
                />
              )}
            </>
          ) : (
            <History
              items={history}
              loading={historyLoading}
              filter={historyFilter}
              onFilter={setHistoryFilter}
              renamingId={renamingId}
              renamingValue={renamingValue}
              onStartRename={(id, name) => {
                setRenamingId(id)
                setRenamingValue(name)
              }}
              onCancelRename={() => setRenamingId(null)}
              onRenameValue={setRenamingValue}
              onRename={renameHistory}
              onOpen={openFromHistory}
              onDownloadPdf={downloadHistoryPdf}
              pdfLoadingId={historyPdfLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════ HEADER ═══════════
function Header({
  tab,
  onTab,
  histCount,
}: {
  tab: Tab
  onTab: (t: Tab) => void
  histCount: number
}) {
  return (
    <div
      className="flex justify-between items-end bg-marble shrink-0"
      style={{
        gap: 24,
        padding: '26px 36px 22px',
        borderBottom: '1px solid rgba(0,75,70,0.12)',
      }}
    >
      <div className="min-w-0 flex-1">
        <Eyebrow>Costa Select · Klantrapportage</Eyebrow>
        <h1
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
        >
          Woningpresentatie.
        </h1>
        <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', margin: 0 }}>
          Genereer een professionele presentatie voor je klant.
        </p>
      </div>
      <div
        className="inline-flex items-center bg-white"
        style={{
          gap: 4,
          padding: 4,
          border: '1px solid rgba(0,75,70,0.14)',
          borderRadius: 12,
        }}
      >
        <TabButton active={tab === 'new'} onClick={() => onTab('new')}>
          <FilePlus2 size={14} strokeWidth={2} /> Nieuwe presentatie
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => onTab('history')}>
          <Clock size={14} strokeWidth={2} /> Geschiedenis
          <span
            className="inline-flex items-center justify-center font-heading font-bold"
            style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 999,
              background: tab === 'history' ? 'rgba(245,175,64,0.25)' : '#E6F0EF',
              color: tab === 'history' ? '#F5AF40' : '#004B46',
              marginLeft: 4,
            }}
          >
            {histCount}
          </span>
        </TabButton>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center font-body font-semibold cursor-pointer transition-colors"
      style={{
        padding: '8px 14px',
        fontSize: 12,
        borderRadius: 8,
        gap: 6,
        background: active ? '#004B46' : 'transparent',
        color: active ? '#FFFAEF' : '#5F7472',
        border: 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#5F7472'
        }
      }}
    >
      {children}
    </button>
  )
}

// ═══════════ CONFIG CARD ═══════════
function ConfigCard({
  mode,
  onMode,
  urlValue,
  onUrlChange,
  manualForm,
  onManualChange,
  onGenerate,
  busy,
}: {
  mode: InputMode
  onMode: (m: InputMode) => void
  urlValue: string
  onUrlChange: (v: string) => void
  manualForm: ManualForm
  onManualChange: (k: keyof ManualForm, v: string) => void
  onGenerate: () => void
  busy: boolean
}) {
  const canGenerate = !busy && (mode === 'url' ? !!urlValue.trim() : !!manualForm.adres.trim())

  return (
    <Card>
      <ConfigLabel>Woning-input</ConfigLabel>
      <div
        className="inline-flex items-center"
        style={{
          gap: 4,
          padding: 4,
          background: '#E6F0EF',
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <InputToggleBtn active={mode === 'url'} onClick={() => onMode('url')}>
          <Link2 size={13} strokeWidth={2} /> URL invoeren
        </InputToggleBtn>
        <InputToggleBtn active={mode === 'manual'} onClick={() => onMode('manual')}>
          <Pencil size={13} strokeWidth={2} /> Handmatig invullen
        </InputToggleBtn>
      </div>

      {mode === 'url' ? (
        <>
          <DsInput
            type="url"
            value={urlValue}
            onChange={e => onUrlChange(e.target.value)}
            placeholder="https://www.idealista.com/inmueble/... of https://www.costaselect.com/nl/koop/..."
            disabled={busy}
          />
          <div
            className="inline-flex items-center font-body"
            style={{ gap: 6, marginTop: 6, fontSize: 12, color: '#7A8C8B' }}
          >
            <Info size={13} strokeWidth={2} /> Ondersteunt Costa Select en Idealista URLs.
          </div>
        </>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}
        >
          <Field label="Adres / projectnaam" required colFull>
            <DsInput
              value={manualForm.adres}
              onChange={e => onManualChange('adres', e.target.value)}
              placeholder="Bijv. Villa Marea, Marbella"
            />
          </Field>
          <Field label="Regio" required>
            <DsSelect
              value={manualForm.regio}
              onChange={e => onManualChange('regio', e.target.value)}
            >
              <option value="">Kies regio...</option>
              {REGIOS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </DsSelect>
          </Field>
          <Field label="Type">
            <DsSelect
              value={manualForm.type}
              onChange={e => onManualChange('type', e.target.value)}
            >
              {TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </DsSelect>
          </Field>
          <Field label="Vraagprijs (€)">
            <DsInput
              type="number"
              value={manualForm.vraagprijs}
              onChange={e => onManualChange('vraagprijs', e.target.value)}
              placeholder="485000"
            />
          </Field>
          <Field label="Oppervlakte (m²)">
            <DsInput
              type="number"
              value={manualForm.oppervlakte}
              onChange={e => onManualChange('oppervlakte', e.target.value)}
              placeholder="120"
            />
          </Field>
          <Field label="Slaapkamers">
            <DsInput
              type="number"
              value={manualForm.slaapkamers}
              onChange={e => onManualChange('slaapkamers', e.target.value)}
            />
          </Field>
          <Field label="Badkamers">
            <DsInput
              type="number"
              value={manualForm.badkamers}
              onChange={e => onManualChange('badkamers', e.target.value)}
            />
          </Field>
          <Field label="Omschrijving" colFull>
            <DsTextarea
              value={manualForm.omschrijving}
              onChange={e => onManualChange('omschrijving', e.target.value)}
              placeholder="Beschrijf de woning..."
            />
          </Field>
          <Field label="Foto-URLs (één per regel of kommagescheiden)" colFull>
            <DsTextarea
              value={manualForm.fotos}
              onChange={e => onManualChange('fotos', e.target.value)}
              placeholder={'https://...\nhttps://...'}
            />
          </Field>
        </div>
      )}

      <div
        className="flex items-center"
        style={{ gap: 12, marginTop: 18, flexWrap: 'wrap' }}
      >
        <DsButton variant="primary" disabled={!canGenerate} onClick={onGenerate}>
          <Eye size={14} strokeWidth={2} /> Presentatie genereren
        </DsButton>
        <span className="font-body" style={{ fontSize: 12, color: '#7A8C8B' }}>
          Scrape + kennisbank · 10–30 s
        </span>
      </div>
    </Card>
  )
}

function InputToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center font-body font-semibold cursor-pointer transition-all"
      style={{
        padding: '7px 14px',
        fontSize: 12,
        borderRadius: 8,
        gap: 6,
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? '#004B46' : '#5F7472',
        boxShadow: active ? '0 1px 2px rgba(7,42,36,0.08)' : 'none',
        border: 'none',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.color = '#004B46'
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.color = '#5F7472'
      }}
    >
      {children}
    </button>
  )
}

function ConfigLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center font-body font-bold uppercase text-sun-dark"
      style={{
        gap: 8,
        fontSize: 10,
        letterSpacing: '0.18em',
        marginBottom: 10,
      }}
    >
      {children}
      <span
        style={{
          display: 'inline-block',
          flex: 1,
          height: 1,
          minWidth: 32,
          background: 'rgba(212,146,26,0.3)',
        }}
      />
    </div>
  )
}

// ═══════════ LOADING BLOCK ═══════════
function LoadingBlock({ brochure, step }: { brochure: BrochureType; step: number }) {
  const steps = [
    { key: 'scrape', label: 'Woning wordt opgehaald...' },
    { key: 'kennisbank', label: 'Kennisbank wordt geraadpleegd...' },
    {
      key: 'analyse',
      label: brochure === 'pitch' ? 'Analyse wordt gegenereerd...' : 'Data wordt gestructureerd...',
    },
  ]
  return (
    <Card className="text-center" style={{ padding: '40px 24px', marginTop: 20 }}>
      <div
        className="inline-flex items-center justify-center ds-anim-pulse"
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: '#E6F0EF',
          color: '#004B46',
          marginBottom: 14,
        }}
      >
        {brochure === 'pitch' ? (
          <Sparkles size={26} strokeWidth={2} />
        ) : (
          <FileText size={26} strokeWidth={2} />
        )}
      </div>
      <h3
        className="font-heading font-bold text-deepsea"
        style={{ fontSize: 18, margin: '0 0 6px' }}
      >
        {brochure === 'pitch' ? 'Pitch wordt samengesteld' : 'Presentatie wordt samengesteld'}
      </h3>
      <p className="font-body" style={{ fontSize: 13, color: '#5F7472', margin: '0 0 20px' }}>
        Dit duurt typisch 30–60 seconden. Je kunt dit tabblad open laten.
      </p>
      <div
        className="inline-flex flex-col"
        style={{ gap: 8, maxWidth: 420, margin: '0 auto', textAlign: 'left' }}
      >
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'active' : 'pending'
          return (
            <div
              key={s.key}
              className="inline-flex items-center font-body"
              style={{
                gap: 10,
                padding: '9px 14px',
                fontSize: 12.5,
                borderRadius: 8,
                background: state === 'active' ? '#E6F0EF' : 'transparent',
                color: state === 'pending' ? '#7A8C8B' : '#004B46',
                fontWeight: state === 'active' ? 600 : 400,
              }}
            >
              {state === 'done' ? (
                <CheckCircle2 size={15} strokeWidth={2} color="#10b981" />
              ) : state === 'active' ? (
                <Loader2 size={15} strokeWidth={2} color="#D4921A" className="ds-spinner" />
              ) : (
                <Circle size={15} strokeWidth={2} color="#7A8C8B" />
              )}
              {s.label}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ═══════════ RESULT BLOCK ═══════════
type SectionDef = { id: string; icon: React.ReactNode; label: string }

function ResultBlock({
  dossier,
  editProperty,
  onPatchProperty,
  editAnalyse,
  editPitch,
  onPatchPitch,
  onPatchAnalyse,
  onRegenerate,
  aiBusyKey,
  onReset,
  onDownloadPdf,
  pdfLoading,
  internalNotes,
  onInternalNotes,
}: {
  dossier: DossierResult
  editProperty: DossierResult['property'] | null
  onPatchProperty: (patch: Partial<DossierResult['property']>) => void
  editAnalyse: DossierAnalyse | null
  editPitch: PitchContent | null
  onPatchPitch: (patch: Partial<PitchContent>) => void
  onPatchAnalyse: (patch: Partial<DossierAnalyse>) => void
  onRegenerate: (section: string) => void
  aiBusyKey: string | null
  onReset: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
  internalNotes: string
  onInternalNotes: (v: string) => void
}) {
  const isPitch = dossier.brochure_type === 'pitch'
  const hasUnits = (dossier.units_data?.length ?? 0) > 0

  const sections: SectionDef[] = useMemo(() => {
    const items: SectionDef[] = [{ id: 'feiten', icon: <List size={14} strokeWidth={1.8} />, label: 'Feiten' }]
    if (hasUnits) items.push({ id: 'units', icon: <Building2 size={14} strokeWidth={1.8} />, label: 'Units' })
    items.push({ id: 'photos', icon: <ImageIcon size={14} strokeWidth={1.8} />, label: "Foto's" })
    if (isPitch) {
      items.push(
        { id: 'samenvatting', icon: <AlignLeft size={14} strokeWidth={1.8} />, label: 'Samenvatting' },
        { id: 'voordelen', icon: <CheckCircle2 size={14} strokeWidth={1.8} />, label: 'Voordelen' },
        { id: 'nadelen', icon: <AlertTriangle size={14} strokeWidth={1.8} />, label: 'Nadelen' },
        { id: 'buurt', icon: <MapIcon size={14} strokeWidth={1.8} />, label: 'Buurt' },
        { id: 'investering', icon: <TrendingUp size={14} strokeWidth={1.8} />, label: 'Investering' },
        { id: 'juridisch', icon: <ShieldAlert size={14} strokeWidth={1.8} />, label: 'Juridisch' },
        { id: 'advies', icon: <Sparkles size={14} strokeWidth={1.8} />, label: 'Advies' },
      )
    }
    items.push(
      { id: 'notities', icon: <Lock size={14} strokeWidth={1.8} />, label: 'Interne notities' },
    )
    return items
  }, [isPitch, hasUnits])

  return (
    <div
      className="grid ds-anim-fade-in"
      style={{ gridTemplateColumns: '220px 1fr', gap: 24, marginTop: 24, alignItems: 'start' }}
    >
      {/* Sticky sections-nav */}
      <SectionsNav sections={sections} />

      {/* Main */}
      <div className="min-w-0">
        <ResultHeader
          dossier={dossier}
          onReset={onReset}
          onDownloadPdf={onDownloadPdf}
          pdfLoading={pdfLoading}
        />

        <CollapsibleSection id="feiten" num="01" title="Feiten" defaultOpen>
          <FactsSection
            property={editProperty ?? dossier.property}
            onPatch={onPatchProperty}
          />
        </CollapsibleSection>

        {hasUnits && dossier.units_data && (
          <CollapsibleSection id="units" num="02" title="Units beschikbaar">
            <UnitsTable units={dossier.units_data} />
          </CollapsibleSection>
        )}

        <CollapsibleSection
          id="photos"
          num={hasUnits ? '03' : '02'}
          title={`Foto's (${dossier.property.fotos?.length || 0})`}
        >
          <PhotosGrid fotos={dossier.property.fotos || []} />
        </CollapsibleSection>

        {isPitch && editPitch && (
          <PitchSections
            editPitch={editPitch}
            editAnalyse={editAnalyse}
            onPatchPitch={onPatchPitch}
            onPatchAnalyse={onPatchAnalyse}
            onRegenerate={onRegenerate}
            aiBusyKey={aiBusyKey}
            startNum={hasUnits ? 4 : 3}
          />
        )}

        <div
          id="notities"
          className="bg-white"
          style={{
            border: '1px solid rgba(0,75,70,0.12)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div
            className="flex items-center"
            style={{ gap: 8, marginBottom: 10 }}
          >
            <Lock size={14} strokeWidth={1.8} color="#004B46" />
            <span
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 14, letterSpacing: '-0.005em' }}
            >
              Interne notities
            </span>
            <span
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#7A8C8B',
                marginLeft: 'auto',
                padding: '2px 8px',
                background: '#FEF6E4',
                borderRadius: 999,
              }}
            >
              Alleen consultants
            </span>
          </div>
          <DsTextarea
            value={internalNotes}
            onChange={e => onInternalNotes(e.target.value)}
            placeholder="Notities over deze woning (alleen zichtbaar voor consultants)..."
            rows={3}
          />
        </div>
      </div>
    </div>
  )
}

// ═══════════ SECTIONS NAV (sticky) ═══════════
function SectionsNav({ sections }: { sections: SectionDef[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? '')

  function goto(id: string) {
    setActive(id)
    const el = document.getElementById(id)
    if (!el) return
    const scroller = el.closest('.overflow-y-auto') as HTMLDivElement | null
    if (scroller) {
      const rect = el.getBoundingClientRect()
      scroller.scrollTo({
        top: scroller.scrollTop + rect.top - 80,
        behavior: 'smooth',
      })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <aside
      className="bg-white"
      style={{
        position: 'sticky',
        top: 8,
        padding: '14px 10px',
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
      }}
    >
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: '#7A8C8B',
          padding: '4px 10px 10px',
        }}
      >
        Secties
      </div>
      <ul className="list-none" style={{ margin: 0, padding: 0 }}>
        {sections.map((s, i) => (
          <li key={s.id} style={{ margin: 0 }}>
            <a
              onClick={() => goto(s.id)}
              className="flex items-center cursor-pointer transition-colors font-body"
              style={{
                gap: 10,
                padding: '9px 10px',
                fontSize: 12.5,
                borderRadius: 8,
                background: active === s.id ? '#004B46' : 'transparent',
                color: active === s.id ? '#FFFAEF' : '#5F7472',
                fontWeight: active === s.id ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (active !== s.id) {
                  e.currentTarget.style.background = '#E6F0EF'
                  e.currentTarget.style.color = '#004B46'
                }
              }}
              onMouseLeave={e => {
                if (active !== s.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#5F7472'
                }
              }}
            >
              <span
                className="shrink-0"
                style={{ color: active === s.id ? '#F5AF40' : '#7A8C8B' }}
              >
                {s.icon}
              </span>
              <span className="flex-1 truncate">{s.label}</span>
              <span
                className="font-body font-semibold tabular-nums"
                style={{
                  fontSize: 10.5,
                  color: active === s.id ? 'rgba(255,250,239,0.6)' : '#7A8C8B',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

// ═══════════ RESULT HEADER ═══════════
function ResultHeader({
  dossier,
  onReset,
  onDownloadPdf,
  pdfLoading,
}: {
  dossier: DossierResult
  onReset: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
}) {
  const isPitch = dossier.brochure_type === 'pitch'
  return (
    <div
      className="flex items-start bg-white"
      style={{
        gap: 16,
        padding: 20,
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        marginBottom: 16,
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'rgba(16,185,129,0.12)',
          color: '#10b981',
        }}
      >
        <Check size={20} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h2
          className="flex items-center font-heading font-bold text-deepsea flex-wrap"
          style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px', gap: 8 }}
        >
          Dossier gereed.
          <Badge variant={isPitch ? 'pitch' : 'presentatie'}>
            {isPitch ? (
              <Megaphone size={11} strokeWidth={2.2} />
            ) : (
              <Eye size={11} strokeWidth={2.2} />
            )}{' '}
            {isPitch ? 'Pitch' : 'Presentatie'}
          </Badge>
          {dossier.source && (
            <Badge variant="source">{sourceLabel(dossier.source)}</Badge>
          )}
        </h2>
        <div
          className="font-body truncate"
          style={{ fontSize: 13, color: '#7A8C8B' }}
        >
          {dossier.property.adres} · {dossier.property.regio}
        </div>
      </div>
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <DsButton variant="subtle" onClick={onReset}>
          <RotateCcw size={13} strokeWidth={2} /> Opnieuw
        </DsButton>
        <DsButton variant="sun" disabled={pdfLoading} onClick={onDownloadPdf}>
          {pdfLoading ? (
            <Loader2 size={13} strokeWidth={2} className="ds-spinner" />
          ) : (
            <Download size={13} strokeWidth={2} />
          )}{' '}
          Download PDF
        </DsButton>
      </div>
    </div>
  )
}

// ═══════════ COLLAPSIBLE SECTION ═══════════
function CollapsibleSection({
  id,
  num,
  title,
  aiAction,
  aiBusy,
  defaultOpen = true,
  children,
}: {
  id: string
  num: string
  title: string
  aiAction?: () => void
  aiBusy?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section
      id={id}
      className="bg-white overflow-hidden"
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        marginBottom: 16,
      }}
    >
      <header
        onClick={() => setOpen(o => !o)}
        className="flex items-center cursor-pointer transition-colors"
        style={{
          gap: 12,
          padding: '14px 18px',
          borderBottom: open ? '1px solid rgba(0,75,70,0.08)' : '1px solid transparent',
          background: 'transparent',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FFFAEF')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span
          className="inline-flex items-center justify-center shrink-0 font-heading font-bold text-sun-dark"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: '#FEF6E4',
            fontSize: 11,
            letterSpacing: '-0.01em',
          }}
        >
          {num}
        </span>
        <h3
          className="flex-1 font-heading font-bold text-deepsea"
          style={{ fontSize: 15, letterSpacing: '-0.005em', margin: 0 }}
        >
          {title}
        </h3>
        {aiAction && (
          <button
            onClick={e => {
              e.stopPropagation()
              aiAction()
            }}
            disabled={aiBusy}
            className="inline-flex items-center font-body font-semibold cursor-pointer transition-all disabled:opacity-50"
            style={{
              gap: 6,
              padding: '6px 12px',
              fontSize: 11,
              borderRadius: 999,
              background: aiBusy ? '#FEF6E4' : '#FEF6E4',
              color: '#D4921A',
              border: '1px solid rgba(212,146,26,0.35)',
            }}
            onMouseEnter={e => {
              if (aiBusy) return
              e.currentTarget.style.background = '#F5AF40'
              e.currentTarget.style.color = '#004B46'
            }}
            onMouseLeave={e => {
              if (aiBusy) return
              e.currentTarget.style.background = '#FEF6E4'
              e.currentTarget.style.color = '#D4921A'
            }}
          >
            {aiBusy ? (
              <Loader2 size={11} strokeWidth={2} className="ds-spinner" />
            ) : (
              <Sparkles size={11} strokeWidth={2} />
            )}
            {aiBusy ? 'Genereren...' : 'AI opnieuw'}
          </button>
        )}
        <span
          className="inline-flex items-center justify-center shrink-0 transition-transform"
          style={{
            width: 24,
            height: 24,
            color: '#7A8C8B',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </header>
      {open && (
        <div style={{ padding: 20 }}>
          {children}
        </div>
      )}
    </section>
  )
}

// ═══════════ FACTS SECTION ═══════════
function FactsSection({
  property,
  onPatch,
}: {
  property: DossierResult['property']
  onPatch: (patch: Partial<DossierResult['property']>) => void
}) {
  return (
    <>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}
      >
        <EditableStat
          label="Vraagprijs"
          accent
          prefix="€"
          value={property.vraagprijs || 0}
          type="number"
          onChange={v => onPatch({ vraagprijs: Number(v) || 0 })}
        />
        <EditableStat
          label="Oppervlakte"
          value={property.oppervlakte || 0}
          type="number"
          suffix="m²"
          onChange={v => onPatch({ oppervlakte: Number(v) || 0 })}
        />
        <EditableStat
          label="Slaapkamers"
          value={property.slaapkamers || 0}
          type="number"
          onChange={v => onPatch({ slaapkamers: Number(v) || 0 })}
        />
        <EditableStat
          label="Badkamers"
          value={property.badkamers || 0}
          type="number"
          onChange={v => onPatch({ badkamers: Number(v) || 0 })}
        />
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}
      >
        <EditableMeta
          label="Type"
          value={property.type || ''}
          onChange={v => onPatch({ type: String(v) })}
        />
        <EditableMeta
          label="Regio"
          value={property.regio || ''}
          onChange={v => onPatch({ regio: String(v) })}
        />
        <MetaItem
          label="Listing"
          value={
            property.url ? (
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center font-body text-deepsea"
                style={{ gap: 4, textDecoration: 'underline' }}
              >
                Open listing <ExternalLink size={11} strokeWidth={2} />
              </a>
            ) : (
              <span style={{ color: '#7A8C8B' }}>Geen URL</span>
            )
          }
        />
      </div>
      <div>
        <div
          className="font-body font-bold uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: '#7A8C8B',
            marginBottom: 6,
          }}
        >
          Beschrijving
        </div>
        <DsTextarea
          value={property.omschrijving || ''}
          onChange={e => onPatch({ omschrijving: e.target.value })}
          placeholder="Beschrijving van de woning…"
          rows={6}
        />
      </div>
    </>
  )
}

function EditableStat({
  label,
  value,
  onChange,
  type = 'text',
  prefix,
  suffix,
  accent,
}: {
  label: string
  value: string | number
  onChange: (v: string | number) => void
  type?: 'text' | 'number'
  prefix?: string
  suffix?: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: accent ? '#004B46' : '#FFFFFF',
        border: accent ? '1px solid #004B46' : '1px solid rgba(0,75,70,0.12)',
        borderRadius: 10,
      }}
    >
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          color: accent ? 'rgba(255,250,239,0.6)' : '#7A8C8B',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline" style={{ gap: 4 }}>
        {prefix && (
          <span
            className="font-heading font-bold"
            style={{ fontSize: 20, color: accent ? '#F5AF40' : '#004B46', lineHeight: 1 }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={value === 0 ? '' : String(value)}
          placeholder={type === 'number' ? '—' : ''}
          onChange={e =>
            onChange(type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)
          }
          className="font-heading font-bold bg-transparent outline-none w-full"
          style={{
            fontSize: 20,
            color: accent ? '#F5AF40' : '#004B46',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            border: 'none',
            padding: 0,
            minWidth: 0,
          }}
        />
        {suffix && (
          <span
            className="font-body"
            style={{ fontSize: 12, color: accent ? 'rgba(255,250,239,0.6)' : '#7A8C8B', fontWeight: 500 }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function EditableMeta({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          color: '#7A8C8B',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        type="text"
        value={value}
        placeholder="—"
        onChange={e => onChange(e.target.value)}
        className="font-body text-deepsea bg-transparent outline-none w-full"
        style={{
          fontSize: 13,
          fontWeight: 500,
          border: '1px solid transparent',
          borderBottom: '1px solid rgba(0,75,70,0.18)',
          padding: '4px 0',
          minWidth: 0,
        }}
      />
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          color: '#7A8C8B',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div className="font-body text-deepsea" style={{ fontSize: 13, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  )
}

// ═══════════ PHOTOS ═══════════
function PhotosGrid({ fotos }: { fotos: string[] }) {
  if (!fotos.length) {
    return (
      <div
        className="font-body text-center"
        style={{ fontSize: 13, color: '#7A8C8B', padding: 20 }}
      >
        Geen foto&apos;s beschikbaar.
      </div>
    )
  }
  const visible = fotos.slice(0, 7)
  const remaining = fotos.length - 7
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}
    >
      {visible.map((src, i) => (
        <div
          key={i}
          className="overflow-hidden"
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 10,
            background: '#E6F0EF',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Foto ${i + 1}`}
            className="w-full h-full"
            style={{ objectFit: 'cover', display: 'block' }}
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="flex items-center justify-center font-heading font-bold text-deepsea"
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 10,
            background: '#E6F0EF',
            border: '1px dashed rgba(0,75,70,0.2)',
            fontSize: 22,
            letterSpacing: '-0.01em',
          }}
        >
          <div className="text-center">
            +{remaining}
            <div
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#7A8C8B',
                marginTop: 4,
              }}
            >
              in PDF
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════ UNITS TABLE ═══════════
function UnitsTable({ units }: { units: UnitRow[] }) {
  const withPrice = units.filter(u => u.price != null && u.price > 0)
  const minPrice = withPrice.length > 0 ? Math.min(...withPrice.map(u => u.price!)) : null

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid rgba(0,75,70,0.14)' }}>
              <ThCell>Type</ThCell>
              <ThCell>Kamers</ThCell>
              <ThCell>m²</ThCell>
              <ThCell align="right">Prijs</ThCell>
            </tr>
          </thead>
          <tbody>
            {units.map((u, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,75,70,0.08)' }}>
                <TdCell>{u.typology || '—'}</TdCell>
                <TdCell muted>{u.rooms ? `${u.rooms} slk` : '—'}</TdCell>
                <TdCell muted>{u.size_m2 ? `${u.size_m2}` : '—'}</TdCell>
                <TdCell align="right">
                  <span
                    className="font-heading font-bold"
                    style={{ color: '#0EAE96', fontSize: 14 }}
                  >
                    {u.price ? fmtPrice(u.price) : '—'}
                  </span>
                </TdCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="font-body"
        style={{
          marginTop: 14,
          fontSize: 12,
          color: '#5F7472',
        }}
      >
        <b className="font-heading font-bold" style={{ color: '#004B46' }}>
          {units.length}
        </b>{' '}
        units beschikbaar
        {minPrice != null && (
          <>
            {' · '}Vanaf{' '}
            <b className="font-heading font-bold" style={{ color: '#004B46' }}>
              {fmtPrice(minPrice)}
            </b>
          </>
        )}
      </div>
    </>
  )
}

function ThCell({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className="font-body font-bold uppercase"
      style={{
        fontSize: 10,
        letterSpacing: '0.14em',
        color: '#7A8C8B',
        padding: '10px 16px',
        textAlign: align ?? 'left',
      }}
    >
      {children}
    </th>
  )
}

function TdCell({
  children,
  align,
  muted,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  muted?: boolean
}) {
  return (
    <td
      style={{
        padding: '14px 16px',
        color: muted ? '#5F7472' : '#004B46',
        textAlign: align ?? 'left',
        fontSize: 13,
      }}
    >
      {children}
    </td>
  )
}

// ═══════════ PITCH SECTIONS ═══════════
function PitchSections({
  editPitch,
  editAnalyse,
  onPatchPitch,
  onPatchAnalyse,
  onRegenerate,
  aiBusyKey,
  startNum,
}: {
  editPitch: PitchContent
  editAnalyse: DossierAnalyse | null
  onPatchPitch: (patch: Partial<PitchContent>) => void
  onPatchAnalyse: (patch: Partial<DossierAnalyse>) => void
  onRegenerate: (section: string) => void
  aiBusyKey: string | null
  startNum: number
}) {
  const n = (offset: number) => String(startNum + offset).padStart(2, '0')

  return (
    <>
      <CollapsibleSection
        id="samenvatting"
        num={n(0)}
        title="Samenvatting & prijsanalyse"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          <Pane label="Samenvatting">
            <DsTextarea
              value={editAnalyse?.samenvatting || ''}
              onChange={e => onPatchAnalyse({ samenvatting: e.target.value })}
              rows={4}
            />
          </Pane>
          <Pane label="Prijsanalyse">
            <DsTextarea
              value={editAnalyse?.prijsanalyse || ''}
              onChange={e => onPatchAnalyse({ prijsanalyse: e.target.value })}
              rows={4}
            />
          </Pane>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="voordelen"
        num={n(1)}
        title="Voordelen"
        aiAction={() => onRegenerate('voordelen')}
        aiBusy={aiBusyKey === 'voordelen'}
      >
        <BulletList
          items={editPitch.voordelen}
          tone="pos"
          placeholder="Waarom is dit een sterke koop?"
          onChange={v => onPatchPitch({ voordelen: v })}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="nadelen"
        num={n(2)}
        title="Nadelen / aandachtspunten"
        aiAction={() => onRegenerate('nadelen')}
        aiBusy={aiBusyKey === 'nadelen'}
      >
        <BulletList
          items={editPitch.nadelen}
          tone="neg"
          placeholder="Wat moet de koper weten?"
          onChange={v => onPatchPitch({ nadelen: v })}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="buurt"
        num={n(3)}
        title="Buurtcontext"
        aiAction={() => onRegenerate('buurtcontext')}
        aiBusy={aiBusyKey === 'buurtcontext'}
      >
        <DsTextarea
          value={editPitch.buurtcontext}
          onChange={e => onPatchPitch({ buurtcontext: e.target.value })}
          rows={5}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="investering"
        num={n(4)}
        title="Investeringspotentieel"
        defaultOpen={false}
      >
        <DsTextarea
          value={editPitch.investering}
          onChange={e => onPatchPitch({ investering: e.target.value })}
          rows={4}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="juridisch"
        num={n(5)}
        title="Juridische aandachtspunten"
        defaultOpen={false}
      >
        <BulletList
          items={editAnalyse?.juridische_risicos ?? []}
          tone="warn"
          placeholder="Juridisch aandachtspunt..."
          onChange={v => onPatchAnalyse({ juridische_risicos: v })}
        />
      </CollapsibleSection>

      <CollapsibleSection
        id="advies"
        num={n(6)}
        title="Costa Select advies"
        aiAction={() => onRegenerate('advies')}
        aiBusy={aiBusyKey === 'advies'}
      >
        <div
          className="relative overflow-hidden"
          style={{
            background: '#004B46',
            color: '#FFFAEF',
            borderRadius: 12,
            padding: '22px 26px',
          }}
        >
          <div
            className="inline-flex items-center font-body font-bold uppercase text-sun"
            style={{
              gap: 10,
              fontSize: 10,
              letterSpacing: '0.22em',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 24,
                height: 2,
                background: '#F5AF40',
              }}
            />
            Ons advies
          </div>
          <textarea
            value={editPitch.advies}
            onChange={e => onPatchPitch({ advies: e.target.value })}
            placeholder="Schrijf hier het Costa Select advies..."
            rows={4}
            className="w-full font-heading font-medium bg-transparent outline-none resize-y"
            style={{
              color: '#FFFAEF',
              fontSize: 16,
              lineHeight: 1.5,
              border: 'none',
              padding: 0,
            }}
          />
        </div>
      </CollapsibleSection>
    </>
  )
}

function Pane({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          color: '#7A8C8B',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

// ═══════════ BULLET LIST ═══════════
function BulletList({
  items,
  tone,
  onChange,
  placeholder,
}: {
  items: string[]
  tone: 'pos' | 'neg' | 'warn'
  onChange: (next: string[]) => void
  placeholder: string
}) {
  const toneStyles = {
    pos: { dot: '#0EAE96', border: 'rgba(14,174,150,0.3)', icon: CheckCircle2 },
    neg: { dot: '#F5AF40', border: 'rgba(245,175,64,0.3)', icon: AlertTriangle },
    warn: { dot: '#B81D13', border: 'rgba(184,29,19,0.3)', icon: ShieldAlert },
  }[tone]
  const Icon = toneStyles.icon

  function update(i: number, v: string) {
    const next = [...items]
    next[i] = v
    onChange(next)
  }
  function remove(i: number) {
    onChange(items.filter((_, j) => j !== i))
  }
  function add() {
    onChange([...items, ''])
  }

  return (
    <>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start bg-white transition-colors"
            style={{
              gap: 10,
              padding: '10px 12px',
              border: `1px solid rgba(0,75,70,0.12)`,
              borderLeft: `3px solid ${toneStyles.dot}`,
              borderRadius: 10,
            }}
          >
            <Icon
              size={15}
              strokeWidth={2}
              color={toneStyles.dot}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <textarea
              value={item}
              onChange={e => update(i, e.target.value)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 font-body bg-transparent outline-none resize-none"
              style={{
                fontSize: 13,
                color: '#004B46',
                lineHeight: 1.5,
                border: 'none',
                padding: 0,
              }}
            />
            <button
              onClick={() => remove(i)}
              title="Verwijderen"
              className="shrink-0 flex items-center justify-center cursor-pointer transition-colors"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                color: '#7A8C8B',
                background: 'transparent',
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
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        className="inline-flex items-center font-body font-semibold cursor-pointer transition-colors"
        style={{
          gap: 6,
          fontSize: 12,
          color: '#004B46',
          padding: '6px 10px',
          marginTop: 10,
          background: 'transparent',
          border: 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#E6F0EF')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={13} strokeWidth={2.2} /> Punt toevoegen
      </button>
    </>
  )
}

// ═══════════ HISTORY ═══════════
function History({
  items,
  loading,
  filter,
  onFilter,
  renamingId,
  renamingValue,
  onStartRename,
  onCancelRename,
  onRenameValue,
  onRename,
  onOpen,
  onDownloadPdf,
  pdfLoadingId,
}: {
  items: HistoryItem[]
  loading: boolean
  filter: 'all' | 'pitch' | 'presentatie'
  onFilter: (f: 'all' | 'pitch' | 'presentatie') => void
  renamingId: string | null
  renamingValue: string
  onStartRename: (id: string, name: string) => void
  onCancelRename: () => void
  onRenameValue: (v: string) => void
  onRename: (id: string) => void
  onOpen: (id: string) => void
  onDownloadPdf: (id: string) => void
  pdfLoadingId: string | null
}) {
  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter(i => i.brochure_type === filter)),
    [items, filter]
  )

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ padding: '60px 0', color: '#7A8C8B' }}
      >
        <Loader2 size={20} className="animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="text-center" style={{ padding: '48px 24px' }}>
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
          <FileText size={26} strokeWidth={1.5} />
        </div>
        <h3
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 18, margin: '0 0 6px' }}
        >
          Nog geen presentaties
        </h3>
        <p className="font-body" style={{ fontSize: 13, color: '#5F7472', margin: 0 }}>
          Maak je eerste presentatie aan via de tab Nieuwe presentatie.
        </p>
      </Card>
    )
  }

  return (
    <>
      <div
        className="inline-flex items-center bg-white"
        style={{
          gap: 4,
          padding: 4,
          border: '1px solid rgba(0,75,70,0.14)',
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <HistoryFilterChip active={filter === 'all'} onClick={() => onFilter('all')}>
          <List size={13} strokeWidth={2} /> Alle
          <span style={{ opacity: 0.7, fontSize: 10.5, marginLeft: 2 }}>{items.length}</span>
        </HistoryFilterChip>
        <HistoryFilterChip active={filter === 'pitch'} onClick={() => onFilter('pitch')}>
          <Megaphone size={13} strokeWidth={2} /> Pitches
          <span style={{ opacity: 0.7, fontSize: 10.5, marginLeft: 2 }}>
            {items.filter(i => i.brochure_type === 'pitch').length}
          </span>
        </HistoryFilterChip>
        <HistoryFilterChip
          active={filter === 'presentatie'}
          onClick={() => onFilter('presentatie')}
        >
          <Eye size={13} strokeWidth={2} /> Presentaties
          <span style={{ opacity: 0.7, fontSize: 10.5, marginLeft: 2 }}>
            {items.filter(i => i.brochure_type === 'presentatie').length}
          </span>
        </HistoryFilterChip>
      </div>

      <div
        className="flex flex-col bg-white overflow-hidden"
        style={{
          border: '1px solid rgba(0,75,70,0.12)',
          borderRadius: 14,
        }}
      >
        {filtered.map((item, i) => (
          <HistoryRow
            key={item.id}
            item={item}
            isFirst={i === 0}
            renaming={renamingId === item.id}
            renamingValue={renamingValue}
            onStartRename={() => onStartRename(item.id, item.adres)}
            onCancelRename={onCancelRename}
            onRenameValue={onRenameValue}
            onRename={() => onRename(item.id)}
            onOpen={() => onOpen(item.id)}
            onDownloadPdf={() => onDownloadPdf(item.id)}
            pdfLoading={pdfLoadingId === item.id}
          />
        ))}
      </div>
    </>
  )
}

function HistoryFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center font-body font-semibold cursor-pointer transition-colors"
      style={{
        padding: '7px 12px',
        fontSize: 12,
        borderRadius: 8,
        gap: 6,
        background: active ? '#004B46' : 'transparent',
        color: active ? '#FFFAEF' : '#5F7472',
        border: 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#5F7472'
        }
      }}
    >
      {children}
    </button>
  )
}

function HistoryRow({
  item,
  isFirst,
  renaming,
  renamingValue,
  onStartRename,
  onCancelRename,
  onRenameValue,
  onRename,
  onOpen,
  onDownloadPdf,
  pdfLoading,
}: {
  item: HistoryItem
  isFirst: boolean
  renaming: boolean
  renamingValue: string
  onStartRename: () => void
  onCancelRename: () => void
  onRenameValue: (v: string) => void
  onRename: () => void
  onOpen: () => void
  onDownloadPdf: () => void
  pdfLoading: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const isPitch = item.brochure_type === 'pitch'
  return (
    <div
      data-history-id={item.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center transition-colors"
      style={{
        gap: 16,
        padding: '14px 20px',
        borderTop: isFirst ? 'none' : '1px solid rgba(0,75,70,0.08)',
        background: hovered ? '#FFFAEF' : 'transparent',
      }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: isPitch ? '#004B46' : '#E6F0EF',
          color: isPitch ? '#F5AF40' : '#004B46',
        }}
      >
        {isPitch ? (
          <Megaphone size={16} strokeWidth={2} />
        ) : (
          <Eye size={16} strokeWidth={2} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            autoFocus
            value={renamingValue}
            onChange={e => onRenameValue(e.target.value)}
            onBlur={onRename}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename()
              if (e.key === 'Escape') onCancelRename()
            }}
            className="font-heading font-bold text-deepsea w-full outline-none"
            style={{
              fontSize: 14,
              background: '#FFFFFF',
              border: '1.5px solid rgba(0,75,70,0.3)',
              borderRadius: 8,
              padding: '4px 8px',
              letterSpacing: '-0.005em',
            }}
          />
        ) : (
          <button
            onClick={onStartRename}
            className="inline-flex items-center font-heading font-bold text-deepsea truncate"
            style={{
              gap: 6,
              fontSize: 14,
              letterSpacing: '-0.005em',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              maxWidth: '100%',
            }}
          >
            <span className="truncate">{item.adres || 'Zonder naam'}</span>
            <Pencil size={11} strokeWidth={2} style={{ opacity: 0.35 }} />
          </button>
        )}
        <div
          className="flex items-center flex-wrap font-body"
          style={{ gap: 8, fontSize: 11.5, color: '#7A8C8B', marginTop: 4 }}
        >
          <Badge variant={isPitch ? 'pitch' : 'presentatie'}>
            {isPitch ? (
              <Megaphone size={10} strokeWidth={2.2} />
            ) : (
              <Eye size={10} strokeWidth={2.2} />
            )}{' '}
            {isPitch ? 'Pitch' : 'Presentatie'}
          </Badge>
          {item.source && (
            <Badge variant="source">{sourceLabel(item.source)}</Badge>
          )}
          {item.regio && <span>{item.regio}</span>}
          {item.vraagprijs > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>●</span>
              <b className="font-heading font-bold" style={{ color: '#004B46' }}>
                {fmtPrice(item.vraagprijs)}
              </b>
            </>
          )}
          <span style={{ opacity: 0.4 }}>●</span>
          <span>{fmtDate(item.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center shrink-0" style={{ gap: 4 }}>
        {item.url && (
          <SmallIconLink href={item.url} title="Listing">
            <ExternalLink size={14} strokeWidth={1.8} />
          </SmallIconLink>
        )}
        <SmallIconButton title="PDF" onClick={onDownloadPdf} disabled={pdfLoading}>
          {pdfLoading ? (
            <Loader2 size={14} strokeWidth={2} className="ds-spinner" />
          ) : (
            <Download size={14} strokeWidth={1.8} />
          )}
        </SmallIconButton>
        <SmallIconButton title="Bekijk" onClick={onOpen}>
          <ChevronRight size={14} strokeWidth={2} />
        </SmallIconButton>
      </div>
    </div>
  )
}

function SmallIconButton({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'transparent',
        color: '#7A8C8B',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = '#E6F0EF'
        e.currentTarget.style.color = '#004B46'
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.15)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = '#7A8C8B'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

function SmallIconLink({
  href,
  title,
  children,
}: {
  href: string
  title: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className="flex items-center justify-center transition-all"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: 'transparent',
        color: '#7A8C8B',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#E6F0EF'
        e.currentTarget.style.color = '#004B46'
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.15)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = '#7A8C8B'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      {children}
    </a>
  )
}

// ═══════════ ATOMS ═══════════
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-body font-bold uppercase text-sun-dark"
      style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10 }}
    >
      {children}
    </div>
  )
}

function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={`bg-white ${className ?? ''}`}
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(7,42,36,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function ErrorBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center font-body"
      style={{
        gap: 8,
        padding: '10px 14px',
        background: 'rgba(224,82,82,0.1)',
        border: '1px solid rgba(224,82,82,0.25)',
        borderRadius: 10,
        fontSize: 12.5,
        color: '#c24040',
        marginTop: 16,
      }}
    >
      <AlertTriangle size={14} strokeWidth={2} /> {children}
    </div>
  )
}

function Badge({
  variant,
  children,
}: {
  variant: 'pitch' | 'presentatie' | 'source'
  children: React.ReactNode
}) {
  const styles = {
    pitch: { bg: '#004B46', color: '#F5AF40' },
    presentatie: { bg: '#E6F0EF', color: '#004B46' },
    source: { bg: '#FEF6E4', color: '#D4921A' },
  }[variant]
  return (
    <span
      className="inline-flex items-center font-body font-bold uppercase"
      style={{
        gap: 4,
        fontSize: 10,
        letterSpacing: '0.1em',
        padding: '3px 9px',
        borderRadius: 999,
        background: styles.bg,
        color: styles.color,
      }}
    >
      {children}
    </span>
  )
}

function DsButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: 'primary' | 'sun' | 'ghost' | 'subtle'
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
      hoverBg: '#0A6B63',
      hoverBorder: '#0A6B63',
    },
    sun: {
      background: '#F5AF40',
      color: '#004B46',
      border: '1.5px solid #F5AF40',
      fontWeight: 700,
      hoverBg: '#D4921A',
      hoverBorder: '#D4921A',
    },
    ghost: {
      background: '#FFFFFF',
      color: '#004B46',
      border: '1.5px solid rgba(0,75,70,0.18)',
      fontWeight: 600,
      hoverBg: '#E6F0EF',
      hoverBorder: '#004B46',
    },
    subtle: {
      background: 'transparent',
      color: '#5F7472',
      border: '1.5px solid transparent',
      fontWeight: 500,
      hoverBg: '#E6F0EF',
      hoverBorder: 'transparent',
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
        background: styles.background,
        color: styles.color,
        border: styles.border,
        fontWeight: styles.fontWeight,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = styles.hoverBg
        if (variant !== 'subtle') {
          e.currentTarget.style.border = `1.5px solid ${styles.hoverBorder}`
        } else {
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.background = styles.background
        e.currentTarget.style.border = styles.border
        e.currentTarget.style.color = styles.color
      }}
    >
      {children}
    </button>
  )
}

function Field({
  label,
  required,
  colFull,
  children,
}: {
  label: string
  required?: boolean
  colFull?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col min-w-0"
      style={{ gap: 5, ...(colFull ? { gridColumn: '1 / -1' } : {}) }}
    >
      <label
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10.5,
          color: '#7A8C8B',
          letterSpacing: '0.1em',
        }}
      >
        {label}
        {required && <span style={{ color: '#D4921A', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function DsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...props.style,
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

function DsTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all resize-y ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        minHeight: 76,
        lineHeight: 1.5,
        ...props.style,
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

function DsSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full font-body bg-marble outline-none transition-all cursor-pointer ${props.className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...props.style,
      }}
    />
  )
}
