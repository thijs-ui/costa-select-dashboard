'use client'

import { useEffect, useState } from 'react'
import { formatEuro } from '@/lib/calculations'
import { RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface Stage { id: number; name: string; pipeline_id: number; order_nr: number }
interface Pipeline { id: number; name: string }
interface Deal {
  id: number; title: string; status: string; stage_id: number
  pipeline_id: number; value: number; add_time: string; won_time: string | null
  person_name: string | null; user_id: { id: number; name: string } | null
}
interface Person { id: number; name: string; add_time: string }

interface PipedriveData {
  deals: Deal[]
  stages: Stage[]
  pipelines: Pipeline[]
  persons: Person[]
}

export default function PipedrivePage() {
  const [data, setData] = useState<PipedriveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncingDeals, setSyncingDeals] = useState(false)
  const [activePipeline, setActivePipeline] = useState<number | 'gesloten' | null>(null)
  const [eigenaarOpen, setEigenaarOpen] = useState(true)
  const [dealsOpen, setDealsOpen] = useState(true)
  const [geslotenOpen, setGeslotenOpen] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pipedrive/data')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Ophalen mislukt')
      }
      const json = await res.json()
      setData(json)
      if (json.pipelines?.length > 0) setActivePipeline(json.pipelines[0].id)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  async function syncAfspraken(reset = false) {
    if (reset && !confirm('Alle Pipedrive-afspraken verwijderen en opnieuw importeren?')) return
    setSyncing(true)
    try {
      const res = await fetch('/api/pipedrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset }),
      })
      const json = await res.json()
      alert(`Sync klaar: ${json.imported ?? 0} nieuwe afspraken geïmporteerd, ${json.skipped ?? 0} overgeslagen`)
    } catch {
      alert('Sync mislukt')
    }
    setSyncing(false)
  }

  async function syncDeals(forceUpdate = false) {
    setSyncingDeals(true)
    try {
      const res = await fetch('/api/pipedrive/sync-deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_update: forceUpdate }),
      })
      const json = await res.json()
      const parts = [
        json.imported > 0 ? `${json.imported} nieuw geïmporteerd` : null,
        json.updated > 0 ? `${json.updated} bijgewerkt` : null,
        json.skipped > 0 ? `${json.skipped} overgeslagen` : null,
      ].filter(Boolean)
      const errMsg = json.errors?.length ? `\n\nWaarschuwingen:\n${json.errors.join('\n')}` : ''
      alert(`Sync klaar: ${parts.join(', ')}${errMsg}`)
    } catch {
      alert('Sync deals mislukt')
    }
    setSyncingDeals(false)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 text-sm p-8">
      <RefreshCw size={14} className="animate-spin" /> Pipedrive data laden...
    </div>
  )

  if (error) {
    return (
      <div className="w-full max-w-[800px]">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">Pipedrive</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-red-700">Kan Pipedrive niet bereiken</div>
            <div className="text-sm text-red-600 mt-1">{error}</div>
            <div className="text-xs text-red-400 mt-2">
              Controleer je <code>PIPEDRIVE_API_TOKEN</code> in <code>.env.local</code>.
            </div>
            <button onClick={load} className="mt-3 text-sm text-red-600 underline">Opnieuw proberen</button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { deals, stages, pipelines, persons } = data
  const currentPipeline = pipelines.find((p) => p.id === activePipeline)

  // Globale stats (alle pipelines)
  const openDeals = deals.filter((d) => d.status === 'open')
  const wonDeals = deals.filter((d) => d.status === 'won')
  const pipelineWaarde = openDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const conversiePct = persons.length > 0 ? ((wonDeals.length / persons.length) * 100).toFixed(1) : '—'

  const doorlooptijden = wonDeals
    .filter((d) => d.won_time && d.add_time)
    .map((d) => Math.floor((new Date(d.won_time!).getTime() - new Date(d.add_time).getTime()) / 86400000))
  const gemDoorlooptijd = doorlooptijden.length > 0
    ? Math.round(doorlooptijden.reduce((s, d) => s + d, 0) / doorlooptijden.length)
    : null

  // Gefilterd op actieve pipeline (niet van toepassing op gesloten tab)
  const isGeslotenTab = activePipeline === 'gesloten'
  const pipelineDeals = (activePipeline && !isGeslotenTab) ? deals.filter((d) => d.pipeline_id === activePipeline) : deals
  const pipelineOpen = pipelineDeals.filter((d) => d.status === 'open')
  const pipelineWon = pipelineDeals.filter((d) => d.status === 'won')
  const pipelineStages = (!isGeslotenTab && activePipeline)
    ? stages.filter((s) => s.pipeline_id === (activePipeline as number)).sort((a, b) => a.order_nr - b.order_nr)
    : []

  // Alle gesloten (won) deals over alle pipelines
  const geslotenDeals = [...wonDeals].sort((a, b) =>
    new Date(b.won_time ?? b.add_time).getTime() - new Date(a.won_time ?? a.add_time).getTime()
  )
  const geslotenWaarde = geslotenDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const geslotenPerEigenaar: Record<string, { count: number; waarde: number }> = {}
  geslotenDeals.forEach((d) => {
    const naam = d.user_id?.name ?? 'Onbekend'
    if (!geslotenPerEigenaar[naam]) geslotenPerEigenaar[naam] = { count: 0, waarde: 0 }
    geslotenPerEigenaar[naam].count++
    geslotenPerEigenaar[naam].waarde += d.value ?? 0
  })

  // Deals per stage voor actieve pipeline
  const dealsPerStage = pipelineStages.map((s) => ({
    stage: s,
    count: pipelineOpen.filter((d) => d.stage_id === s.id).length,
    waarde: pipelineOpen.filter((d) => d.stage_id === s.id).reduce((sum, d) => sum + (d.value ?? 0), 0),
  }))

  // Deals per eigenaar voor actieve pipeline
  const eigenaarStats: Record<string, { open: number; won: number; waarde: number }> = {}
  pipelineDeals.forEach((d) => {
    const naam = d.user_id?.name ?? 'Onbekend'
    if (!eigenaarStats[naam]) eigenaarStats[naam] = { open: 0, won: 0, waarde: 0 }
    if (d.status === 'open') { eigenaarStats[naam].open++; eigenaarStats[naam].waarde += d.value ?? 0 }
    if (d.status === 'won') eigenaarStats[naam].won++
  })

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pipedrive</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {deals.length} deals · {persons.length} contacten · {pipelines.length} pipelines
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => syncAfspraken(false)} disabled={syncing}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchroniseren...' : 'Sync afspraken'}
          </button>
          <button onClick={() => syncAfspraken(true)} disabled={syncing}
            className="flex items-center gap-2 border border-red-200 text-red-600 px-3 py-1.5 rounded-md text-sm hover:bg-red-50 disabled:opacity-50">
            <RefreshCw size={13} />
            Reset & opnieuw sync
          </button>
          <button onClick={() => syncDeals(false)} disabled={syncingDeals}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={13} className={syncingDeals ? 'animate-spin' : ''} />
            {syncingDeals ? 'Synchroniseren...' : 'Sync deals'}
          </button>
          <button onClick={() => syncDeals(true)} disabled={syncingDeals}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
            title="Overschrijft regio/bron/type op bestaande deals vanuit Pipedrive veldenmapping">
            <RefreshCw size={13} />
            Velden bijwerken
          </button>
          <button onClick={load}
            className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm hover:bg-slate-700">
            <RefreshCw size={13} /> Vernieuwen
          </button>
        </div>
      </div>

      {/* Globale KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Totaal leads" value={persons.length} sub="alle contacten" />
        <KpiCard label="Open deals" value={openDeals.length} sub="alle pipelines" />
        <KpiCard label="Deals gewonnen" value={wonDeals.length} color="green" />
        <KpiCard label="Conversie %" value={`${conversiePct}%`} sub="leads → won" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Pipeline waarde" value={formatEuro(pipelineWaarde)} sub="open deals totaal" />
        <KpiCard label="Gem. doorlooptijd" value={gemDoorlooptijd ? `${gemDoorlooptijd} dagen` : '—'} sub="lead → deal gewonnen" />
        <KpiCard label="Gewonnen waarde" value={formatEuro(wonDeals.reduce((s, d) => s + (d.value ?? 0), 0))} color="green" />
      </div>

      {/* Pipeline tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePipeline(p.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activePipeline === p.id
                ? 'border-b-2 text-[#004B46]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            style={activePipeline === p.id ? { borderBottomColor: '#F5AF40' } : {}}
          >
            {p.name}
            <span className="ml-1.5 text-xs text-slate-400">
              ({deals.filter((d) => d.pipeline_id === p.id && d.status === 'open').length})
            </span>
          </button>
        ))}
        {/* Gesloten deals tab */}
        <button
          onClick={() => setActivePipeline('gesloten')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isGeslotenTab
              ? 'text-[#004B46]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          style={isGeslotenTab ? { borderBottomColor: '#0EAE96', borderBottomWidth: '2px' } : {}}
        >
          Gesloten deals
          <span className="ml-1.5 text-xs text-slate-400">({wonDeals.length})</span>
        </button>
      </div>

      {/* Gesloten deals overzicht */}
      {isGeslotenTab && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Gewonnen deals" value={geslotenDeals.length} color="green" />
            <KpiCard label="Totale waarde" value={formatEuro(geslotenWaarde)} color="green" />
            <KpiCard label="Gem. dealwaarde" value={geslotenDeals.length > 0 ? formatEuro(Math.round(geslotenWaarde / geslotenDeals.length)) : '—'} />
          </div>

          {/* Per eigenaar */}
          {Object.keys(geslotenPerEigenaar).length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setGeslotenOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-slate-900">Per eigenaar — gewonnen deals</h2>
                {geslotenOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
              </button>
              {geslotenOpen && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Eigenaar', 'Gewonnen deals', 'Totale waarde', 'Gem. waarde'].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(geslotenPerEigenaar)
                      .sort((a, b) => b[1].waarde - a[1].waarde)
                      .map(([naam, stats]) => (
                        <tr key={naam} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-700">{naam}</td>
                          <td className="px-4 py-2 text-green-600 font-medium">{stats.count}</td>
                          <td className="px-4 py-2 text-green-600 font-medium">{formatEuro(stats.waarde)}</td>
                          <td className="px-4 py-2 text-slate-500">{stats.count > 0 ? formatEuro(Math.round(stats.waarde / stats.count)) : '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Deals tabel */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Alle gewonnen deals ({geslotenDeals.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Deal', 'Contactpersoon', 'Pipeline', 'Waarde', 'Gewonnen op', 'Eigenaar'].map((h) => (
                      <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {geslotenDeals.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Geen gewonnen deals</td></tr>
                  )}
                  {geslotenDeals.map((deal) => {
                    const pipeline = pipelines.find((p) => p.id === deal.pipeline_id)
                    return (
                      <tr key={deal.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800 max-w-[220px] truncate">{deal.title}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{deal.person_name ?? '—'}</td>
                        <td className="px-4 py-2">
                          <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                            {pipeline?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                          {deal.value ? formatEuro(deal.value) : '—'}
                        </td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap text-xs">
                          {deal.won_time ? new Date(deal.won_time).toLocaleDateString('nl-NL') : '—'}
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-xs">{deal.user_id?.name ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Funnel voor actieve pipeline */}
      {currentPipeline && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">{currentPipeline.name}</h2>
            <div className="text-xs text-slate-400">
              {pipelineOpen.length} open · {pipelineWon.length} gewonnen
            </div>
          </div>

          {/* Stage kolommen */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {dealsPerStage.map(({ stage, count, waarde }) => (
              <div key={stage.id} className="flex-shrink-0 min-w-[130px]">
                <div className="text-xs text-slate-500 mb-1.5 truncate font-medium">{stage.name}</div>
                <div className={`rounded-lg p-3 text-center border ${count > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`text-2xl font-semibold ${count > 0 ? 'text-blue-700' : 'text-slate-300'}`}>{count}</div>
                  {waarde > 0 && <div className="text-xs text-blue-400 mt-0.5">{formatEuro(waarde)}</div>}
                </div>
              </div>
            ))}
            <div className="flex-shrink-0 min-w-[130px]">
              <div className="text-xs text-slate-500 mb-1.5 font-medium">Gewonnen</div>
              <div className="rounded-lg p-3 text-center border bg-green-50 border-green-100">
                <div className="text-2xl font-semibold text-green-700">{pipelineWon.length}</div>
                {pipelineWon.reduce((s, d) => s + (d.value ?? 0), 0) > 0 && (
                  <div className="text-xs text-green-400 mt-0.5">
                    {formatEuro(pipelineWon.reduce((s, d) => s + (d.value ?? 0), 0))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deals per eigenaar */}
      {!isGeslotenTab && Object.keys(eigenaarStats).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setEigenaarOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Per eigenaar {currentPipeline ? `— ${currentPipeline.name}` : ''}
            </h2>
            {eigenaarOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
          </button>
          {eigenaarOpen && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Eigenaar', 'Open deals', 'Open waarde', 'Gewonnen'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(eigenaarStats)
                  .sort((a, b) => (b[1].open + b[1].won) - (a[1].open + a[1].won))
                  .map(([naam, stats]) => (
                    <tr key={naam} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{naam}</td>
                      <td className="px-4 py-2 text-slate-600">{stats.open}</td>
                      <td className="px-4 py-2 text-slate-600">{stats.waarde > 0 ? formatEuro(stats.waarde) : '—'}</td>
                      <td className="px-4 py-2 text-green-600 font-medium">{stats.won}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Open deals tabel */}
      {!isGeslotenTab && <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setDealsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Open deals ({pipelineOpen.length})
            {currentPipeline ? ` — ${currentPipeline.name}` : ''}
          </h2>
          {dealsOpen ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </button>
        <div className={`overflow-x-auto ${dealsOpen ? '' : 'hidden'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Deal', 'Contactpersoon', 'Stage', 'Waarde', 'Aangemaakt', 'Eigenaar'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipelineOpen.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">Geen open deals</td></tr>
              )}
              {pipelineOpen.map((deal) => {
                const stage = stages.find((s) => s.id === deal.stage_id)
                return (
                  <tr key={deal.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800 max-w-[220px] truncate">{deal.title}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{deal.person_name ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                        {stage?.name ?? `Stage ${deal.stage_id}`}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">
                      {deal.value ? formatEuro(deal.value) : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(deal.add_time).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{deal.user_id?.name ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Webhook instructie */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Webhooks instellen voor auto-import</h2>
        <p className="text-xs text-slate-500 mb-3">Stel drie webhooks in via Pipedrive → <strong>Settings → Webhooks → + Add webhook</strong>. Gebruik dezelfde URL voor alle drie:</p>
        <div className="mb-3">
          <code className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs">https://jouw-domein.com/api/pipedrive/webhook</code>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="text-xs font-semibold text-slate-600 mb-1">Webhook 1 — Nieuwe afspraak</div>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Event: <strong>added.activity</strong></li>
              <li>Action: <strong>added</strong></li>
            </ol>
            <p className="text-[11px] text-slate-400 mt-2">Importeert nieuwe afspraken direct als ze worden ingepland in Pipedrive (status: Gepland).</p>
          </div>
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="text-xs font-semibold text-slate-600 mb-1">Webhook 2 — Afspraak update</div>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Event: <strong>updated.activity</strong></li>
              <li>Action: <strong>updated</strong></li>
            </ol>
            <p className="text-[11px] text-slate-400 mt-2">Werkt bestaande afspraken bij (bijv. datum of status Uitgevoerd) als ze worden afgevinkt in Pipedrive.</p>
          </div>
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="text-xs font-semibold text-slate-600 mb-1">Webhook 3 — Deals</div>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Event: <strong>updated.deal</strong></li>
              <li>Action: <strong>updated</strong></li>
            </ol>
            <p className="text-[11px] text-slate-400 mt-2">Importeert gewonnen deals automatisch. Veldenmapping instellen via Aannames → Pipedrive veldenmapping.</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Activiteitsnamen configureren via Aannames → Pipedrive activiteitsnamen (standaard: Teams Meeting, Bezoek Nederland).</p>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${color === 'green' ? 'text-green-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}
