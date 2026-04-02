'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { berekenCommissie, formatEuro, formatPct } from '@/lib/calculations'
import DateFilter from '@/components/date-filter'
import { DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { Pencil, Trash2 } from 'lucide-react'

interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
}

interface Deal {
  id: string
  deal_nummer: number
  datum_passering: string
  regio: string
  type_deal: string
  bron: string
  aankoopprijs: number
  commissie_pct: number | null
  min_fee_toegepast: boolean
  bruto_commissie: number | null
  eigen_netwerk: boolean | null
  makelaar_id: string | null
  makelaar_pct: number
  makelaar_commissie: number | null
  is_overdracht: boolean | null
  overdracht_scenario: string | null
  makelaar2_id: string | null
  makelaar2_pct: number | null
  makelaar2_commissie: number | null
  area_manager_id: string | null
  area_manager_kpi: boolean | null
  area_manager_commissie: number | null
  partner_deal: boolean
  partner_naam: string | null
  partner_pct: number
  partner_commissie: number | null
  netto_commissie_cs: number | null
  notities: string | null
  pipedrive_deal_id?: number | null
}

interface AppSettings {
  minimum_fee: number
  commissie_per_type: Record<string, number>
  regios: string[]
  deal_types: string[]
  bronnen: string[]
}

const OVERDRACHT_SCENARIOS = [
  { value: 'standaard', label: 'Standaard (20% / 20%)', m1: 20, m2: 20 },
  { value: 'eigen_netwerk', label: 'Eigen netwerk overdracht (15% / 40%)', m1: 15, m2: 40 },
  { value: 'tweede_aankoop', label: 'Tweede aankoop andere regio (5% / 35%)', m1: 5, m2: 35 },
  { value: 'custom', label: 'Aangepast (vrije verdeling)', m1: null, m2: null },
]

