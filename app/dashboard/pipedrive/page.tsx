'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { formatEuro } from '@/lib/calculations'
import {
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinSection,
} from '@/components/financieel/parts'

interface Stage {
  id: number
  name: string
  pipeline_id: number
  order_nr: number
}
interface Pipeline { id: number; name: string }
interface Deal {
  id: number
  title: string
  status: string
  stage_id: number
  pipeline_id: number
  value: number
  add_time: string
  won_time: string | null
  person_name: string | null
  user_id: { id: number; name: string } | null
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

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pipedrive/data')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Ophalen mislukt')
      }
      const json = (await res.json()) as PipedriveData
      setData(json)
      if (json.pipelines?.length > 0) setActivePipeline(json.pipelines[0].id)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }

  async function syncAfspraken(reset = false) {
    if (reset && !confirm('Alle Pipedrive-afspraken verwijderen en opnieuw importeren?'))
      return
    setSyncing(true)
    try {
      const res = await fetch('/api/pipedrive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset }),
      })
      const json = await res.json()
      alert(
        `Sync klaar: ${json.imported ?? 0} nieuwe afspraken geïmporteerd, ${json.skipped ?? 0} overgeslagen`
      )
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
      const errMsg = json.errors?.length
        ? `\n\nWaarschuwingen:\n${json.errors.join('\n')}`
        : ''
      alert(`Sync klaar: ${parts.join(', ')}${errMsg}`)
    } catch {
      alert('Sync deals mislukt')
    }
    setSyncingDeals(false)
  }

  const built = useMemo(() => {
    if (!data) return null
    const { deals, stages, pipelines, persons } = data
    const openDeals = deals.filter(d => d.status === 'open')
    const wonDeals = deals.filter(d => d.status === 'won')
    const pipelineWaarde = openDeals.reduce((s, d) => s + (d.value ?? 0), 0)
    const conversiePct = persons.length > 0
      ? ((wonDeals.length / persons.length) * 100).toFixed(1)
      : '—'
    const doorlooptijden = wonDeals
      .filter(d => d.won_time && d.add_time)
      .map(d =>
        Math.floor(
          (new Date(d.won_time!).getTime() - new Date(d.add_time).getTime()) / 86400000
        )
      )
    const gemDoorlooptijd =
      doorlooptijden.length > 0
        ? Math.round(doorlooptijden.reduce((s, d) => s + d, 0) / doorlooptijden.length)
        : null
    return {
      deals,
      stages,
      pipelines,
      persons,
      openDeals,
      wonDeals,
      pipelineWaarde,
      conversiePct,
      gemDoorlooptijd,
    }
  }, [data])

  if (loading) {
    return (
      <div className="fin-page">
        <div className="fin-shell">
          <div
            className="fin-loading"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <RefreshCw size={14} className="fin-spin" /> Pipedrive data laden…
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fin-page">
        <div className="fin-shell">
          <FinHeader title="Pipedrive" />
          <div className="fin-error">
            <AlertCircle size={18} />
            <div>
              <div className="title">Kan Pipedrive niet bereiken</div>
              <div className="msg">{error}</div>
              <div className="hint">
                Controleer je <code>PIPEDRIVE_API_TOKEN</code> in <code>.env.local</code>.
              </div>
              <button type="button" className="fin-link" onClick={() => void load()}>
                Opnieuw proberen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!built) return null
  const {
    deals,
    stages,
    pipelines,
    persons,
    openDeals,
    wonDeals,
    pipelineWaarde,
    conversiePct,
    gemDoorlooptijd,
  } = built

  const isGeslotenTab = activePipeline === 'gesloten'
  const currentPipeline = pipelines.find(p => p.id === activePipeline)
  const pipelineDeals =
    activePipeline && !isGeslotenTab
      ? deals.filter(d => d.pipeline_id === activePipeline)
      : deals
  const pipelineOpen = pipelineDeals.filter(d => d.status === 'open')
  const pipelineWon = pipelineDeals.filter(d => d.status === 'won')
  const pipelineStages =
    !isGeslotenTab && activePipeline
      ? stages
          .filter(s => s.pipeline_id === (activePipeline as number))
          .sort((a, b) => a.order_nr - b.order_nr)
      : []

  const geslotenDeals = [...wonDeals].sort(
    (a, b) =>
      new Date(b.won_time ?? b.add_time).getTime() -
      new Date(a.won_time ?? a.add_time).getTime()
  )
  const geslotenWaarde = geslotenDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const geslotenPerEigenaar: Record<string, { count: number; waarde: number }> = {}
  geslotenDeals.forEach(d => {
    const naam = d.user_id?.name ?? 'Onbekend'
    if (!geslotenPerEigenaar[naam]) geslotenPerEigenaar[naam] = { count: 0, waarde: 0 }
    geslotenPerEigenaar[naam].count++
    geslotenPerEigenaar[naam].waarde += d.value ?? 0
  })

  const dealsPerStage = pipelineStages.map(s => ({
    stage: s,
    count: pipelineOpen.filter(d => d.stage_id === s.id).length,
    waarde: pipelineOpen
      .filter(d => d.stage_id === s.id)
      .reduce((sum, d) => sum + (d.value ?? 0), 0),
  }))

  const eigenaarStats: Record<string, { open: number; won: number; waarde: number }> = {}
  pipelineDeals.forEach(d => {
    const naam = d.user_id?.name ?? 'Onbekend'
    if (!eigenaarStats[naam]) eigenaarStats[naam] = { open: 0, won: 0, waarde: 0 }
    if (d.status === 'open') {
      eigenaarStats[naam].open++
      eigenaarStats[naam].waarde += d.value ?? 0
    }
    if (d.status === 'won') eigenaarStats[naam].won++
  })

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Pipedrive"
          subtitle={`${deals.length} deals · ${persons.length} contacten · ${pipelines.length} pipelines`}
        >
          <button
            type="button"
            className="fin-btn"
            onClick={() => void syncAfspraken(false)}
            disabled={syncing}
          >
            <RefreshCw className={syncing ? 'fin-spin' : ''} />
            {syncing ? 'Synchroniseren…' : 'Sync afspraken'}
          </button>
          <button
            type="button"
            className="fin-btn"
            onClick={() => void syncDeals(false)}
            disabled={syncingDeals}
          >
            <RefreshCw className={syncingDeals ? 'fin-spin' : ''} />
            {syncingDeals ? 'Synchroniseren…' : 'Sync deals'}
          </button>
          <button
            type="button"
            className="fin-btn primary"
            onClick={() => void load()}
          >
            <RefreshCw /> Vernieuwen
          </button>
        </FinHeader>

        <FinKpiGrid>
          <FinKpi label="Totaal leads" value={persons.length} sub="alle contacten" />
          <FinKpi label="Open deals" value={openDeals.length} sub="alle pipelines" />
          <FinKpi
            label="Deals gewonnen"
            value={wonDeals.length}
            sub={`conversie ${conversiePct}%`}
            tone="positive"
          />
          <FinKpi
            label="Pipeline waarde"
            value={formatEuro(pipelineWaarde)}
            sub="open deals totaal"
            tone="accent"
          />
        </FinKpiGrid>
        <FinKpiGrid cols={3}>
          <FinKpi
            label="Gewonnen waarde"
            value={formatEuro(wonDeals.reduce((s, d) => s + (d.value ?? 0), 0))}
            sub={`${wonDeals.length} deals`}
            tone="positive"
          />
          <FinKpi
            label="Gem. doorlooptijd"
            value={gemDoorlooptijd ? `${gemDoorlooptijd} dagen` : '—'}
            sub="lead → deal gewonnen"
          />
          <FinKpi
            label="Gem. dealwaarde"
            value={
              wonDeals.length > 0
                ? formatEuro(Math.round(wonDeals.reduce((s, d) => s + (d.value ?? 0), 0) / wonDeals.length))
                : '—'
            }
            sub="gewonnen deals"
          />
        </FinKpiGrid>

        {/* Pipeline tabs */}
        <div className="fin-pd-tabs">
          {pipelines.map(p => {
            const cnt = deals.filter(
              d => d.pipeline_id === p.id && d.status === 'open'
            ).length
            const isActive = activePipeline === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={`fin-pd-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActivePipeline(p.id)}
              >
                {p.name}
                <span className="fin-pd-tab-count">{cnt}</span>
              </button>
            )
          })}
          <button
            type="button"
            className={`fin-pd-tab ${isGeslotenTab ? 'active sun' : ''}`}
            onClick={() => setActivePipeline('gesloten')}
          >
            Gesloten deals
            <span className="fin-pd-tab-count">{wonDeals.length}</span>
          </button>
        </div>

        {/* Gesloten deals tab */}
        {isGeslotenTab && (
          <>
            <FinKpiGrid cols={3}>
              <FinKpi
                label="Gewonnen deals"
                value={geslotenDeals.length}
                tone="positive"
              />
              <FinKpi
                label="Totale waarde"
                value={formatEuro(geslotenWaarde)}
                tone="positive"
              />
              <FinKpi
                label="Gem. dealwaarde"
                value={
                  geslotenDeals.length > 0
                    ? formatEuro(Math.round(geslotenWaarde / geslotenDeals.length))
                    : '—'
                }
              />
            </FinKpiGrid>

            {Object.keys(geslotenPerEigenaar).length > 0 && (
              <FinSection title="Per eigenaar — gewonnen deals">
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Eigenaar</th>
                        <th className="num">Gewonnen deals</th>
                        <th className="num">Totale waarde</th>
                        <th className="num">Gem. waarde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(geslotenPerEigenaar)
                        .sort((a, b) => b[1].waarde - a[1].waarde)
                        .map(([naam, stats]) => (
                          <tr key={naam}>
                            <td style={{ fontWeight: 600 }}>{naam}</td>
                            <td className="num positive">{stats.count}</td>
                            <td className="num positive">{formatEuro(stats.waarde)}</td>
                            <td className="num muted">
                              {stats.count > 0
                                ? formatEuro(Math.round(stats.waarde / stats.count))
                                : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </FinSection>
            )}

            <FinSection title={`Alle gewonnen deals (${geslotenDeals.length})`}>
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Deal</th>
                        <th>Contactpersoon</th>
                        <th>Pipeline</th>
                        <th className="num">Waarde</th>
                        <th>Gewonnen op</th>
                        <th>Eigenaar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {geslotenDeals.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="muted"
                            style={{ textAlign: 'center', padding: '24px' }}
                          >
                            Geen gewonnen deals
                          </td>
                        </tr>
                      )}
                      {geslotenDeals.map(deal => {
                        const pipeline = pipelines.find(p => p.id === deal.pipeline_id)
                        return (
                          <tr key={deal.id}>
                            <td
                              style={{
                                fontWeight: 600,
                                maxWidth: 220,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {deal.title}
                            </td>
                            <td className="muted">{deal.person_name ?? '—'}</td>
                            <td>
                              <span className="fin-pill-soft">
                                {pipeline?.name ?? '—'}
                              </span>
                            </td>
                            <td className="num">
                              {deal.value ? formatEuro(deal.value) : '—'}
                            </td>
                            <td className="muted">
                              {deal.won_time
                                ? new Date(deal.won_time).toLocaleDateString('nl-NL')
                                : '—'}
                            </td>
                            <td className="muted">{deal.user_id?.name ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </FinSection>
          </>
        )}

        {/* Funnel voor actieve pipeline */}
        {!isGeslotenTab && currentPipeline && (
          <FinSection
            title={currentPipeline.name}
            meta={`${pipelineOpen.length} open · ${pipelineWon.length} gewonnen`}
          >
            <div className="fin-pd-stages">
              {dealsPerStage.map(({ stage, count, waarde }) => (
                <div key={stage.id} className={`fin-pd-stage ${count > 0 ? 'has' : ''}`}>
                  <div className="lbl">{stage.name}</div>
                  <div className="num">{count}</div>
                  {waarde > 0 && <div className="val">{formatEuro(waarde)}</div>}
                </div>
              ))}
              <div className="fin-pd-stage won">
                <div className="lbl">Gewonnen</div>
                <div className="num">{pipelineWon.length}</div>
                {pipelineWon.reduce((s, d) => s + (d.value ?? 0), 0) > 0 && (
                  <div className="val">
                    {formatEuro(pipelineWon.reduce((s, d) => s + (d.value ?? 0), 0))}
                  </div>
                )}
              </div>
            </div>
          </FinSection>
        )}

        {/* Per eigenaar voor actieve pipeline */}
        {!isGeslotenTab && Object.keys(eigenaarStats).length > 0 && (
          <FinSection
            title={`Per eigenaar${currentPipeline ? ` — ${currentPipeline.name}` : ''}`}
          >
            <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Eigenaar</th>
                    <th className="num">Open deals</th>
                    <th className="num">Open waarde</th>
                    <th className="num">Gewonnen</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(eigenaarStats)
                    .sort((a, b) => b[1].open + b[1].won - (a[1].open + a[1].won))
                    .map(([naam, stats]) => (
                      <tr key={naam}>
                        <td style={{ fontWeight: 600 }}>{naam}</td>
                        <td className="num">{stats.open}</td>
                        <td className="num">{stats.waarde > 0 ? formatEuro(stats.waarde) : '—'}</td>
                        <td className="num positive">{stats.won}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </FinSection>
        )}

        {/* Open deals tabel */}
        {!isGeslotenTab && (
          <FinSection
            title={`Open deals (${pipelineOpen.length})${currentPipeline ? ` — ${currentPipeline.name}` : ''}`}
          >
            <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Contactpersoon</th>
                      <th>Stage</th>
                      <th className="num">Waarde</th>
                      <th>Aangemaakt</th>
                      <th>Eigenaar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineOpen.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          Geen open deals
                        </td>
                      </tr>
                    )}
                    {pipelineOpen.map(deal => {
                      const stage = stages.find(s => s.id === deal.stage_id)
                      return (
                        <tr key={deal.id}>
                          <td
                            style={{
                              fontWeight: 600,
                              maxWidth: 220,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {deal.title}
                          </td>
                          <td className="muted">{deal.person_name ?? '—'}</td>
                          <td>
                            <span className="fin-pill-soft">
                              {stage?.name ?? `Stage ${deal.stage_id}`}
                            </span>
                          </td>
                          <td className="num">{deal.value ? formatEuro(deal.value) : '—'}</td>
                          <td className="muted">
                            {new Date(deal.add_time).toLocaleDateString('nl-NL')}
                          </td>
                          <td className="muted">{deal.user_id?.name ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </FinSection>
        )}

        {/* Webhook info */}
        <FinSection title="Webhooks instellen voor auto-import">
          <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: '0 0 12px' }}>
            Stel drie webhooks in via Pipedrive →{' '}
            <strong>Settings → Webhooks → + Add webhook</strong>. Gebruik voor alle drie
            dezelfde URL:
          </p>
          <code className="fin-code">https://jouw-domein.com/api/pipedrive/webhook</code>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 14,
            }}
          >
            <WebhookCard
              title="Webhook 1 — Nieuwe afspraak"
              event="added.activity"
              action="added"
              note="Importeert nieuwe afspraken direct als ze worden ingepland (status: Gepland)."
            />
            <WebhookCard
              title="Webhook 2 — Afspraak update"
              event="updated.activity"
              action="updated"
              note="Werkt afspraken bij (datum, status Uitgevoerd) als ze worden afgevinkt."
            />
            <WebhookCard
              title="Webhook 3 — Deals"
              event="updated.deal"
              action="updated"
              note="Importeert gewonnen deals automatisch. Velden-mapping in Aannames → Pipedrive."
            />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="fin-btn"
              onClick={() => void syncAfspraken(true)}
              disabled={syncing}
              style={{ color: 'var(--negative-text)' }}
            >
              <RefreshCw /> Reset & opnieuw sync
            </button>
            <button
              type="button"
              className="fin-btn"
              onClick={() => void syncDeals(true)}
              disabled={syncingDeals}
              title="Overschrijft regio/bron/type op bestaande deals vanuit Pipedrive"
            >
              <RefreshCw /> Velden bijwerken
            </button>
          </div>
        </FinSection>

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}

function WebhookCard({
  title,
  event,
  action,
  note,
}: {
  title: string
  event: string
  action: string
  note: string
}) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--deepsea)',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
        Event: <strong>{event}</strong>
        <br />
        Action: <strong>{action}</strong>
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--fg-subtle)', marginTop: 8, lineHeight: 1.5 }}>
        {note}
      </p>
    </div>
  )
}
