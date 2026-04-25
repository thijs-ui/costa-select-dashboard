'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Euro, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ENTITY_LABELS, matchesEntity, useEntity } from '@/lib/entity'
import { formatEuro } from '@/lib/calculations'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import {
  FinCountChip,
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinPctBadge,
  FinPeriodPicker,
  FinSection,
} from '@/components/financieel/parts'

interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
  pipedrive_naam: string | null
}

interface Deal {
  makelaar_id: string | null
  aankoopprijs: number
  makelaar_commissie: number | null
  bruto_commissie: number | null
  datum_passering: string
  regio: string | null
  type_deal: string | null
}

interface Afspraak {
  makelaar_id: string | null
  datum: string
  status: string
  type: string | null
}

interface PipedriveStats {
  leads: number
  openDeals: number
}

interface MakelaarStats {
  makelaar: Makelaar
  sales: number
  omzet: number
  makelaarCommissie: number
  afsprakenGepland: number
  leads: number
  openDeals: number
  lToD: number | null
  dToS: number | null
  lToS: number | null
}

function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

export default function MakelaarsPage() {
  const { entity, setEntity } = useEntity()
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [pipedrivePerUser, setPipedrivePerUser] = useState<Record<string, PipedriveStats>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [mRes, dRes, aRes, pdRes] = await Promise.all([
      supabase
        .from('makelaars')
        .select('id, naam, rol, area_manager_id, pipedrive_naam')
        .eq('actief', true)
        .order('naam'),
      supabase
        .from('deals')
        .select('makelaar_id, aankoopprijs, makelaar_commissie, bruto_commissie, datum_passering, regio, type_deal'),
      supabase.from('afspraken').select('makelaar_id, datum, status, type'),
      fetch('/api/pipedrive/consultant-funnel').then(r => (r.ok ? r.json() : { perUser: {} })),
    ])
    setMakelaars((mRes.data ?? []) as Makelaar[])
    setDeals((dRes.data ?? []) as Deal[])
    setAfspraken((aRes.data ?? []) as Afspraak[])
    setPipedrivePerUser(((pdRes as { perUser: Record<string, PipedriveStats> }).perUser ?? {}))
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const stats: MakelaarStats[] = useMemo(() => {
    const filteredDeals = deals.filter(
      d => matchesEntity(d.regio, entity) && isInRange(d.datum_passering, range)
    )
    const filteredAfspraken = afspraken.filter(a => isInRange(a.datum, range))

    return makelaars
      .filter(m => m.rol !== 'area_manager')
      .map(m => {
        const mDeals = filteredDeals.filter(d => d.makelaar_id === m.id)
        const mAfspraken = filteredAfspraken.filter(a => a.makelaar_id === m.id)
        const gepland = mAfspraken.filter(a => a.status === 'Gepland').length
        const sales = mDeals.length

        const matchKey = (m.pipedrive_naam ?? m.naam).trim().toLowerCase()
        const pdEntry = Object.entries(pipedrivePerUser).find(
          ([name]) => name.trim().toLowerCase() === matchKey
        )
        const leads = pdEntry?.[1].leads ?? 0
        const openDeals = pdEntry?.[1].openDeals ?? 0

        return {
          makelaar: m,
          sales,
          omzet: mDeals.reduce((s, d) => s + (d.aankoopprijs ?? 0), 0),
          makelaarCommissie: mDeals.reduce((s, d) => s + (d.makelaar_commissie ?? 0), 0),
          afsprakenGepland: gepland,
          leads,
          openDeals,
          lToD: pct(openDeals, leads),
          dToS: pct(sales, openDeals),
          lToS: pct(sales, leads),
        }
      })
      .sort((a, b) => b.makelaarCommissie - a.makelaarCommissie)
  }, [makelaars, deals, afspraken, pipedrivePerUser, entity, range])

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          sales: acc.sales + s.sales,
          omzet: acc.omzet + s.omzet,
          makelaarCommissie: acc.makelaarCommissie + s.makelaarCommissie,
          leads: acc.leads + s.leads,
          openDeals: acc.openDeals + s.openDeals,
          afsprakenGepland: acc.afsprakenGepland + s.afsprakenGepland,
        }),
        { sales: 0, omzet: 0, makelaarCommissie: 0, leads: 0, openDeals: 0, afsprakenGepland: 0 }
      ),
    [stats]
  )

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Consultants"
          subtitle={`Prestaties per consultant — ${ENTITY_LABELS[entity]}`}
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid>
              <FinKpi
                label="Sales"
                value={totals.sales}
                sub={range.label}
                icon={TrendingUp}
                tone="positive"
              />
              <FinKpi
                label="Commissie consultants"
                value={formatEuro(totals.makelaarCommissie)}
                sub={`omzet: ${formatEuro(totals.omzet)}`}
                icon={Euro}
                tone="accent"
              />
              <FinKpi
                label="Leads (Pipedrive)"
                value={totals.leads}
                sub="actieve leads"
                icon={Users}
              />
              <FinKpi
                label="Open deals (Pipedrive)"
                value={totals.openDeals}
                sub="actief in pipeline"
                icon={CalendarDays}
              />
            </FinKpiGrid>

            <FinSection title="Per consultant" meta={range.label}>
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Consultant</th>
                      <th className="num">Leads</th>
                      <th className="num">Deals</th>
                      <th className="num">Sales</th>
                      <th className="num">Omzet</th>
                      <th className="num">Commissie</th>
                      <th className="num">L→D</th>
                      <th className="num">D→S</th>
                      <th className="num">L→S</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          Geen actieve consultants in deze selectie
                        </td>
                      </tr>
                    )}
                    {stats.map(s => (
                      <tr key={s.makelaar.id}>
                        <td>
                          <Link
                            href={`/makelaars/${s.makelaar.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              color: 'var(--deepsea)',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <span className="fin-avatar">{s.makelaar.naam.charAt(0)}</span>
                            {s.makelaar.naam}
                          </Link>
                        </td>
                        <td className="num">
                          <FinCountChip value={s.leads} tone={s.leads > 0 ? 'deepsea' : 'mid'} />
                        </td>
                        <td className="num">
                          <FinCountChip
                            value={s.openDeals}
                            tone={s.openDeals > 0 ? 'mid' : 'mid'}
                          />
                        </td>
                        <td className="num">
                          <FinCountChip
                            value={s.sales}
                            tone={s.sales > 0 ? 'positive' : 'mid'}
                          />
                        </td>
                        <td className="num">{s.omzet > 0 ? formatEuro(s.omzet) : '—'}</td>
                        <td className="num">
                          {s.makelaarCommissie > 0 ? formatEuro(s.makelaarCommissie) : '—'}
                          {totals.makelaarCommissie > 0 && s.makelaarCommissie > 0 && (
                            <span style={{ marginLeft: 6, color: 'var(--fg-subtle)', fontSize: 11 }}>
                              ({Math.round((s.makelaarCommissie / totals.makelaarCommissie) * 100)}%)
                            </span>
                          )}
                        </td>
                        <td className="num"><FinPctBadge value={s.lToD} good={50} /></td>
                        <td className="num"><FinPctBadge value={s.dToS} good={30} /></td>
                        <td className="num"><FinPctBadge value={s.lToS} good={15} /></td>
                      </tr>
                    ))}
                  </tbody>
                  {stats.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>Totaal</td>
                        <td className="num">{totals.leads}</td>
                        <td className="num">{totals.openDeals}</td>
                        <td className="num">{totals.sales}</td>
                        <td className="num">{formatEuro(totals.omzet)}</td>
                        <td className="num">{formatEuro(totals.makelaarCommissie)}</td>
                        <td className="num">
                          <FinPctBadge value={pct(totals.openDeals, totals.leads)} good={50} />
                        </td>
                        <td className="num">
                          <FinPctBadge value={pct(totals.sales, totals.openDeals)} good={30} />
                        </td>
                        <td className="num">
                          <FinPctBadge value={pct(totals.sales, totals.leads)} good={15} />
                        </td>
                      </tr>
                    </tfoot>
                  )}
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