const emptyForm = {
  datum_passering: new Date().toISOString().split('T')[0],
  regio: '',
  type_deal: '',
  bron: '',
  aankoopprijs: '' as string | number,
  commissie_pct: '' as string | number,
  eigen_netwerk: false,
  makelaar_id: '',
  makelaar_pct: 40,
  is_overdracht: false,
  overdracht_scenario: 'standaard',
  makelaar2_id: '',
  makelaar2_pct: 0,
  area_manager_kpi: false,
  partner_deal: false,
  partner_naam: '',
  partner_pct: 20,
  skip_min_fee: false,
  notities: '',
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [appSettings, setAppSettings] = useState<AppSettings>({
    minimum_fee: 6000,
    commissie_per_type: {},
    regios: [],
    deal_types: [],
    bronnen: [],
  })
  const [form, setForm] = useState(emptyForm)
  const [editingDealId, setEditingDealId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [dealsRes, makelaarRes, settingsRes] = await Promise.all([
      supabase.from('deals').select('*').order('datum_passering', { ascending: false }),
      supabase.from('makelaars').select('id, naam, rol, area_manager_id').eq('actief', true),
      supabase.from('settings').select('key, value'),
    ])
    setDeals((dealsRes.data ?? []) as Deal[])
    setMakelaars((makelaarRes.data ?? []) as Makelaar[])
    if (settingsRes.data) {
      const map: Record<string, unknown> = {}
      ;(settingsRes.data as { key: string; value: unknown }[]).forEach((r) => { map[r.key] = r.value })
      setAppSettings({
        minimum_fee: Number(map.minimum_fee) || 6000,
        commissie_per_type: (map.commissie_per_type as Record<string, number>) || {},
        regios: (map.regios as string[]) || [],
        deal_types: (map.deal_types as string[]) || [],
        bronnen: (map.bronnen as string[]) || [],
      })
    }
    setLoading(false)
  }

  // Bepaal area manager voor geselecteerde makelaar
  function getAreaManager() {
    const makelaar = makelaars.find(m => m.id === form.makelaar_id)
    if (!makelaar?.area_manager_id) return null
    return makelaars.find(m => m.id === makelaar.area_manager_id) ?? null
  }

  function bereken() {
    if (!form.aankoopprijs || !form.type_deal) return null
    const areaManager = getAreaManager()
    const area_manager_pct = areaManager ? (form.area_manager_kpi ? 0.15 : 0.10) : 0

    return berekenCommissie({
      aankoopprijs: Number(form.aankoopprijs),
      commissie_pct: form.commissie_pct !== '' ? Number(form.commissie_pct) / 100 : null,
      type_deal: form.type_deal,
      eigen_netwerk: form.eigen_netwerk,
      makelaar_pct: form.makelaar_pct / 100,
      is_overdracht: form.is_overdracht,
      overdracht_scenario: form.is_overdracht ? form.overdracht_scenario as 'standaard' | 'eigen_netwerk' | 'tweede_aankoop' | 'custom' : null,
      makelaar2_pct: form.makelaar2_pct / 100,
      partner_deal: form.partner_deal,
      partner_pct: form.partner_pct / 100,
      area_manager_pct,
      commissie_per_type: appSettings.commissie_per_type,
      minimum_fee: appSettings.minimum_fee,
      skip_min_fee: form.skip_min_fee,
    })
  }

  async function saveDeal() {
    if (!form.datum_passering || !form.regio || !form.type_deal || !form.bron || !form.aankoopprijs) return
    setSaving(true)
    const calc = bereken()
    if (!calc) { setSaving(false); return }

    const areaManager = getAreaManager()

    const payload = {
      datum_passering: form.datum_passering,
      regio: form.regio,
      type_deal: form.type_deal,
      bron: form.bron,
      aankoopprijs: Number(form.aankoopprijs),
      commissie_pct: form.commissie_pct !== '' ? Number(form.commissie_pct) / 100 : null,
      min_fee_toegepast: calc.min_fee_toegepast,
      bruto_commissie: calc.bruto_commissie,
      eigen_netwerk: form.eigen_netwerk,
      makelaar_id: form.makelaar_id || null,
      makelaar_pct: calc.makelaar_pct_effectief,
      makelaar_commissie: calc.makelaar_commissie,
      is_overdracht: form.is_overdracht,
      overdracht_scenario: form.is_overdracht ? form.overdracht_scenario : null,
      makelaar2_id: form.is_overdracht && form.makelaar2_id ? form.makelaar2_id : null,
      makelaar2_pct: calc.makelaar2_pct_effectief,
      makelaar2_commissie: calc.makelaar2_commissie > 0 ? calc.makelaar2_commissie : null,
      area_manager_id: areaManager?.id ?? null,
      area_manager_kpi: form.area_manager_kpi,
      area_manager_commissie: calc.area_manager_commissie > 0 ? calc.area_manager_commissie : null,
      partner_deal: form.partner_deal,
      partner_naam: form.partner_naam || null,
      partner_pct: calc.partner_commissie > 0 ? form.partner_pct / 100 : 0,
      partner_commissie: calc.partner_commissie > 0 ? calc.partner_commissie : null,
      netto_commissie_cs: calc.netto_commissie_cs,
      notities: form.notities || null,
    }

    let error
    if (editingDealId) {
      ;({ error } = await supabase.from('deals').update(payload).eq('id', editingDealId))
    } else {
      ;({ error } = await supabase.from('deals').insert(payload))
    }
    if (!error) {
      setEditingDealId(null)
      setForm(emptyForm)
      await loadAll()
    }
    setSaving(false)
  }

  async function deleteDeal(id: string) {
    if (!confirm('Deal verwijderen?')) return
    await supabase.from('deals').delete().eq('id', id)
    setDeals(deals.filter((d) => d.id !== id))
  }

  function startEdit(deal: Deal) {
    setEditingDealId(deal.id)
    setForm({
      datum_passering: deal.datum_passering,
      regio: deal.regio,
      type_deal: deal.type_deal,
      bron: deal.bron,
      aankoopprijs: deal.aankoopprijs,
      commissie_pct: deal.commissie_pct != null ? Number((deal.commissie_pct * 100).toFixed(2)) : '',
      eigen_netwerk: deal.eigen_netwerk ?? false,
      makelaar_id: deal.makelaar_id ?? '',
      makelaar_pct: Math.round((deal.makelaar_pct ?? 0) * 100),
      is_overdracht: deal.is_overdracht ?? false,
      overdracht_scenario: deal.overdracht_scenario ?? 'standaard',
      makelaar2_id: deal.makelaar2_id ?? '',
      makelaar2_pct: Math.round((deal.makelaar2_pct ?? 0) * 100),
      area_manager_kpi: deal.area_manager_kpi ?? false,
      partner_deal: deal.partner_deal,
      partner_naam: deal.partner_naam ?? '',
      partner_pct: Math.round((deal.partner_pct ?? 0) * 100),
      // skip_min_fee: true wanneer min fee NIET toegepast is maar bruto < minimum fee
      // (betekent: gebruiker heeft hem uitgeschakeld)
      skip_min_fee: !deal.min_fee_toegepast && Number(deal.bruto_commissie ?? 0) < appSettings.minimum_fee,
      notities: deal.notities ?? '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cancelEdit() {
    setEditingDealId(null)
    setForm(emptyForm)
  }

  const preview = bereken()
  const areaManager = getAreaManager()
  const range = getDateRange(datePreset)
  const filteredDeals = deals.filter((d) => isInRange(d.datum_passering, range))

  // Bepaal effectieve percentages voor display in formulier
  const scenarioInfo = OVERDRACHT_SCENARIOS.find(s => s.value === form.overdracht_scenario)
  const displayM1 = form.is_overdracht && scenarioInfo?.m1 != null ? scenarioInfo.m1 : form.eigen_netwerk ? 55 : form.makelaar_pct
  const displayM2 = form.is_overdracht && scenarioInfo?.m2 != null ? scenarioInfo.m2 : form.makelaar2_pct

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
        <DateFilter value={datePreset} onChange={setDatePreset} />
      </div>

      {/* Invoerformulier */}
      <div
        ref={formRef}
        className={`bg-white rounded-lg border p-5 mb-6 ${editingDealId ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">
            {editingDealId ? 'Sale bewerken' : 'Nieuwe sale'}
          </h2>
          {editingDealId && (
            <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1 rounded-md">
              Annuleren
            </button>
          )}
        </div>

        {/* Basisvelden */}
        <div className="grid grid-cols-3 gap-4">
          <Field label="Datum passering *">
            <input type="date" value={form.datum_passering}
              onChange={(e) => setForm({ ...form, datum_passering: e.target.value })}
              className={inp} />
          </Field>
          <Field label="Regio *">
            <select value={form.regio} onChange={(e) => setForm({ ...form, regio: e.target.value })} className={inp}>
              <option value="">Kies regio</option>
              {appSettings.regios.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Type sale *">
            <select value={form.type_deal} onChange={(e) => setForm({ ...form, type_deal: e.target.value })} className={inp}>
              <option value="">Kies type</option>
              {appSettings.deal_types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Bron *">
            <select value={form.bron} onChange={(e) => setForm({ ...form, bron: e.target.value })} className={inp}>
              <option value="">Kies bron</option>
              {appSettings.bronnen.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Aankoopprijs (€) *">
            <input type="number" placeholder="0" value={form.aankoopprijs}
              onChange={(e) => setForm({ ...form, aankoopprijs: e.target.value })}
              className={inp} />
          </Field>
          <Field label="Commissie % (leeg = auto)">
            <input type="number" step="0.1" placeholder="auto" value={form.commissie_pct}
              onChange={(e) => setForm({ ...form, commissie_pct: e.target.value })}
              className={inp} />
          </Field>
          <Field label="Minimum fee">
            <label className="flex items-center gap-2 h-[34px] text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!form.skip_min_fee}
                onChange={(e) => setForm({ ...form, skip_min_fee: !e.target.checked })}
                className="rounded border-slate-300" />
              Toepassen
              <span className="text-xs text-slate-400">(€{appSettings.minimum_fee.toLocaleString('nl-NL')})</span>
            </label>
          </Field>
          <Field label="Notities">
            <input type="text" value={form.notities}
              onChange={(e) => setForm({ ...form, notities: e.target.value })}
              className={inp} />
          </Field>
        </div>

        {/* Commissieverdeling */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Commissieverdeling</div>

          {/* Makelaar 1 */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Field label="Consultant">
              <select value={form.makelaar_id}
                onChange={(e) => setForm({ ...form, makelaar_id: e.target.value, area_manager_kpi: false })}
                className={inp}>
                <option value="">Geen / Costa Select</option>
                {makelaars.map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
              </select>
            </Field>
            <Field label={`Consultant % ${form.eigen_netwerk ? '(eigen netwerk)' : form.is_overdracht && form.overdracht_scenario !== 'custom' ? '(auto)' : ''}`}>
              {form.eigen_netwerk || (form.is_overdracht && form.overdracht_scenario !== 'custom') ? (
                <div className={`${inp} bg-slate-50 text-slate-500`}>{displayM1}%</div>
              ) : (
                <input type="number" step="1" min="0" max="100" value={form.makelaar_pct}
                  onChange={(e) => setForm({ ...form, makelaar_pct: Number(e.target.value) })}
                  className={inp} />
              )}
            </Field>
            <div className="flex items-end gap-4 pb-0.5">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={form.eigen_netwerk}
                  onChange={(e) => setForm({ ...form, eigen_netwerk: e.target.checked, is_overdracht: e.target.checked ? false : form.is_overdracht })}
                  className="rounded border-slate-300" />
                Eigen netwerk sale
                <span className="text-xs text-slate-400">(55/45)</span>
              </label>
            </div>
          </div>

          {/* Area manager info */}
          {areaManager && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-md flex items-center justify-between">
              <div className="text-sm text-amber-800">
                <span className="font-medium">Area manager:</span> {areaManager.naam} — ontvangt {form.area_manager_kpi ? '15%' : '10%'} van CS aandeel
              </div>
              <label className="flex items-center gap-2 text-xs text-amber-700 cursor-pointer">
                <input type="checkbox" checked={form.area_manager_kpi}
                  onChange={(e) => setForm({ ...form, area_manager_kpi: e.target.checked })}
                  className="rounded border-amber-300" />
                KPI behaald (15%)
              </label>
            </div>
          )}

          {/* Overdracht toggle */}
          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.is_overdracht}
                onChange={(e) => setForm({ ...form, is_overdracht: e.target.checked, eigen_netwerk: e.target.checked ? false : form.eigen_netwerk })}
                className="rounded border-slate-300" />
              Overdracht sale
              <span className="text-xs text-slate-400">(split tussen twee consultants)</span>
            </label>
          </div>

          {form.is_overdracht && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <Field label="Scenario">
                <select value={form.overdracht_scenario}
                  onChange={(e) => setForm({ ...form, overdracht_scenario: e.target.value })}
                  className={inp}>
                  {OVERDRACHT_SCENARIOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <Field label="Tweede consultant">
                <select value={form.makelaar2_id}
                  onChange={(e) => setForm({ ...form, makelaar2_id: e.target.value })}
                  className={inp}>
                  <option value="">Kies consultant</option>
                  {makelaars.filter(m => m.id !== form.makelaar_id).map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
                </select>
              </Field>
              {form.overdracht_scenario === 'custom' ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Consultant 1 %">
                    <input type="number" step="1" min="0" max="100" value={form.makelaar_pct}
                      onChange={(e) => setForm({ ...form, makelaar_pct: Number(e.target.value) })}
                      className={inp} />
                  </Field>
                  <Field label="Consultant 2 %">
                    <input type="number" step="1" min="0" max="100" value={form.makelaar2_pct}
                      onChange={(e) => setForm({ ...form, makelaar2_pct: Number(e.target.value) })}
                      className={inp} />
                  </Field>
                </div>
              ) : (
                <Field label="Verdeling">
                  <div className={`${inp} bg-white text-slate-500`}>{displayM1}% / {displayM2}%</div>
                </Field>
              )}
            </div>
          )}
        </div>

        {/* Partner deal */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mb-3">
            <input type="checkbox" checked={form.partner_deal}
              onChange={(e) => setForm({ ...form, partner_deal: e.target.checked })}
              className="rounded border-slate-300" />
            Referral partner deal
            <span className="text-xs text-slate-400">(partner krijgt % van CS aandeel)</span>
          </label>
          {form.partner_deal && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Partner naam">
                <input type="text" value={form.partner_naam}
                  onChange={(e) => setForm({ ...form, partner_naam: e.target.value })}
                  className={inp} />
              </Field>
              <Field label="Partner % van CS aandeel">
                <input type="number" step="1" min="0" max="100" value={form.partner_pct}
                  onChange={(e) => setForm({ ...form, partner_pct: Number(e.target.value) })}
                  className={inp} />
              </Field>
            </div>
          )}
        </div>

        {/* Preview berekening */}
        {preview && (
          <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Berekening</div>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <PreviewItem label="Bruto commissie" value={formatEuro(preview.bruto_commissie)}
                sub={preview.min_fee_toegepast ? 'min fee' : `${(preview.commissie_pct * 100).toFixed(1)}%`} />
              {preview.makelaar_commissie > 0 && (
                <PreviewItem
                  label={`Consultant${form.is_overdracht ? ' 1' : ''} (${(preview.makelaar_pct_effectief * 100).toFixed(0)}%)`}
                  value={formatEuro(preview.makelaar_commissie)} />
              )}
              {preview.makelaar2_commissie > 0 && (
                <PreviewItem
                  label={`Consultant 2 (${(preview.makelaar2_pct_effectief * 100).toFixed(0)}%)`}
                  value={formatEuro(preview.makelaar2_commissie)} />
              )}
              <PreviewItem label="CS aandeel" value={formatEuro(preview.cs_aandeel)}
                sub={`${(100 - (preview.makelaar_pct_effectief + preview.makelaar2_pct_effectief) * 100).toFixed(0)}%`} />
              {preview.partner_commissie > 0 && (
                <PreviewItem label={`Partner (${form.partner_pct}% v. CS)`} value={formatEuro(preview.partner_commissie)} />
              )}
              {preview.area_manager_commissie > 0 && (
                <PreviewItem label={`Area mgr (${form.area_manager_kpi ? '15' : '10'}% v. CS)`} value={formatEuro(preview.area_manager_commissie)} />
              )}
              <PreviewItem label="Netto omzet CS" value={formatEuro(preview.netto_commissie_cs)} highlight />
            </div>
          </div>
        )}

        <div className="mt-4">
          <button onClick={saveDeal} disabled={saving}
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Opslaan...' : editingDealId ? 'Wijzigingen opslaan' : 'Sale opslaan'}
          </button>
        </div>
      </div>

      {/* Deals tabel */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Sales ({filteredDeals.length})</h2>
          <span className="text-xs text-slate-400">{range.label}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['#', 'Datum', 'Regio', 'Type', 'Bron', 'Aankoopprijs', 'Comm%', 'Bruto', 'Consultant(s)', 'CS netto', 'Notities', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDeals.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-6 text-center text-slate-400 text-sm">Geen deals in deze periode</td></tr>
              )}
              {filteredDeals.map((deal) => {
                const m1 = makelaars.find((m) => m.id === deal.makelaar_id)
                const m2 = makelaars.find((m) => m.id === deal.makelaar2_id)
                const isEditing = editingDealId === deal.id
                return (
                  <tr key={deal.id} className={`border-b border-slate-50 ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2 text-slate-500">{deal.deal_nummer}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(deal.datum_passering).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{deal.regio}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{deal.type_deal}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-[100px] truncate">{deal.bron}</td>
                    <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{formatEuro(deal.aankoopprijs)}</td>
                    <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
                      {formatPct(deal.commissie_pct)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{formatEuro(deal.bruto_commissie)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          {deal.eigen_netwerk && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-medium">EN</span>
                          )}
                          {deal.is_overdracht && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-medium">OD</span>
                          )}
                          <span>{m1?.naam?.split(' ')[0] ?? '—'}</span>
                          {m1 && <span className="text-xs text-slate-400">({formatPct(deal.makelaar_pct)})</span>}
                        </div>
                        {m2 && (
                          <div className="text-xs text-slate-500">
                            {m2.naam.split(' ')[0]} <span className="text-slate-400">({formatPct(deal.makelaar2_pct)})</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-600 whitespace-nowrap">
                      {formatEuro(deal.netto_commissie_cs)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">
                      <div className="flex items-center gap-1">
                        {deal.pipedrive_deal_id && (
                          <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0">PD</span>
                        )}
                        <span className="truncate">{deal.notities ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(deal)} className={`p-1 ${isEditing ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deleteDeal(deal.id)} className="text-slate-300 hover:text-red-500 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function PreviewItem({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-green-600' : 'text-slate-800'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
