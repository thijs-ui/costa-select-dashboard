'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import DateFilter from '@/components/date-filter'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import { formatEuro } from '@/lib/calculations'
import { Plus, Pencil, Check, X, Euro, Handshake, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Partner {
  id: string
  naam: string
  email: string | null
  land: string | null
  actief: boolean
}

interface Deal {
  partner_naam: string | null
  partner_commissie: number | null
  partner_deal: boolean
  datum_passering: string
  aankoopprijs: number
}

interface Afspraak {
  partner_id: string | null
  datum: string
}

const emptyForm = { naam: '', email: '', land: '' }

export default function PartnersPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [partners, setPartners] = useState<Partner[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, dRes, aRes] = await Promise.allSettled([
        supabase.from('partners').select('*').eq('actief', true).order('naam'),
        supabase.from('deals').select('partner_naam, partner_commissie, partner_deal, datum_passering, aankoopprijs'),
        supabase.from('afspraken').select('partner_id, datum'),
      ])
      const pData = pRes.status === 'fulfilled' ? (pRes.value.data ?? []) : []
      const dData = dRes.status === 'fulfilled' ? (dRes.value.data ?? []) : []
      const aData = aRes.status === 'fulfilled' ? (aRes.value.data ?? []) : []
      setPartners(pData as Partner[])
      setDeals(dData as Deal[])
      setAfspraken(aData as Afspraak[])
    } catch (e) {
      console.error('[load] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const range = getDateRange(datePreset)
  const filteredDeals = deals.filter(d => d.partner_deal && isInRange(d.datum_passering, range))

  const filteredAfspraken = afspraken.filter(a => isInRange(a.datum, range))

  const stats = partners.map(p => {
    const partnerDeals = filteredDeals.filter(d =>
      d.partner_naam?.toLowerCase().trim() === p.naam.toLowerCase().trim()
    )
    const partnerAfspraken = filteredAfspraken.filter(a => a.partner_id === p.id).length
    const commissie = partnerDeals.reduce((s, d) => s + (d.partner_commissie ?? 0), 0)
    const omzet = partnerDeals.reduce((s, d) => s + d.aankoopprijs, 0)
    return { partner: p, deals: partnerDeals.length, afspraken: partnerAfspraken, commissie, omzet }
  }).sort((a, b) => b.commissie - a.commissie)

  const totals = stats.reduce((acc, s) => ({
    deals: acc.deals + s.deals,
    commissie: acc.commissie + s.commissie,
    omzet: acc.omzet + s.omzet,
  }), { deals: 0, commissie: 0, omzet: 0 })

  async function addPartner() {
    if (!form.naam.trim()) return
    setSaving(true)
    const { data } = await supabase.from('partners')
      .insert({ naam: form.naam.trim(), email: form.email || null, land: form.land || null })
      .select().single()
    if (data) setPartners(prev => [...prev, data as Partner].sort((a, b) => a.naam.localeCompare(b.naam)))
    setForm(emptyForm)
    setShowForm(false)
    setSaving(false)
  }

  async function saveEdit(id: string) {
    if (!editForm.naam.trim()) return
    setSaving(true)
    await supabase.from('partners').update({
      naam: editForm.naam.trim(),
      email: editForm.email || null,
      land: editForm.land || null,
    }).eq('id', id)
    setPartners(prev => prev.map(p => p.id === id ? { ...p, ...editForm } : p))
    setEditingId(null)
    setSaving(false)
  }

  async function deactivate(id: string, naam: string) {
    if (!confirm(`${naam} verwijderen uit de partnerlijst?`)) return
    await supabase.from('partners').update({ actief: false }).eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden…</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Referral partners & commissies</p>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter value={datePreset} onChange={setDatePreset} />
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-700"
          >
            <Plus size={14} /> Partner toevoegen
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <SummaryCard icon={<Handshake className="w-4 h-4" />} label="Actieve partners" value={String(partners.length)} color="blue" />
        <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Partner-sales in periode" value={String(totals.deals)} color="green" />
        <SummaryCard icon={<Euro className="w-4 h-4" />} label="Commissie partners" value={totals.commissie > 0 ? formatEuro(totals.commissie) : '—'} color="amber" />
      </div>

      {/* Formulier nieuwe partner */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Nieuwe partner</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Naam *</label>
              <input autoFocus type="text" value={form.naam} onChange={e => setForm({ ...form, naam: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addPartner()}
                placeholder="Naam partner" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="email@voorbeeld.com" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Land</label>
              <input type="text" value={form.land} onChange={e => setForm({ ...form, land: e.target.value })}
                placeholder="Nederland" className={inp} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addPartner} disabled={saving || !form.naam.trim()}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Opslaan...' : 'Toevoegen'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm) }}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      {stats.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm rounded-xl border border-gray-200">
          Nog geen partners toegevoegd.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="text-left px-4 py-3 font-semibold">Partner</th>
                <th className="text-left px-4 py-3 font-semibold">Land</th>
                <th className="text-right px-4 py-3 font-semibold">Afspraken</th>
                <th className="text-right px-4 py-3 font-semibold">Sales</th>
                <th className="text-right px-4 py-3 font-semibold">Omzet</th>
                <th className="text-right px-4 py-3 font-semibold">Commissie</th>
                <th className="text-right px-4 py-3 font-semibold">Gem. per deal</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.partner.id} className={`group border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  {editingId === s.partner.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input autoFocus value={editForm.naam} onChange={e => setEditForm({ ...editForm, naam: e.target.value })}
                          className={inpSm} />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.land} onChange={e => setEditForm({ ...editForm, land: e.target.value })}
                          placeholder="Land" className={inpSm} />
                      </td>
                      <td colSpan={3} className="px-4 py-2">
                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="E-mail" className={inpSm} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => saveEdit(s.partner.id)} disabled={saving}
                            className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                            {s.partner.naam.charAt(0)}
                          </div>
                          <div>
                            <Link href={`/partners/${s.partner.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline">{s.partner.naam}</Link>
                            {s.partner.email && <div className="text-xs text-gray-400">{s.partner.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{s.partner.land ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.afspraken > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.afspraken}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${s.deals > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {s.deals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{s.omzet > 0 ? formatEuro(s.omzet) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {s.commissie > 0 ? formatEuro(s.commissie) : '—'}
                        {totals.commissie > 0 && s.commissie > 0 && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400">
                            ({Math.round((s.commissie / totals.commissie) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {s.deals > 0 ? formatEuro(s.commissie / s.deals) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(s.partner.id); setEditForm({ naam: s.partner.naam, email: s.partner.email ?? '', land: s.partner.land ?? '' }) }}
                            className="p-1 text-gray-300 hover:text-amber-500"><Pencil size={13} /></button>
                          <button onClick={() => deactivate(s.partner.id, s.partner.naam)}
                            className="p-1 text-gray-300 hover:text-red-500"><X size={13} /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-700">
                <td colSpan={2} className="px-4 py-3">Totaal</td>
                <td className="px-4 py-3 text-right">{stats.reduce((s, r) => s + r.afspraken, 0)}</td>
                <td className="px-4 py-3 text-right">{totals.deals}</td>  {/* sales */}
                <td className="px-4 py-3 text-right">{formatEuro(totals.omzet)}</td>
                <td className="px-4 py-3 text-right">{formatEuro(totals.commissie)}</td>
                <td className="px-4 py-3 text-right">
                  {totals.deals > 0 ? formatEuro(totals.commissie / totals.deals) : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'
const inpSm = 'w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400 bg-white'

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: 'blue' | 'green' | 'amber'
}) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', amber: 'bg-amber-50 text-amber-600' }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${colors[color]}`}>{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
