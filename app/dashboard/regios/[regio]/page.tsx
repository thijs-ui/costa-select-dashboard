'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { formatEuro, normalizeRegio } from '@/lib/calculations'
import { ArrowLeft, Users, TrendingUp, Building2, Euro } from 'lucide-react'

interface Sale {
  id: string
  datum_passering: string
  aankoopprijs: number
  bruto_commissie: number | null
  makelaar_commissie: number | null
  netto_commissie_cs: number | null
  type_deal: string | null
  makelaar_naam?: string | null
}

interface OpenDeal {
  id: number
  title: string
  regio: string
  status: string
  add_time: string
  value: number
  person_name: string | null
}

interface Lead {
  id: string
  title: string
  regio: string
  person_name: string | null
  add_time: string
}

interface Makelaar {
  id: string
  naam: string
}

export default function RegioDetailPage() {
  const params = useParams<{ regio: string }>()
  const regio = decodeURIComponent(params.regio)

  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [sales, setSales] = useState<Sale[]>([])
  const [openDeals, setOpenDeals] = useState<OpenDeal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [salesRes, makelaarsRes, dealsRes, leadsRes] = await Promise.all([
      supabase.from('deals').select('id, datum_passering, aankoopprijs, bruto_commissie, makelaar_commissie, netto_commissie_cs, type_deal, makelaar_id, regio'),
      supabase.from('makelaars').select('id, naam'),
      fetch('/api/pipedrive/open-deals').then(r => r.ok ? r.json() : { allDeals: [] }),
      fetch('/api/pipedrive/leads').then(r => r.ok ? r.json() : { leads: [] }),
    ])

    const mList = (makelaarsRes.data ?? []) as Makelaar[]
    setMakelaars(mList)

    const mMap = new Map(mList.map(m => [m.id, m.naam]))
    const rawSales = (salesRes.data ?? []) as (Sale & { makelaar_id?: string | null })[]
    setSales(rawSales.map(s => ({ ...s, makelaar_naam: s.makelaar_id ? mMap.get(s.makelaar_id) ?? null : null })))
    setOpenDeals((dealsRes.allDeals ?? []) as OpenDeal[])
    setLeads((leadsRes.leads ?? []) as Lead[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const range = getDateRange(datePreset)

  const filteredSales = sales.filter(s => normalizeRegio((s as unknown as { regio?: string }).regio) === regio && isInRange(s.datum_passering, range))
  const filteredDeals = openDeals.filter(d => d.regio === regio && d.status === 'open' && isInRange(d.add_time, range))
  const filteredLeads = leads.filter(l => l.regio === regio && isInRange(l.add_time, range))

  const totalCommissie = filteredSales.reduce((s, d) => s + (d.netto_commissie_cs ?? 0), 0)
  const maxFunnel = Math.max(filteredLeads.length, filteredDeals.length, filteredSales.length, 1)

  const funnelSteps = [
    { label: 'Leads', value: filteredLeads.length, color: 'bg-purple-500', textColor: 'text-purple-700', bg: 'bg-purple-100' },
    { label: 'Open deals', value: filteredDeals.length, color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-100' },
    { label: 'Sales', value: filteredSales.length, color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-100' },
  ]

  function pct(num: number, den: number) {
    return den > 0 ? Math.round((num / den) * 100) : null
  }

  if (loading) return <div className="text-gray-400 text-sm p-8">Laden…</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/regios" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft size={14} /> Terug naar regio&apos;s
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{regio}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Leads · Open deals · Sales</p>
          </div>
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<Users className="w-4 h-4" />} label="Leads" value={String(filteredLeads.length)} color="purple" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Open deals" value={String(filteredDeals.length)} color="blue" />
        <KpiCard icon={<Building2 className="w-4 h-4" />} label="Sales" value={String(filteredSales.length)} color="green" />
        <KpiCard icon={<Euro className="w-4 h-4" />} label="Netto commissie" value={totalCommissie > 0 ? formatEuro(totalCommissie) : '—'} color="amber" />
      </div>

      {/* Conversiefunnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversiefunnel</h2>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => {
            const width = Math.max((step.value / maxFunnel) * 100, step.value > 0 ? 4 : 0)
            const conv = i === 1 ? pct(filteredDeals.length, filteredLeads.length)
              : i === 2 ? pct(filteredSales.length, filteredDeals.length) : null
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
                  <div className="w-20 text-right text-sm font-medium text-gray-600 shrink-0">{step.label}</div>
                  <div className="flex-1 relative h-9 bg-gray-50 rounded-lg overflow-hidden">
                    <div className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center px-3`} style={{ width: `${width}%` }}>
                      {step.value > 0 && <span className="text-white text-sm font-bold">{step.value}</span>}
                    </div>
                    {step.value === 0 && <span className="absolute inset-0 flex items-center px-3 text-gray-400 text-sm">0</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-6 text-sm">
          <div><span className="text-gray-400">Lead → Deal</span><span className="ml-2 font-semibold">{pct(filteredDeals.length, filteredLeads.length) ?? '—'}{pct(filteredDeals.length, filteredLeads.length) !== null ? '%' : ''}</span></div>
          <div><span className="text-gray-400">Deal → Sale</span><span className="ml-2 font-semibold">{pct(filteredSales.length, filteredDeals.length) ?? '—'}{pct(filteredSales.length, filteredDeals.length) !== null ? '%' : ''}</span></div>
          <div><span className="text-gray-400">Lead → Sale</span><span className="ml-2 font-semibold">{pct(filteredSales.length, filteredLeads.length) ?? '—'}{pct(filteredSales.length, filteredLeads.length) !== null ? '%' : ''}</span></div>
        </div>
      </div>

      {/* Sales tabel */}
      <Section title={`Sales (${filteredSales.length})`} empty={filteredSales.length === 0} emptyText="Geen sales in deze periode.">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="text-left px-4 py-2.5 font-semibold">Datum</th>
              <th className="text-left px-4 py-2.5 font-semibold">Consultant</th>
              <th className="text-left px-4 py-2.5 font-semibold">Type</th>
              <th className="text-right px-4 py-2.5 font-semibold">Aankoopprijs</th>
              <th className="text-right px-4 py-2.5 font-semibold">Commissie</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((s, i) => (
              <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-2.5 text-gray-600">{new Date(s.datum_passering).toLocaleDateString('nl-NL')}</td>
                <td className="px-4 py-2.5 text-gray-700">{s.makelaar_naam ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{s.type_deal ?? '—'}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{formatEuro(s.aankoopprijs)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{s.netto_commissie_cs ? formatEuro(s.netto_commissie_cs) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Open deals tabel */}
      <Section title={`Open deals (${filteredDeals.length})`} empty={filteredDeals.length === 0} emptyText="Geen open deals in deze periode.">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="text-left px-4 py-2.5 font-semibold">Aangemaakt</th>
              <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
              <th className="text-right px-4 py-2.5 font-semibold">Waarde</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((d, i) => (
              <tr key={d.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-2.5 text-gray-600">{new Date(d.add_time).toLocaleDateString('nl-NL')}</td>
                <td className="px-4 py-2.5 text-gray-700">{d.person_name ?? d.title}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{d.value ? formatEuro(d.value) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Leads tabel */}
      <Section title={`Leads (${filteredLeads.length})`} empty={filteredLeads.length === 0} emptyText="Geen leads in deze periode.">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="text-left px-4 py-2.5 font-semibold">Aangemaakt</th>
              <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((l, i) => (
              <tr key={l.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                <td className="px-4 py-2.5 text-gray-600">{new Date(l.add_time).toLocaleDateString('nl-NL')}</td>
                <td className="px-4 py-2.5 text-gray-700">{l.person_name ?? l.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

function Section({ title, empty, emptyText, children }: {
  title: string
  empty: boolean
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {empty ? (
        <div className="text-center py-8 text-gray-400 text-sm rounded-xl border border-gray-200">{emptyText}</div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">{children}</div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'purple' | 'blue' | 'green' | 'amber' }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
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
