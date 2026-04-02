'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { normalizeRegio } from '@/lib/calculations'
import Link from 'next/link'

interface Sale {
  regio: string | null
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

function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

function PctBadge({ value, good = 20 }: { value: number | null; good?: number }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>
  const color = value >= good ? 'bg-green-100 text-green-700' : value >= good / 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}%</span>
}

export default function FunnelPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  const [sales, setSales] = useState<Sale[]>([])
  const [pipedriveDeals, setPipedriveDeals] = useState<PipedriveDealRow[]>([])
  const [pipedriveLeads, setPipedriveLeads] = useState<PipedriveLeadRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [salesRes, dealsRes, leadsRes] = await Promise.all([
      supabase.from('deals').select('regio, datum_passering'),
      fetch('/api/pipedrive/open-deals').then(r => r.ok ? r.json() : { allDeals: [] }),
      fetch('/api/pipedrive/leads').then(r => r.ok ? r.json() : { leads: [] }),
    ])
    setSales((salesRes.data ?? []) as Sale[])
    setPipedriveDeals((dealsRes.allDeals ?? []) as PipedriveDealRow[])
    setPipedriveLeads((leadsRes.leads ?? []) as PipedriveLeadRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const range = getDateRange(datePreset)

  const filteredLeads = pipedriveLeads.filter(l => isInRange(l.add_time, range))
  const filteredDeals = pipedriveDeals.filter(d => d.status === 'open' && isInRange(d.add_time, range))
  const filteredSales = sales.filter(s => isInRange(s.datum_passering, range))

  const totalLeads = filteredLeads.length
  const totalDeals = filteredDeals.length
  const totalSales = filteredSales.length
  const maxVal = Math.max(totalLeads, totalDeals, totalSales, 1)

  // Per-regio funnel
  const regios = Array.from(new Set([
    ...filteredLeads.map(l => l.regio),
    ...filteredDeals.map(d => d.regio),
    ...filteredSales.map(s => normalizeRegio(s.regio)),
  ])).filter(Boolean).sort()

  const regioFunnels: RegioFunnel[] = regios.map(regio => {
    const leads = filteredLeads.filter(l => l.regio === regio).length
    const deals = filteredDeals.filter(d => d.regio === regio).length
    const s = filteredSales.filter(s => normalizeRegio(s.regio) === regio).length
    return {
      regio,
      leads,
      deals,
      sales: s,
      leadsToDealsPct: pct(deals, leads),
      dealsToSalesPct: pct(s, deals),
      leadsToSalesPct: pct(s, leads),
    }
  }).sort((a, b) => b.leads - a.leads)

  const steps = [
    { label: 'Leads', value: totalLeads, color: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
    { label: 'Deals', value: totalDeals, color: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
    { label: 'Sales', value: totalSales, color: 'bg-green-500', light: 'bg-green-100', text: 'text-green-700' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversiefunnel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Leads → Deals → Sales — alle entiteiten</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Laden…</div>}

      {!loading && (
        <>
          {/* Funnel visualisatie */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="space-y-3">
              {steps.map((step, i) => {
                const width = maxVal > 0 ? Math.max((step.value / maxVal) * 100, step.value > 0 ? 4 : 0) : 0
                const convFromPrev = i === 1 ? pct(totalDeals, totalLeads) : i === 2 ? pct(totalSales, totalDeals) : null
                return (
                  <div key={step.label}>
                    {i > 0 && convFromPrev !== null && (
                      <div className="flex items-center gap-2 my-1 ml-1">
                        <div className="w-px h-4 bg-gray-200 ml-3" />
                        <span className="text-xs text-gray-400">
                          conversie: <span className={`font-semibold ${convFromPrev >= 20 ? 'text-green-600' : convFromPrev >= 10 ? 'text-amber-600' : 'text-red-500'}`}>{convFromPrev}%</span>
                        </span>
                      </div>
                    )}
                    {i > 0 && convFromPrev === null && (
                      <div className="my-1 ml-4">
                        <div className="w-px h-4 bg-gray-200" />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-right text-sm font-medium text-gray-600 shrink-0">{step.label}</div>
                      <div className="flex-1 relative h-10 bg-gray-50 rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center px-3`}
                          style={{ width: `${width}%` }}
                        >
                          {step.value > 0 && (
                            <span className="text-white text-sm font-bold whitespace-nowrap">{step.value}</span>
                          )}
                        </div>
                        {step.value === 0 && (
                          <span className="absolute inset-0 flex items-center px-3 text-gray-400 text-sm">0</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totaal conversie */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex gap-6 text-sm">
              <div>
                <span className="text-gray-400">Lead → Deal</span>
                <span className="ml-2 font-semibold text-gray-800">{pct(totalDeals, totalLeads) ?? '—'}{pct(totalDeals, totalLeads) !== null ? '%' : ''}</span>
              </div>
              <div>
                <span className="text-gray-400">Deal → Sale</span>
                <span className="ml-2 font-semibold text-gray-800">{pct(totalSales, totalDeals) ?? '—'}{pct(totalSales, totalDeals) !== null ? '%' : ''}</span>
              </div>
              <div>
                <span className="text-gray-400">Lead → Sale</span>
                <span className="ml-2 font-semibold text-gray-800">{pct(totalSales, totalLeads) ?? '—'}{pct(totalSales, totalLeads) !== null ? '%' : ''}</span>
              </div>
            </div>
          </div>

          {/* Per regio */}
          {regioFunnels.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Per regio</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <th className="text-left px-4 py-2.5 font-semibold">Regio</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-purple-600">Leads</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-blue-600">Deals</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-green-600">Sales</th>
                    <th className="text-right px-4 py-2.5 font-semibold">L→D</th>
                    <th className="text-right px-4 py-2.5 font-semibold">D→S</th>
                    <th className="text-right px-4 py-2.5 font-semibold">L→S</th>
                  </tr>
                </thead>
                <tbody>
                  {regioFunnels.map((r, i) => (
                    <tr key={r.regio} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        <Link href={`/regios/${encodeURIComponent(r.regio)}`} className="hover:text-blue-600 hover:underline">{r.regio}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{r.leads}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{r.deals}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{r.sales}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right"><PctBadge value={r.leadsToDealsPct} good={20} /></td>
                      <td className="px-4 py-2.5 text-right"><PctBadge value={r.dealsToSalesPct} good={30} /></td>
                      <td className="px-4 py-2.5 text-right"><PctBadge value={r.leadsToSalesPct} good={10} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                    <td className="px-4 py-2.5">Totaal</td>
                    <td className="px-4 py-2.5 text-right text-purple-700">{totalLeads}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{totalDeals}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{totalSales}</td>
                    <td className="px-4 py-2.5 text-right"><PctBadge value={pct(totalDeals, totalLeads)} good={20} /></td>
                    <td className="px-4 py-2.5 text-right"><PctBadge value={pct(totalSales, totalDeals)} good={30} /></td>
                    <td className="px-4 py-2.5 text-right"><PctBadge value={pct(totalSales, totalLeads)} good={10} /></td>
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
