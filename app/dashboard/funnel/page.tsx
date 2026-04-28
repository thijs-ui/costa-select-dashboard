'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeRegio } from '@/lib/calculations'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import {
  FinCountChip,
  FinFunnelBars,
  FinHeader,
  FinPctBadge,
  FinPeriodPicker,
  FinSection,
  type FinFunnelStep,
} from '@/components/financieel/parts'
import AfhandelingSection from '@/components/afhandeling-section'

interface Sale {
  regio: string | null
  datum_passering: string
}
interface PipedriveDealRow {
  id: number
  title: string
  regio: string
  status: string
  value: number
  add_time: string
}
interface PipedriveLeadRow {
  id: string
  regio: string
  add_time: string
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
        supabase.from('deals').select('regio, datum_passering'),
        fetch('/api/pipedrive/open-deals').then(r => (r.ok ? r.json() : { allDeals: [] })),
        fetch('/api/pipedrive/leads').then(r => (r.ok ? r.json() : { leads: [] })),
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
