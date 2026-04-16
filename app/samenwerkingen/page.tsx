'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { useAuth } from '@/lib/auth-context'
import { Plus, Search, Phone, Mail, ExternalLink, Star, Trash2, Pencil, X } from 'lucide-react'

const REGIOS = ['Costa Brava', 'Costa Dorada', 'Valencia', 'Costa Blanca Noord', 'Costa Blanca Zuid', 'Alicante', 'Costa del Sol']
const PARTNER_TYPES = [
  { key: 'financieel_adviseur', label: 'Financieel adviseur' },
  { key: 'hypotheekadviseur', label: 'Hypotheekadviseur' },
  { key: 'notaris', label: 'Notaris' },
  { key: 'belastingadviseur', label: 'Belastingadviseur' },
  { key: 'anders', label: 'Anders' },
]

interface Agency {
  id: string; name: string; region: string; city: string | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  website: string | null; property_types: string[] | null
  commission_notes: string | null; reliability_score: number | null
  notes: string | null; is_active: boolean
}

interface Partner {
  id: string; name: string; type: string; region: string | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  website: string | null; specialism: string | null
  internal_notes: string | null; commission_arrangement: string | null
  is_active: boolean
}

type View = 'makelaars' | 'partners'

const emptyPartner = { name: '', type: 'anders', region: '', contact_name: '', contact_phone: '', contact_email: '', website: '', specialism: '', internal_notes: '', commission_arrangement: '' }

