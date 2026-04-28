'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Euro, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro, normalizeRegio } from '@/lib/calculations'
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

interface GeslotenDeal {
  regio: string | null
  aankoopprijs: number
  bruto_commissie: number
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
interface RegioStats {
  regio: string
  geslotenDeals: number
  openDeals: number
  leads: number
  omzet: number
  commissie: number
}

function isAfhandeling(regio: string) {
  return regio.toLowerCase().includes('afhandeling')
}
function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

export default function RegiosPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [geslotenDeals, setGeslotenDeals] = useState<GeslotenDeal[]>([])
  const [pipedriveDeals, setPipedriveDeals] = useState<PipedriveDealRow[]>([])
  const [pipedriveLeads, setPipedriveLeads] = useState<PipedriveLeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await supabase
        .from('deals')
        .select('regio, aankoopprijs, bruto_commissie, datum_passering')
      setGeslotenDeals((data ?? []) as GeslotenDeal[])
      const [pdDealsRes, pdLeadsRes] = await Promise.allSettled([
        fetch('/api/pipedrive/open-deals'),
        fetch('/api/pipedrive/leads'),
      ])
      if (pdDealsRes.status === 'fulfilled' && pdDealsRes.value.ok) {
        const json = await pdDealsRes.value.json()
        setPipedriveDeals(
          (json.allDeals ?? []).filter((d: PipedriveDealRow) => d.status === 'open')
        )
      }
      if (pdLeadsRes.status === 'fulfilled' && pdLeadsRes.value.ok) {
        const json = await pdLeadsRes.value.json()
        setPipedriveLeads(json.leads ?? [])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const built = useMemo(() => {
    const filteredGesloten = geslotenDeals.filter(d => isInRange(d.datum_passering, range))
    const allOpenDeals = pipedriveDeals.filter(d => d.status === 'open')
    const filteredOpenDeals = allOpenDeals.filter(d => isInRange(d.add_time, range))
    const filteredLeads = pipedriveLeads.filter(l => isInRange(l.add_time, range))

    const regularOpenDeals = filteredOpenDeals.filter(d => !isAfhandeling(d.regio))
    const afhandelingDeals = allOpenDeals.filter(d => isAfhandeling(d.regio))

    const regioMap = new Map<string, RegioStats>()
    const ensure = (regio: string): RegioStats => {
      const existing = regioMap.get(regio)
      if (existing) return existing
      const fresh: RegioStats = {
        regio,
        geslotenDeals: 0,
        openDeals: 0,
        leads: 0,
        omzet: 0,
        commissie: 0,
      }
      regioMap.set(regio, fresh)
      return fresh
    }

    for (const d of filteredGesloten) {
      const r = ensure(normalizeRegio(d.regio))
      r.geslotenDeals++
      r.omzet += d.aankoopprijs ?? 0
      r.commissie += d.bruto_commissie ?? 0
    }
    for (const d of regularOpenDeals) ensure(d.regio).openDeals++
    for (const l of filteredLeads) ensure(l.regio).leads++

    const stats = Array.from(regioMap.values()).sort(
      (a, b) => b.commissie - a.commissie || b.leads - a.leads
    )
    const totals = stats.reduce(
      (acc, r) => ({
        geslotenDeals: acc.geslotenDeals + r.geslotenDeals,
        openDeals: acc.openDeals + r.openDeals,
        leads: acc.leads + r.leads,
        omzet: acc.omzet + r.omzet,
        commissie: acc.commissie + r.commissie,
      }),
      { geslotenDeals: 0, openDeals: 0, leads: 0, omzet: 0, commissie: 0 }
    )
    const totalAfhandeling = afhandelingDeals.length

    return {
      filteredGesloten,
      filteredLeads,
      regularOpenDeals,
      afhandelingDeals,
      totalAfhandeling,
      stats,
      totals,
    }
  }, [geslotenDeals, pipedriveDeals, pipedriveLeads, range])

  const totalLeads = built.filteredLeads.length
  const totalDeals = built.regularOpenDeals.length
  const totalSales = built.filteredGesloten.length
  const max = Math.max(totalLeads, totalDeals + built.totalAfhandeling, totalSales, 1)

  const funnelSteps: FinFunnelStep[] = [
    { label: 'Leads', value: totalLeads, variant: 'deepsea' },
    {
      label: 'Open deals',
      value: totalDeals,
      variant: 'mid',
      conversionFromPrev: pct(totalDeals, totalLeads),
    },
    { label: 'In afhandeling', value: built.totalAfhandeling, variant: 'sun' },
    {
      label: 'Sales',
      value: totalSales,
      variant: 'deepsea',
      conversionFromPrev: pct(totalSales, totalDeals + built.totalAfhandeling),
    },
  ]

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Regio's & Funnel"
          subtitle="Prestaties en conversie per regio — alle entiteiten."
        >
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {error && (
          <div className="fin-section" style={{ borderColor: 'var(--negative)' }}>
            <p style={{ color: 'var(--negative-text)', margin: 0 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid>
              <FinKpi
                label="Leads in periode"
                value={built.totals.leads}
                sub={range.label}
                icon={Users}
              />
              <FinKpi
                label="Open deals"
                value={built.totals.openDeals}
                sub="exclusief afhandeling"
                icon={TrendingUp}
              />
              <FinKpi
                label="Sales"
                value={built.totals.geslotenDeals}
                sub="gepasseerd in periode"
                icon={Building2}
                tone="positive"
              />
              <FinKpi
                label="Bruto commissie"
                value={formatEuro(built.totals.commissie)}
                sub={`omzet: ${formatEuro(built.totals.omzet)}`}
                icon={Euro}
                tone="accent"
              />
            </FinKpiGrid>

            <FinSection title="Conversiefunnel" meta={range.label}>
              <FinFunnelBars steps={funnelSteps} max={max} />
            </FinSection>

            <FinSection title="Per regio">
              {built.stats.length === 0 ? (
                <p style={{ color: 'var(--fg-subtle)', textAlign: 'center', padding: '24px 0' }}>
                  Geen data gevonden voor deze periode.
                </p>
              ) : (
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Regio</th>
                        <th className="num">Leads</th>
                        <th className="num">Open deals</th>
                        <th className="num">Sales</th>
                        <th className="num">Omzet</th>
                        <th className="num">Commissie</th>
                        <th className="num">L→D</th>
                        <th className="num">D→S</th>
                      </tr>
                    </thead>
                    <tbody>
                      {built.stats.map(r => (
                        <tr key={r.regio}>
                          <td>
                            <Link
                              href={`/regios/${encodeURIComponent(r.regio)}`}
                              style={{
                                color: 'var(--deepsea)',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              {r.regio}
                            </Link>
                          </td>
                          <td className="num"><FinCountChip value={r.leads} tone="deepsea" /></td>
                          <td className="num"><FinCountChip value={r.openDeals} tone="mid" /></td>
                          <td className="num"><FinCountChip value={r.geslotenDeals} tone="positive" /></td>
                          <td className="num">{formatEuro(r.omzet)}</td>
                          <td className="num">
                            {formatEuro(r.commissie)}
                            {built.totals.commissie > 0 && (
                              <span style={{ marginLeft: 6, color: 'var(--fg-subtle)', fontSize: 11 }}>
                                ({Math.round((r.commissie / built.totals.commissie) * 100)}%)
                              </span>
                            )}
                          </td>
                          <td className="num">
                            <FinPctBadge value={pct(r.openDeals, r.leads)} good={20} />
                          </td>
                          <td className="num">
                            <FinPctBadge value={pct(r.geslotenDeals, r.openDeals)} good={30} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Totaal</td>
                        <td className="num">{built.totals.leads}</td>
                        <td className="num">{built.totals.openDeals}</td>
                        <td className="num">{built.totals.geslotenDeals}</td>
                        <td className="num">{formatEuro(built.totals.omzet)}</td>
                        <td className="num">{formatEuro(built.totals.commissie)}</td>
                        <td className="num">
                          <FinPctBadge value={pct(built.totals.openDeals, built.totals.leads)} good={20} />
                        </td>
                        <td className="num">
                          <FinPctBadge value={pct(built.totals.geslotenDeals, built.totals.openDeals)} good={30} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </FinSection>

            <AfhandelingSection deals={built.afhandelingDeals} />

            <FinSection title="Eindtotaal" meta="alle pijplijnen">
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Overzicht</th>
                      <th className="num">Leads</th>
                      <th className="num">Open deals</th>
                      <th className="num">Sales</th>
                      <th className="num">Omzet</th>
                      <th className="num">Commissie</th>
                      <th className="num">L→D</th>
                      <th className="num">D→S</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Alle regio&apos;s + afhandeling</td>
                      <td className="num">
                        <FinCountChip value={built.totals.leads} tone="deepsea" />
                      </td>
                      <td className="num">
                        <FinCountChip value={built.totals.openDeals + built.totalAfhandeling} tone="mid" />
                      </td>
                      <td className="num">
                        <FinCountChip value={built.totals.geslotenDeals} tone="positive" />
                      </td>
                      <td className="num">{formatEuro(built.totals.omzet)}</td>
                      <td className="num">{formatEuro(built.totals.commissie)}</td>
                      <td className="num">
                        <FinPctBadge
                          value={pct(built.totals.openDeals + built.totalAfhandeling, built.totals.leads)}
                          good={20}
                        />
                      </td>
                      <td className="num">
                        <FinPctBadge
                          value={pct(built.totals.geslotenDeals, built.totals.openDeals + built.totalAfhandeling)}
                          good={30}
                        />
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
