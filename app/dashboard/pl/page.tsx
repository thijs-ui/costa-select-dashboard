'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import { matchesEntiteit, matchesEntity, useEntity } from '@/lib/entity'
import {
  FinChartCard,
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinKpiHero,
  FinSection,
} from '@/components/financieel/parts'
import { FinStackedAreaChart } from '@/components/financieel/Charts'

interface Deal {
  datum_passering: string
  aankoopprijs: number
  bruto_commissie: number | null
  makelaar_commissie: number | null
  partner_commissie: number | null
  netto_commissie_cs: number | null
  regio: string | null
}

interface MaandRow {
  maand: number
  deals: number
  aankoopwaarde: number
  bruto_commissie: number
  makelaar_commissie: number
  partner_commissie: number
  netto_omzet: number
  kosten: number
  brutowinst: number
  marge_pct: number
  cumulatief: number
}

interface KostenRow { maand: number; bedrag: number; entiteit?: string }

export default function PLPage() {
  const { entity, setEntity } = useEntity()
  const [allDeals, setAllDeals] = useState<Deal[]>([])
  const [allKosten, setAllKosten] = useState<KostenRow[]>([])
  const [loading, setLoading] = useState(true)
  const jaar = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      try {
        const [dealsRes, kostenRes] = await Promise.allSettled([
          supabase
            .from('deals')
            .select('datum_passering, aankoopprijs, bruto_commissie, makelaar_commissie, partner_commissie, netto_commissie_cs, regio'),
          supabase.from('maandkosten').select('maand, bedrag, entiteit').eq('jaar', jaar),
        ])
        const dealsData = dealsRes.status === 'fulfilled' ? (dealsRes.value.data ?? []) : []
        const kostenData = kostenRes.status === 'fulfilled' ? (kostenRes.value.data ?? []) : []
        setAllDeals(dealsData as Deal[])
        setAllKosten(kostenData as KostenRow[])
      } catch (e) {
        console.error('[load] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [jaar])

  const rows: MaandRow[] = useMemo(() => {
    const deals = allDeals.filter(d => matchesEntity(d.regio, entity))
    const kostenData = allKosten.filter(k => matchesEntiteit(k.entiteit, entity))

    const kostenPerMaand: Record<number, number> = {}
    kostenData.forEach(k => {
      kostenPerMaand[k.maand] = (kostenPerMaand[k.maand] ?? 0) + Number(k.bedrag)
    })

    const monthly = MAANDEN.map((_, i) => {
      const maand = i + 1
      const maandDeals = deals.filter(d => {
        const dt = new Date(d.datum_passering)
        return dt.getMonth() === i && dt.getFullYear() === jaar
      })
      const bruto = maandDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
      const mak = maandDeals.reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0)
      const part = maandDeals.reduce((s, d) => s + Number(d.partner_commissie ?? 0), 0)
      const netto = maandDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)
      const kosten = kostenPerMaand[maand] ?? 0
      const winst = netto - kosten
      return {
        maand,
        deals: maandDeals.length,
        aankoopwaarde: maandDeals.reduce((s, d) => s + Number(d.aankoopprijs), 0),
        bruto_commissie: bruto,
        makelaar_commissie: mak,
        partner_commissie: part,
        netto_omzet: netto,
        kosten,
        brutowinst: winst,
        marge_pct: bruto > 0 ? (netto / bruto) * 100 : 0,
      }
    })
    return monthly.reduce<MaandRow[]>((acc, row) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulatief : 0
      acc.push({ ...row, cumulatief: prev + row.brutowinst })
      return acc
    }, [])
  }, [allDeals, allKosten, entity, jaar])

  const totaal = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          deals: acc.deals + r.deals,
          aankoopwaarde: acc.aankoopwaarde + r.aankoopwaarde,
          bruto_commissie: acc.bruto_commissie + r.bruto_commissie,
          makelaar_commissie: acc.makelaar_commissie + r.makelaar_commissie,
          partner_commissie: acc.partner_commissie + r.partner_commissie,
          netto_omzet: acc.netto_omzet + r.netto_omzet,
          kosten: acc.kosten + r.kosten,
          brutowinst: acc.brutowinst + r.brutowinst,
        }),
        { deals: 0, aankoopwaarde: 0, bruto_commissie: 0, makelaar_commissie: 0, partner_commissie: 0, netto_omzet: 0, kosten: 0, brutowinst: 0 }
      ),
    [rows]
  )

  const margePct = totaal.bruto_commissie > 0
    ? (totaal.netto_omzet / totaal.bruto_commissie) * 100
    : 0

  // Chart-data voor stacked area (zelfde rows, maar in FinChartData shape)
  const chartData = useMemo(
    () =>
      rows.map(r => ({
        maand: MAANDEN[r.maand - 1],
        omzet: r.netto_omzet,
        kosten: r.kosten,
        winst: r.brutowinst,
        cumulatief: r.cumulatief,
        deals: r.deals,
      })),
    [rows]
  )

  const sparkOmzet = useMemo(() => rows.map(r => r.netto_omzet), [rows])
  const sparkWinst = useMemo(() => rows.map(r => r.brutowinst), [rows])

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title={`Winst & Verlies ${jaar}`}
          subtitle="Volledige P&L-opbouw — netto omzet minus kosten, per maand."
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid>
              <FinKpiHero
                label="Netto omzet YTD"
                value={formatEuro(totaal.netto_omzet)}
                sub={`${formatEuro(totaal.bruto_commissie)} bruto commissie`}
                spark={sparkOmzet}
              />
              <FinKpi
                label="Kosten YTD"
                value={formatEuro(totaal.kosten)}
                sub="alle maandkosten"
                tone="negative"
              />
              <FinKpi
                label="Brutowinst YTD"
                value={formatEuro(totaal.brutowinst)}
                sub={`${margePct.toFixed(1)}% marge`}
                tone={totaal.brutowinst >= 0 ? 'positive' : 'negative'}
                spark={sparkWinst}
              />
            </FinKpiGrid>

            <FinChartCard title="Omzet, kosten & winst" period={`${jaar}`}>
              <FinStackedAreaChart data={chartData} />
            </FinChartCard>

            {/* Dense P&L grid — line-items × 12 maanden */}
            <FinSection title="P&L per maand" meta={`${jaar}`}>
              <div className="fin-pl-table-wrap">
                <table className="fin-pl-table">
                  <thead>
                    <tr>
                      <th className="sticky">Omschrijving</th>
                      {MAANDEN.map(m => (
                        <th key={m} className="num">{m}</th>
                      ))}
                      <th className="num total">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SectionHeader label="Omzet" />
                    <DataRow label="Aantal sales" values={rows.map(r => r.deals || null)} totaal={totaal.deals} format="getal" />
                    <DataRow label="Aankoopwaarde" values={rows.map(r => r.aankoopwaarde || null)} totaal={totaal.aankoopwaarde} />
                    <DataRow label="Bruto commissie" values={rows.map(r => r.bruto_commissie || null)} totaal={totaal.bruto_commissie} />
                    <DataRow label="− Consultant commissie" values={rows.map(r => r.makelaar_commissie || null)} totaal={totaal.makelaar_commissie} muted />
                    <DataRow label="− Partner commissie" values={rows.map(r => r.partner_commissie || null)} totaal={totaal.partner_commissie} muted />
                    <DataRow label="Netto omzet CS" values={rows.map(r => r.netto_omzet || null)} totaal={totaal.netto_omzet} bold accent="deepsea" />

                    <SectionHeader label="Kosten" />
                    <DataRow label="Totale maandkosten" values={rows.map(r => r.kosten || null)} totaal={totaal.kosten} accent="negative" />

                    <SectionHeader label="Resultaat" />
                    <DataRow
                      label="Brutowinst"
                      values={rows.map(r => r.brutowinst || null)}
                      totaal={totaal.brutowinst}
                      bold
                      colorByValue
                    />
                    <tr className="muted">
                      <td className="sticky">Winstmarge %</td>
                      {rows.map((r, i) => (
                        <td key={i} className="num">
                          {r.netto_omzet > 0 ? `${r.marge_pct.toFixed(0)}%` : '—'}
                        </td>
                      ))}
                      <td className="num total">{margePct > 0 ? `${margePct.toFixed(0)}%` : '—'}</td>
                    </tr>
                    <tr className="cumulatief">
                      <td className="sticky">Cumulatief</td>
                      {rows.map((r, i) => (
                        <td key={i} className={`num ${r.cumulatief >= 0 ? 'pos' : 'neg'}`}>
                          {r.cumulatief !== 0 ? formatEuro(r.cumulatief) : '—'}
                        </td>
                      ))}
                      <td className={`num total ${totaal.brutowinst >= 0 ? 'pos' : 'neg'}`}>
                        {formatEuro(totaal.brutowinst)}
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

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="section">
      <td colSpan={14} className="sticky">{label}</td>
    </tr>
  )
}

function DataRow({
  label,
  values,
  totaal,
  bold,
  muted,
  accent,
  colorByValue,
  format = 'euro',
}: {
  label: string
  values: (number | null)[]
  totaal: number
  bold?: boolean
  muted?: boolean
  accent?: 'deepsea' | 'negative'
  colorByValue?: boolean
  format?: 'euro' | 'getal'
}) {
  const fmt = (v: number | null) => {
    if (v == null || v === 0) return '—'
    return format === 'euro' ? formatEuro(v) : String(v)
  }
  const cls = [
    bold ? 'bold' : '',
    muted ? 'muted' : '',
    accent === 'deepsea' ? 'accent-deepsea' : '',
    accent === 'negative' ? 'accent-neg' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr className={cls}>
      <td className="sticky">{label}</td>
      {values.map((v, i) => {
        const dyn = colorByValue && v != null ? (v >= 0 ? 'pos' : 'neg') : ''
        return (
          <td key={i} className={`num ${dyn}`}>
            {fmt(v)}
          </td>
        )
      })}
      <td className={`num total ${colorByValue ? (totaal >= 0 ? 'pos' : 'neg') : ''}`}>
        {fmt(totaal)}
      </td>
    </tr>
  )
}