export default function SamenwerkingenPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [view, setView] = useState<View>('makelaars')
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(emptyPartner)
  const [editing, setEditing] = useState<Partner | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [aRes, pRes] = await Promise.all([
      fetch('/api/agentschappen'),
      fetch('/api/samenwerkingen'),
    ])
    if (aRes.ok) setAgencies(await aRes.json())
    if (pRes.ok) setPartners(await pRes.json())
    setLoading(false)
  }

  async function savePartner() {
    if (!newForm.name) return
    const method = editing ? 'PUT' : 'POST'
    const body = editing ? { id: editing.id, ...newForm } : newForm
    const res = await fetch('/api/samenwerkingen', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      await load()
      setShowNew(false); setEditing(null); setNewForm(emptyPartner)
    }
  }

  async function deletePartner(id: string) {
    if (!confirm('Partner verwijderen?')) return
    await fetch('/api/samenwerkingen', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  function startEdit(p: Partner) {
    setEditing(p)
    setNewForm({
      name: p.name, type: p.type, region: p.region ?? '',
      contact_name: p.contact_name ?? '', contact_phone: p.contact_phone ?? '',
      contact_email: p.contact_email ?? '', website: p.website ?? '',
      specialism: p.specialism ?? '', internal_notes: p.internal_notes ?? '',
      commission_arrangement: p.commission_arrangement ?? '',
    })
    setShowNew(true)
  }

  const filteredAgencies = agencies.filter(a => {
    if (!a.is_active) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q) || a.contact_name?.toLowerCase().includes(q)
  })

  const filteredPartners = partners.filter(p => {
    if (!p.is_active) return false
    if (typeFilter && p.type !== typeFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.contact_name?.toLowerCase().includes(q) || p.specialism?.toLowerCase().includes(q)
  })

  if (loading) return <PageLayout title="Samenwerkingen"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Samenwerkingen" subtitle="Makelaars en partners waar Costa Select mee samenwerkt">
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('makelaars')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer ${view === 'makelaars' ? 'bg-[#004B46] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Makelaars ({filteredAgencies.length})
        </button>
        <button onClick={() => setView('partners')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer ${view === 'partners' ? 'bg-[#004B46] text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Partners ({filteredPartners.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004B46]" />
        </div>
        {view === 'partners' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="">Alle types</option>
            {PARTNER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        )}
        {isAdmin && view === 'partners' && (
          <button onClick={() => { setEditing(null); setNewForm(emptyPartner); setShowNew(true) }}
            className="ml-auto bg-[#004B46] text-white font-medium px-4 py-2 rounded-xl hover:bg-[#0A6B63] flex items-center gap-2 text-sm cursor-pointer">
            <Plus size={15} /> Partner toevoegen
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Naam</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Regio</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Contact</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Telefoon</th>
                <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Email</th>
                {isAdmin && <th className="w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {view === 'makelaars' && filteredAgencies.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-[#004B46]">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">Makelaar</td>
                  <td className="px-4 py-3 text-slate-600">{a.region}{a.city ? ` — ${a.city}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{a.contact_name || '—'}</td>
                  <td className="px-4 py-3">
                    {a.contact_phone ? <a href={`tel:${a.contact_phone}`} className="text-[#004B46] hover:underline flex items-center gap-1 whitespace-nowrap"><Phone size={12} /> {a.contact_phone}</a> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {a.contact_email ? <a href={`mailto:${a.contact_email}`} className="text-[#004B46] hover:underline flex items-center gap-1"><Mail size={12} /> {a.contact_email}</a> : '—'}
                  </td>
                  {isAdmin && <td className="px-4 py-3">
                    {a.reliability_score && (
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} size={11} className={i <= (a.reliability_score ?? 0) ? 'text-[#F5AF40]' : 'text-slate-200'} fill={i <= (a.reliability_score ?? 0) ? 'currentColor' : 'none'} />)}
                      </div>
                    )}
                  </td>}
                </tr>
              ))}
              {view === 'partners' && filteredPartners.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-[#004B46]">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{PARTNER_TYPES.find(t => t.key === p.type)?.label || p.type}</td>
                  <td className="px-4 py-3 text-slate-600">{p.region || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.contact_name || '—'}</td>
                  <td className="px-4 py-3">
                    {p.contact_phone ? <a href={`tel:${p.contact_phone}`} className="text-[#004B46] hover:underline flex items-center gap-1 whitespace-nowrap"><Phone size={12} /> {p.contact_phone}</a> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.contact_email ? <a href={`mailto:${p.contact_email}`} className="text-[#004B46] hover:underline flex items-center gap-1"><Mail size={12} /> {p.contact_email}</a> : '—'}
                  </td>
                  {isAdmin && <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-[#004B46] p-1 cursor-pointer"><Pencil size={13} /></button>
                      <button onClick={() => deletePartner(p.id)} className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  </td>}
                </tr>
              ))}
              {((view === 'makelaars' && filteredAgencies.length === 0) || (view === 'partners' && filteredPartners.length === 0)) && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-slate-400 text-sm">Geen {view} gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner modal */}
      {showNew && isAdmin && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => { setShowNew(false); setEditing(null) }} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">{editing ? 'Partner bewerken' : 'Nieuwe partner'}</h3>
                <button onClick={() => { setShowNew(false); setEditing(null) }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Naam *" className={inp} />
                <select value={newForm.type} onChange={e => setNewForm({ ...newForm, type: e.target.value })} className={inp}>
                  {PARTNER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <select value={newForm.region} onChange={e => setNewForm({ ...newForm, region: e.target.value })} className={inp}>
                  <option value="">Alle regio&apos;s</option>
                  {REGIOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={newForm.contact_name} onChange={e => setNewForm({ ...newForm, contact_name: e.target.value })} placeholder="Contactpersoon" className={inp} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={newForm.contact_phone} onChange={e => setNewForm({ ...newForm, contact_phone: e.target.value })} placeholder="Telefoon" className={inp} />
                  <input value={newForm.contact_email} onChange={e => setNewForm({ ...newForm, contact_email: e.target.value })} placeholder="Email" className={inp} />
                </div>
                <input value={newForm.website} onChange={e => setNewForm({ ...newForm, website: e.target.value })} placeholder="Website" className={inp} />
                <textarea value={newForm.specialism} onChange={e => setNewForm({ ...newForm, specialism: e.target.value })} placeholder="Specialisme (zichtbaar voor iedereen)" rows={2} className={`${inp} resize-none`} />
                <textarea value={newForm.commission_arrangement} onChange={e => setNewForm({ ...newForm, commission_arrangement: e.target.value })} placeholder="Commissie-afspraken (alleen admins)" rows={2} className={`${inp} resize-none`} />
                <textarea value={newForm.internal_notes} onChange={e => setNewForm({ ...newForm, internal_notes: e.target.value })} placeholder="Interne notities (alleen admins)" rows={2} className={`${inp} resize-none`} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowNew(false); setEditing(null) }} className="text-sm text-slate-500 px-3 py-2 cursor-pointer">Annuleren</button>
                <button onClick={savePartner} disabled={!newForm.name}
                  className="bg-[#004B46] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] disabled:opacity-50 cursor-pointer">
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20'
