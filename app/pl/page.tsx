'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import { useEntity, matchesEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'

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

export default function PLPage() {
  const { entity, setEntity } = useEntity()
  const [rows, setRows] = useState<MaandRow[]>([])
  const [loading, setLoading] = useState(true)
  const jaar = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      const [dealsRes, kostenRes] = await Promise.all([
        supabase.from('deals').select('datum_passering, aankoopprijs, bruto_commissie, makelaar_commissie, partner_commissie, netto_commissie_cs, regio'),
        supabase.from('maandkosten').select('maand, bedrag, entiteit').eq('jaar', jaar),
      ])

      const allDeals = (dealsRes.data ?? []) as Deal[]
      const allKosten = (kostenRes.data ?? []) as { maand: number; bedrag: number; entiteit?: string }[]

      const deals = allDeals.filter((d) => matchesEntity(d.regio, entity))
      const kostenData = allKosten.filter((k) => (k.entiteit ?? 'overig') === entity)

      const kostenPerMaand: Record<number, number> = {}
      kostenData.forEach((k) => {
        kostenPerMaand[k.maand] = (kostenPerMaand[k.maand] ?? 0) + Number(k.bedrag)
      })

      let cumulatief = 0
      const data: MaandRow[] = MAANDEN.map((_, i) => {
        const maand = i + 1
        const maandDeals = deals.filter(
          (d) => new Date(d.datum_passering).getMonth() === i &&
            new Date(d.datum_passering).getFullYear() === jaar
        )
        const bruto = maandDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
        const mak = maandDeals.reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0)
        const part = maandDeals.reduce((s, d) => s + Number(d.partner_commissie ?? 0), 0)
        const netto = maandDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)
        const kosten = kostenPerMaand[maand] ?? 0
        const winst = netto - kosten
        cumulatief += winst
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
          cumulatief,
        }
      })
      setRows(data)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity])

  const totaal = rows.reduce(
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
  )

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">P&L {jaar}</h1>
        <EntitySwitch value={entity} onChange={(e) => { setLoading(true); setEntity(e) }} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-3 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium sticky left-0 bg-slate-50 w-40">
                  Omschrijving
                </th>
                {MAANDEN.map((m) => (
                  <th key={m} className="text-right px-2 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium min-w-[80px]">
                    {m}
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium min-w-[90px]">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {/* OMZET SECTIE */}
              <SectionHeader label="OMZET" />
              <DataRow label="Aantal sales" values={rows.map((r) => r.deals || null)} totaal={totaal.deals} format="getal" />
              <DataRow label="Aankoopwaarde" values={rows.map((r) => r.aankoopwaarde || null)} totaal={totaal.aankoopwaarde} />
              <DataRow label="Bruto commissie" values={rows.map((r) => r.bruto_commissie || null)} totaal={totaal.bruto_commissie} />
              <DataRow label="− Makelaar commissie" values={rows.map((r) => r.makelaar_commissie || null)} totaal={totaal.makelaar_commissie} muted />
              <DataRow label="− Partner commissie" values={rows.map((r) => r.partner_commissie || null)} totaal={totaal.partner_commissie} muted />
              <DataRow
                label="Netto omzet CS"
                values={rows.map((r) => r.netto_omzet || null)}
                totaal={totaal.netto_omzet}
                bold
                color="blue"
              />

              {/* KOSTEN SECTIE */}
              <SectionHeader label="KOSTEN" />
              <DataRow label="Totale maandkosten" values={rows.map((r) => r.kosten || null)} totaal={totaal.kosten} color="red" />

              {/* RESULTAAT SECTIE */}
              <SectionHeader label="RESULTAAT" />
              <DataRow
                label="Brutowinst"
                values={rows.map((r) => r.brutowinst || null)}
                totaal={totaal.brutowinst}
                bold
                colorFn={(v) => (v >= 0 ? 'green' : 'red')}
              />
              <tr className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500 text-xs sticky left-0 bg-white">Winstmarge %</td>
                {rows.map((r, i) => (
                  <td key={i} className="px-2 py-2 text-right text-xs text-slate-500">
                    {r.netto_omzet > 0 ? `${r.marge_pct.toFixed(0)}%` : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-xs text-slate-500">
                  {totaal.netto_omzet > 0
                    ? `${((totaal.netto_omzet > 0 ? totaal.bruto_commissie > 0 ? (totaal.netto_omzet / totaal.bruto_commissie) * 100 : 0 : 0)).toFixed(0)}%`
                    : '—'}
                </td>
              </tr>
              <tr className="border-t border-slate-100 bg-slate-50/50">
                <td className="px-3 py-2 text-slate-600 font-medium text-xs sticky left-0 bg-slate-50/50">Cumulatief</td>
                {rows.map((r, i) => (
                  <td key={i} className={`px-2 py-2 text-right text-xs font-medium ${r.cumulatief >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.cumulatief !== 0 ? formatEuro(r.cumulatief) : '—'}
                  </td>
                ))}
                <td className={`px-3 py-2 text-right text-xs font-semibold ${totaal.brutowinst >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatEuro(totaal.brutowinst)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="border-t-2 border-slate-200 bg-slate-50">
      <td colSpan={14} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50">
        {label}
      </td>
    </tr>
  )
}

function DataRow({
  label,
  values,
  totaal,
  bold,
  muted,
  color,
  colorFn,
  format = 'euro',
}: {
  label: string
  values: (number | null)[]
  totaal: number
  bold?: boolean
  muted?: boolean
  color?: 'blue' | 'red' | 'green'
  colorFn?: (v: number) => 'green' | 'red'
  format?: 'euro' | 'getal'
}) {
  const fmt = (v: number | null) => {
    if (v === null || v === 0) return '—'
    return format === 'euro' ? formatEuro(v) : String(v)
  }
  const baseClass = bold ? 'font-semibold' : muted ? 'text-slate-400' : 'text-slate-600'
  const colorClass = color === 'blue' ? 'text-blue-600' : color === 'red' ? 'text-red-500' : color === 'green' ? 'text-green-600' : ''

  return (
    <tr className="border-t border-slate-50 hover:bg-slate-50/50">
      <td className={`px-3 py-1.5 sticky left-0 bg-white text-xs ${baseClass} ${colorClass}`}>{label}</td>
      {values.map((v, i) => {
        const dynColor = colorFn && v !== null ? colorFn(v) : null
        return (
          <td key={i} className={`px-2 py-1.5 text-right text-xs whitespace-nowrap
            ${dynColor === 'green' ? 'text-green-600 font-medium' : dynColor === 'red' ? 'text-red-600 font-medium' : baseClass} ${colorClass}`}>
            {fmt(v)}
          </td>
        )
      })}
      <td className={`px-3 py-1.5 text-right text-xs font-semibold whitespace-nowrap
        ${colorFn ? (totaal >= 0 ? 'text-green-600' : 'text-red-600') : `${baseClass} ${colorClass}`}`}>
        {fmt(totaal)}
      </td>
    </tr>
  )
}
