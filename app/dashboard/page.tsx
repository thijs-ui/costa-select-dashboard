'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Coins, Receipt, TrendingUp, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { berekenTargetStatus, formatEuro, getDagVanJaar, isMonthStarted, MAANDEN } from '@/lib/calculations'
import { type DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { matchesEntiteit, matchesEntity, useEntity } from '@/lib/entity'
import {
  FinChartCard,
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinKpiHero,
  FinPeriodPicker,
  FinSection,
  FinTargetBar,
} from '@/components/financieel/parts'
import { FinCumulatiefChart, FinOmzetChart } from '@/components/financieel/Charts'

interface DealRow {
  aankoopprijs: number
  bruto_commissie: number | null
  netto_commissie_cs: number | null
  datum_passering: string
  regio: string | null
}
interface KostenRow {
  bedrag: number
  jaar: number
  maand: number
  entiteit?: string
  kosten_posten?: { naam: string } | null
}
interface SettingRow { key: string; value: unknown }

const AD_POSTEN = ['Google Ads', 'Meta Ads (Facebook/Instagram)', 'LinkedIn Ads']
// Afspraak-types die we groeperen: NL & Teams (digitaal/lokaal NL) vs Spanje
// (fysiek bezoek). Dedup gebeurt op lead_naam zodat één persoon die zowel
// in NL als in Spanje is geweest in elke categorie 1× telt — en exact die
// overlap is de NL→ES conversie.
const TYPES_NL_TEAMS = ['Bezoek Nederland', 'Afspraak Teams']
const TYPES_SPANJE = ['Bezoek Spanje']

function normalizeLeadKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

export default function DashboardPage() {
  const { entity, setEntity } = useEntity()
  const [deals, setDeals] = useState<DealRow[]>([])
  const [maandkosten, setMaandkosten] = useState<KostenRow[]>([])
  const [targets, setTargets] = useState({ deals_2026: 20, netto_omzet_2026: 200000 })
  const [leads, setLeads] = useState<{ regio: string; add_time: string }[]>([])
  const [afspraken, setAfspraken] = useState<
    { bron: string | null; datum: string; regio: string | null; type: string | null; lead_naam: string | null }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  useEffect(() => {
    async function load() {
      try {
        const [dealsRes, kostenRes, settingsRes, leadsRes, afsprakenRes] = await Promise.allSettled([
          supabase.from('deals').select('aankoopprijs, bruto_commissie, netto_commissie_cs, datum_passering, regio'),
          supabase.from('maandkosten').select('bedrag, jaar, maand, entiteit, kosten_posten(naam)'),
          supabase.from('settings').select('key, value'),
          fetch('/api/pipedrive/leads', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
          supabase.from('afspraken').select('bron, datum, regio, type, lead_naam'),
        ])
        const dealsData = dealsRes.status === 'fulfilled' ? (dealsRes.value.data ?? []) : []
        const kostenData = kostenRes.status === 'fulfilled' ? (kostenRes.value.data ?? []) : []
        const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value.data ?? []) : []
        const leadsData = leadsRes.status === 'fulfilled' ? (leadsRes.value ?? null) : null
        const afsprakenData = afsprakenRes.status === 'fulfilled' ? (afsprakenRes.value.data ?? []) : []
        setDeals(dealsData as DealRow[])
        setMaandkosten(kostenData as unknown as KostenRow[])
        if (leadsData?.leads) setLeads(leadsData.leads as { regio: string; add_time: string }[])
        setAfspraken(
          afsprakenData as { bron: string | null; datum: string; regio: string | null; type: string | null; lead_naam: string | null }[]
        )
        const map: Record<string, unknown> = {}
        ;(settingsData as SettingRow[]).forEach(r => {
          map[r.key] = r.value
        })
        if (map.targets) setTargets(map.targets as typeof targets)
      } catch (e) {
        console.error('[load] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const computed = useMemo(() => {
    const entityDeals = deals.filter(d => matchesEntity(d.regio, entity))
    const filteredDeals = entityDeals.filter(d => isInRange(d.datum_passering, range))
    const totaalDeals = filteredDeals.length
    const totaalAankoopwaarde = filteredDeals.reduce((s, d) => s + Number(d.aankoopprijs), 0)
    const brutoCommissie = filteredDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
    const nettoOmzet = filteredDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)

    const entityKosten = maandkosten.filter(k => matchesEntiteit(k.entiteit, entity))
    // isMonthStarted: maand telt mee vanaf de 1e (lopende maand inclusief).
    // Toekomstige maanden uitgesloten — recurring kosten staan al voor de
    // volledige kalender in de DB, geprojecteerd meetellen geeft een
    // vertekend YTD-beeld.
    const filteredKosten = entityKosten.filter(k =>
      isInRange(`${k.jaar}-${String(k.maand).padStart(2, '0')}-01`, range)
      && isMonthStarted(k.jaar, k.maand)
    )
    const kostenPeriode = filteredKosten.reduce((s, k) => s + Number(k.bedrag), 0)
    const brutowinst = nettoOmzet - kostenPeriode

    const filteredLeads = leads.filter(l => matchesEntity(l.regio, entity) && isInRange(l.add_time, range))
    const totaalAdSpend = entityKosten
      .filter(k => AD_POSTEN.includes(k.kosten_posten?.naam ?? ''))
      .filter(k =>
        isInRange(`${k.jaar}-${String(k.maand).padStart(2, '0')}-01`, range)
        && isMonthStarted(k.jaar, k.maand)
      )
      .reduce((s, k) => s + Number(k.bedrag), 0)

    const filteredAfspraken = afspraken.filter(
      a => matchesEntity(a.regio, entity) && isInRange(a.datum, range)
    )
    const totaalAfspraken = filteredAfspraken.length
    const klantReferrals = filteredAfspraken.filter(a => a.bron === 'Referentie van klant').length
    const partnerReferrals = filteredAfspraken.filter(a => a.bron === 'Referentie van partner').length
    const klantReferralPct = totaalAfspraken > 0 ? Math.round((klantReferrals / totaalAfspraken) * 100) : null
    const partnerReferralPct = totaalAfspraken > 0 ? Math.round((partnerReferrals / totaalAfspraken) * 100) : null

    // NL+Teams vs Spanje, gededupt op lead-naam zodat overlap meetbaar is
    const leadsNlTeams = new Set<string>()
    const leadsSpanje = new Set<string>()
    for (const a of filteredAfspraken) {
      const key = normalizeLeadKey(a.lead_naam)
      if (!key) continue
      if (TYPES_NL_TEAMS.includes(a.type ?? '')) leadsNlTeams.add(key)
      else if (TYPES_SPANJE.includes(a.type ?? '')) leadsSpanje.add(key)
    }
    let nlNaarEsCount = 0
    leadsNlTeams.forEach(k => { if (leadsSpanje.has(k)) nlNaarEsCount++ })
    const nlNaarEsPct = leadsNlTeams.size > 0
      ? Math.round((nlNaarEsCount / leadsNlTeams.size) * 100)
      : null
    const afsprakenNlTeams = leadsNlTeams.size
    const afsprakenSpanje = leadsSpanje.size

    const gemAankoopprijs = totaalDeals > 0 ? totaalAankoopwaarde / totaalDeals : 0
    const gemBrutoCommissie = totaalDeals > 0 ? brutoCommissie / totaalDeals : 0
    const nettoMarge = brutoCommissie > 0 ? (nettoOmzet / brutoCommissie) * 100 : 0

    return {
      entityDeals,
      entityKosten,
      filteredLeads,
      totaalDeals,
      totaalAankoopwaarde,
      brutoCommissie,
      nettoOmzet,
      kostenPeriode,
      brutowinst,
      totaalAdSpend,
      klantReferrals,
      partnerReferrals,
      klantReferralPct,
      partnerReferralPct,
      totaalAfspraken,
      afsprakenNlTeams,
      afsprakenSpanje,
      nlNaarEsCount,
      nlNaarEsPct,
      gemAankoopprijs,
      gemBrutoCommissie,
      nettoMarge,
    }
  }, [deals, maandkosten, leads, afspraken, entity, range])

  // Targets — altijd op jaarbasis
  const dagVanJaar = getDagVanJaar()
  const jaarDeals = computed.entityDeals.filter(
    d => new Date(d.datum_passering).getFullYear() === new Date().getFullYear()
  )
  const targetStatus = berekenTargetStatus(jaarDeals.length, targets.deals_2026, dagVanJaar)
  const jaarOmzet = jaarDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)
  const omzetPct =
    targets.netto_omzet_2026 > 0 ? Math.min(100, (jaarOmzet / targets.netto_omzet_2026) * 100) : 0

  // Chart data — altijd huidig jaar (voor jaaroverzicht)
  const chartJaar = range.from ? range.from.getFullYear() : new Date().getFullYear()
  const chartData = useMemo(() => {
    const kostenPerMaand: Record<number, number> = {}
    computed.entityKosten
      .filter(k => k.jaar === chartJaar && isMonthStarted(k.jaar, k.maand))
      .forEach(k => {
        kostenPerMaand[k.maand] = (kostenPerMaand[k.maand] ?? 0) + Number(k.bedrag)
      })
    const jaarDealsChart = computed.entityDeals.filter(
      d => new Date(d.datum_passering).getFullYear() === chartJaar
    )
    const monthly = MAANDEN.map((label, i) => {
      const maandDeals = jaarDealsChart.filter(d => new Date(d.datum_passering).getMonth() === i)
      const omzet = maandDeals.reduce((s, d) => s + Number(d.netto_commissie_cs ?? 0), 0)
      const kosten = kostenPerMaand[i + 1] ?? 0
      const winst = omzet - kosten
      return { maand: label, omzet, kosten, winst, deals: maandDeals.length }
    })
    return monthly.reduce<
      { maand: string; omzet: number; kosten: number; winst: number; cumulatief: number; deals: number }[]
    >((acc, row) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulatief : 0
      acc.push({ ...row, cumulatief: prev + row.winst })
      return acc
    }, [])
  }, [computed.entityKosten, computed.entityDeals, chartJaar])

  const filteredChartData = useMemo(
    () =>
      chartData.filter((_, i) => {
        const localStr = `${chartJaar}-${String(i + 1).padStart(2, '0')}-01`
        return isInRange(localStr, range)
      }),
    [chartData, chartJaar, range]
  )

  const monthRowsTotals = useMemo(
    () => ({
      deals: filteredChartData.reduce((s, r) => s + r.deals, 0),
      omzet: filteredChartData.reduce((s, r) => s + r.omzet, 0),
      kosten: filteredChartData.reduce((s, r) => s + r.kosten, 0),
      winst: filteredChartData.reduce((s, r) => s + r.winst, 0),
    }),
    [filteredChartData]
  )

  // Sparklines (12 punten op chart-jaar)
  const sparkSales = useMemo(() => chartData.map(r => r.deals), [chartData])
  const sparkOmzet = useMemo(() => chartData.map(r => r.omzet), [chartData])
  const sparkWinst = useMemo(() => chartData.map(r => r.winst), [chartData])

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader title="Financieel overzicht" subtitle="Jouw kerncijfers, gefilterd op entiteit en periode.">
          <FinEntitySwitch value={entity} onChange={setEntity} />
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            {/* Hero KPI's — netto omzet is de hero (deepsea, 2-col span) */}
            <FinKpiGrid>
              <FinKpiHero
                label="Netto omzet CS"
                value={formatEuro(computed.nettoOmzet)}
                sub={`${formatEuro(computed.brutoCommissie)} bruto · ${range.label}`}
                spark={sparkOmzet}
              />
              <FinKpi
                label="Sales"
                value={computed.totaalDeals}
                sub={range.label}
                tone="accent"
                spark={sparkSales}
              />
              <FinKpi
                label="Brutowinst"
                value={formatEuro(computed.brutowinst)}
                sub="netto omzet − kosten"
                tone={computed.brutowinst >= 0 ? 'positive' : 'negative'}
                spark={sparkWinst}
              />
            </FinKpiGrid>

            {/* Targets — altijd jaarbasis */}
            <FinSection
              title={`Targets & prognose ${new Date().getFullYear()}`}
              meta="jaardoelstelling"
            >
              <FinTargetBar
                label="Sales"
                pct={targetStatus.pct}
                vals={
                  <>
                    <strong>{jaarDeals.length}</strong> van {targets.deals_2026} sales
                  </>
                }
                foot={`Prognose: ${targetStatus.prognose} sales eind jaar`}
              />
              <FinTargetBar
                label="Netto omzet"
                pct={omzetPct}
                variant="sun"
                vals={
                  <>
                    <strong>{formatEuro(jaarOmzet)}</strong> van {formatEuro(targets.netto_omzet_2026)}
                  </>
                }
                foot={`${omzetPct.toFixed(0)}% van het jaartarget`}
              />
            </FinSection>

            {/* Charts */}
            <div className="fin-charts">
              <FinChartCard title="Omzet & kosten per maand" period={`${chartJaar}`}>
                <FinOmzetChart data={chartData} />
              </FinChartCard>
              <FinChartCard title="Cumulatief resultaat" period={`${chartJaar}`}>
                <FinCumulatiefChart data={chartData} />
              </FinChartCard>
            </div>

            {/* Sub KPI's — bruto omzet eerst, dan aankoop-stats */}
            <FinKpiGrid>
              <FinKpi
                label="Bruto omzet"
                value={formatEuro(computed.brutoCommissie)}
                sub="totale commissie vóór afdrachten"
              />
              <FinKpi
                label="Aankoopwaarde"
                value={formatEuro(computed.totaalAankoopwaarde)}
                sub={`${computed.totaalDeals} ${computed.totaalDeals === 1 ? 'sale' : 'sales'}`}
              />
              <FinKpi
                label="Gem. aankoopprijs"
                value={formatEuro(computed.gemAankoopprijs)}
                sub="per sale"
              />
              <FinKpi
                label="Netto marge"
                value={`${computed.nettoMarge.toFixed(1)}%`}
                sub="netto omzet / bruto commissie"
              />
            </FinKpiGrid>

            <FinKpiGrid cols={3}>
              <FinKpi
                label="Kosten periode"
                value={formatEuro(computed.kostenPeriode)}
                sub="alle maandkosten"
                icon={Receipt}
                tone="negative"
              />
              <FinKpi
                label="Ad spend"
                value={formatEuro(computed.totaalAdSpend)}
                sub="Google + Meta + LinkedIn"
                icon={TrendingUp}
              />
              <FinKpi
                label="Cost per sale"
                value={
                  computed.totaalDeals > 0 && computed.totaalAdSpend > 0
                    ? formatEuro(computed.totaalAdSpend / computed.totaalDeals)
                    : '—'
                }
                sub={`${computed.totaalDeals} sales · ${computed.filteredLeads.length} leads`}
                icon={Coins}
              />
            </FinKpiGrid>

            <FinKpiGrid cols={3}>
              <FinKpi
                label="Afspraken NL & Teams"
                value={computed.afsprakenNlTeams}
                sub={`unieke leads · ${range.label}`}
                icon={Users}
              />
              <FinKpi
                label="Afspraken Spanje"
                value={computed.afsprakenSpanje}
                sub={`unieke leads · ${range.label}`}
                icon={Users}
                tone="accent"
              />
              <FinKpi
                label="Conversie NL → ES"
                value={computed.nlNaarEsPct != null ? `${computed.nlNaarEsPct}%` : '—'}
                sub={`${computed.nlNaarEsCount} van ${computed.afsprakenNlTeams} doorgegaan naar Spanje`}
                tone={computed.nlNaarEsPct != null && computed.nlNaarEsPct >= 50 ? 'positive' : undefined}
              />
            </FinKpiGrid>

            <FinKpiGrid cols={3}>
              <FinKpi
                label="Klant-referrals"
                value={computed.klantReferralPct != null ? `${computed.klantReferralPct}%` : '—'}
                sub={`${computed.klantReferrals} van ${computed.totaalAfspraken} afspraken`}
                icon={Users}
              />
              <FinKpi
                label="Partner-referrals"
                value={computed.partnerReferralPct != null ? `${computed.partnerReferralPct}%` : '—'}
                sub={`${computed.partnerReferrals} van ${computed.totaalAfspraken} afspraken`}
                icon={Users}
              />
              <FinKpi
                label="Totaal referrals"
                value={String(computed.klantReferrals + computed.partnerReferrals)}
                sub={
                  computed.klantReferralPct != null && computed.partnerReferralPct != null
                    ? `${computed.klantReferralPct + computed.partnerReferralPct}% van afspraken`
                    : '—'
                }
                icon={CheckCircle2}
              />
            </FinKpiGrid>

            {/* Maandoverzicht */}
            <FinSection title="Maandoverzicht" meta={range.label}>
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Maand</th>
                      <th className="num">Sales</th>
                      <th className="num">Netto omzet</th>
                      <th className="num">Kosten</th>
                      <th className="num">Winst</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChartData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '24px' }}>
                          Geen data voor deze periode
                        </td>
                      </tr>
                    )}
                    {filteredChartData.map(row => (
                      <tr key={row.maand}>
                        <td>{row.maand}</td>
                        <td className="num">{row.deals || '—'}</td>
                        <td className="num">{row.omzet > 0 ? formatEuro(row.omzet) : '—'}</td>
                        <td className="num">{row.kosten > 0 ? formatEuro(row.kosten) : '—'}</td>
                        <td
                          className={`num ${
                            row.winst > 0 ? 'positive' : row.winst < 0 ? 'negative' : 'muted'
                          }`}
                        >
                          {row.omzet > 0 || row.kosten > 0 ? formatEuro(row.winst) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filteredChartData.length > 0 && (
                    <tfoot>
                      <tr>
                        <td>Totaal</td>
                        <td className="num">{monthRowsTotals.deals}</td>
                        <td className="num">{formatEuro(monthRowsTotals.omzet)}</td>
                        <td className="num">{formatEuro(monthRowsTotals.kosten)}</td>
                        <td className="num">{formatEuro(monthRowsTotals.winst)}</td>
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
