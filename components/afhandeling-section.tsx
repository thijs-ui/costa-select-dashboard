'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/calculations'

interface AfhandelingDeal {
  id: number
  title: string
  value: number
}

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
    <div className="fin-section fin-afh">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="fin-afh-head"
      >
        <span className="fin-afh-chev">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <span className="fin-afh-title">
          In afhandeling <span className="fin-afh-count">{deals.length}</span>
        </span>
        <span className="fin-afh-sub">
          Akkoord gegeven, notaris nog niet gepasseerd
        </span>
      </button>

      {!collapsed && (
        <>
          {deals.length === 0 ? (
            <div className="fin-afh-empty">Geen deals in afhandeling.</div>
          ) : (
            <div className="fin-table-wrap" style={{ marginTop: 12, borderRadius: 10 }}>
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th className="num">Waarde</th>
                    <th className="num">Commissie</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map(d => (
                    <tr key={d.id}>
                      <td>{d.title}</td>
                      <td className="num">{d.value > 0 ? formatEuro(d.value) : '—'}</td>
                      <td className="num">
                        <span className="fin-afh-input">
                          <span className="prefix">€</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            defaultValue={commissies[d.id] || ''}
                            key={commissies[d.id]}
                            onBlur={e => void saveCommissie(d.id, e.target.value)}
                            placeholder="0"
                          />
                          {saving[d.id] && <span className="saving">…</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Totaal ({deals.length})</td>
                    <td className="num">{formatEuro(totaalWaarde)}</td>
                    <td className="num">{totaalCommissie > 0 ? formatEuro(totaalCommissie) : '—'}</td>
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
