'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { useAuth } from '@/lib/auth-context'
import {
  Plus, Search, Star, X, Trash2, ExternalLink, Phone, Mail,
  Building2, Pencil, Check,
} from 'lucide-react'

const REGIOS = ['Costa Brava', 'Costa Dorada', 'Valencia', 'Costa Blanca Noord', 'Costa Blanca Zuid', 'Alicante', 'Costa del Sol']
const PROPERTY_TYPES = ['Appartement', "Villa", 'Penthouse', 'Townhouse', 'Nieuwbouw', 'Commercieel', 'Grond/kavel']

interface Agency {
  id: string
  name: string
  region: string
  city: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  property_types: string[] | null
  commission_notes: string | null
  reliability_score: number | null
  notes: string | null
  is_active: boolean
  updated_at: string
  created_by: string | null
}

const emptyForm = { name: '', region: '', city: '', contact_name: '', contact_phone: '', contact_email: '', website: '', property_types: [] as string[], commission_notes: '', reliability_score: 0, notes: '' }

export default function AgentschappenPage() {
  const { role, user } = useAuth()
  const isAdmin = role === 'admin'
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegio, setFilterRegio] = useState('')
  const [filterActive, setFilterActive] = useState(true)
  const [filterScore, setFilterScore] = useState(0)

  // Detail panel
  const [selected, setSelected] = useState<Agency | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(emptyForm)

  // New form
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAgencies() }, [])

  async function loadAgencies() {
    const res = await fetch('/api/agentschappen')
    if (res.ok) setAgencies(await res.json())
    setLoading(false)
  }

  async function createAgency() {
    if (!newForm.name || !newForm.region) return
    setSaving(true)
    const res = await fetch('/api/agentschappen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, created_by: user?.id }),
    })
    if (res.ok) {
      const agency = await res.json()
      setAgencies(prev => [...prev, agency])
      setNewForm(emptyForm)
      setShowNew(false)
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/agentschappen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, ...editForm }),
    })
    const updated = { ...selected, ...editForm, updated_at: new Date().toISOString() }
    setAgencies(prev => prev.map(a => a.id === selected.id ? updated : a))
    setSelected(updated)
    setEditing(false)
    setSaving(false)
  }

  async function deleteAgency(id: string) {
    if (!confirm('Agentschap verwijderen?')) return
    await fetch('/api/agentschappen', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAgencies(prev => prev.filter(a => a.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function toggleActive(agency: Agency) {
    const newActive = !agency.is_active
    await fetch('/api/agentschappen', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agency.id, is_active: newActive }),
    })
    setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, is_active: newActive } : a))
    if (selected?.id === agency.id) setSelected({ ...selected, is_active: newActive })
  }

  function openDetail(agency: Agency) {
    setSelected(agency)
    setEditing(false)
    setEditForm({
      name: agency.name, region: agency.region, city: agency.city || '',
      contact_name: agency.contact_name || '', contact_phone: agency.contact_phone || '',
      contact_email: agency.contact_email || '', website: agency.website || '',
      property_types: agency.property_types || [], commission_notes: agency.commission_notes || '',
      reliability_score: agency.reliability_score || 0, notes: agency.notes || '',
    })
  }

  // Filtering
  const filtered = agencies.filter(a => {
    if (filterActive && !a.is_active) return false
    if (filterRegio && a.region !== filterRegio) return false
    if (filterScore && (a.reliability_score ?? 0) < filterScore) return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || (a.city?.toLowerCase().includes(q)) || (a.contact_name?.toLowerCase().includes(q))
    }
    return true
  })

  if (loading) return <PageLayout title="Agentschappen"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Agentschappen" subtitle="Database van makelaars en agentschappen in Spanje">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam, stad of contact..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#004B46]" />
        </div>
        <select value={filterRegio} onChange={e => setFilterRegio(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#004B46]">
          <option value="">Alle regio&apos;s</option>
          {REGIOS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterScore} onChange={e => setFilterScore(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#004B46]">
          <option value={0}>Alle scores</option>
          <option value={1}>1+ ster</option>
          <option value={2}>2+ sterren</option>
          <option value={3}>3+ sterren</option>
          <option value={4}>4+ sterren</option>
          <option value={5}>5 sterren</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={filterActive} onChange={e => setFilterActive(e.target.checked)} className="rounded border-gray-300" />
          Alleen actief
        </label>
        {isAdmin && (
          <button onClick={() => setShowNew(true)}
            className="ml-auto bg-[#004B46] text-[#FFFAEF] font-medium px-4 py-2.5 rounded-xl hover:bg-[#0A6B63] flex items-center gap-2 text-sm cursor-pointer">
            <Plus size={15} /> Agentschap toevoegen
          </button>
        )}
      </div>

      {/* Nieuw formulier */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Nieuw agentschap</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Naam *" className={inp} />
            <select value={newForm.region} onChange={e => setNewForm({ ...newForm, region: e.target.value })} className={inp}>
              <option value="">Regio *</option>
              {REGIOS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={newForm.city} onChange={e => setNewForm({ ...newForm, city: e.target.value })} placeholder="Stad" className={inp} />
            <input value={newForm.contact_name} onChange={e => setNewForm({ ...newForm, contact_name: e.target.value })} placeholder="Contactpersoon" className={inp} />
            <input value={newForm.contact_phone} onChange={e => setNewForm({ ...newForm, contact_phone: e.target.value })} placeholder="Telefoon" className={inp} />
            <input value={newForm.contact_email} onChange={e => setNewForm({ ...newForm, contact_email: e.target.value })} placeholder="Email" className={inp} />
            <input value={newForm.website} onChange={e => setNewForm({ ...newForm, website: e.target.value })} placeholder="Website" className={inp} />
            <div className="col-span-2">
              <StarRating value={newForm.reliability_score} onChange={v => setNewForm({ ...newForm, reliability_score: v })} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <textarea value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Notities..." rows={2} className={`${inp} resize-none`} />
            </div>
          </div>
          <button onClick={createAgency} disabled={saving || !newForm.name || !newForm.region}
            className="mt-3 bg-[#004B46] text-[#FFFAEF] font-medium px-4 py-2 rounded-xl hover:bg-[#0A6B63] text-sm cursor-pointer disabled:opacity-50">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      )}

      {/* Tabel */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-400 text-sm">Geen agentschappen gevonden</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Naam', 'Regio', 'Stad', 'Contact', 'Telefoon', 'Score', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => openDetail(a)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${!a.is_active ? 'opacity-50' : 'hover:bg-slate-50'} ${selected?.id === a.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#004B46]">{a.name}</td>
                    <td className="px-4 py-3 text-slate-600">{a.region}</td>
                    <td className="px-4 py-3 text-slate-500">{a.city || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{a.contact_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.contact_phone || '—'}</td>
                    <td className="px-4 py-3"><Stars count={a.reliability_score ?? 0} /></td>
                    <td className="px-4 py-3">
                      {!a.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Inactief</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail slide-over */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-50 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">{editing ? 'Bewerken' : 'Agentschap'}</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {editing ? (
                /* Bewerkformulier */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">Naam *</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inp} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Regio *</label><select value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })} className={inp}>{REGIOS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Stad</label><input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} className={inp} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Contactpersoon</label><input value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} className={inp} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Telefoon</label><input value={editForm.contact_phone} onChange={e => setEditForm({ ...editForm, contact_phone: e.target.value })} className={inp} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Email</label><input value={editForm.contact_email} onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })} className={inp} /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">Website</label><input value={editForm.website} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className={inp} /></div>
                  </div>
                  <div><label className="block text-xs text-slate-500 mb-1">Score</label><StarRating value={editForm.reliability_score} onChange={v => setEditForm({ ...editForm, reliability_score: v })} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Commissie-afspraken</label><textarea value={editForm.commission_notes} onChange={e => setEditForm({ ...editForm, commission_notes: e.target.value })} rows={2} className={`${inp} resize-none`} /></div>
                  <div><label className="block text-xs text-slate-500 mb-1">Notities</label><textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={4} className={`${inp} resize-none`} /></div>
                </>
              ) : (
                /* Leesweergave */
                <>
                  <div>
                    <h3 className="text-lg font-bold text-[#004B46]">{selected.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-slate-600">{selected.region}{selected.city ? ` — ${selected.city}` : ''}</span>
                      {!selected.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Inactief</span>}
                    </div>
                    <div className="mt-2"><Stars count={selected.reliability_score ?? 0} /></div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contactgegevens</div>
                    {selected.contact_name && <p className="text-sm text-slate-700">{selected.contact_name}</p>}
                    {selected.contact_phone && (
                      <a href={`tel:${selected.contact_phone}`} className="flex items-center gap-2 text-sm text-[#004B46] hover:underline">
                        <Phone size={13} /> {selected.contact_phone}
                      </a>
                    )}
                    {selected.contact_email && (
                      <a href={`mailto:${selected.contact_email}`} className="flex items-center gap-2 text-sm text-[#004B46] hover:underline">
                        <Mail size={13} /> {selected.contact_email}
                      </a>
                    )}
                    {selected.website && (
                      <a href={selected.website.startsWith('http') ? selected.website : `https://${selected.website}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#004B46] hover:underline">
                        <ExternalLink size={13} /> {selected.website}
                      </a>
                    )}
                  </div>

                  {selected.property_types && selected.property_types.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Type woningen</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.property_types.map(t => (
                          <span key={t} className="text-[10px] bg-[#004B46]/10 text-[#004B46] px-2 py-0.5 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.commission_notes && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Commissie-afspraken</div>
                      <p className="text-sm text-slate-700">{selected.commission_notes}</p>
                    </div>
                  )}

                  {selected.notes && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notities</div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    Laatst bijgewerkt: {new Date(selected.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </>
              )}
            </div>

            {/* Footer acties */}
            {isAdmin && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
                {editing ? (
                  <>
                    <button onClick={saveEdit} disabled={saving}
                      className="bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] disabled:opacity-50 cursor-pointer">
                      {saving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                    <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer">Annuleren</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] cursor-pointer">
                      <Pencil size={13} /> Bewerken
                    </button>
                    <button onClick={() => toggleActive(selected)}
                      className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
                      {selected.is_active ? 'Markeer als inactief' : 'Markeer als actief'}
                    </button>
                    <button onClick={() => deleteAgency(selected.id)}
                      className="ml-auto text-slate-300 hover:text-red-500 p-2 cursor-pointer">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </PageLayout>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} className={i <= count ? 'text-[#F5AF40]' : 'text-slate-200'} fill={i <= count ? 'currentColor' : 'none'} />
      ))}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i === value ? 0 : i)} className="cursor-pointer">
          <Star size={18} className={i <= value ? 'text-[#F5AF40]' : 'text-slate-300 hover:text-[#F5AF40]'} fill={i <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20'
