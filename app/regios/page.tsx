'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { Building2, Users, TrendingUp, Euro } from 'lucide-react'

interface GeslotenDeal {
  regio: string | null
  aankoopprijs: number
  bruto_commissie: number
  datum_passering: string
}

interface PipedriveDealRow {
  id: number
  regio: string
  status: string
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

function formatEuro(val: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
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

      // Open deals + leads from Pipedrive in parallel
      const [pdDealsRes, pdLeadsRes] = await Promise.all([
        fetch('/api/pipedrive/open-deals'),
        fetch('/api/pipedrive/leads'),
      ])
      if (pdDealsRes.ok) {
        const json = await pdDealsRes.json()
        setPipedriveDeals((json.allDeals ?? []).filter((d: PipedriveDealRow) => d.status === 'open'))
      }
      if (pdLeadsRes.ok) {
        const json = await pdLeadsRes.json()
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
  const filteredOpenDeals = pipedriveDeals.filter(d => d.status === 'open' && isInRange(d.add_time, dateRange))
  const filteredLeads = pipedriveLeads.filter(l => isInRange(l.add_time, dateRange))

  // Build per-regio stats
  const regioMap = new Map<string, RegioStats>()

  const ensureRegio = (regio: string) => {
    if (!regioMap.has(regio)) {
      regioMap.set(regio, { regio, geslotenDeals: 0, openDeals: 0, leads: 0, omzet: 0, commissie: 0 })
    }
    return regioMap.get(regio)!
  }

  for (const d of filteredGesloten) {
    const r = ensureRegio(d.regio ?? 'Onbekend')
    r.geslotenDeals++
    r.omzet += d.aankoopprijs ?? 0
    r.commissie += d.bruto_commissie ?? 0
  }

  for (const d of filteredOpenDeals) {
    ensureRegio(d.regio).openDeals++
  }

  for (const l of filteredLeads) {
    ensureRegio(l.regio).leads++
  }

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Regio&apos;s</h1>
          <p className="text-sm text-gray-500 mt-0.5">Prestaties per regio — alle entiteiten</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

{loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Laden…</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <SummaryCard icon={<Users className="w-4 h-4" />} label="Leads in periode" value={String(totals.leads)} color="purple" />
            <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Open deals" value={String(totals.openDeals)} color="blue" />
            <SummaryCard icon={<Building2 className="w-4 h-4" />} label="Sales" value={String(totals.geslotenDeals)} color="green" />
            <SummaryCard icon={<Euro className="w-4 h-4" />} label="Bruto commissie" value={formatEuro(totals.commissie)} color="amber" />
          </div>


          {/* Per-regio table */}
          {stats.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Geen data gevonden voor deze entiteit.</div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Regio</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      <span className="flex items-center justify-end gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Leads
                      </span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      <span className="flex items-center justify-end gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Open deals
                      </span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      <span className="flex items-center justify-end gap-1.5">
                        <Building2 className="w-3.5 h-3.5" /> Sales
                      </span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      <span className="flex items-center justify-end gap-1.5">
                        <Euro className="w-3.5 h-3.5" /> Omzet
                      </span>
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">
                      <span className="flex items-center justify-end gap-1.5">
                        <Euro className="w-3.5 h-3.5" /> Commissie
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((r, i) => (
                    <tr
                      key={r.regio}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{r.regio}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {r.leads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {r.openDeals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {r.geslotenDeals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatEuro(r.omzet)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatEuro(r.commissie)}
                        {totals.commissie > 0 && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400">
                            ({Math.round((r.commissie / totals.commissie) * 100)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-700">Totaal</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.leads}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.openDeals}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{totals.geslotenDeals}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatEuro(totals.omzet)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatEuro(totals.commissie)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SummaryCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'green' | 'blue' | 'purple' | 'amber'
}) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
