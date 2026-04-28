'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEntity, matchesEntity, ENTITY_LABELS } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { formatEuro } from '@/lib/calculations'
import { TrendingUp, CalendarDays, Euro } from 'lucide-react'
import Link from 'next/link'

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
  leads: number        // Pipedrive leads
  openDeals: number    // Pipedrive open deals
  lToD: number | null  // Lead → Deal
  dToS: number | null  // Deal → Sale
  lToS: number | null  // Lead → Sale
}

function pct(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 100) : null
}

function PctBadge({ value, good = 20 }: { value: number | null; good?: number }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>
  const color = value >= good ? 'bg-green-100 text-green-700' : value >= good / 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{value}%</span>
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
    try {
      const [mRes, dRes, aRes, pdRes] = await Promise.allSettled([
        supabase.from('makelaars').select('id, naam, rol, area_manager_id, pipedrive_naam').eq('actief', true).order('naam'),
        supabase.from('deals').select('makelaar_id, aankoopprijs, makelaar_commissie, bruto_commissie, datum_passering, regio, type_deal'),
        supabase.from('afspraken').select('makelaar_id, datum, status, type'),
        fetch('/api/pipedrive/consultant-funnel', { cache: 'no-store' }).then(r => r.ok ? r.json() : { perUser: {} }),
      ])
      const mData = mRes.status === 'fulfilled' ? (mRes.value.data ?? []) : []
      const dData = dRes.status === 'fulfilled' ? (dRes.value.data ?? []) : []
      const aData = aRes.status === 'fulfilled' ? (aRes.value.data ?? []) : []
      const pdData = pdRes.status === 'fulfilled' ? (pdRes.value ?? { perUser: {} }) : { perUser: {} }
      setMakelaars(mData as Makelaar[])
      setDeals(dData as Deal[])
      setAfspraken(aData as Afspraak[])
      setPipedrivePerUser((pdData as { perUser: Record<string, PipedriveStats> }).perUser ?? {})
    } catch (e) {
      console.error('[load] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const range = getDateRange(datePreset)

  const filteredDeals = deals.filter(d =>
    matchesEntity(d.regio, entity) && isInRange(d.datum_passering, range)
  )
  const filteredAfspraken = afspraken.filter(a => isInRange(a.datum, range))

  const stats: MakelaarStats[] = makelaars
    .filter(m => m.rol !== 'area_manager')
    .map(m => {
      const mDeals = filteredDeals.filter(d => d.makelaar_id === m.id)
      const mAfspraken = filteredAfspraken.filter(a => a.makelaar_id === m.id)
      const gepland = mAfspraken.filter(a => a.status === 'Gepland').length
      const sales = mDeals.length

      // Match Pipedrive user: gebruik pipedrive_naam als die ingesteld is, anders naam
      const matchKey = (m.pipedrive_naam ?? m.naam).trim().toLowerCase()
      const pdEntry = Object.entries(pipedrivePerUser).find(([name]) => name.trim().toLowerCase() === matchKey)
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

  const totals = stats.reduce((acc, s) => ({
    sales: acc.sales + s.sales,
    omzet: acc.omzet + s.omzet,
    makelaarCommissie: acc.makelaarCommissie + s.makelaarCommissie,
    leads: acc.leads + s.leads,
    openDeals: acc.openDeals + s.openDeals,
    afsprakenGepland: acc.afsprakenGepland + s.afsprakenGepland,
  }), { sales: 0, omzet: 0, makelaarCommissie: 0, leads: 0, openDeals: 0, afsprakenGepland: 0 })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultants</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Prestaties per consultant — {ENTITY_LABELS[entity]}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <EntitySwitch value={entity} onChange={setEntity} />
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Laden…</div>}

      {!loading && (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Sales" value={String(totals.sales)} color="green" />
            <SummaryCard icon={<Euro className="w-4 h-4" />} label="Commissie consultants" value={formatEuro(totals.makelaarCommissie)} color="amber" />
            <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="Leads (Pipedrive)" value={String(totals.leads)} color="blue" />
            <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="Open deals (Pipedrive)" value={String(totals.openDeals)} color="purple" />
          </div>

          {/* Per-makelaar tabel */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Consultant</th>
                  <th className="text-right px-4 py-3 font-semibold">Leads</th>
                  <th className="text-right px-4 py-3 font-semibold">Deals</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-600">Sales</th>
                  <th className="text-right px-4 py-3 font-semibold">Omzet</th>
                  <th className="text-right px-4 py-3 font-semibold">Commissie</th>
                  <th className="text-right px-4 py-3 font-semibold">L→D</th>
                  <th className="text-right px-4 py-3 font-semibold">D→S</th>
                  <th className="text-right px-4 py-3 font-semibold">L→S</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => {
                  return (
                    <tr
                      key={s.makelaar.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/makelaars/${s.makelaar.id}`} className="flex items-center gap-2 group">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                            {s.makelaar.naam.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline">{s.makelaar.naam}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.leads > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.leads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.openDeals > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.openDeals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.sales > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.sales}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.omzet > 0 ? formatEuro(s.omzet) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {s.makelaarCommissie > 0 ? formatEuro(s.makelaarCommissie) : '—'}
                        {totals.makelaarCommissie > 0 && s.makelaarCommissie > 0 && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400">
                            ({Math.round((s.makelaarCommissie / totals.makelaarCommissie) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right"><PctBadge value={s.lToD} good={50} /></td>
                      <td className="px-4 py-3 text-right"><PctBadge value={s.dToS} good={30} /></td>
                      <td className="px-4 py-3 text-right"><PctBadge value={s.lToS} good={15} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                  <td className="px-4 py-3">Totaal</td>
                  <td className="px-4 py-3 text-right">{totals.leads}</td>
                  <td className="px-4 py-3 text-right">{totals.openDeals}</td>
                  <td className="px-4 py-3 text-right">{totals.sales}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(totals.omzet)}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(totals.makelaarCommissie)}</td>
                  <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.openDeals, totals.leads)} good={50} /></td>
                  <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.sales, totals.openDeals)} good={30} /></td>
                  <td className="px-4 py-3 text-right"><PctBadge value={pct(totals.sales, totals.leads)} good={15} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: {
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
