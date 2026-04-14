'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface RegionalSettings {
  id: string
  region: string
  itp_percentage: number
  itp_progressive: Array<{ threshold: number | null; rate: number }> | null
  ajd_percentage: number
  iva_percentage: number
  notary_min: number
  notary_max: number
  notary_percentage: number
  registro_min: number
  registro_max: number
  registro_percentage: number
  lawyer_percentage: number
  lawyer_minimum: number
  property_tax_percentage: number
  community_fees_avg_monthly: number
  average_rental_yield: number | null
}

interface RenovationDefaults {
  cosmetic: number; partial: number; full: number; luxury: number; contingency: number; architect: number
}

const fmt = (n: number) => n > 0 ? `€ ${Math.round(n).toLocaleString('nl-NL')}` : '—'
const pct = (n: number) => `${n.toFixed(1)}%`

type Tab = 'kosten' | 'rendement' | 'hypotheek' | 'renovatie'

export default function CalculatorsPage() {
  const [regions, setRegions] = useState<RegionalSettings[]>([])
  const [reno, setReno] = useState<RenovationDefaults>({ cosmetic: 300, partial: 600, full: 1000, luxury: 1500, contingency: 15, architect: 3000 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('kosten')

  useEffect(() => {
    async function load() {
      const [regRes, setRes] = await Promise.all([
        fetch('/api/regional-settings'),
        supabase.from('settings').select('key, value').in('key', [
          'renovation_cosmetic_per_m2', 'renovation_partial_per_m2', 'renovation_full_per_m2',
          'renovation_luxury_per_m2', 'renovation_contingency_pct', 'renovation_architect_fee',
        ]),
      ])
      if (regRes.ok) setRegions(await regRes.json())
      if (setRes.data) {
        const m: Record<string, number> = {}
        for (const r of setRes.data as { key: string; value: number }[]) m[r.key] = Number(r.value)
        setReno({
          cosmetic: m.renovation_cosmetic_per_m2 || 300,
          partial: m.renovation_partial_per_m2 || 600,
          full: m.renovation_full_per_m2 || 1000,
          luxury: m.renovation_luxury_per_m2 || 1500,
          contingency: m.renovation_contingency_pct || 15,
          architect: m.renovation_architect_fee || 3000,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLayout title="Calculators"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  const tabs: { key: Tab; label: string }[] = [
    { key: 'kosten', label: 'Kosten koper' },
    { key: 'rendement', label: 'Netto rendement' },
    { key: 'hypotheek', label: 'Hypotheeklasten' },
    { key: 'renovatie', label: 'Renovatiebudget' },
  ]

  return (
    <PageLayout title="Calculators" subtitle="Rekenmachines voor klantgesprekken">
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === t.key ? 'bg-[#004B46] text-[#FFFAEF]' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'kosten' && <KostenKoper regions={regions} />}
      {activeTab === 'rendement' && <NettoRendement regions={regions} />}
      {activeTab === 'hypotheek' && <Hypotheeklasten />}
      {activeTab === 'renovatie' && <Renovatiebudget defaults={reno} regions={regions} />}
    </PageLayout>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// CALCULATOR 1: KOSTEN KOPER
// ═══════════════════════════════════════════════════════════════════════

function KostenKoper({ regions }: { regions: RegionalSettings[] }) {
  const [regionId, setRegionId] = useState('')
  const [price, setPrice] = useState(350000)
  const [type, setType] = useState<'bestaand' | 'nieuwbouw'>('bestaand')

  const region = regions.find(r => r.id === regionId)

  function calcITP(price: number, region: RegionalSettings) {
    if (region.itp_progressive && region.itp_progressive.length > 0) {
      let tax = 0; let remaining = price
      for (const band of region.itp_progressive) {
        const limit = band.threshold ? band.threshold : Infinity
        const taxable = Math.min(remaining, limit - (price - remaining))
        if (taxable <= 0) continue
        tax += taxable * (band.rate / 100)
        remaining -= taxable
        if (remaining <= 0) break
      }
      return tax > 0 ? tax : price * (region.itp_percentage / 100)
    }
    return price * (region.itp_percentage / 100)
  }

  const notary = region ? Math.min(Math.max(price * (region.notary_percentage / 100), region.notary_min), region.notary_max) : 0
  const registro = region ? Math.min(Math.max(price * (region.registro_percentage / 100), region.registro_min), region.registro_max) : 0
  const lawyer = region ? Math.max(price * (region.lawyer_percentage / 100), region.lawyer_minimum) : 0

  const itp = region && type === 'bestaand' ? calcITP(price, region) : 0
  const iva = region && type === 'nieuwbouw' ? price * (region.iva_percentage / 100) : 0
  const ajd = region && type === 'nieuwbouw' ? price * (region.ajd_percentage / 100) : 0

  const totalExtra = (type === 'bestaand' ? itp : iva + ajd) + notary + registro + lawyer
  const totalAll = price + totalExtra
  const extraPct = price > 0 ? (totalExtra / price) * 100 : 0

  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Regio</label>
          <select value={regionId} onChange={e => setRegionId(e.target.value)} className={inp}>
            <option value="">Selecteer regio...</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Aankoopprijs (€)</label>
          <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as 'bestaand' | 'nieuwbouw')} className={inp}>
            <option value="bestaand">Bestaande bouw</option>
            <option value="nieuwbouw">Nieuwbouw</option>
          </select>
        </div>
      </div>

      {region && price > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Row label="Aankoopprijs" value={fmt(price)} bold />
          <div className="border-t border-slate-200" />
          {type === 'bestaand' ? (
            <Row label={`ITP (${pct(region.itp_percentage)})`} value={fmt(itp)} sub={region.itp_progressive ? 'Progressief tarief' : undefined} />
          ) : (
            <>
              <Row label={`IVA / BTW (${pct(region.iva_percentage)})`} value={fmt(iva)} />
              <Row label={`AJD (${pct(region.ajd_percentage)})`} value={fmt(ajd)} />
            </>
          )}
          <Row label={`Notaris (~${pct(region.notary_percentage)})`} value={fmt(notary)} />
          <Row label={`Registro (~${pct(region.registro_percentage)})`} value={fmt(registro)} />
          <Row label={`Advocaat (${pct(region.lawyer_percentage)}, min ${fmt(region.lawyer_minimum)})`} value={fmt(lawyer)} />
          <div className="border-t border-slate-200" />
          <Row label={`Totaal bijkomende kosten`} value={`${fmt(totalExtra)} (${extraPct.toFixed(1)}%)`} bold />
          <div className="border-t-2 border-[#004B46]" />
          <Row label="TOTAAL INCLUSIEF KOSTEN" value={fmt(totalAll)} bold highlight />
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// CALCULATOR 2: NETTO RENDEMENT
// ═══════════════════════════════════════════════════════════════════════

function NettoRendement({ regions }: { regions: RegionalSettings[] }) {
  const [regionId, setRegionId] = useState('')
  const [price, setPrice] = useState(300000)
  const [monthlyRent, setMonthlyRent] = useState(1500)
  const [ibi, setIbi] = useState(0)
  const [vve, setVve] = useState(0)
  const [basura, setBasura] = useState(200)
  const [insurance, setInsurance] = useState(400)
  const [maintenancePct, setMaintenancePct] = useState(1)
  const [managementPct, setManagementPct] = useState(0)
  const [taxRate, setTaxRate] = useState(19)

  const region = regions.find(r => r.id === regionId)

  useEffect(() => {
    if (region) {
      setIbi(Math.round(price * (region.property_tax_percentage / 100)))
      setVve(Math.round(region.community_fees_avg_monthly * 12))
    }
  }, [region, price])

  const yearlyRent = monthlyRent * 12
  const maintenance = Math.round(price * (maintenancePct / 100))
  const management = Math.round(yearlyRent * (managementPct / 100))
  const costsBeforeTax = ibi + vve + basura + insurance + maintenance + management
  const netBeforeTax = yearlyRent - costsBeforeTax
  const irnr = Math.round(Math.max(netBeforeTax, 0) * (taxRate / 100))
  const totalCosts = costsBeforeTax + irnr
  const netIncome = yearlyRent - totalCosts
  const grossYield = price > 0 ? (yearlyRent / price) * 100 : 0
  const netYield = price > 0 ? (netIncome / price) * 100 : 0

  return (
    <Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Regio</label>
          <select value={regionId} onChange={e => setRegionId(e.target.value)} className={inp}>
            <option value="">Selecteer...</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Aankoopprijs (€)</label>
          <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Maandhuur (€)</label>
          <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">IRNR tarief (%)</label>
          <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className={inp}>
            <option value={19}>19% (EU-ingezetene)</option>
            <option value={24}>24% (niet-EU)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        <CostInput label="IBI" value={ibi} onChange={setIbi} />
        <CostInput label="VvE/jaar" value={vve} onChange={setVve} />
        <CostInput label="Basura" value={basura} onChange={setBasura} />
        <CostInput label="Verzekering" value={insurance} onChange={setInsurance} />
        <CostInput label="Onderhoud %" value={maintenancePct} onChange={setMaintenancePct} isPercent />
        <CostInput label="Beheer %" value={managementPct} onChange={setManagementPct} isPercent />
      </div>

      {price > 0 && monthlyRent > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Row label="Bruto jaarhuur" value={fmt(yearlyRent)} bold />
          <div className="border-t border-slate-200" />
          <Row label="IBI" value={fmt(ibi)} />
          <Row label="VvE" value={fmt(vve)} />
          <Row label="Basura" value={fmt(basura)} />
          <Row label="Verzekering" value={fmt(insurance)} />
          <Row label={`Onderhoud (${maintenancePct}%)`} value={fmt(maintenance)} />
          {management > 0 && <Row label={`Beheer (${managementPct}%)`} value={fmt(management)} />}
          <Row label={`IRNR (${taxRate}% over netto)`} value={fmt(irnr)} />
          <div className="border-t border-slate-200" />
          <Row label="Totale jaarkosten" value={fmt(totalCosts)} bold />
          <Row label="Netto huurinkomsten" value={fmt(netIncome)} bold highlight={netIncome > 0} />
          <div className="border-t-2 border-[#004B46]" />
          <Row label="Bruto rendement" value={`${grossYield.toFixed(1)}%`} bold />
          <Row label="Netto rendement" value={`${netYield.toFixed(1)}%`} bold highlight={netYield > 0} />
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// CALCULATOR 3: HYPOTHEEKLASTEN
// ═══════════════════════════════════════════════════════════════════════

function Hypotheeklasten() {
  const [price, setPrice] = useState(400000)
  const [downPct, setDownPct] = useState(30)
  const [rate, setRate] = useState(3.5)
  const [years, setYears] = useState(25)

  const downPayment = Math.round(price * (downPct / 100))
  const mortgage = price - downPayment
  const monthlyRate = rate / 100 / 12
  const totalMonths = years * 12

  let monthly = 0
  if (mortgage > 0 && monthlyRate > 0 && totalMonths > 0) {
    monthly = mortgage * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
  }

  const totalPaid = monthly * totalMonths
  const totalInterest = totalPaid - mortgage

  return (
    <Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Aankoopprijs (€)</label>
          <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Eigen inbreng (%)</label>
          <input type="number" value={downPct} onChange={e => setDownPct(Number(e.target.value))} min={0} max={100} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Looptijd (jaren)</label>
          <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={5} max={30} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Rente (%)</label>
          <input type="number" value={rate} step={0.1} onChange={e => setRate(Number(e.target.value))} className={inp} />
        </div>
      </div>

      {/* Rente slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>2%</span>
          <span className="font-semibold text-[#004B46]">{rate.toFixed(1)}% → {fmt(Math.round(monthly))}/mnd</span>
          <span>6%</span>
        </div>
        <input type="range" min={2} max={6} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))}
          className="w-full accent-[#004B46]" />
      </div>

      {price > 0 && mortgage > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Row label="Aankoopprijs" value={fmt(price)} />
          <Row label={`Eigen inbreng (${downPct}%)`} value={fmt(downPayment)} />
          <Row label="Hypotheekbedrag" value={fmt(mortgage)} bold />
          <div className="border-t border-slate-200" />
          <Row label="Rente" value={pct(rate)} />
          <Row label="Looptijd" value={`${years} jaar`} />
          <div className="border-t-2 border-[#004B46]" />
          <Row label="Maandlast" value={fmt(Math.round(monthly))} bold highlight />
          <Row label="Totaal over looptijd" value={fmt(Math.round(totalPaid))} />
          <Row label="Waarvan rente" value={fmt(Math.round(totalInterest))} />
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// CALCULATOR 4: RENOVATIEBUDGET
// ═══════════════════════════════════════════════════════════════════════

function Renovatiebudget({ defaults, regions }: { defaults: RenovationDefaults; regions: RegionalSettings[] }) {
  const [m2, setM2] = useState(100)
  const [renoType, setRenoType] = useState<'cosmetic' | 'partial' | 'full' | 'luxury'>('partial')
  const [costPerM2, setCostPerM2] = useState(defaults.partial)
  const [architect, setArchitect] = useState(defaults.architect)
  const [contingencyPct, setContingencyPct] = useState(defaults.contingency)
  // Optioneel: koppel aan aankoop
  const [price, setPrice] = useState(0)
  const [regionId, setRegionId] = useState('')

  useEffect(() => {
    const typeDefaults = { cosmetic: defaults.cosmetic, partial: defaults.partial, full: defaults.full, luxury: defaults.luxury }
    setCostPerM2(typeDefaults[renoType])
  }, [renoType, defaults])

  const renoCost = m2 * costPerM2
  const contingency = Math.round(renoCost * (contingencyPct / 100))
  const totalReno = renoCost + architect + contingency

  return (
    <Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Oppervlakte (m²)</label>
          <input type="number" value={m2} onChange={e => setM2(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Type renovatie</label>
          <select value={renoType} onChange={e => setRenoType(e.target.value as typeof renoType)} className={inp}>
            <option value="cosmetic">Cosmetisch</option>
            <option value="partial">Gedeeltelijk</option>
            <option value="full">Volledig</option>
            <option value="luxury">Luxe</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Kosten per m² (€)</label>
          <input type="number" value={costPerM2} onChange={e => setCostPerM2(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Architect (€)</label>
          <input type="number" value={architect} onChange={e => setArchitect(Number(e.target.value))} className={inp} />
        </div>
      </div>

      {m2 > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <Row label={`Oppervlakte`} value={`${m2} m²`} />
          <Row label={`Kosten per m²`} value={fmt(costPerM2)} />
          <div className="border-t border-slate-200" />
          <Row label="Renovatiekosten" value={fmt(renoCost)} />
          <Row label="Architect / vergunningen" value={fmt(architect)} />
          <Row label={`Onvoorzien (${contingencyPct}%)`} value={fmt(contingency)} />
          <div className="border-t-2 border-[#004B46]" />
          <Row label="TOTAAL RENOVATIEBUDGET" value={fmt(totalReno)} bold highlight />
        </div>
      )}

      {/* Optioneel: all-in met aankoopprijs */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Optioneel: all-in berekening</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Aankoopprijs (€)</label>
            <input type="number" value={price || ''} onChange={e => setPrice(Number(e.target.value))} placeholder="Optioneel" className={inp} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Regio (voor kosten koper)</label>
            <select value={regionId} onChange={e => setRegionId(e.target.value)} className={inp}>
              <option value="">Geen</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
            </select>
          </div>
        </div>
        {price > 0 && (() => {
          const region = regions.find(r => r.id === regionId)
          const kostenKoper = region ? Math.round(price * ((region.itp_percentage + region.notary_percentage + region.registro_percentage + region.lawyer_percentage) / 100)) : 0
          const allIn = price + kostenKoper + totalReno
          return (
            <div className="bg-[#004B46]/5 border border-[#004B46]/15 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Aankoop + kosten koper + renovatie</span>
                <span className="font-bold text-[#004B46] text-lg">{fmt(allIn)}</span>
              </div>
            </div>
          )
        })()}
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">{children}</div>
}

function Row({ label, value, bold, highlight, sub }: { label: string; value: string; bold?: boolean; highlight?: boolean; sub?: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${bold ? 'bg-slate-50' : ''}`}>
      <div>
        <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
        {sub && <span className="text-[10px] text-slate-400 ml-2">{sub}</span>}
      </div>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${highlight ? 'text-[#004B46]' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

function CostInput({ label, value, onChange, isPercent }: { label: string; value: number; onChange: (n: number) => void; isPercent?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-400 mb-0.5">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} step={isPercent ? 0.5 : 50}
        className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-slate-400 tabular-nums" />
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20'
