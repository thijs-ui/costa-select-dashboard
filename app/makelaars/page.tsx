'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useEntity, matchesEntity, ENTITY_LABELS } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { formatEuro } from '@/lib/calculations'
import { TrendingUp, CalendarDays, Euro } from 'lucide-react'

interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
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

interface MakelaarStats {
  makelaar: Makelaar
  deals: number
  omzet: number
  makelaarCommissie: number
  afsprakenUitgevoerd: number
  afsprakenGepland: number
  conversie: number | null
}

export default function MakelaarsPage() {
  const { entity, setEntity } = useEntity()
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [mRes, dRes, aRes] = await Promise.all([
      supabase.from('makelaars').select('id, naam, rol, area_manager_id').eq('actief', true).order('naam'),
      supabase.from('deals').select('makelaar_id, aankoopprijs, makelaar_commissie, bruto_commissie, datum_passering, regio, type_deal'),
      supabase.from('afspraken').select('makelaar_id, datum, status, type'),
    ])
    setMakelaars((mRes.data ?? []) as Makelaar[])
    setDeals((dRes.data ?? []) as Deal[])
    setAfspraken((aRes.data ?? []) as Afspraak[])
    setLoading(false)
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
      const uitgevoerd = mAfspraken.filter(a => a.status === 'Uitgevoerd').length
      const gepland = mAfspraken.filter(a => a.status === 'Gepland').length
      const conversie = uitgevoerd > 0 ? (mDeals.length / uitgevoerd) * 100 : null
      return {
        makelaar: m,
        deals: mDeals.length,
        omzet: mDeals.reduce((s, d) => s + (d.aankoopprijs ?? 0), 0),
        makelaarCommissie: mDeals.reduce((s, d) => s + (d.makelaar_commissie ?? 0), 0),
        afsprakenUitgevoerd: uitgevoerd,
        afsprakenGepland: gepland,
        conversie,
      }
    })
    .sort((a, b) => b.makelaarCommissie - a.makelaarCommissie)

  const totals = stats.reduce((acc, s) => ({
    deals: acc.deals + s.deals,
    omzet: acc.omzet + s.omzet,
    makelaarCommissie: acc.makelaarCommissie + s.makelaarCommissie,
    afsprakenUitgevoerd: acc.afsprakenUitgevoerd + s.afsprakenUitgevoerd,
    afsprakenGepland: acc.afsprakenGepland + s.afsprakenGepland,
  }), { deals: 0, omzet: 0, makelaarCommissie: 0, afsprakenUitgevoerd: 0, afsprakenGepland: 0 })

  const topPerformer = stats.length > 0 ? stats[0] : null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Makelaars</h1>
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
            <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Sales" value={String(totals.deals)} color="green" />
            <SummaryCard icon={<Euro className="w-4 h-4" />} label="Commissie makelaars" value={formatEuro(totals.makelaarCommissie)} color="amber" />
            <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="Afspraken uitgevoerd" value={String(totals.afsprakenUitgevoerd)} color="blue" />
            <SummaryCard icon={<CalendarDays className="w-4 h-4" />} label="Afspraken gepland" value={String(totals.afsprakenGepland)} color="purple" />
          </div>

          {/* Per-makelaar tabel */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Consultant</th>
                  <th className="text-right px-4 py-3 font-semibold">Sales</th>
                  <th className="text-right px-4 py-3 font-semibold">Omzet</th>
                  <th className="text-right px-4 py-3 font-semibold">Commissie</th>
                  <th className="text-right px-4 py-3 font-semibold">Afspraken</th>
                  <th className="text-right px-4 py-3 font-semibold">Gepland</th>
                  <th className="text-right px-4 py-3 font-semibold">Conversie</th>
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
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                            {s.makelaar.naam.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{s.makelaar.naam}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.deals > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.deals}
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
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.afsprakenUitgevoerd > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.afsprakenUitgevoerd}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.afsprakenGepland > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.afsprakenGepland}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.conversie !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.conversie >= 30 ? 'bg-green-100 text-green-700' : s.conversie >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {s.conversie.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                  <td className="px-4 py-3">Totaal</td>
                  <td className="px-4 py-3 text-right">{totals.deals}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(totals.omzet)}</td>
                  <td className="px-4 py-3 text-right">{formatEuro(totals.makelaarCommissie)}</td>
                  <td className="px-4 py-3 text-right">{totals.afsprakenUitgevoerd}</td>
                  <td className="px-4 py-3 text-right">{totals.afsprakenGepland}</td>
                  <td className="px-4 py-3 text-right">
                    {totals.afsprakenUitgevoerd > 0 ? (
                      <span className="text-xs font-semibold">
                        {((totals.deals / totals.afsprakenUitgevoerd) * 100).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
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
