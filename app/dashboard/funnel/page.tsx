'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeRegio } from '@/lib/calculations'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import {
  FinCountChip,
  FinFunnelBars,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinPctBadge,
  FinPeriodPicker,
  FinSection,
  type FinFunnelStep,
} from '@/components/financieel/parts'
import AfhandelingSection from '@/components/afhandeling-section'

interface Sale {
  regio: string | null
  datum_passering: string
  created_at: string
}
interface PipedriveDealRow {
  id: number
  title: string
  regio: string
  status: string
  value: number
  add_time: string
  person_id?: number | null
  origin_id?: string | null
}
interface PipedriveLeadRow {
  id: string
  regio: string
  add_time: string
  person_id?: number | null
}
interface RegioFunnel {
  regio: string
  leads: number
  deals: number
  sales: number
  leadsToDealsPct: number | null
  dealsToSalesPct: number | null
  leadsToSalesPct: number | null
}

function isAfhandeling(regio: string) {
  return regio.toLowerCase().includes('afhandeling')
}
function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}
function daysBetween(later: string, earlier: string): number | null {
  if (!later || !earlier) return null
  const a = new Date(later).getTime()
  const b = new Date(earlier).getTime()
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  const diff = (a - b) / (1000 * 60 * 60 * 24)
  return diff >= 0 ? diff : null
}

