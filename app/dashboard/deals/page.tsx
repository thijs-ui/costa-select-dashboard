'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { berekenCommissie, formatEuro } from '@/lib/calculations'
import { type DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import {
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinPeriodPicker,
  FinSection,
} from '@/components/financieel/parts'
import DealsForm, { emptyForm, type FormState } from '@/components/deals-form'
import DealsTable from '@/components/deals-table'
import type { AppSettings, Deal, Makelaar } from '@/components/deals-types'

export default function DealsPageWrapper() {
  return (
    <Suspense fallback={<div className="fin-loading">Laden…</div>}>
      <DealsPage />
    </Suspense>
  )
}

function DealsPage() {
  const searchParams = useSearchParams()
  const [deals, setDeals] = useState<Deal[]>([])
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [appSettings, setAppSettings] = useState<AppSettings>({
    minimum_fee: 6000,
    commissie_per_type: {},
    regios: [],
    deal_types: [],
    bronnen: [],
  })
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingDealId, setEditingDealId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [filterConsultant, setFilterConsultant] = useState<string>('')
  const [filterRegio, setFilterRegio] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void loadAll()
  }, [])

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || deals.length === 0) return
    const deal = deals.find(d => d.id === editId)
    if (deal) startEdit(deal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, searchParams])

  async function loadAll() {
    try {
      const [dealsRes, makelaarRes, settingsRes] = await Promise.allSettled([
        supabase.from('deals').select('*').order('datum_passering', { ascending: false }),
        supabase
          .from('makelaars')
          .select('id, naam, rol, area_manager_id')
          .eq('actief', true),
        supabase.from('settings').select('key, value'),
      ])
      const dealsData = dealsRes.status === 'fulfilled' ? (dealsRes.value.data ?? []) : []
      const makelaarData = makelaarRes.status === 'fulfilled' ? (makelaarRes.value.data ?? []) : []
      const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value.data ?? null) : null
      setDeals(dealsData as Deal[])
      setMakelaars(makelaarData as Makelaar[])
      if (settingsData) {
        const map: Record<string, unknown> = {}
        ;(settingsData as { key: string; value: unknown }[]).forEach(r => {
          map[r.key] = r.value
        })
        setAppSettings({
          minimum_fee: Number(map.minimum_fee) || 6000,
          commissie_per_type: (map.commissie_per_type as Record<string, number>) || {},
          regios: (map.regios as string[]) || [],
          deal_types: (map.deal_types as string[]) || [],
          bronnen: (map.bronnen as string[]) || [],
        })
      }
    } catch (e) {
      console.error('[loadAll] failed:', e)
    } finally {
      setLoading(false)
    }
  }

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
      overdracht_scenario: form.is_overdracht
        ? (form.overdracht_scenario as 'standaard' | 'eigen_netwerk' | 'tweede_aankoop' | 'custom')
        : null,
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
    if (!calc) {
      setSaving(false)
      return
    }

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
    setDeals(deals.filter(d => d.id !== id))
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
      skip_min_fee:
        !deal.min_fee_toegepast && Number(deal.bruto_commissie ?? 0) < appSettings.minimum_fee,
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
  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const filteredDeals = useMemo(
    () =>
      deals
        .filter(d => isInRange(d.datum_passering, range))
        .filter(
          d =>
            !filterConsultant ||
            d.makelaar_id === filterConsultant ||
            d.makelaar2_id === filterConsultant
        )
        .filter(d => !filterRegio || d.regio === filterRegio)
        .filter(
          d =>
            !search ||
            (d.notities ?? '').toLowerCase().includes(search.toLowerCase()) ||
            (d.partner_naam ?? '').toLowerCase().includes(search.toLowerCase())
        ),
    [deals, range, filterConsultant, filterRegio, search]
  )

  const kpis = useMemo(() => {
    const totaalDeals = filteredDeals.length
    const bruto = filteredDeals.reduce((a, d) => a + (d.bruto_commissie ?? 0), 0)
    const netto = filteredDeals.reduce((a, d) => a + (d.netto_commissie_cs ?? 0), 0)
    const aankoop = filteredDeals.reduce((a, d) => a + d.aankoopprijs, 0)
    const gemAankoop = filteredDeals.length > 0 ? aankoop / filteredDeals.length : 0
    return { totaalDeals, bruto, netto, gemAankoop, aankoop }
  }, [filteredDeals])

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Sales"
          subtitle="Volledige deal-administratie — commissies, partners, area-manager-kpi."
        >
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid>
              <FinKpi
                label="Totaal sales"
                value={kpis.totaalDeals}
                sub={range.label}
                tone="accent"
              />
              <FinKpi
                label="Bruto commissie"
                value={formatEuro(kpis.bruto)}
                sub={
                  kpis.totaalDeals > 0
                    ? `gem. ${formatEuro(kpis.bruto / kpis.totaalDeals)} / sale`
                    : '—'
                }
              />
              <FinKpi
                label="Netto omzet CS"
                value={formatEuro(kpis.netto)}
                sub="na consultant + partner"
                tone="positive"
              />
              <FinKpi
                label="Aankoopwaarde"
                value={formatEuro(kpis.aankoop)}
                sub={`gem. ${formatEuro(kpis.gemAankoop)} / sale`}
              />
            </FinKpiGrid>

            <FinSection
              title={editingDealId ? 'Sale bewerken' : 'Nieuwe sale toevoegen'}
              meta={editingDealId ? `#${editingDealId.slice(-4)}` : 'commissie wordt automatisch berekend'}
            >
              <div ref={formRef}>
                <DealsForm
                  form={form}
                  setForm={setForm}
                  editingDealId={editingDealId}
                  onCancel={cancelEdit}
                  onSave={saveDeal}
                  saving={saving}
                  makelaars={makelaars}
                  appSettings={appSettings}
                  areaManager={areaManager}
                  preview={preview}
                />
              </div>
            </FinSection>

            <DealsTable
              deals={filteredDeals}
              makelaars={makelaars}
              editingDealId={editingDealId}
              onEdit={startEdit}
              onDelete={deleteDeal}
              range={range}
              filterConsultant={filterConsultant}
              setFilterConsultant={setFilterConsultant}
              filterRegio={filterRegio}
              setFilterRegio={setFilterRegio}
              search={search}
              setSearch={setSearch}
              regios={appSettings.regios}
            />

            <div style={{ height: 60 }} />
          </>
        )}
      </div>
    </div>
  )
}
