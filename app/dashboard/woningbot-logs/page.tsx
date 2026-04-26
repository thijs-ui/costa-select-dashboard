'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FinHeader, FinKpi, FinKpiGrid, FinSection,
} from '@/components/financieel/parts'

interface LogStep {
  ms?: number
  ok?: boolean
  error?: string | null
  count?: number | null
  before?: number
  after?: number
  selected?: number
  intent?: string
}

interface LogRow {
  id: string
  created_at: string
  user_id: string | null
  session_id: string | null
  user_message: string
  intent: string | null
  status: string
  error_message: string | null
  total_ms: number
  steps: {
    intent_detection?: LogStep
    parser?: LogStep
    scrape?: { idealista?: LogStep; supabase?: LogStep }
    dedup?: LogStep
    filter?: LogStep
    selector?: LogStep
  }
  selected_count: number | null
  total_found: number | null
  source: string
}

const STATUS_LABELS: Record<string, string> = {
  success: 'Succes',
  no_results: 'Geen resultaten',
  parse_error: 'Parse-fout',
  scrape_error: 'Scrape-fout',
  selector_error: 'Selector-fout',
  exception: 'Exception',
}

const STATUS_TONE: Record<string, 'positive' | 'negative' | 'default' | 'accent'> = {
  success: 'positive',
  no_results: 'default',
  parse_error: 'accent',
  scrape_error: 'negative',
  selector_error: 'negative',
  exception: 'negative',
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

export default function WoningbotLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [intentFilter, setIntentFilter] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (statusFilter) params.set('status', statusFilter)
    if (intentFilter) params.set('intent', intentFilter)
    const res = await fetch(`/api/woningbot/logs?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, intentFilter])

  const stats = useMemo(() => {
    if (logs.length === 0) {
      return {
        total: 0, todayCount: 0, successRate: 0,
        p50: 0, p95: 0,
        topErrors: [] as { msg: string; count: number }[],
      }
    }
    const today = new Date().toISOString().slice(0, 10)
    const todayLogs = logs.filter(l => l.created_at.startsWith(today))
    const successes = logs.filter(l => l.status === 'success').length
    const successRate = (successes / logs.length) * 100
    const durations = logs.map(l => l.total_ms)
    const p50 = percentile(durations, 50)
    const p95 = percentile(durations, 95)

    const errorMap = new Map<string, number>()
    for (const l of logs) {
      if (l.status === 'success') continue
      const key = l.error_message || STATUS_LABELS[l.status] || l.status
      errorMap.set(key, (errorMap.get(key) || 0) + 1)
    }
    const topErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([msg, count]) => ({ msg, count }))

    return {
      total: logs.length,
      todayCount: todayLogs.length,
      successRate,
      p50, p95,
      topErrors,
    }
  }, [logs])

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Woningbot — observability"
          subtitle="Per-query logs van /api/chat. Sprint 0: zien wat er stuk gaat voordat we fixen."
          eyebrow="Costa Select · Setup"
        />

        {/* Top stats */}
        <FinKpiGrid cols={4}>
          <FinKpi
            label="Queries vandaag"
            value={String(stats.todayCount)}
            sub={`${stats.total} totaal in view`}
          />
          <FinKpi
            label="Succespercentage"
            value={`${stats.successRate.toFixed(0)}%`}
            sub="laatste 200 queries"
            tone={stats.successRate >= 80 ? 'positive' : stats.successRate >= 50 ? 'accent' : 'negative'}
          />
          <FinKpi
            label="P50 latency"
            value={fmtMs(stats.p50)}
            sub="mediaan duur"
          />
          <FinKpi
            label="P95 latency"
            value={fmtMs(stats.p95)}
            sub="95e percentiel"
          />
        </FinKpiGrid>

        {/* Filters */}
        <FinSection title="Filters">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 13,
              }}
            >
              <option value="">Alle statussen</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={intentFilter}
              onChange={e => setIntentFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', fontSize: 13,
              }}
            >
              <option value="">Alle intents</option>
              <option value="zoekwoning">zoekwoning</option>
              <option value="nieuwbouw">nieuwbouw</option>
              <option value="vergelijk">vergelijk</option>
              <option value="pitch">pitch</option>
              <option value="buurt">buurt</option>
              <option value="prijs">prijs</option>
              <option value="klant">klant</option>
              <option value="alert">alert</option>
              <option value="algemeen">algemeen</option>
            </select>
            <button
              onClick={() => void load()}
              className="fin-btn"
            >
              Vernieuwen
            </button>
          </div>
        </FinSection>

        {/* Top failure modes */}
        {stats.topErrors.length > 0 && (
          <FinSection title="Top failure modes" meta="laatste 200 queries">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Foutmelding</th>
                  <th className="num">Aantal</th>
                </tr>
              </thead>
              <tbody>
                {stats.topErrors.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{e.msg}</td>
                    <td className="num"><strong>{e.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FinSection>
        )}

        {/* Recent queries lijst */}
        <FinSection title="Recente queries" meta={`${logs.length} items`}>
          {loading ? (
            <div style={{ padding: 24, color: 'var(--fg-subtle)', fontSize: 13 }}>Laden…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--fg-subtle)', fontSize: 13 }}>
              Nog geen logs. Stel een vraag aan de woningbot om de eerste log te zien verschijnen.
            </div>
          ) : (
            <table className="fin-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Tijd</th>
                  <th>Bericht</th>
                  <th style={{ width: 100 }}>Intent</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th className="num" style={{ width: 80 }}>Duur</th>
                  <th className="num" style={{ width: 80 }}>Found</th>
                  <th className="num" style={{ width: 80 }}>Selected</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} onClick={() => setSelectedLog(l)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                      <div>{fmtTime(l.created_at)}</div>
                      <div>{fmtDate(l.created_at)}</div>
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 400 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.user_message}
                      </div>
                      {l.error_message && (
                        <div style={{ color: 'var(--negative-text)', fontSize: 11, marginTop: 2 }}>
                          {l.error_message}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{l.intent || '—'}</td>
                    <td>
                      <span className={`fin-pill-soft ${STATUS_TONE[l.status] || ''}`}>
                        {STATUS_LABELS[l.status] || l.status}
                      </span>
                    </td>
                    <td className="num" style={{ fontSize: 12 }}>{fmtMs(l.total_ms)}</td>
                    <td className="num" style={{ fontSize: 12 }}>{l.total_found ?? '—'}</td>
                    <td className="num" style={{ fontSize: 12 }}>{l.selected_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </FinSection>

        {/* Detail-paneel */}
        {selectedLog && (
          <>
            <div
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(7,42,36,0.30)',
                zIndex: 80, backdropFilter: 'blur(2px)',
              }}
            />
            <aside
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: 'min(540px, 100vw)', background: 'white',
                borderLeft: '1px solid var(--border)',
                zIndex: 90, padding: '24px', overflowY: 'auto',
                fontFamily: 'var(--font-body)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--deepsea)', margin: 0 }}>
                  Log details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  Sluit
                </button>
              </div>
              <pre style={{
                fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                background: 'var(--marble)', padding: 12, borderRadius: 8,
                overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: '70vh',
              }}>
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
