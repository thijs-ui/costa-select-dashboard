'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface AfhandelingDeal {
  id: number
  title: string
  value: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

export default function AfhandelingSection({ deals }: { deals: AfhandelingDeal[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const [commissies, setCommissies] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (deals.length === 0) return
    const ids = deals.map(d => d.id)
    supabase
      .from('afhandeling_data')
      .select('pipedrive_deal_id, commissie')
      .in('pipedrive_deal_id', ids)
      .then(({ data }) => {
        if (!data) return
        const map: Record<number, number> = {}
        data.forEach((r: { pipedrive_deal_id: number; commissie: number }) => {
          map[r.pipedrive_deal_id] = r.commissie
        })
        setCommissies(map)
      })
  }, [deals])

  async function saveCommissie(dealId: number, value: string) {
    const bedrag = parseFloat(value.replace(',', '.')) || 0
    setCommissies(prev => ({ ...prev, [dealId]: bedrag }))
    setSaving(prev => ({ ...prev, [dealId]: true }))
    await supabase
      .from('afhandeling_data')
      .upsert({ pipedrive_deal_id: dealId, commissie: bedrag }, { onConflict: 'pipedrive_deal_id' })
    setSaving(prev => ({ ...prev, [dealId]: false }))
  }

  const totaalWaarde = deals.reduce((s, d) => s + (d.value ?? 0), 0)
  const totaalCommissie = Object.entries(commissies)
    .filter(([id]) => deals.some(d => d.id === Number(id)))
    .reduce((s, [, v]) => s + v, 0)

  return (
    <div className="rounded-xl border border-amber-200 overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center justify-between hover:bg-amber-100/60 transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            {collapsed ? <ChevronRight size={14} className="text-amber-600" /> : <ChevronDown size={14} className="text-amber-600" />}
            <h2 className="text-sm font-semibold text-amber-700">In afhandeling</h2>
          </div>
          <p className="text-xs text-amber-500 mt-0.5 ml-5">Alle huidige deals — akkoord gegeven, notaris nog niet gepasseerd</p>
        </div>
      </button>

      {!collapsed && (
        deals.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">Geen deals in afhandeling.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-50/60 border-b border-amber-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-2.5 font-semibold">Deal</th>
                <th className="text-right px-4 py-2.5 font-semibold text-amber-600">Waarde</th>
                <th className="text-right px-4 py-2.5 font-semibold text-green-600">Commissie</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d, i) => (
                <tr key={d.id} className={`border-b border-amber-50 hover:bg-amber-50/40 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}`}>
                  <td className="px-4 py-2.5 text-gray-700">{d.title}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                    {d.value > 0 ? fmt(d.value) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-400 text-xs">€</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        defaultValue={commissies[d.id] || ''}
                        key={commissies[d.id]}
                        onBlur={e => saveCommissie(d.id, e.target.value)}
                        placeholder="0"
                        className="w-28 text-right px-2 py-1 text-sm rounded border border-transparent hover:border-slate-200 focus:border-green-400 focus:outline-none bg-transparent focus:bg-white"
                      />
                      {saving[d.id] && <span className="text-xs text-gray-300">...</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t-2 border-amber-200 font-semibold">
                <td className="px-4 py-3 text-amber-700">Totaal ({deals.length})</td>
                <td className="px-4 py-3 text-right text-amber-700">{fmt(totaalWaarde)}</td>
                <td className="px-4 py-3 text-right text-green-700">
                  {totaalCommissie > 0 ? fmt(totaalCommissie) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        )
      )}
    </div>
  )
}
