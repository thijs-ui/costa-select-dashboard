// ============================================================================
// components/deals-form.tsx
//
// Invoerformulier + STICKY commissie-preview onderaan.
// Berekenlogica leeft in parent (app/dashboard/deals/page.tsx); dit component
// ontvangt alleen `preview: CommissieResult | null`.
// ============================================================================
'use client'

import type { CommissieResult } from '@/lib/calculations'
import { formatEuro } from '@/lib/calculations'
import type { Makelaar, AppSettings } from '@/components/deals-types'

export interface FormState {
  datum_passering: string
  regio: string
  type_deal: string
  bron: string
  aankoopprijs: string | number
  commissie_pct: string | number
  eigen_netwerk: boolean
  makelaar_id: string
  makelaar_pct: number
  is_overdracht: boolean
  overdracht_scenario: string
  makelaar2_id: string
  makelaar2_pct: number
  area_manager_kpi: boolean
  partner_deal: boolean
  partner_naam: string
  partner_pct: number
  skip_min_fee: boolean
  notities: string
}

export const emptyForm: FormState = {
  datum_passering: new Date().toISOString().split('T')[0],
  regio: '',
  type_deal: '',
  bron: '',
  aankoopprijs: '',
  commissie_pct: '',
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

export const OVERDRACHT_SCENARIOS = [
  { value: 'standaard', label: 'Standaard (20% / 20%)', m1: 20, m2: 20 },
  { value: 'eigen_netwerk', label: 'Eigen netwerk overdracht (15% / 40%)', m1: 15, m2: 40 },
  { value: 'tweede_aankoop', label: 'Tweede aankoop andere regio (5% / 35%)', m1: 5, m2: 35 },
  { value: 'custom', label: 'Aangepast (vrije verdeling)', m1: null as number | null, m2: null as number | null },
]

// Shared input class — all brand tokens, no slate/blue
const inp =
  'w-full border rounded-[8px] px-3 py-2 text-[13px] bg-white font-[inherit] focus:outline-none'

const inpStyle: React.CSSProperties = {
  borderColor: 'rgba(0,75,70,0.15)',
  color: '#004B46',
}

interface Props {
  form: FormState
  setForm: (next: FormState) => void
  editingDealId: string | null
  onCancel: () => void
  onSave: () => void
  saving: boolean
  makelaars: Makelaar[]
  appSettings: AppSettings
  areaManager: Makelaar | null
  preview: CommissieResult | null
}

export default function DealsForm({
  form, setForm, editingDealId, onCancel, onSave, saving,
  makelaars, appSettings, areaManager, preview,
}: Props) {
  const scenarioInfo = OVERDRACHT_SCENARIOS.find(s => s.value === form.overdracht_scenario)
  const displayM1 =
    form.is_overdracht && scenarioInfo?.m1 != null ? scenarioInfo.m1
    : form.eigen_netwerk ? 55
    : form.makelaar_pct
  const displayM2 =
    form.is_overdracht && scenarioInfo?.m2 != null ? scenarioInfo.m2
    : form.makelaar2_pct

  return (
    <div
      className="rounded-[12px] bg-white mb-6 relative overflow-hidden"
      style={{
        border: editingDealId
          ? '1px solid #F5AF40'
          : '1px solid rgba(0,75,70,0.12)',
        boxShadow: editingDealId ? '0 0 0 3px rgba(245,175,64,0.12)' : undefined,
        padding: '20px 22px 0',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="font-heading"
          style={{ fontSize: 15, fontWeight: 700, color: '#004B46', letterSpacing: '-0.005em' }}
        >
          {editingDealId ? 'Sale bewerken' : 'Nieuwe sale'}
        </h2>
        {editingDealId && (
          <button
            onClick={onCancel}
            className="text-[11px] rounded-[8px] px-3 py-1 cursor-pointer"
            style={{ color: '#7A8C8B', border: '1px solid rgba(0,75,70,0.15)', background: '#fff' }}
          >
            Annuleren
          </button>
        )}
      </div>

      {/* Base fields */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-[14px]">
        <Field label="Datum passering *">
          <input type="date" value={form.datum_passering}
            onChange={(e) => setForm({ ...form, datum_passering: e.target.value })}
            className={inp} style={inpStyle} />
        </Field>
        <Field label="Regio *">
          <select value={form.regio} onChange={(e) => setForm({ ...form, regio: e.target.value })}
            className={inp} style={inpStyle}>
            <option value="">Kies regio</option>
            {appSettings.regios.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Type sale *">
          <select value={form.type_deal} onChange={(e) => setForm({ ...form, type_deal: e.target.value })}
            className={inp} style={inpStyle}>
            <option value="">Kies type</option>
            {appSettings.deal_types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Bron *">
          <select value={form.bron} onChange={(e) => setForm({ ...form, bron: e.target.value })}
            className={inp} style={inpStyle}>
            <option value="">Kies bron</option>
            {appSettings.bronnen.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Aankoopprijs (€) *">
          <input type="number" placeholder="0" value={form.aankoopprijs}
            onChange={(e) => setForm({ ...form, aankoopprijs: e.target.value })}
            className={inp} style={inpStyle} />
        </Field>
        <Field label="Commissie % (leeg = auto)">
          <input type="number" step="0.1" placeholder="auto" value={form.commissie_pct}
            onChange={(e) => setForm({ ...form, commissie_pct: e.target.value })}
            className={inp} style={inpStyle} />
        </Field>
        <Field label="Minimum fee">
          <label className="flex items-center gap-2 h-[34px] text-[13px] cursor-pointer" style={{ color: '#004B46' }}>
            <input type="checkbox" checked={!form.skip_min_fee}
              onChange={(e) => setForm({ ...form, skip_min_fee: !e.target.checked })}
              style={{ accentColor: '#004B46' }} />
            Toepassen
            <span className="text-[11px]" style={{ color: '#7A8C8B' }}>
              (€{appSettings.minimum_fee.toLocaleString('nl-NL')})
            </span>
          </label>
        </Field>
        <Field label="Notities" className="col-span-2">
          <input type="text" value={form.notities}
            onChange={(e) => setForm({ ...form, notities: e.target.value })}
            className={inp} style={inpStyle} />
        </Field>
      </div>

      {/* Commissieverdeling */}
      <div className="mt-[18px] pt-[14px]" style={{ borderTop: '1px solid rgba(0,75,70,0.08)' }}>
        <div
          className="mb-3"
          style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A8C8B', fontWeight: 700 }}
        >
          Commissieverdeling
        </div>

        {/* Consultant + % + eigen netwerk */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-[14px] mb-3">
          <Field label="Consultant">
            <select value={form.makelaar_id}
              onChange={(e) => setForm({ ...form, makelaar_id: e.target.value, area_manager_kpi: false })}
              className={inp} style={inpStyle}>
              <option value="">Geen / Costa Select</option>
              {makelaars.map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
            </select>
          </Field>
          <Field
            label={`Consultant % ${form.eigen_netwerk ? '(eigen netwerk)' : form.is_overdracht && form.overdracht_scenario !== 'custom' ? '(auto)' : ''}`}
          >
            {form.eigen_netwerk || (form.is_overdracht && form.overdracht_scenario !== 'custom') ? (
              <div className={inp} style={{ ...inpStyle, background: 'rgba(0,75,70,0.04)', color: '#7A8C8B' }}>
                {displayM1}%
              </div>
            ) : (
              <input type="number" step="1" min="0" max="100" value={form.makelaar_pct}
                onChange={(e) => setForm({ ...form, makelaar_pct: Number(e.target.value) })}
                className={inp} style={inpStyle} />
            )}
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: '#004B46' }}>
              <input type="checkbox" checked={form.eigen_netwerk}
                onChange={(e) => setForm({
                  ...form,
                  eigen_netwerk: e.target.checked,
                  is_overdracht: e.target.checked ? false : form.is_overdracht,
                })}
                style={{ accentColor: '#004B46' }} />
              Eigen netwerk sale
              <span className="text-[11px]" style={{ color: '#7A8C8B' }}>(55/45)</span>
            </label>
          </div>
        </div>

        {/* Area manager banner — sun-subtle */}
        {areaManager && (
          <div
            className="mb-3 rounded-[8px] flex items-center justify-between gap-3"
            style={{
              padding: '11px 14px',
              background: '#FEF6E4',
              border: '1px solid #FBD78A',
              color: '#8a5a10',
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ fontWeight: 700 }}>Area manager:</span> {areaManager.naam}
              — ontvangt {form.area_manager_kpi ? '15%' : '10%'} van CS aandeel
            </div>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer" style={{ color: '#8a5a10' }}>
              <input type="checkbox" checked={form.area_manager_kpi}
                onChange={(e) => setForm({ ...form, area_manager_kpi: e.target.checked })}
                style={{ accentColor: '#D4921A' }} />
              KPI behaald (15%)
            </label>
          </div>
        )}

        {/* Overdracht toggle */}
        <div className="mb-3">
          <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: '#004B46' }}>
            <input type="checkbox" checked={form.is_overdracht}
              onChange={(e) => setForm({
                ...form,
                is_overdracht: e.target.checked,
                eigen_netwerk: e.target.checked ? false : form.eigen_netwerk,
              })}
              style={{ accentColor: '#004B46' }} />
            Overdracht sale
            <span className="text-[11px]" style={{ color: '#7A8C8B' }}>(split tussen twee consultants)</span>
          </label>
        </div>

        {form.is_overdracht && (
          <div
            className="grid grid-cols-3 gap-x-4 gap-y-[14px] p-3 rounded-[8px]"
            style={{ background: '#E6F0EF', border: '1px solid rgba(0,75,70,0.15)' }}
          >
            <Field label="Scenario">
              <select value={form.overdracht_scenario}
                onChange={(e) => setForm({ ...form, overdracht_scenario: e.target.value })}
                className={inp} style={inpStyle}>
                {OVERDRACHT_SCENARIOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Tweede consultant">
              <select value={form.makelaar2_id}
                onChange={(e) => setForm({ ...form, makelaar2_id: e.target.value })}
                className={inp} style={inpStyle}>
                <option value="">Kies consultant</option>
                {makelaars.filter(m => m.id !== form.makelaar_id).map((m) => (
                  <option key={m.id} value={m.id}>{m.naam}</option>
                ))}
              </select>
            </Field>
            {form.overdracht_scenario === 'custom' ? (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Consultant 1 %">
                  <input type="number" step="1" min="0" max="100" value={form.makelaar_pct}
                    onChange={(e) => setForm({ ...form, makelaar_pct: Number(e.target.value) })}
                    className={inp} style={inpStyle} />
                </Field>
                <Field label="Consultant 2 %">
                  <input type="number" step="1" min="0" max="100" value={form.makelaar2_pct}
                    onChange={(e) => setForm({ ...form, makelaar2_pct: Number(e.target.value) })}
                    className={inp} style={inpStyle} />
                </Field>
              </div>
            ) : (
              <Field label="Verdeling">
                <div className={inp} style={{ ...inpStyle, background: '#fff', color: '#7A8C8B' }}>
                  {displayM1}% / {displayM2}%
                </div>
              </Field>
            )}
          </div>
        )}
      </div>

      {/* Partner */}
      <div className="mt-4 pt-[14px]" style={{ borderTop: '1px solid rgba(0,75,70,0.08)' }}>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer mb-3" style={{ color: '#004B46' }}>
          <input type="checkbox" checked={form.partner_deal}
            onChange={(e) => setForm({ ...form, partner_deal: e.target.checked })}
            style={{ accentColor: '#004B46' }} />
          Referral partner deal
          <span className="text-[11px]" style={{ color: '#7A8C8B' }}>(partner krijgt % van CS aandeel)</span>
        </label>
        {form.partner_deal && (
          <div className="grid grid-cols-3 gap-x-4 gap-y-[14px]">
            <Field label="Partner naam">
              <input type="text" value={form.partner_naam}
                onChange={(e) => setForm({ ...form, partner_naam: e.target.value })}
                className={inp} style={inpStyle} />
            </Field>
            <Field label="Partner % van CS aandeel">
              <input type="number" step="1" min="0" max="100" value={form.partner_pct}
                onChange={(e) => setForm({ ...form, partner_pct: Number(e.target.value) })}
                className={inp} style={inpStyle} />
            </Field>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 py-[14px] pb-[22px]">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-[18px] py-[10px] rounded-[10px] text-[13px] font-semibold cursor-pointer font-[inherit]"
          style={{
            background: '#004B46', color: '#fff', border: 'none',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? 'Opslaan…' : editingDealId ? 'Wijzigingen opslaan' : 'Sale opslaan'}
        </button>
      </div>

      {/* ------ STICKY COMMISSIE PREVIEW ------ */}
      {preview && (
        <div
          className="sticky"
          style={{
            bottom: 0,
            margin: '0 -22px',
            padding: '16px 22px',
            background: '#E6F0EF',                           // deepsea-lighter
            borderTop: '1px solid rgba(0,75,70,0.15)',
            zIndex: 5,
          }}
        >
          <div className="flex items-center justify-between mb-[10px]">
            <div
              style={{
                fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#004B46', fontWeight: 700, opacity: 0.7,
              }}
            >
              Berekening · live
            </div>
            {preview.min_fee_toegepast && (
              <div
                style={{
                  fontSize: 11, color: '#8a5a10', background: '#FEF6E4',
                  border: '1px solid #FBD78A', padding: '3px 9px',
                  borderRadius: 999, fontWeight: 600,
                }}
              >
                Minimum fee toegepast
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-[14px]">
            <PreviewItem
              label="Bruto"
              value={formatEuro(preview.bruto_commissie)}
              sub={
                preview.min_fee_toegepast
                  ? `min fee · ${formatEuro(preview.bruto_commissie_incl_btw)} incl. BTW`
                  : `${(preview.commissie_pct * 100).toFixed(1)}% · ex BTW`
              }
            />
            {preview.makelaar_commissie > 0 && (
              <PreviewItem
                label={`Consultant${form.is_overdracht ? ' 1' : ''} (${(preview.makelaar_pct_effectief * 100).toFixed(0)}%)`}
                value={formatEuro(preview.makelaar_commissie)}
              />
            )}
            {preview.makelaar2_commissie > 0 && (
              <PreviewItem
                label={`Consultant 2 (${(preview.makelaar2_pct_effectief * 100).toFixed(0)}%)`}
                value={formatEuro(preview.makelaar2_commissie)}
              />
            )}
            <PreviewItem
              label="CS aandeel"
              value={formatEuro(preview.cs_aandeel)}
              sub={`${(100 - (preview.makelaar_pct_effectief + preview.makelaar2_pct_effectief) * 100).toFixed(0)}%`}
            />
            {preview.partner_commissie > 0 && (
              <PreviewItem
                label={`Partner (${form.partner_pct}% v. CS)`}
                value={formatEuro(preview.partner_commissie)}
              />
            )}
            {preview.area_manager_commissie > 0 && (
              <PreviewItem
                label={`Area mgr (${form.area_manager_kpi ? '15' : '10'}% v. CS)`}
                value={formatEuro(preview.area_manager_commissie)}
              />
            )}
            <PreviewItem
              label="Netto omzet CS"
              value={formatEuro(preview.netto_commissie_cs)}
              highlight
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
function Field({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] mb-[5px]" style={{ color: '#7A8C8B', fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PreviewItem({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10, color: '#7A8C8B', textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 500, marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        className="font-heading"
        style={{
          fontWeight: 700, fontSize: highlight ? 20 : 18, lineHeight: 1.1,
          color: highlight ? '#0EAE96' : '#004B46',
        }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] mt-[2px]" style={{ color: '#7A8C8B' }}>{sub}</div>}
    </div>
  )
}
