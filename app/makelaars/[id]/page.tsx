'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { formatEuro } from '@/lib/calculations'
import { ArrowLeft, TrendingUp, CalendarDays, Euro, BarChart2 } from 'lucide-react'

interface Makelaar {
  id: string
  naam: string
  rol: string
}

interface Deal {
  id: string
  datum_passering: string
  aankoopprijs: number
  bruto_commissie: number | null
  makelaar_commissie: number | null
  regio: string | null
  type_deal: string | null
}

interface Afspraak {
  id: string
  datum: string
  status: string
  type: string | null
  klant_naam: string | null
  regio: string | null
}

export default function MakelaarDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  const [makelaar, setMakelaar] = useState<Makelaar | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [mRes, dRes, aRes] = await Promise.all([
        supabase.from('makelaars').select('id, naam, rol').eq('id', id).single(),
        supabase.from('deals').select('id, datum_passering, aankoopprijs, bruto_commissie, makelaar_commissie, regio, type_deal').eq('makelaar_id', id).order('datum_passering', { ascending: false }),
        supabase.from('afspraken').select('id, datum, status, type, klant_naam, regio').eq('makelaar_id', id).order('datum', { ascending: false }),
      ])
      setMakelaar(mRes.data as Makelaar | null)
      setDeals((dRes.data ?? []) as Deal[])
      setAfspraken((aRes.data ?? []) as Afspraak[])
      setLoading(false)
    }
    load()
  }, [id])

  const range = getDateRange(datePreset)
  const filteredDeals = deals.filter(d => isInRange(d.datum_passering, range))
  const filteredAfspraken = afspraken.filter(a => isInRange(a.datum, range))

  const uitgevoerd = filteredAfspraken.filter(a => a.status === 'Uitgevoerd').length
  const gepland = filteredAfspraken.filter(a => a.status === 'Gepland').length
  const totalCommissie = filteredDeals.reduce((s, d) => s + (d.makelaar_commissie ?? 0), 0)
  const conversie = uitgevoerd > 0 ? (filteredDeals.length / uitgevoerd) * 100 : null

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden…</div>
  if (!makelaar) return <div className="text-slate-400 text-sm p-8">Makelaar niet gevonden.</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/makelaars" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft size={14} /> Terug naar makelaars
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-base font-bold text-slate-600">
              {makelaar.naam.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{makelaar.naam}</h1>
              <p className="text-sm text-gray-400 capitalize">{makelaar.rol}</p>
            </div>
          </div>
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Sales" value={String(filteredDeals.length)} color="green" />
        <KpiCard icon={<Euro className="w-4 h-4" />} label="Commissie" value={totalCommissie > 0 ? formatEuro(totalCommissie) : '—'} color="amber" />
        <KpiCard icon={<CalendarDays className="w-4 h-4" />} label="Afspraken uitgevoerd" value={String(uitgevoerd)} color="blue" />
        <KpiCard
          icon={<BarChart2 className="w-4 h-4" />}
          label="Conversie"
          value={conversie !== null ? `${conversie.toFixed(0)}%` : '—'}
          color={conversie === null ? 'gray' : conversie >= 30 ? 'green' : conversie >= 15 ? 'amber' : 'red'}
        />
      </div>

      {/* Sales tabel */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Sales ({filteredDeals.length})</h2>
        {filteredDeals.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm rounded-xl border border-gray-200">Geen sales in deze periode.</div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Regio</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Aankoopprijs</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Commissie</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((d, i) => (
                  <tr key={d.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2.5 text-gray-600">{new Date(d.datum_passering).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-2.5 text-gray-700">{d.regio ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{d.type_deal ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{formatEuro(d.aankoopprijs)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{d.makelaar_commissie ? formatEuro(d.makelaar_commissie) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                  <td colSpan={3} className="px-4 py-2.5">Totaal</td>
                  <td className="px-4 py-2.5 text-right">{formatEuro(filteredDeals.reduce((s, d) => s + d.aankoopprijs, 0))}</td>
                  <td className="px-4 py-2.5 text-right">{formatEuro(totalCommissie)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Afspraken tabel */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Afspraken ({filteredAfspraken.length})</h2>
        {filteredAfspraken.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm rounded-xl border border-gray-200">Geen afspraken in deze periode.</div>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Klant</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Regio</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAfspraken.map((a, i) => (
                  <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-4 py-2.5 text-gray-600">{new Date(a.datum).toLocaleDateString('nl-NL')}</td>
                    <td className="px-4 py-2.5 text-gray-700">{a.klant_naam ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{a.regio ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{a.type ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        a.status === 'Uitgevoerd' ? 'bg-green-100 text-green-700' :
                        a.status === 'Gepland' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'green' | 'blue' | 'amber' | 'red' | 'gray'
}) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-400',
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
