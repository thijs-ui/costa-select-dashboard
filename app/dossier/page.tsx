'use client'

import { useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import {
  FileText, Link2, PenLine, Loader2, Download, Check,
  AlertTriangle, ChevronDown,
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

type Mode = 'url' | 'manual'

export default function DossierPage() {
  const [mode, setMode] = useState<Mode>('url')
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [dossier, setDossier] = useState<DossierResult | null>(null)
  const [error, setError] = useState('')

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

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setDossier(null)

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
    } catch {
      setError('Kon geen verbinding maken met de server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPdf() {
    if (!dossier) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/dossier/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dossier),
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

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('url'); setDossier(null); setError('') }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            mode === 'url'
              ? 'bg-[#004B46] text-[#FFFAEF]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Link2 size={15} /> URL invoeren
        </button>
        <button
          onClick={() => { setMode('manual'); setDossier(null); setError('') }}
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
              placeholder="https://www.idealista.com/inmueble/12345678/ of https://www.costaselect.com/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20"
            />
            <p className="text-xs text-gray-400 mt-2">Ondersteunt Idealista en CostaSelect URLs</p>
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

      {/* Preview + Download */}
      {dossier && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-[#004B46] mb-2">Samenvatting</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{dossier.analyse.samenvatting}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#004B46] mb-2">Prijsanalyse</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{dossier.analyse.prijsanalyse}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2">Sterke punten</h3>
              {dossier.analyse.sterke_punten.map((p, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-green-500 font-bold text-xs mt-0.5">✓</span>
                  <span className="text-sm text-gray-600">{p}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2">Aandachtspunten</h3>
              {dossier.analyse.aandachtspunten.map((p, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-amber-500 font-bold text-xs mt-0.5">!</span>
                  <span className="text-sm text-gray-600">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {dossier.analyse.juridische_risicos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Juridische aandachtspunten</h3>
              {dossier.analyse.juridische_risicos.map((r, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5">
                  <span className="text-red-500 font-bold text-xs mt-0.5">⚠</span>
                  <span className="text-sm text-gray-600">{r}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#004B46] mb-2">Verhuurpotentieel</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{dossier.analyse.verhuurpotentieel}</p>
          </div>

          <div className="bg-[#004B46]/5 border border-[#004B46]/15 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-[#004B46] uppercase tracking-wider mb-2">Advies voor consultant</p>
            <p className="text-sm text-gray-700 leading-relaxed">{dossier.analyse.advies_consultant}</p>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
