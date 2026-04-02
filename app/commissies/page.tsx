'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import DateFilter from '@/components/date-filter'
import { DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { Plus, Trash2 } from 'lucide-react'
import { useEntity, matchesEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'

interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
}

interface Deal {
  id: string
  datum_passering: string
  aankoopprijs: number
  bruto_commissie: number | null
  makelaar_id: string | null
  makelaar_commissie: number | null
  makelaar2_id: string | null
  makelaar2_commissie: number | null
  area_manager_id: string | null
  area_manager_commissie: number | null
  netto_commissie_cs: number | null
  regio: string | null
}

interface Uitbetaling {
  id: string
  deal_id: string
  makelaar_id: string
  bedrag: number
  status: string
  uitbetaald_op: string | null
}

interface WervingBonus {
  id: string
  aanbrenger_id: string | null
  aangebrachte_id: string | null
  startdatum: string
  mijlpaal_1_uitbetaald: boolean
  mijlpaal_1_datum: string | null
  mijlpaal_2_uitbetaald: boolean
  mijlpaal_2_datum: string | null
  notities: string | null
}

const emptyBonus = { aanbrenger_id: '', aangebrachte_id: '', startdatum: '', notities: '' }

export default function CommissiesPage() {
  const { entity, setEntity } = useEntity()
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [uitbetalingen, setUitbetalingen] = useState<Uitbetaling[]>([])
  const [wervingBonussen, setWervingBonussen] = useState<WervingBonus[]>([])
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [newBonus, setNewBonus] = useState(emptyBonus)
  const [savingBonus, setSavingBonus] = useState(false)

  useEffect(() => {
    async function load() {
      const [mRes, dRes, uRes, wRes] = await Promise.all([
        supabase.from('makelaars').select('id, naam, rol, area_manager_id').eq('actief', true),
        supabase.from('deals').select('id, datum_passering, aankoopprijs, bruto_commissie, makelaar_id, makelaar_commissie, makelaar2_id, makelaar2_commissie, area_manager_id, area_manager_commissie, netto_commissie_cs, regio').order('datum_passering', { ascending: false }),
        supabase.from('commissie_uitbetalingen').select('*'),
        supabase.from('werving_bonussen').select('*').order('startdatum', { ascending: false }),
      ])
      setMakelaars((mRes.data ?? []) as Makelaar[])
      setDeals((dRes.data ?? []) as Deal[])
      setUitbetalingen((uRes.data ?? []) as Uitbetaling[])
      setWervingBonussen((wRes.data ?? []) as WervingBonus[])
      setLoading(false)
    }
    load()
  }, [])

  async function toggleStatus(uitbetaling: Uitbetaling) {
    const newStatus = uitbetaling.status === 'Open' ? 'Uitbetaald' : 'Open'
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'Uitbetaald') updates.uitbetaald_op = new Date().toISOString().split('T')[0]
    else updates.uitbetaald_op = null
    await supabase.from('commissie_uitbetalingen').update(updates).eq('id', uitbetaling.id)
    setUitbetalingen(prev => prev.map(u => u.id === uitbetaling.id ? { ...u, ...updates } as Uitbetaling : u))
  }

  async function createUitbetaling(deal: Deal) {
    if (!deal.makelaar_id || !deal.makelaar_commissie) return
    const exists = uitbetalingen.find(u => u.deal_id === deal.id)
    if (exists) return
    const { data } = await supabase.from('commissie_uitbetalingen').insert({
      deal_id: deal.id, makelaar_id: deal.makelaar_id, bedrag: deal.makelaar_commissie, status: 'Open',
    }).select().single()
    if (data) setUitbetalingen(prev => [...prev, data as Uitbetaling])
  }

  async function toggleMijlpaal(id: string, mijlpaal: 1 | 2, huidig: boolean) {
    const field = mijlpaal === 1 ? 'mijlpaal_1_uitbetaald' : 'mijlpaal_2_uitbetaald'
    const datumField = mijlpaal === 1 ? 'mijlpaal_1_datum' : 'mijlpaal_2_datum'
    const updates: Record<string, unknown> = { [field]: !huidig }
    updates[datumField] = !huidig ? new Date().toISOString().split('T')[0] : null
    await supabase.from('werving_bonussen').update(updates).eq('id', id)
    setWervingBonussen(prev => prev.map(w => w.id === id ? { ...w, ...updates } as WervingBonus : w))
  }

  async function addBonus() {
    if (!newBonus.startdatum) return
    setSavingBonus(true)
    const { data } = await supabase.from('werving_bonussen').insert({
      aanbrenger_id: newBonus.aanbrenger_id || null,
      aangebrachte_id: newBonus.aangebrachte_id || null,
      startdatum: newBonus.startdatum,
      notities: newBonus.notities || null,
    }).select().single()
    if (data) setWervingBonussen(prev => [data as WervingBonus, ...prev])
    setNewBonus(emptyBonus)
    setSavingBonus(false)
  }

  async function deleteBonus(id: string) {
    if (!confirm('Bonus verwijderen?')) return
    await supabase.from('werving_bonussen').delete().eq('id', id)
    setWervingBonussen(prev => prev.filter(w => w.id !== id))
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  const range = getDateRange(datePreset)
  const filteredDeals = deals.filter(d => matchesEntity(d.regio, entity) && isInRange(d.datum_passering, range))
  const chartJaar = range.from ? range.from.getFullYear() : new Date().getFullYear()

  // Stats per consultant
  const stats = makelaars.map((m) => {
    const mDeals = filteredDeals.filter(d => d.makelaar_id === m.id || d.makelaar2_id === m.id)
    const totaalMak = filteredDeals
      .filter(d => d.makelaar_id === m.id).reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0)
      + filteredDeals.filter(d => d.makelaar2_id === m.id).reduce((s, d) => s + Number(d.makelaar2_commissie ?? 0), 0)
    const totaalAankoop = mDeals.reduce((s, d) => s + Number(d.aankoopprijs), 0)
    const totaalBruto = mDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
    return {
      makelaar: m,
      deals: mDeals.length,
      aankoopwaarde: totaalAankoop,
      bruto_commissie: totaalBruto,
      makelaar_commissie: totaalMak,
      gem_per_deal: mDeals.length > 0 ? totaalMak / mDeals.length : 0,
      pct_van_totaal: filteredDeals.length > 0 ? (mDeals.length / filteredDeals.length) * 100 : 0,
    }
  }).filter(s => s.deals > 0)

  // Area manager stats
  const areaManagers = makelaars.filter(m => m.rol === 'area_manager')
  const areaManagerStats = areaManagers.map(am => {
    const amDeals = filteredDeals.filter(d => d.area_manager_id === am.id)
    const totaalCommissie = amDeals.reduce((s, d) => s + Number(d.area_manager_commissie ?? 0), 0)
    const totaalCSAandeel = amDeals.reduce((s, d) => {
      const bruto = Number(d.bruto_commissie ?? 0)
      const mak = Number(d.makelaar_commissie ?? 0) + Number(d.makelaar2_commissie ?? 0)
      return s + (bruto - mak)
    }, 0)
    const kpiDeals = amDeals.filter(d => d.area_manager_commissie && Number(d.bruto_commissie) > 0
      ? Number(d.area_manager_commissie) / (Number(d.bruto_commissie) - Number(d.makelaar_commissie ?? 0) - Number(d.makelaar2_commissie ?? 0)) > 0.12
      : false).length
    return { am, deals: amDeals.length, totaalCommissie, totaalCSAandeel, kpiDeals }
  }).filter(s => s.deals > 0)

  // Commissie per maand per consultant
  const commissiePerMaand = makelaars.filter(m => m.rol !== 'area_manager').map((m) => {
    const perMaand = MAANDEN.map((_, i) => {
      const mnd1 = filteredDeals.filter(d => d.makelaar_id === m.id && new Date(d.datum_passering).getMonth() === i && new Date(d.datum_passering).getFullYear() === chartJaar)
      const mnd2 = filteredDeals.filter(d => d.makelaar2_id === m.id && new Date(d.datum_passering).getMonth() === i && new Date(d.datum_passering).getFullYear() === chartJaar)
      return mnd1.reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0)
        + mnd2.reduce((s, d) => s + Number(d.makelaar2_commissie ?? 0), 0)
    })
    const totaal = perMaand.reduce((s, v) => s + v, 0)
    return { makelaar: m, perMaand, totaal }
  }).filter(r => r.totaal > 0)

  // Uitbetaalstatus
  const dealsMetCommissie = filteredDeals.filter(d => d.makelaar_id && Number(d.makelaar_commissie) > 0)

  // Werving bonussen verrijkt
  const salesPerMakelaar: Record<string, number> = {}
  deals.forEach(d => {
    if (d.makelaar_id) salesPerMakelaar[d.makelaar_id] = (salesPerMakelaar[d.makelaar_id] ?? 0) + 1
    if (d.makelaar2_id) salesPerMakelaar[d.makelaar2_id] = (salesPerMakelaar[d.makelaar2_id] ?? 0) + 1
  })

  const wervingVerrijkt = wervingBonussen.map(w => {
    const aanbrenger = makelaars.find(m => m.id === w.aanbrenger_id)
    const aangebrachte = makelaars.find(m => m.id === w.aangebrachte_id)
    const sales = w.aangebrachte_id ? (salesPerMakelaar[w.aangebrachte_id] ?? 0) : 0
    const maandenActief = Math.floor((Date.now() - new Date(w.startdatum).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    return {
      ...w,
      aanbrenger,
      aangebrachte,
      sales,
      maandenActief,
      mijlpaal1Bereikt: maandenActief >= 6 && sales >= 1,
      mijlpaal2Bereikt: maandenActief >= 12 && sales >= 5,
    }
  })

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Commissies</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <EntitySwitch value={entity} onChange={setEntity} />
          <DateFilter value={datePreset} onChange={setDatePreset} />
        </div>
      </div>

      {/* Overzicht per consultant */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Overzicht per consultant</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Consultant', 'Sales', 'Aankoopwaarde', 'Bruto commissie', 'Commissie consultant', 'Gem. per sale', '% van sales'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-sm">Nog geen sales met makelaarscommissie</td></tr>
            )}
            {stats.map(s => (
              <tr key={s.makelaar.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800">{s.makelaar.naam}</td>
                <td className="px-4 py-2 text-slate-600">{s.deals}</td>
                <td className="px-4 py-2 text-slate-600">{formatEuro(s.aankoopwaarde)}</td>
                <td className="px-4 py-2 text-slate-600">{formatEuro(s.bruto_commissie)}</td>
                <td className="px-4 py-2 font-semibold text-slate-800">{formatEuro(s.makelaar_commissie)}</td>
                <td className="px-4 py-2 text-slate-600">{formatEuro(s.gem_per_deal)}</td>
                <td className="px-4 py-2 text-slate-500">{s.pct_van_totaal.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Area manager commissies */}
      {areaManagerStats.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Area manager commissies</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Area manager', 'Team deals', 'Totaal CS aandeel', 'Area mgr commissie', 'Gem. %'].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areaManagerStats.map(s => (
                <tr key={s.am.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800">{s.am.naam}</td>
                  <td className="px-4 py-2 text-slate-600">{s.deals}</td>
                  <td className="px-4 py-2 text-slate-600">{formatEuro(s.totaalCSAandeel)}</td>
                  <td className="px-4 py-2 font-semibold text-amber-700">{formatEuro(s.totaalCommissie)}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {s.totaalCSAandeel > 0 ? `${((s.totaalCommissie / s.totaalCSAandeel) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commissie per maand */}
      {commissiePerMaand.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Commissie per maand — {range.label}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Consultant</th>
                  {MAANDEN.map(m => (
                    <th key={m} className="text-right px-2 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{m}</th>
                  ))}
                  <th className="text-right px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Totaal</th>
                </tr>
              </thead>
              <tbody>
                {commissiePerMaand.map(r => (
                  <tr key={r.makelaar.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-700">{r.makelaar.naam}</td>
                    {r.perMaand.map((v, i) => (
                      <td key={i} className="px-2 py-2 text-right text-slate-600 text-xs whitespace-nowrap">
                        {v > 0 ? formatEuro(v) : '—'}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">{formatEuro(r.totaal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Uitbetaalstatus */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Uitbetaalstatus consultants</h2>
          <span className="text-xs text-slate-400">Klik op status om te wijzigen</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Deal #', 'Datum', 'Consultant', 'Bedrag', 'Status', 'Uitbetaald op', ''].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dealsMetCommissie.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-sm">Geen deals met makelaarscommissie</td></tr>
            )}
            {dealsMetCommissie.map(deal => {
              const makelaar = makelaars.find(m => m.id === deal.makelaar_id)
              const uitbetaling = uitbetalingen.find(u => u.deal_id === deal.id)
              return (
                <tr key={deal.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500 text-xs">#{deal.id.slice(-4)}</td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(deal.datum_passering).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{makelaar?.naam ?? '—'}</td>
                  <td className="px-4 py-2 font-semibold text-slate-800">{formatEuro(deal.makelaar_commissie)}</td>
                  <td className="px-4 py-2">
                    {uitbetaling ? (
                      <button onClick={() => toggleStatus(uitbetaling)}
                        className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                          uitbetaling.status === 'Uitbetaald'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}>
                        {uitbetaling.status}
                      </button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {uitbetaling?.uitbetaald_op ? new Date(uitbetaling.uitbetaald_op).toLocaleDateString('nl-NL') : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {!uitbetaling && (
                      <button onClick={() => createUitbetaling(deal)} className="text-xs text-blue-500 hover:text-blue-700">
                        Aanmaken
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Werving bonussen */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Recruitment bonussen</h2>
        </div>

        {/* Nieuw bonus formulier */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Aanbrenger</label>
              <select value={newBonus.aanbrenger_id}
                onChange={e => setNewBonus({ ...newBonus, aanbrenger_id: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none">
                <option value="">Kies consultant</option>
                {makelaars.map(m => <option key={m.id} value={m.id}>{m.naam}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Aangebrachte consultant</label>
              <select value={newBonus.aangebrachte_id}
                onChange={e => setNewBonus({ ...newBonus, aangebrachte_id: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none">
                <option value="">Kies consultant</option>
                {makelaars.map(m => <option key={m.id} value={m.id}>{m.naam}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Startdatum *</label>
              <input type="date" value={newBonus.startdatum}
                onChange={e => setNewBonus({ ...newBonus, startdatum: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={addBonus} disabled={savingBonus || !newBonus.startdatum}
                className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded text-sm hover:bg-slate-700 disabled:opacity-50">
                <Plus size={13} /> Toevoegen
              </button>
            </div>
          </div>
        </div>

        {/* Bonussen tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Aanbrenger', 'Aangebrachte', 'Start', 'Maanden', 'Sales', 'Mijlpaal 1 (6m+1)', 'Mijlpaal 2 (12m+5)', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wervingVerrijkt.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400 text-sm">Nog geen recruitment bonussen geregistreerd</td></tr>
              )}
              {wervingVerrijkt.map(w => (
                <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{w.aanbrenger?.naam ?? '—'}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{w.aangebrachte?.naam ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(w.startdatum).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{w.maandenActief}</td>
                  <td className="px-4 py-2 text-slate-600">{w.sales}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleMijlpaal(w.id, 1, w.mijlpaal_1_uitbetaald)}
                      className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                        w.mijlpaal_1_uitbetaald
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : w.mijlpaal1Bereikt
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                      {w.mijlpaal_1_uitbetaald ? `Uitbetaald ${w.mijlpaal_1_datum ? new Date(w.mijlpaal_1_datum).toLocaleDateString('nl-NL') : ''}` : w.mijlpaal1Bereikt ? 'Bereikt — €5.000' : 'Niet bereikt'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleMijlpaal(w.id, 2, w.mijlpaal_2_uitbetaald)}
                      className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                        w.mijlpaal_2_uitbetaald
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : w.mijlpaal2Bereikt
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                      {w.mijlpaal_2_uitbetaald ? `Uitbetaald ${w.mijlpaal_2_datum ? new Date(w.mijlpaal_2_datum).toLocaleDateString('nl-NL') : ''}` : w.mijlpaal2Bereikt ? 'Bereikt — €5.000' : 'Niet bereikt'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => deleteBonus(w.id)} className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
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
