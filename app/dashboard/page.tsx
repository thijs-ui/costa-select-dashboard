'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import KpiCard from '@/components/kpi-card'
import DateFilter from '@/components/date-filter'
import { formatEuro, MAANDEN, berekenTargetStatus, getDagVanJaar } from '@/lib/calculations'
import { DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { useEntity, matchesEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'
import DashboardClient from './dashboard-client'

interface DealRow {
  aankoopprijs: number
  bruto_commissie: number | null
  netto_commissie_cs: number | null
  datum_passering: string
  regio: string | null
}
interface KostenRow { bedrag: number; jaar: number; maand: number; entiteit?: string; kosten_posten?: { naam: string } | null }

const AD_POSTEN = ['Google Ads', 'Meta Ads (Facebook/Instagram)', 'LinkedIn Ads']

export default function DashboardPage() {
  const { entity, setEntity } = useEntity()
  const [deals, setDeals] = useState<DealRow[]>([])
  const [maandkosten, setMaandkosten] = useState<KostenRow[]>([])
  const [targets, setTargets] = useState({ deals_2026: 20, netto_omzet_2026: 200000 })
  const [leads, setLeads] = useState<{ regio: string; add_time: string }[]>([])
  const [afspraken, setAfspraken] = useState<{ bron: string | null; datum: string; regio: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  useEffect(() => {
    async function load() {
      const [dealsRes, kostenRes, settingsRes, leadsRes, afsprakenRes] = await Promise.all([
        supabase.from('deals').select('aankoopprijs, bruto_commissie, netto_commissie_cs, datum_passering, regio'),
        supabase.from('maandkosten').select('bedrag, jaar, maand, entiteit, kosten_posten(naam)'),
        supabase.from('settings').select('key, value'),
        fetch('/api/pipedrive/leads').then(r => r.ok ? r.json() : null).catch(() => null),
        supabase.from('afspraken').select('bron, datum, regio'),
      ])
      setDeals((dealsRes.data ?? []) as DealRow[])
      setMaandkosten((kostenRes.data ?? []) as unknown as KostenRow[])
      if (leadsRes?.leads) setLeads(leadsRes.leads as { regio: string; add_time: string }[])
      setAfspraken((afsprakenRes.data ?? []) as { bron: string | null; datum: string; regio: string | null }[])
      const map: Record<string, unknown> = {}
      ;(settingsRes.data ?? [] as { key: string; value: unknown }[]).forEach((r: { key: string; value: unknown }) => { map[r.key] = r.value })
      if (map.targets) setTargets(map.targets as typeof targets)
      setLoading(false)
    }
    load()
  }, [])

  const range = getDateRange(datePreset)

  // Deals gefilterd op entiteit en geselecteerde periode
  const entityDeals = deals.filter((d) => matchesEntity(d.regio, entity))
  const filteredDeals = entityDeals.filter((d) => isInRange(d.datum_passering, range))
  const totaalDeals = filteredDeals.length
  const totaalAankoopwaarde = filteredDeals.reduce((s, d) => s + Number(d.aankoopprijs), 0)
  const brutoCommissie = filteredDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
  const nettoOmzet = filteredDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)

  // Kosten gefilterd op entiteit en periode
  const entityKosten = maandkosten.filter((k) => (k.entiteit ?? 'overig') === entity)
  const filteredKosten = entityKosten.filter((k) => {
    const localStr = `${k.jaar}-${String(k.maand).padStart(2, '0')}-01`
    return isInRange(localStr, range)
  })
  const kostenPeriode = filteredKosten.reduce((s, k) => s + Number(k.bedrag), 0)
  const brutowinst = nettoOmzet - kostenPeriode

  // Leads gefilterd op entiteit + periode
  const filteredLeads = leads.filter(l =>
    matchesEntity(l.regio, entity) && isInRange(l.add_time, range)
  )

  // Ad spend gefilterd op entiteit + periode
  const totaalAdSpend = maandkosten
    .filter(k => (k.entiteit ?? 'overig') === entity)
    .filter(k => AD_POSTEN.includes(k.kosten_posten?.naam ?? ''))
    .filter(k => isInRange(`${k.jaar}-${String(k.maand).padStart(2, '0')}-01`, range))
    .reduce((s, k) => s + Number(k.bedrag), 0)

  // Referral KPI's — gefilterd op entiteit + periode
  const filteredAfspraken = afspraken.filter(a =>
    matchesEntity(a.regio, entity) && isInRange(a.datum, range)
  )
  const totaalAfspraken = filteredAfspraken.length
  const klantReferrals = filteredAfspraken.filter(a => a.bron === 'Referentie van klant').length
  const partnerReferrals = filteredAfspraken.filter(a => a.bron === 'Referentie van partner').length
  const klantReferralPct = totaalAfspraken > 0 ? Math.round((klantReferrals / totaalAfspraken) * 100) : null
  const partnerReferralPct = totaalAfspraken > 0 ? Math.round((partnerReferrals / totaalAfspraken) * 100) : null

  const gemAankoopprijs = totaalDeals > 0 ? totaalAankoopwaarde / totaalDeals : 0
  const gemBrutoCommissie = totaalDeals > 0 ? brutoCommissie / totaalDeals : 0
  const nettoMarge = brutoCommissie > 0 ? (nettoOmzet / brutoCommissie) * 100 : 0

  // Targets (altijd op jaarbasis, gefilterd op entiteit)
  const dagVanJaar = getDagVanJaar()
  const jaarDeals = entityDeals.filter((d) => new Date(d.datum_passering).getFullYear() === new Date().getFullYear())
  const targetStatus = berekenTargetStatus(jaarDeals.length, targets.deals_2026, dagVanJaar)
  const omzetPct = Math.min(100, targets.netto_omzet_2026 > 0
    ? (jaarDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0) / targets.netto_omzet_2026) * 100 : 0)

  // Chart altijd huidig jaar (maandoverzicht), gefilterd op entiteit
  const chartJaar = range.from ? range.from.getFullYear() : new Date().getFullYear()
  const kostenPerMaand: Record<number, number> = {}
  entityKosten.filter((k) => k.jaar === chartJaar).forEach((k) => {
    kostenPerMaand[k.maand] = (kostenPerMaand[k.maand] ?? 0) + Number(k.bedrag)
  })
  const jaarDealsVoorChart = entityDeals.filter((d) => new Date(d.datum_passering).getFullYear() === chartJaar)
  let cumulatief = 0
  const chartData = MAANDEN.map((label, i) => {
    const maandDeals = jaarDealsVoorChart.filter((d) => new Date(d.datum_passering).getMonth() === i)
    const omzet = maandDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)
    const kosten = kostenPerMaand[i + 1] ?? 0
    const winst = omzet - kosten
    cumulatief += winst
    return { maand: label, omzet, kosten, winst, cumulatief, deals: maandDeals.length }
  })

  // Maandoverzicht gefilterd op periode
  const filteredChartData = chartData.filter((_, i) => {
    const localStr = `${chartJaar}-${String(i + 1).padStart(2, '0')}-01`
    return isInRange(localStr, range)
  })

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div className="px-8 py-8 w-full">
      {/* Header + filter */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <EntitySwitch value={entity} onChange={setEntity} />
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* Kerngetallen rij 1 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <KpiCard label="Aantal sales" value={totaalDeals} sub={range.label} />
        <KpiCard label="Totale aankoopwaarde" value={formatEuro(totaalAankoopwaarde)} sub="alle sales" />
        <KpiCard label="Bruto commissie" value={formatEuro(brutoCommissie)} sub="incl. makelaar & partner" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <KpiCard label="Netto omzet CS" value={formatEuro(nettoOmzet)} sub="na commissies" color="green" />
        <KpiCard label="Kosten periode" value={formatEuro(kostenPeriode)} color="red" />
        <KpiCard label="Brutowinst periode" value={formatEuro(brutowinst)}
          sub="netto omzet − kosten" color={brutowinst >= 0 ? 'green' : 'red'} />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Gem. aankoopprijs" value={formatEuro(gemAankoopprijs)} sub="per sale" />
        <KpiCard label="Gem. bruto commissie" value={formatEuro(gemBrutoCommissie)} sub="per sale" />
        <KpiCard label="Netto marge" value={`${nettoMarge.toFixed(1)}%`} sub="netto omzet / bruto commissie" />
      </div>

      {/* Acquisitiekosten */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard label="Ad spend" value={formatEuro(totaalAdSpend)} sub="Google + Meta + LinkedIn" />
        <KpiCard
          label="Cost per lead"
          value={filteredLeads.length > 0 && totaalAdSpend > 0 ? formatEuro(totaalAdSpend / filteredLeads.length) : '—'}
          sub={`${filteredLeads.length} leads in periode`}
        />
        <KpiCard
          label="Cost per sale"
          value={totaalDeals > 0 && totaalAdSpend > 0 ? formatEuro(totaalAdSpend / totaalDeals) : '—'}
          sub={`${totaalDeals} sales in periode`}
        />
      </div>

      {/* Referrals */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Klant-referrals"
          value={klantReferralPct !== null ? `${klantReferralPct}%` : '—'}
          sub={`${klantReferrals} van ${totaalAfspraken} afspraken`}
        />
        <KpiCard
          label="Partner-referrals"
          value={partnerReferralPct !== null ? `${partnerReferralPct}%` : '—'}
          sub={`${partnerReferrals} van ${totaalAfspraken} afspraken`}
        />
        <KpiCard
          label="Totaal referrals"
          value={String(klantReferrals + partnerReferrals)}
          sub={`${klantReferralPct !== null && partnerReferralPct !== null ? klantReferralPct + partnerReferralPct : '—'}% van alle afspraken`}
        />
      </div>

      {/* Targets — altijd op jaarbasis */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Targets & prognose {new Date().getFullYear()}
          <span className="ml-2 text-xs font-normal text-slate-400">(jaardoelstelling)</span>
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">{jaarDeals.length} van {targets.deals_2026} sales</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${targetStatus.onTrack ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {targetStatus.onTrack ? 'On track' : 'Achter schema'}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${targetStatus.pct}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Prognose: <span className="font-medium text-slate-600">{targetStatus.prognose} sales</span> eind jaar
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-600">
                {formatEuro(jaarDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0))} van {formatEuro(targets.netto_omzet_2026)} netto omzet
              </span>
              <span className="text-xs text-slate-400">{omzetPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${omzetPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <DashboardClient chartData={chartData} />

      {/* Maandoverzicht gefilterd */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Maandoverzicht</h2>
          <span className="text-xs text-slate-400">{range.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Maand', 'Sales', 'Netto omzet', 'Kosten', 'Winst'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredChartData.map((row) => (
                <tr key={row.maand} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{row.maand}</td>
                  <td className="px-4 py-2 text-slate-600">{row.deals || '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{row.omzet > 0 ? formatEuro(row.omzet) : '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{row.kosten > 0 ? formatEuro(row.kosten) : '—'}</td>
                  <td className={`px-4 py-2 font-medium ${row.winst > 0 ? 'text-green-600' : row.winst < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {row.omzet > 0 || row.kosten > 0 ? formatEuro(row.winst) : '—'}
                  </td>
                </tr>
              ))}
              {filteredChartData.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">Geen data voor deze periode</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
