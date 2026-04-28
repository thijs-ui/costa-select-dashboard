'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { Building2, Users, TrendingUp, Euro } from 'lucide-react'
import { normalizeRegio, formatEuro } from '@/lib/calculations'
import Link from 'next/link'
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
  person_name: string | null
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

function PctBadge({ value, good = 20 }: { value: number | null; good?: number }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>
  const color = value >= good ? 'bg-green-100 text-green-700' : value >= good / 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}%</span>
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
      const { data } = await supabase.from('deals').select('regio, aankoopprijs, bruto_commissie, datum_passering')
      setGeslotenDeals((data ?? []) as GeslotenDeal[])
      const [pdDealsRes, pdLeadsRes] = await Promise.allSettled([
        fetch('/api/pipedrive/open-deals', { cache: 'no-store' }),
        fetch('/api/pipedrive/leads', { cache: 'no-store' }),
      ])
      if (pdDealsRes.status === 'fulfilled' && pdDealsRes.value.ok) {
        const json = await pdDealsRes.value.json()
        setPipedriveDeals((json.allDeals ?? []).filter((d: PipedriveDealRow) => d.status === 'open'))
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

  useEffect(() => { load() }, [load])

  const dateRange = getDateRange(datePreset)

  const filteredGesloten = geslotenDeals.filter(d => isInRange(d.datum_passering, dateRange))
  const allOpenDeals = pipedriveDeals.filter(d => d.status === 'open')
  const filteredOpenDeals = allOpenDeals.filter(d => isInRange(d.add_time, dateRange))
  const filteredLeads = pipedriveLeads.filter(l => isInRange(l.add_time, dateRange))

  const regularOpenDeals = filteredOpenDeals.filter(d => !isAfhandeling(d.regio))
  const afhandelingDeals = allOpenDeals.filter(d => isAfhandeling(d.regio))

  // Build per-regio stats
  const regioMap = new Map<string, RegioStats>()
  const ensureRegio = (regio: string) => {
    if (!regioMap.has(regio)) {
      regioMap.set(regio, { regio, geslotenDeals: 0, openDeals: 0, leads: 0, omzet: 0, commissie: 0 })
    }
    return regioMap.get(regio)!
  }

  for (const d of filteredGesloten) {
    const r = ensureRegio(normalizeRegio(d.regio))
    r.geslotenDeals++
    r.omzet += d.aankoopprijs ?? 0
    r.commissie += d.bruto_commissie ?? 0
  }
  for (const d of regularOpenDeals) ensureRegio(d.regio).openDeals++
  for (const l of filteredLeads) ensureRegio(l.regio).leads++

  const stats = Array.from(regioMap.values()).sort((a, b) => b.commissie - a.commissie || b.leads - a.leads)

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
  const grandTotals = {
    leads: totals.leads,
    openDeals: totals.openDeals + totalAfhandeling,
    geslotenDeals: totals.geslotenDeals,
    omzet: totals.omzet,
    commissie: totals.commissie,
  }

  // Funnel totals
  const totalLeads = filteredLeads.length
  const totalDeals = regularOpenDeals.length
  const totalSales = filteredGesloten.length
  const maxVal = Math.max(totalLeads, totalDeals + totalAfhandeling, totalSales, 1)

  const funnelSteps = [
    { label: 'Leads', value: totalLeads, color: 'bg-purple-500' },
    { label: 'Open deals', value: totalDeals, color: 'bg-blue-500' },
    { label: 'In afhandeling', value: totalAfhandeling, color: 'bg-amber-500' },
    { label: 'Sales', value: totalSales, color: 'bg-green-500' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regio&apos;s & Funnel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Prestaties en conversie per regio — alle entiteiten</p>
        </div>
        <DateFilter value={datePreset} onChange={setDatePreset} />
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Laden…</div>}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">{error}</div>}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard icon={<Users className="w-4 h-4" />} label="Leads in periode" value={String(totals.leads)} color="purple" />
            <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Open deals" value={String(totals.openDeals)} color="blue" />
            <SummaryCard icon={<Building2 className="w-4 h-4" />} label="Sales" value={String(totals.geslotenDeals)} color="green" />
            <SummaryCard icon={<Euro className="w-4 h-4" />} label="Bruto commissie" value={formatEuro(totals.commissie)} color="amber" />
          </div>

          {/* Funnel visualisatie */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversiefunnel</h2>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const width = maxVal > 0 ? Math.max((step.value / maxVal) * 100, step.value > 0 ? 4 : 0) : 0
                const conv = i === 1 ? pct(totalDeals, totalLeads) : i === 3 ? pct(totalSales, totalDeals + totalAfhandeling) : null
                return (
                  <div key={step.label}>
                    {i > 0 && (
                      <div className="flex items-center gap-2 my-1 ml-1">
                        <div className="w-px h-4 bg-gray-200 ml-3" />
                        {conv !== null && (
                          <span className="text-xs text-gray-400">
                            conversie: <span className={`font-semibold ${conv >= 20 ? 'text-green-600' : conv >= 10 ? 'text-amber-600' : 'text-red-500'}`}>{conv}%</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="w-28 text-right text-sm font-medium text-gray-600 shrink-0">{step.label}</div>
                      <div className="flex-1 relative h-10 bg-gray-50 rounded-lg overflow-hidden">
                        <div className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center px-3`} style={{ width: `${width}%` }}>
                          {step.value > 0 && <span className="text-white text-sm font-bold whitespace-nowrap">{step.value}</span>}
                        </div>
                        {step.value === 0 && <span className="absolute inset-0 flex items-center px-3 text-gray-400 text-sm">0</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex gap-6 text-sm flex-wrap">
              <div><span className="text-gray-400">Lead → Deal</span><span className="ml-2 font-semibold text-gray-800">{pct(totalDeals, totalLeads) ?? '—'}{pct(totalDeals, totalLeads) !== null ? '%' : ''}</span></div>
              <div><span className="text-gray-400">Deal → Sale</span><span className="ml-2 font-semibold text-gray-800">{pct(totalSales, totalDeals) ?? '—'}{pct(totalSales, totalDeals) !== null ? '%' : ''}</span></div>
              <div><span className="text-gray-400">Lead → Sale</span><span className="ml-2 font-semibold text-gray-800">{pct(totalSales, totalLeads) ?? '—'}{pct(totalSales, totalLeads) !== null ? '%' : ''}</span></div>
            </div>
          </div>

          {/* Per regio tabel */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Per regio</h2>
            </div>
            {stats.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Geen data gevonden voor deze periode.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-4 py-3 font-semibold">Regio</th>
                    <th className="text-right px-4 py-3 font-semibold text-purple-600">Leads</th>
                    <th className="text-right px-4 py-3 font-semibold text-blue-600">Open deals</th>
                    <th className="text-right px-4 py-3 font-semibold text-green-600">Sales</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Omzet</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Commissie</th>
                    <th className="text-right px-4 py-3 font-semibold">L→D</th>
                    <th className="text-right px-4 py-3 font-semibold">D→S</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((r, i) => (
                    <tr key={r.regio} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link href={`/regios/${encodeURIComponent(r.regio)}`} className="hover:text-blue-600 hover:underline">{r.regio}</Link>
                      </td>
                      <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{r.leads}</span></td>
                      <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{r.openDeals}</span></td>
                      <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{r.geslotenDeals}</span></td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatEuro(r.omzet)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatEuro(r.commissie)}
                        {totals.commissie > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">({Math.round((r.commissie / totals.commissie) * 100)}%)</span>}
                      </td>
                      <td className="px-4 py-3 text-right"><PctBadge value={pct(r.openDeals, r.leads)} good={20} /></td>
                      <td className="px-4 py-3 text-right"><PctBadge value={pct(r.geslotenDeals, r.openDeals)} good={30} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-700">Totaal</td>
                    <td className="px-4 py-3 text-right text-purple-700">{totals.leads}</td>
                    <td className="px-4 py-3 text-right text-blue-700">{totals.openDeals}</td>
                    <td className="px-4 py-3 text-right text-green-700">{totals.geslotenDeals}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatEuro(totals.omzet)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatEuro(totals.commissie)}</td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.openDeals, totals.leads)} good={20} /></td>
                    <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.geslotenDeals, totals.openDeals)} good={30} /></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* In afhandeling */}
          <AfhandelingSection deals={afhandelingDeals} />

          {/* Eindtotaal */}
          <div className="rounded-xl border border-gray-300 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Eindtotaal — alle pijplijnen</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-3 font-semibold">Overzicht</th>
                  <th className="text-right px-4 py-3 font-semibold text-purple-600">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold text-blue-600">Open deals</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-600">Sales</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Omzet</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Commissie</th>
                  <th className="text-right px-4 py-3 font-semibold">L→D</th>
                  <th className="text-right px-4 py-3 font-semibold">D→S</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white font-semibold">
                  <td className="px-4 py-3 text-gray-700">Alle regio&apos;s + afhandeling</td>
                  <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{grandTotals.leads}</span></td>
                  <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{grandTotals.openDeals}</span></td>
                  <td className="px-4 py-3 text-right"><span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{grandTotals.geslotenDeals}</span></td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatEuro(grandTotals.omzet)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatEuro(grandTotals.commissie)}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={pct(grandTotals.openDeals, grandTotals.leads)} good={20} /></td>
                  <td className="px-4 py-3 text-right"><PctBadge value={pct(grandTotals.geslotenDeals, grandTotals.openDeals)} good={30} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: 'green' | 'blue' | 'purple' | 'amber'
}) {
  const colors = { green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600' }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
