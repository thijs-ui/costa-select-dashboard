'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageLayout } from '@/components/page-layout'
import {
  FileText, Link2, PenLine, Loader2, Download, Check,
  AlertTriangle, ChevronDown, Plus, X, Clock, ExternalLink, Pencil,
} from 'lucide-react'

const REGIOS = [
  'Costa Brava', 'Costa Dorada', 'Costa de Valencia', 'Valencia stad',
  'Costa Blanca Noord', 'Costa Blanca Zuid', 'Costa Cálida', 'Costa del Sol',
  'Barcelona', 'Madrid', 'Balearen', 'Canarische Eilanden',
  'Costa Tropical', 'Costa de la Luz', 'Málaga',
]

interface DossierAnalyse {
  samenvatting: string
  prijsanalyse: string
  sterke_punten: string[]
  aandachtspunten: string[]
  juridische_risicos: string[]
  verhuurpotentieel: string
  advies_consultant: string
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
  }
  regioInfo: string
  analyse: DossierAnalyse
  generatedAt: string
}

interface HistoryItem {
  id: string
  adres: string
  regio: string
  type: string
  vraagprijs: number
  url: string
  created_at: string
}

type Tab = 'generate' | 'history'
type Mode = 'url' | 'manual'

export default function DossierPage() {
  const [tab, setTab] = useState<Tab>('generate')
  const [mode, setMode] = useState<Mode>('url')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [dossier, setDossier] = useState<DossierResult | null>(null)
  const [editAnalyse, setEditAnalyse] = useState<DossierAnalyse | null>(null)
  const [error, setError] = useState('')

  // History
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPdfLoading, setHistoryPdfLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dossier/history', { credentials: 'include' })
      const contentType = res.headers.get('content-type') || ''

      // If redirected to login page (HTML instead of JSON)
      if (!contentType.includes('application/json')) {
        setError('Sessie verlopen — herlaad de pagina en log opnieuw in.')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Kon geschiedenis niet laden.')
        return
      }

      const data = await res.json()
      if (Array.isArray(data)) {
        setHistory(data)
      }
    } catch (err) {
      console.error('History fetch error:', err)
      setError('Kon geschiedenis niet laden.')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'history') fetchHistory()
  }, [tab, fetchHistory])

  async function handleHistoryDownload(id: string) {
    setHistoryPdfLoading(id)
    try {
      // Fetch full dossier data
      const res = await fetch(`/api/dossier/history/${id}`)
      if (!res.ok) throw new Error('Kon dossier niet ophalen')
      const { dossier_data } = await res.json()

      // Generate PDF
      const pdfRes = await fetch('/api/dossier/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dossier_data),
      })
      if (!pdfRes.ok) throw new Error('PDF generatie mislukt')

      const blob = await pdfRes.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `costa-select-dossier-${(dossier_data.property?.adres || 'dossier').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setError('PDF kon niet worden gegenereerd.')
    } finally {
      setHistoryPdfLoading(null)
    }
  }

  // URL mode
  const [url, setUrl] = useState('')

  // Manual mode
  const [adres, setAdres] = useState('')
  const [regio, setRegio] = useState('')
  const [type, setType] = useState('appartement')
  const [vraagprijs, setVraagprijs] = useState('')
  const [oppervlakte, setOppervlakte] = useState('')
  const [slaapkamers, setSlaapkamers] = useState('')
  const [badkamers, setBadkamers] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [fotosRaw, setFotosRaw] = useState('')

  async function handleRename(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) { setEditingId(null); return }
    try {
      await fetch(`/api/dossier/history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adres: trimmed }),
      })
      setHistory(prev => prev.map(h => h.id === id ? { ...h, adres: trimmed } : h))
    } catch { /* ignore */ }
    setEditingId(null)
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setDossier(null)
    setEditAnalyse(null)

    const body = mode === 'url'
      ? { mode: 'url', url }
      : {
          mode: 'manual',
          adres, regio, type, vraagprijs, oppervlakte,
          slaapkamers, badkamers, omschrijving,
          fotos: fotosRaw.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
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
        setLoading(false)
        return
      }

      setDossier(data)
      setEditAnalyse({ ...data.analyse })
    } catch {
      setError('Kon geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPdf() {
    if (!dossier || !editAnalyse) return
    setPdfLoading(true)
    try {
      const dossierWithEdits = { ...dossier, analyse: editAnalyse }
      const res = await fetch('/api/dossier/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dossierWithEdits),
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `costa-select-dossier-${dossier.property.adres.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('PDF kon niet worden gegenereerd.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <PageLayout title="Woningdossier" subtitle="Genereer een professioneel PDF-dossier voor je klant">

      {/* Tab toggle: Genereren / Geschiedenis */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('generate')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'generate'
              ? 'bg-[#004B46] text-[#FFFAEF]'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <FileText size={15} /> Nieuw dossier
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            tab === 'history'
              ? 'bg-[#004B46] text-[#FFFAEF]'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Clock size={15} /> Geschiedenis
        </button>
      </div>

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-heading text-lg font-bold text-[#004B46] mb-4">Eerdere dossiers</h2>

          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
              <Loader2 size={16} className="animate-spin" /> Laden...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Nog geen dossiers gegenereerd.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    {editingId === item.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => handleRename(item.id)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        className="text-sm font-medium text-[#004B46] border border-[#004B46]/30 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#004B46]/30"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingId(item.id); setEditingName(item.adres) }}
                        className="flex items-center gap-1.5 text-sm font-medium text-[#004B46] truncate hover:underline cursor-pointer group text-left"
                      >
                        <span className="truncate">{item.adres}</span>
                        <Pencil size={11} className="shrink-0 text-gray-300 group-hover:text-[#004B46] transition-colors" />
                      </button>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {item.regio && <span className="text-xs text-gray-400">{item.regio}</span>}
                      {item.vraagprijs > 0 && (
                        <span className="text-xs text-gray-400">
                          {'\u20AC'} {Number(item.vraagprijs).toLocaleString('nl-NL')}
                        </span>
                      )}
                      <span className="text-xs text-gray-300">
                        {new Date(item.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-[#004B46] transition-colors"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => handleHistoryDownload(item.id)}
                      disabled={historyPdfLoading === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004B46] text-[#FFFAEF] text-xs font-medium rounded-lg hover:bg-[#0A6B63] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {historyPdfLoading === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl text-sm text-red-700">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
        </div>
      )}

      {tab === 'generate' && <>
      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('url'); setDossier(null); setEditAnalyse(null); setError('') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            mode === 'url'
              ? 'bg-[#004B46] text-[#FFFAEF]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Link2 size={15} /> URL invoeren
        </button>
        <button
          onClick={() => { setMode('manual'); setDossier(null); setEditAnalyse(null); setError('') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            mode === 'manual'
              ? 'bg-[#004B46] text-[#FFFAEF]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <PenLine size={15} /> Handmatig invullen
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        {mode === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-[#004B46] mb-1.5">Woning URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.idealista.com/inmueble/12345678/ of https://www.costaselect.com/nl/koop/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20"
            />
            <p className="text-xs text-gray-400 mt-2">Ondersteunt CostaSelect en Idealista URLs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Adres / projectnaam *</label>
              <input value={adres} onChange={e => setAdres(e.target.value)} placeholder="Calle del Sol 15, Estepona"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Regio *</label>
              <div className="relative">
                <select value={regio} onChange={e => setRegio(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] appearance-none bg-white">
                  <option value="">Selecteer regio...</option>
                  {REGIOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Type</label>
              <div className="relative">
                <select value={type} onChange={e => setType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] appearance-none bg-white">
                  <option value="appartement">Appartement</option>
                  <option value="woning">Woning</option>
                  <option value="villa">Villa</option>
                  <option value="nieuwbouw">Nieuwbouw</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Vraagprijs (€)</label>
              <input type="number" value={vraagprijs} onChange={e => setVraagprijs(e.target.value)} placeholder="350000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Oppervlakte (m²)</label>
              <input type="number" value={oppervlakte} onChange={e => setOppervlakte(e.target.value)} placeholder="120"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Slaapkamers</label>
              <input type="number" value={slaapkamers} onChange={e => setSlaapkamers(e.target.value)} placeholder="3"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Badkamers</label>
              <input type="number" value={badkamers} onChange={e => setBadkamers(e.target.value)} placeholder="2"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Omschrijving</label>
              <textarea value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="Optioneel: beschrijving van de woning..." rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#004B46] mb-1.5">Foto-URLs</label>
              <textarea value={fotosRaw} onChange={e => setFotosRaw(e.target.value)} placeholder="Eén URL per regel of kommagescheiden..." rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-none" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl text-sm text-red-700">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || (mode === 'url' ? !url.trim() : !adres.trim())}
          className="mt-6 w-full sm:w-auto bg-[#004B46] text-[#FFFAEF] font-semibold px-6 py-3 rounded-xl hover:bg-[#0A6B63] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Dossier wordt gegenereerd...</>
          ) : (
            <><FileText size={16} /> Dossier genereren</>
          )}
        </button>
      </div>

      {/* Editable Preview + Download */}
      {dossier && editAnalyse && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#004B46] flex items-center gap-2">
                <Check size={20} className="text-green-500" /> Dossier gereed
              </h2>
              <p className="text-sm text-gray-500 mt-1">{dossier.property.adres}</p>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="bg-[#004B46] text-[#FFFAEF] font-semibold px-6 py-3 rounded-xl hover:bg-[#0A6B63] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {pdfLoading ? (
                <><Loader2 size={16} className="animate-spin" /> PDF genereren...</>
              ) : (
                <><Download size={16} /> Download PDF</>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-6">Pas de teksten hieronder aan voordat je de PDF downloadt.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#004B46] mb-1.5">Samenvatting</label>
              <textarea
                value={editAnalyse.samenvatting}
                onChange={e => setEditAnalyse({ ...editAnalyse, samenvatting: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#004B46] mb-1.5">Prijsanalyse</label>
              <textarea
                value={editAnalyse.prijsanalyse}
                onChange={e => setEditAnalyse({ ...editAnalyse, prijsanalyse: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-y"
              />
            </div>

            {/* Sterke punten - editable list */}
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1.5">Sterke punten</label>
              {editAnalyse.sterke_punten.map((p, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1.5">
                  <span className="text-green-500 font-bold text-xs mt-2.5 shrink-0">✓</span>
                  <input
                    value={p}
                    onChange={e => {
                      const updated = [...editAnalyse.sterke_punten]
                      updated[i] = e.target.value
                      setEditAnalyse({ ...editAnalyse, sterke_punten: updated })
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20"
                  />
                  <button
                    onClick={() => setEditAnalyse({ ...editAnalyse, sterke_punten: editAnalyse.sterke_punten.filter((_, j) => j !== i) })}
                    className="text-gray-300 hover:text-red-400 mt-1.5 shrink-0 cursor-pointer"
                  ><X size={14} /></button>
                </div>
              ))}
              <button
                onClick={() => setEditAnalyse({ ...editAnalyse, sterke_punten: [...editAnalyse.sterke_punten, ''] })}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-1 cursor-pointer"
              ><Plus size={12} /> Punt toevoegen</button>
            </div>

            {/* Aandachtspunten - editable list */}
            <div>
              <label className="block text-sm font-semibold text-amber-700 mb-1.5">Aandachtspunten</label>
              {editAnalyse.aandachtspunten.map((p, i) => (
                <div key={i} className="flex items-start gap-1.5 mb-1.5">
                  <span className="text-amber-500 font-bold text-xs mt-2.5 shrink-0">!</span>
                  <input
                    value={p}
                    onChange={e => {
                      const updated = [...editAnalyse.aandachtspunten]
                      updated[i] = e.target.value
                      setEditAnalyse({ ...editAnalyse, aandachtspunten: updated })
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20"
                  />
                  <button
                    onClick={() => setEditAnalyse({ ...editAnalyse, aandachtspunten: editAnalyse.aandachtspunten.filter((_, j) => j !== i) })}
                    className="text-gray-300 hover:text-red-400 mt-1.5 shrink-0 cursor-pointer"
                  ><X size={14} /></button>
                </div>
              ))}
              <button
                onClick={() => setEditAnalyse({ ...editAnalyse, aandachtspunten: [...editAnalyse.aandachtspunten, ''] })}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1 cursor-pointer"
              ><Plus size={12} /> Punt toevoegen</button>
            </div>
          </div>

          {/* Juridische risico's - editable list */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-red-700 mb-1.5">Juridische aandachtspunten</label>
            {editAnalyse.juridische_risicos.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1.5">
                <span className="text-red-500 font-bold text-xs mt-2.5 shrink-0">⚠</span>
                <input
                  value={r}
                  onChange={e => {
                    const updated = [...editAnalyse.juridische_risicos]
                    updated[i] = e.target.value
                    setEditAnalyse({ ...editAnalyse, juridische_risicos: updated })
                  }}
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20"
                />
                <button
                  onClick={() => setEditAnalyse({ ...editAnalyse, juridische_risicos: editAnalyse.juridische_risicos.filter((_, j) => j !== i) })}
                  className="text-gray-300 hover:text-red-400 mt-1.5 shrink-0 cursor-pointer"
                ><X size={14} /></button>
              </div>
            ))}
            <button
              onClick={() => setEditAnalyse({ ...editAnalyse, juridische_risicos: [...editAnalyse.juridische_risicos, ''] })}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 mt-1 cursor-pointer"
            ><Plus size={12} /> Punt toevoegen</button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#004B46] mb-1.5">Verhuurpotentieel</label>
            <textarea
              value={editAnalyse.verhuurpotentieel}
              onChange={e => setEditAnalyse({ ...editAnalyse, verhuurpotentieel: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-y"
            />
          </div>

          <div className="bg-[#004B46]/5 border border-[#004B46]/15 rounded-xl p-4">
            <label className="block text-[10px] font-semibold text-[#004B46] uppercase tracking-wider mb-1.5">Advies voor consultant</label>
            <textarea
              value={editAnalyse.advies_consultant}
              onChange={e => setEditAnalyse({ ...editAnalyse, advies_consultant: e.target.value })}
              rows={3}
              className="w-full bg-transparent border border-[#004B46]/15 rounded-lg px-3 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-y"
            />
          </div>
        </div>
      )}
      </>}
    </PageLayout>
  )
}