export default function FunnelPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [sales, setSales] = useState<Sale[]>([])
  const [pipedriveDeals, setPipedriveDeals] = useState<PipedriveDealRow[]>([])
  const [pipedriveLeads, setPipedriveLeads] = useState<PipedriveLeadRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [salesRes, dealsRes, leadsRes] = await Promise.allSettled([
        // created_at meegehaald voor de Deal → Sale doorlooptijd
        supabase.from('deals').select('regio, datum_passering, created_at'),
        fetch('/api/pipedrive/open-deals', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { allDeals: [] })),
        // archived=all: ook geconverteerde leads, anders mist de lead-zijde
        // van de Lead → Deal koppeling
        fetch('/api/pipedrive/leads?archived=all', { cache: 'no-store' }).then(r => (r.ok ? r.json() : { leads: [] })),
      ])
      const salesData = salesRes.status === 'fulfilled' ? (salesRes.value.data ?? []) : []
      const dealsData = dealsRes.status === 'fulfilled' ? (dealsRes.value ?? { allDeals: [] }) : { allDeals: [] }
      const leadsData = leadsRes.status === 'fulfilled' ? (leadsRes.value ?? { leads: [] }) : { leads: [] }
      setSales(salesData as Sale[])
      setPipedriveDeals((dealsData.allDeals ?? []) as PipedriveDealRow[])
      setPipedriveLeads((leadsData.leads ?? []) as PipedriveLeadRow[])
    } catch (e) {
      console.error('[load] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const data = useMemo(() => {
    const filteredLeads = pipedriveLeads.filter(l => isInRange(l.add_time, range))
    const filteredOpenDeals = pipedriveDeals.filter(
      d => d.status === 'open' && isInRange(d.add_time, range)
    )
    const filteredSales = sales.filter(s => isInRange(s.datum_passering, range))

    // Afhandeling-deals altijd alle huidige (geen periode-filter)
    const allOpenDeals = pipedriveDeals.filter(d => d.status === 'open')
    const regularDeals = filteredOpenDeals.filter(d => !isAfhandeling(d.regio))
    const afhandelingDeals = allOpenDeals.filter(d => isAfhandeling(d.regio))
    const totalAfhandeling = afhandelingDeals.length

    const totalLeads = filteredLeads.length
    const totalDeals = regularDeals.length
    const totalSales = filteredSales.length

    const regios = Array.from(
      new Set([
        ...filteredLeads.map(l => l.regio),
        ...regularDeals.map(d => d.regio),
        ...filteredSales.map(s => normalizeRegio(s.regio)),
      ])
    )
      .filter(r => Boolean(r) && !isAfhandeling(r))
      .sort()

    const regioFunnels: RegioFunnel[] = regios
      .map(regio => {
        const l = filteredLeads.filter(x => x.regio === regio).length
        const d = regularDeals.filter(x => x.regio === regio).length
        const s = filteredSales.filter(x => normalizeRegio(x.regio) === regio).length
        return {
          regio,
          leads: l,
          deals: d,
          sales: s,
          leadsToDealsPct: pct(d, l),
          dealsToSalesPct: pct(s, d),
          leadsToSalesPct: pct(s, l),
        }
      })
      .sort((a, b) => b.leads - a.leads)

    // ── Doorlooptijden ───────────────────────────────────────────────────
    // Deal → Sale: per supabase-deal met passering in periode.
    const salesInRange = sales.filter(s => isInRange(s.datum_passering, range))
    const dealToSaleDays = salesInRange
      .map(s => daysBetween(s.datum_passering, s.created_at))
      .filter((n): n is number => n != null)
    const dealToSaleAvg = dealToSaleDays.length > 0
      ? Math.round(dealToSaleDays.reduce((a, b) => a + b, 0) / dealToSaleDays.length)
      : null

    // Lead → Deal: voor elke Pipedrive deal in periode (alle statuses, ex
    // afhandeling), zoek matching lead via origin_id (canoniek) of via
    // person_id (vroegste lead van die persoon als fallback).
    const leadById = new Map<string, PipedriveLeadRow>()
    const earliestLeadByPerson = new Map<number, PipedriveLeadRow>()
    for (const l of pipedriveLeads) {
      leadById.set(l.id, l)
      if (l.person_id != null) {
        const prev = earliestLeadByPerson.get(l.person_id)
        if (!prev || l.add_time < prev.add_time) earliestLeadByPerson.set(l.person_id, l)
      }
    }
    const dealsInRange = pipedriveDeals.filter(
      d => isInRange(d.add_time, range) && !isAfhandeling(d.regio)
    )
    let leadToDealMatched = 0
    const leadToDealDays: number[] = []
    for (const d of dealsInRange) {
      let lead: PipedriveLeadRow | undefined
      if (d.origin_id) lead = leadById.get(d.origin_id)
      if (!lead && d.person_id != null) lead = earliestLeadByPerson.get(d.person_id)
      if (!lead) continue
      const delta = daysBetween(d.add_time, lead.add_time)
      if (delta == null) continue
      leadToDealDays.push(delta)
      leadToDealMatched++
    }
    const leadToDealAvg = leadToDealDays.length > 0
      ? Math.round(leadToDealDays.reduce((a, b) => a + b, 0) / leadToDealDays.length)
      : null

    return {
      filteredLeads,
      regularDeals,
      filteredSales,
      afhandelingDeals,
      totalAfhandeling,
      totalLeads,
      totalDeals,
      totalSales,
      regioFunnels,
      dealToSaleAvg,
      dealToSaleN: dealToSaleDays.length,
      leadToDealAvg,
      leadToDealN: leadToDealMatched,
      leadToDealTotal: dealsInRange.length,
    }
  }, [pipedriveLeads, pipedriveDeals, sales, range])

  const max = Math.max(
    data.totalLeads,
    data.totalDeals + data.totalAfhandeling,
    data.totalSales,
    1
  )

  const funnelSteps: FinFunnelStep[] = [
    { label: 'Leads', value: data.totalLeads, variant: 'deepsea' },
    {
      label: 'Open deals',
      value: data.totalDeals,
      variant: 'mid',
      conversionFromPrev: pct(data.totalDeals, data.totalLeads),
    },
    { label: 'In afhandeling', value: data.totalAfhandeling, variant: 'sun' },
    {
      label: 'Sales',
      value: data.totalSales,
      variant: 'deepsea',
      conversionFromPrev: pct(data.totalSales, data.totalDeals + data.totalAfhandeling),
    },
  ]

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Conversiefunnel"
          subtitle="Leads → open deals → sales — alle entiteiten."
        >
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinSection title="Funnel" meta={range.label}>
              <FinFunnelBars steps={funnelSteps} max={max} />
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: 28,
                  flexWrap: 'wrap',
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                }}
              >
                <span>
                  Lead → Deal:{' '}
                  <strong style={{ color: 'var(--deepsea)' }}>
                    {pct(data.totalDeals, data.totalLeads) ?? '—'}
                    {pct(data.totalDeals, data.totalLeads) != null ? '%' : ''}
                  </strong>
                </span>
                <span>
                  Deal → Sale:{' '}
                  <strong style={{ color: 'var(--deepsea)' }}>
                    {pct(data.totalSales, data.totalDeals) ?? '—'}
                    {pct(data.totalSales, data.totalDeals) != null ? '%' : ''}
                  </strong>
                </span>
                <span>
                  Lead → Sale:{' '}
                  <strong style={{ color: 'var(--deepsea)' }}>
                    {pct(data.totalSales, data.totalLeads) ?? '—'}
                    {pct(data.totalSales, data.totalLeads) != null ? '%' : ''}
                  </strong>
                </span>
              </div>
            </FinSection>

            <FinSection title="Doorlooptijd" meta="gemiddelde dagen per stap">
              <FinKpiGrid cols={3}>
                <FinKpi
                  label="Lead → Deal"
                  value={data.leadToDealAvg != null ? `${data.leadToDealAvg} dgn` : '—'}
                  sub={
                    data.leadToDealAvg != null
                      ? `${data.leadToDealN} van ${data.leadToDealTotal} deals gekoppeld`
                      : 'geen gekoppelde leads in periode'
                  }
                  tone="accent"
                />
                <FinKpi
                  label="Deal → Sale"
                  value={data.dealToSaleAvg != null ? `${data.dealToSaleAvg} dgn` : '—'}
                  sub={
                    data.dealToSaleAvg != null
                      ? `${data.dealToSaleN} ${data.dealToSaleN === 1 ? 'sale' : 'sales'} in periode`
                      : 'geen sales in periode'
                  }
                  tone="accent"
                />
                <FinKpi
                  label="Lead → Sale"
                  value={
                    data.leadToDealAvg != null && data.dealToSaleAvg != null
                      ? `${data.leadToDealAvg + data.dealToSaleAvg} dgn`
                      : '—'
                  }
                  sub="som van beide stappen"
                />
              </FinKpiGrid>
            </FinSection>

            {data.regioFunnels.length > 0 && (
              <FinSection title="Per regio">
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Regio</th>
                        <th className="num">Leads</th>
                        <th className="num">Deals</th>
                        <th className="num">Sales</th>
                        <th className="num">L→D</th>
                        <th className="num">D→S</th>
                        <th className="num">L→S</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.regioFunnels.map(r => (
                        <tr key={r.regio}>
                          <td>
                            <Link
                              href={`/regios/${encodeURIComponent(r.regio)}`}
                              style={{ color: 'var(--deepsea)', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {r.regio}
                            </Link>
                          </td>
                          <td className="num">
                            <FinCountChip value={r.leads} tone="deepsea" />
                          </td>
                          <td className="num">
                            <FinCountChip value={r.deals} tone="mid" />
                          </td>
                          <td className="num">
                            <FinCountChip value={r.sales} tone="positive" />
                          </td>
                          <td className="num">
                            <FinPctBadge value={r.leadsToDealsPct} good={20} />
                          </td>
                          <td className="num">
                            <FinPctBadge value={r.dealsToSalesPct} good={30} />
                          </td>
                          <td className="num">
                            <FinPctBadge value={r.leadsToSalesPct} good={10} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Totaal</td>
                        <td className="num">{data.totalLeads}</td>
                        <td className="num">{data.totalDeals}</td>
                        <td className="num">{data.totalSales}</td>
                        <td className="num">
                          <FinPctBadge value={pct(data.totalDeals, data.totalLeads)} good={20} />
                        </td>
                        <td className="num">
                          <FinPctBadge value={pct(data.totalSales, data.totalDeals)} good={30} />
                        </td>
                        <td className="num">
                          <FinPctBadge value={pct(data.totalSales, data.totalLeads)} good={10} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </FinSection>
            )}

            <AfhandelingSection deals={data.afhandelingDeals} />

            <FinSection title="Eindtotaal" meta="alle pijplijnen">
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Overzicht</th>
                      <th className="num">Leads</th>
                      <th className="num">Open deals</th>
                      <th className="num">Sales</th>
                      <th className="num">L→D</th>
                      <th className="num">D→S</th>
                      <th className="num">L→S</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Alle regio&apos;s + afhandeling</td>
                      <td className="num">
                        <FinCountChip value={data.totalLeads} tone="deepsea" />
                      </td>
                      <td className="num">
                        <FinCountChip value={data.totalDeals + data.totalAfhandeling} tone="mid" />
                      </td>
                      <td className="num">
                        <FinCountChip value={data.totalSales} tone="positive" />
                      </td>
                      <td className="num">
                        <FinPctBadge
                          value={pct(data.totalDeals + data.totalAfhandeling, data.totalLeads)}
                          good={20}
                        />
                      </td>
                      <td className="num">
                        <FinPctBadge
                          value={pct(data.totalSales, data.totalDeals + data.totalAfhandeling)}
                          good={30}
                        />
                      </td>
                      <td className="num">
                        <FinPctBadge value={pct(data.totalSales, data.totalLeads)} good={10} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FinSection>

            <div style={{ height: 60 }} />
          </>
        )}
      </div>
    </div>
  )
}
