'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/calculations'
import DateFilter from '@/components/date-filter'
import { DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { useEntity, matchesEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'
import { Pencil, Trash2 } from 'lucide-react'

interface Makelaar { id: string; naam: string }
interface Partner { id: string; naam: string }
interface Afspraak {
  id: string
  datum: string
  lead_naam: string
  bron: string | null
  regio: string | null
  makelaar_id: string | null
  type: string
  status: string
  resultaat: string | null
  notities: string | null
  pipedrive_activiteit_id: number | null
}

interface AdPost {
  bedrag: number
  entiteit: string | null
  kosten_posten: { naam: string } | null
}

const statusColors: Record<string, string> = {
  Gepland: 'bg-blue-100 text-blue-700',
  Uitgevoerd: 'bg-green-100 text-green-700',
  'No-show': 'bg-red-100 text-red-600',
  Geannuleerd: 'bg-slate-100 text-slate-500',
}
const resultaatColors: Record<string, string> = {
  Interesse: 'bg-amber-100 text-amber-700',
  'Bod gedaan': 'bg-purple-100 text-purple-700',
  'Deal gewonnen': 'bg-green-100 text-green-700',
  Afgewezen: 'bg-red-100 text-red-600',
}

const emptyForm = {
  datum: new Date().toISOString().split('T')[0],
  lead_naam: '',
  bron: '',
  regio: '',
  makelaar_id: '',
  partner_id: '',
  type: 'Bezichtiging',
  status: 'Gepland',
  resultaat: '',
  notities: '',
}

const AD_POSTEN = ['Google Ads', 'Meta Ads (Facebook/Instagram)', 'LinkedIn Ads']

export default function AfsprakenPage() {
  const { entity, setEntity } = useEntity()
  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [allAdPosten, setAllAdPosten] = useState<AdPost[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [settings, setSettings] = useState({
    regios: ['CBN', 'CBZ', 'CDS', 'CD', 'CB', 'Valencia'],
    bronnen: ['Website CS', 'Website CSV', 'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Referentie van partner', 'Referentie'],
    afspraak_types: ['Bezichtiging', 'Kennismaking', 'Follow-up', 'Notaris'],
  })
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [aRes, mRes, sRes, kRes, pRes] = await Promise.all([
      supabase.from('afspraken').select('*').order('datum', { ascending: false }),
      supabase.from('makelaars').select('id, naam').eq('actief', true),
      supabase.from('settings').select('key, value'),
      supabase.from('maandkosten')
        .select('bedrag, entiteit, kosten_posten(naam)')
        .eq('jaar', new Date().getFullYear()),
      supabase.from('partners').select('id, naam').eq('actief', true).order('naam'),
    ])

    setAfspraken((aRes.data ?? []) as Afspraak[])
    setMakelaars((mRes.data ?? []) as Makelaar[])
    setPartners((pRes.data ?? []) as Partner[])
    setAllAdPosten((kRes.data ?? []) as unknown as AdPost[])

    if (sRes.data) {
      const map: Record<string, unknown> = {}
      ;(sRes.data as { key: string; value: unknown }[]).forEach((r) => { map[r.key] = r.value })
      setSettings({
        regios: (map.regios as string[]) || settings.regios,
        bronnen: (map.bronnen as string[]) || settings.bronnen,
        afspraak_types: (map.afspraak_types as string[]) || settings.afspraak_types,
      })
    }

    setLoading(false)
  }

  function startEdit(a: Afspraak) {
    setEditingId(a.id)
    setForm({
      datum: a.datum,
      lead_naam: a.lead_naam,
      bron: a.bron ?? '',
      regio: a.regio ?? '',
      makelaar_id: a.makelaar_id ?? '',
      partner_id: (a as unknown as { partner_id?: string }).partner_id ?? '',
      type: a.type,
      status: a.status,
      resultaat: a.resultaat ?? '',
      notities: a.notities ?? '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function saveAfspraak() {
    if (!form.datum || !form.lead_naam) return
    setSaving(true)
    const payload = {
      datum: form.datum,
      lead_naam: form.lead_naam,
      bron: form.bron || null,
      regio: form.regio || null,
      makelaar_id: form.makelaar_id || null,
      partner_id: form.bron === 'Referentie van partner' ? (form.partner_id || null) : null,
      type: form.type,
      status: form.status,
      resultaat: form.resultaat || null,
      notities: form.notities || null,
    }
    if (editingId) {
      await supabase.from('afspraken').update(payload).eq('id', editingId)
      setAfspraken((prev) => prev.map((a) => a.id === editingId ? { ...a, ...payload } as Afspraak : a))
      setEditingId(null)
    } else {
      const { data } = await supabase.from('afspraken').insert(payload).select().single()
      if (data) setAfspraken([data as Afspraak, ...afspraken])
    }
    setForm(emptyForm)
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('afspraken').update({ status }).eq('id', id)
    setAfspraken((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
  }

  async function updateResultaat(id: string, resultaat: string) {
    await supabase.from('afspraken').update({ resultaat: resultaat || null }).eq('id', id)
    setAfspraken((prev) => prev.map((a) => a.id === id ? { ...a, resultaat: resultaat || null } : a))
  }

  async function deleteAfspraak(id: string, naam: string) {
    if (!confirm(`Afspraak met ${naam} verwijderen?`)) return
    await supabase.from('afspraken').delete().eq('id', id)
    setAfspraken((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  const range = getDateRange(datePreset)
  const gefilterd = afspraken
    .filter((a) => matchesEntity(a.regio, entity))
    .filter((a) => isInRange(a.datum, range))

  // Ad spend voor huidige entiteit
  const totaalAdSpend = allAdPosten
    .filter((k) => (k.entiteit ?? 'overig') === entity)
    .filter((k) => k.kosten_posten?.naam && AD_POSTEN.includes(k.kosten_posten.naam))
    .reduce((s, k) => s + Number(k.bedrag), 0)

  // Analytics berekeningen
  const uitgevoerd = gefilterd.filter((a) => a.status === 'Uitgevoerd')
  const deals = gefilterd.filter((a) => a.resultaat === 'Deal gewonnen')
  const kostenPerAfspraak = uitgevoerd.length > 0 ? totaalAdSpend / uitgevoerd.length : 0
  const kostenPerDeal = deals.length > 0 ? totaalAdSpend / deals.length : 0

  // Per bron analytics
  const bronStats = settings.bronnen.map((bron) => {
    const bronAfspraken = gefilterd.filter((a) => a.bron === bron)
    const bronUitgevoerd = bronAfspraken.filter((a) => a.status === 'Uitgevoerd')
    const bronDeals = bronAfspraken.filter((a) => a.resultaat === 'Deal gewonnen')
    return {
      bron,
      afspraken: bronAfspraken.length,
      uitgevoerd: bronUitgevoerd.length,
      deals: bronDeals.length,
      conversie: bronUitgevoerd.length > 0 ? ((bronDeals.length / bronUitgevoerd.length) * 100).toFixed(0) + '%' : '—',
    }
  }).filter((b) => b.afspraken > 0)

  // Per makelaar analytics
  const makelaarStats = makelaars.map((m) => {
    const mAfspraken = gefilterd.filter((a) => a.makelaar_id === m.id)
    const mUitgevoerd = mAfspraken.filter((a) => a.status === 'Uitgevoerd')
    const mDeals = mAfspraken.filter((a) => a.resultaat === 'Deal gewonnen')
    return {
      naam: m.naam,
      afspraken: mAfspraken.length,
      deals: mDeals.length,
      closePct: mUitgevoerd.length > 0 ? ((mDeals.length / mUitgevoerd.length) * 100).toFixed(0) + '%' : '—',
    }
  }).filter((m) => m.afspraken > 0)

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Afspraken</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <EntitySwitch value={entity} onChange={setEntity} />
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* Funnel KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Totaal afspraken" value={gefilterd.length} sub={`${range.label}`} />
        <KpiCard label="Uitgevoerd" value={uitgevoerd.length}
          sub={gefilterd.length > 0 ? `${((uitgevoerd.length / gefilterd.length) * 100).toFixed(0)}% van totaal` : '—'} />
        <KpiCard label="Deal gewonnen" value={deals.length}
          sub={uitgevoerd.length > 0 ? `${((deals.length / uitgevoerd.length) * 100).toFixed(0)}% conversie` : '—'}
          color="green" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Kosten per afspraak" value={kostenPerAfspraak > 0 ? formatEuro(kostenPerAfspraak) : '—'}
          sub="ad spend / afspraken" />
        <KpiCard label="Kosten per deal" value={kostenPerDeal > 0 ? formatEuro(kostenPerDeal) : '—'}
          sub="ad spend / deals" />
        <KpiCard label="Totale ad spend YTD" value={formatEuro(totaalAdSpend)} sub="Google + Meta + LinkedIn" />
      </div>

      {/* Analytics per bron */}
      {bronStats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Per bron</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Bron', 'Afspraken', 'Uitgevoerd', 'Deals', 'Conversie'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bronStats.map((b) => (
                <tr key={b.bron} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{b.bron}</td>
                  <td className="px-4 py-2 text-slate-600">{b.afspraken}</td>
                  <td className="px-4 py-2 text-slate-600">{b.uitgevoerd}</td>
                  <td className="px-4 py-2 text-slate-600">{b.deals}</td>
                  <td className="px-4 py-2 font-medium text-slate-700">{b.conversie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics per makelaar */}
      {makelaarStats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Per consultant</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Consultant', 'Afspraken', 'Deals', 'Close %'].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {makelaarStats.map((m) => (
                <tr key={m.naam} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{m.naam}</td>
                  <td className="px-4 py-2 text-slate-600">{m.afspraken}</td>
                  <td className="px-4 py-2 text-slate-600">{m.deals}</td>
                  <td className="px-4 py-2 font-medium text-slate-700">{m.closePct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoer / Bewerken formulier */}
      <div ref={formRef} className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">
            {editingId ? 'Afspraak bewerken' : 'Nieuwe afspraak'}
          </h2>
          {editingId && (
            <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">
              Annuleren
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Datum *">
            <input type="date" value={form.datum}
              onChange={(e) => setForm({ ...form, datum: e.target.value })} className={inp} />
          </Field>
          <Field label="Lead / klantnaam *">
            <input type="text" placeholder="Naam" value={form.lead_naam}
              onChange={(e) => setForm({ ...form, lead_naam: e.target.value })} className={inp} />
          </Field>
          <Field label="Bron">
            <select value={form.bron} onChange={(e) => setForm({ ...form, bron: e.target.value, partner_id: '' })} className={inp}>
              <option value="">Kies bron</option>
              {settings.bronnen.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          {form.bron === 'Referentie van partner' && (
            <Field label="Partner">
              <select value={form.partner_id} onChange={(e) => setForm({ ...form, partner_id: e.target.value })} className={inp}>
                <option value="">Kies partner</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
              </select>
            </Field>
          )}
          <Field label="Regio">
            <select value={form.regio} onChange={(e) => setForm({ ...form, regio: e.target.value })} className={inp}>
              <option value="">Kies regio</option>
              {settings.regios.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Consultant">
            <select value={form.makelaar_id} onChange={(e) => setForm({ ...form, makelaar_id: e.target.value })} className={inp}>
              <option value="">Geen</option>
              {makelaars.map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
              {settings.afspraak_types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inp}>
              {['Gepland', 'Uitgevoerd', 'No-show', 'Geannuleerd'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Resultaat">
            <select value={form.resultaat} onChange={(e) => setForm({ ...form, resultaat: e.target.value })} className={inp}>
              <option value="">—</option>
              {['Interesse', 'Bod gedaan', 'Deal gewonnen', 'Afgewezen'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Notities">
            <input type="text" value={form.notities}
              onChange={(e) => setForm({ ...form, notities: e.target.value })} className={inp} />
          </Field>
        </div>
        <div className="mt-4">
          <button onClick={saveAfspraak} disabled={saving || !form.lead_naam}
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Opslaan...' : editingId ? 'Wijzigingen opslaan' : 'Afspraak opslaan'}
          </button>
        </div>
      </div>

      {/* Afspraken tabel */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Afspraken ({gefilterd.length})</h2>
          <span className="text-xs text-slate-400">{range.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Datum', 'Naam', 'Bron', 'Regio', 'Type', 'Status', 'Resultaat', 'Notities', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefilterd.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400 text-sm">Geen afspraken in deze periode</td></tr>
              )}
              {gefilterd.map((a) => (
                <tr key={a.id} className={`border-b border-slate-50 hover:bg-slate-50 group ${editingId === a.id ? 'bg-amber-50' : ''}`}>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(a.datum).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {a.lead_naam}
                    {a.pipedrive_activiteit_id && (
                      <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded font-medium">PD</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{a.bron ?? '—'}</td>
                  <td className="px-3 py-2">
                    {a.regio && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{a.regio}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{a.type}</td>
                  <td className="px-3 py-2">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded font-medium border-0 cursor-pointer ${statusColors[a.status] ?? 'bg-slate-100 text-slate-600'}`}
                    >
                      {['Gepland', 'Uitgevoerd', 'No-show', 'Geannuleerd'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={a.resultaat ?? ''}
                      onChange={(e) => updateResultaat(a.id, e.target.value)}
                      className={`text-xs px-2 py-0.5 rounded font-medium border-0 cursor-pointer ${a.resultaat ? (resultaatColors[a.resultaat] ?? 'bg-slate-100 text-slate-600') : 'text-slate-300'}`}
                    >
                      <option value="">—</option>
                      {['Interesse', 'Bod gedaan', 'Deal gewonnen', 'Afgewezen'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-xs max-w-[150px] truncate">{a.notities ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(a)}
                        className={`p-1 ${editingId === a.id ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteAfspraak(a.id, a.lead_naam)}
                        className="p-1 text-slate-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${color === 'green' ? 'text-green-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
