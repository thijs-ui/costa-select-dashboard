'use client'

import { useEffect, useState, useMemo } from 'react'
import { PageLayout } from '@/components/page-layout'
import { Home, Wallet, Building2, Hammer, AlertTriangle } from 'lucide-react'

type Mode = 'eigen' | 'verhuur' | 'sl' | 'flip'

interface Bracket { threshold: number | null; rate: number }
interface RegionalSettings {
  id: string
  region: string
  itp_percentage: number
  itp_progressive: Bracket[] | null
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
}

const fmt = (n: number) => n > 0 ? `€ ${Math.round(n).toLocaleString('nl-NL')}` : '—'
const pct = (n: number) => `${n.toFixed(1)}%`

function calcITP(price: number, brackets: Bracket[] | null, flatRate: number): number {
  if (!brackets || brackets.length === 0) return price * (flatRate / 100)
  let tax = 0
  let remaining = price
  let prevThreshold = 0
  for (const band of brackets) {
    const limit = band.threshold ?? Infinity
    const band_size = limit - prevThreshold
    const taxable = Math.min(remaining, band_size)
    if (taxable <= 0) break
    tax += taxable * (band.rate / 100)
    remaining -= taxable
    prevThreshold = limit
    if (remaining <= 0) break
  }
  return tax
}

function annuity(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0
  const n = years * 12
  const r = annualRate / 100 / 12
  if (r === 0) return principal / n
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const MODES: { key: Mode; label: string; icon: typeof Home; desc: string }[] = [
  { key: 'eigen', label: 'Eigen gebruik', icon: Home, desc: 'Tweede woning voor persoonlijk gebruik' },
  { key: 'verhuur', label: 'Verhuur (privé)', icon: Wallet, desc: 'Privé-investering met verhuur' },
  { key: 'sl', label: 'Investering SL', icon: Building2, desc: 'Via Sociedad Limitada' },
  { key: 'flip', label: 'Renovatie / Flip', icon: Hammer, desc: 'Aankoop + renovatie + verkoop' },
]

export default function CalculatorsPage() {
  const [mode, setMode] = useState<Mode>('eigen')
  const [regions, setRegions] = useState<RegionalSettings[]>([])
  const [loading, setLoading] = useState(true)

  // Basis velden
  const [price, setPrice] = useState(350000)
  const [regionId, setRegionId] = useState('')
  const [propType, setPropType] = useState<'bestaand' | 'nieuwbouw'>('bestaand')
  const [isResident, setIsResident] = useState(false)

  // Eigen gebruik / Verhuur / SL
  const [downPayment, setDownPayment] = useState(105000)
  const [rate, setRate] = useState(4.0)
  const [years, setYears] = useState(25)

  // Maandlasten
  const [ibiMonthly, setIbiMonthly] = useState(146)
  const [vveMonthly, setVveMonthly] = useState(150)
  const [insuranceMonthly, setInsuranceMonthly] = useState(40)

  // Verhuur
  const [monthlyRent, setMonthlyRent] = useState(1800)
  const [managementPct, setManagementPct] = useState(8)
  const [maintenancePct, setMaintenancePct] = useState(5)

  // SL
  const [slAge, setSlAge] = useState<'new' | 'old'>('old')
  const [slAdmin, setSlAdmin] = useState(2500)

  // Flip
  const [renoBudget, setRenoBudget] = useState(80000)
  const [sellPrice, setSellPrice] = useState(500000)
  const [renoMonths, setRenoMonths] = useState(6)
  const [saleMonths, setSaleMonths] = useState(4)
  const [agentPct, setAgentPct] = useState(4)

  // Meerjaren projectie
  const [showProjection, setShowProjection] = useState(false)
  const [rentIndex, setRentIndex] = useState(2.5)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/regional-settings')
      if (res.ok) {
        const data = await res.json()
        setRegions(data)
        const defaultRegion = data.find((r: RegionalSettings) => r.region === 'Costa del Sol') || data[0]
        if (defaultRegion) setRegionId(defaultRegion.id)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Auto-update rate when resident changes
  useEffect(() => { setRate(isResident ? 3.2 : 4.0) }, [isResident])

  const region = useMemo(() => regions.find(r => r.id === regionId), [regions, regionId])
  const maxLTV = isResident ? 80 : 70

  // ===== KOSTEN KOPER =====
  const kkCalc = useMemo(() => {
    if (!region) return null
    const itp = propType === 'bestaand' ? calcITP(price, region.itp_progressive, region.itp_percentage) : 0
    const iva = propType === 'nieuwbouw' ? price * (region.iva_percentage / 100) : 0
    const ajd = propType === 'nieuwbouw' ? price * (region.ajd_percentage / 100) : 0
    const notary = Math.min(Math.max(price * (region.notary_percentage / 100), region.notary_min), region.notary_max)
    const registro = Math.min(Math.max(price * (region.registro_percentage / 100), region.registro_min), region.registro_max)
    const lawyer = Math.max(price * (region.lawyer_percentage / 100), region.lawyer_minimum)
    const bankCosts = downPayment < price ? 1000 : 0
    const total = itp + iva + ajd + notary + registro + lawyer + bankCosts
    return { itp, iva, ajd, notary, registro, lawyer, bankCosts, total }
  }, [region, propType, price, downPayment])

  // ===== FINANCIERING =====
  const mortgage = price - downPayment
  const ltv = price > 0 ? (mortgage / price) * 100 : 0
  const ltvWarning = ltv > maxLTV
  const monthlyMortgage = annuity(mortgage, rate, years)

  // ===== MAANDLASTEN =====
  const totalMonthly = monthlyMortgage + ibiMonthly + vveMonthly + insuranceMonthly

  // ===== TOTAAL INVESTERING =====
  const totalInvestment = price + (kkCalc?.total ?? 0)
  const ownMoneyNeeded = downPayment + (kkCalc?.total ?? 0)

  // ===== VERHUUR =====
  const rentCalc = useMemo(() => {
    const yearlyRent = monthlyRent * 12
    const mgmt = yearlyRent * (managementPct / 100)
    const maint = yearlyRent * (maintenancePct / 100)
    const mortgageInterest = monthlyMortgage * 12 * (rate / 100) / (rate / 100 + 0.0001) * 0.6 // benadering: 60% rente in jaar 1
    const ibiYearly = ibiMonthly * 12
    const vveYearly = vveMonthly * 12
    const insYearly = insuranceMonthly * 12
    const totalCosts = mgmt + maint + mortgageInterest + ibiYearly + vveYearly + insYearly
    const netBeforeTax = yearlyRent - totalCosts
    const irnr = Math.max(netBeforeTax, 0) * 0.19
    const netAfterTax = netBeforeTax - irnr
    const yieldOnPrice = price > 0 ? (netAfterTax / price) * 100 : 0
    const yieldOnEquity = ownMoneyNeeded > 0 ? (netAfterTax / ownMoneyNeeded) * 100 : 0
    return { yearlyRent, mgmt, maint, mortgageInterest, ibiYearly, vveYearly, insYearly, totalCosts, netBeforeTax, irnr, netAfterTax, yieldOnPrice, yieldOnEquity }
  }, [monthlyRent, managementPct, maintenancePct, monthlyMortgage, rate, ibiMonthly, vveMonthly, insuranceMonthly, price, ownMoneyNeeded])

  // ===== SL =====
  const slCalc = useMemo(() => {
    const vpbRate = slAge === 'new' ? 15 : 25
    const grossRent = monthlyRent * 12
    const depreciation = price * 0.7 * 0.03 // 3% over gebouwwaarde (70% van aankoop)
    const mortgageInt = rentCalc.mortgageInterest
    const deductibles = rentCalc.mgmt + rentCalc.maint + mortgageInt + rentCalc.ibiYearly + rentCalc.vveYearly + rentCalc.insYearly + depreciation + slAdmin
    const taxableProfit = Math.max(grossRent - deductibles, 0)
    const vpb = taxableProfit * (vpbRate / 100)
    const netInSL = grossRent - deductibles - vpb
    return { grossRent, depreciation, deductibles, taxableProfit, vpbRate, vpb, netInSL }
  }, [slAge, slAdmin, monthlyRent, price, rentCalc])

  // ===== FLIP =====
  const flipCalc = useMemo(() => {
    const buildingSupervision = renoBudget * 0.05
    const unforeseen = renoBudget * 0.10
    const totalInv = price + (kkCalc?.total ?? 0) + renoBudget + buildingSupervision + unforeseen
    const agentFee = sellPrice * (agentPct / 100)
    const plusvalia = sellPrice * 0.005 // schatting
    const capitalGain = sellPrice - totalInv - agentFee - plusvalia
    const capitalGainsTax = Math.max(capitalGain, 0) * 0.19
    const netProfit = capitalGain - capitalGainsTax
    const roi = totalInv > 0 ? (netProfit / totalInv) * 100 : 0
    const durationYears = (renoMonths + saleMonths) / 12
    const roiYearly = durationYears > 0 ? roi / durationYears : 0
    return { totalInv, buildingSupervision, unforeseen, agentFee, plusvalia, capitalGain, capitalGainsTax, netProfit, roi, roiYearly }
  }, [price, kkCalc, renoBudget, sellPrice, agentPct, renoMonths, saleMonths])


  // ===== MEERJAREN PROJECTIE =====
  const projection = useMemo(() => {
    const rows = []
    let cumCashflow = 0
    let remainingMortgage = mortgage
    for (let y = 1; y <= 10; y++) {
      const yearRent = monthlyRent * 12 * Math.pow(1 + rentIndex / 100, y - 1)
      const yearPayment = monthlyMortgage * 12
      const interestPaid = remainingMortgage * (rate / 100)
      const principalPaid = yearPayment - interestPaid
      remainingMortgage = Math.max(remainingMortgage - principalPaid, 0)
      const yearCosts = yearRent * ((managementPct + maintenancePct) / 100) + (ibiMonthly + vveMonthly + insuranceMonthly) * 12 * Math.pow(1.02, y - 1)
      const netBeforeTax = yearRent - yearCosts - interestPaid
      const tax = Math.max(netBeforeTax, 0) * 0.19
      const cashflow = netBeforeTax - tax - principalPaid
      cumCashflow += cashflow
      rows.push({ year: y, mortgage: yearPayment, rent: yearRent, cashflow, cumCashflow, remainingMortgage })
    }
    return rows
  }, [mortgage, monthlyRent, rentIndex, monthlyMortgage, rate, managementPct, maintenancePct, ibiMonthly, vveMonthly, insuranceMonthly])

  if (loading) return <PageLayout title="Calculator"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Calculator" subtitle="Modulaire scenario-calculator voor Spaans vastgoed">
      {/* Modus keuze */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
        {MODES.map(m => {
          const Icon = m.icon
          return (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                mode === m.key ? 'border-[#0EAE96] bg-[#0EAE96]/5' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <Icon size={16} className={mode === m.key ? 'text-[#0EAE96]' : 'text-gray-400'} />
              <div className={`text-sm font-semibold mt-1 ${mode === m.key ? 'text-[#004B46]' : 'text-gray-700'}`}>{m.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{m.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Basis velden */}
      <Card title="Basisgegevens">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Aankoopprijs (€)"><input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className={inp} /></Field>
          <Field label="Regio">
            <select value={regionId} onChange={e => setRegionId(e.target.value)} className={inp}>
              {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
            </select>
          </Field>
          <Field label="Type woning">
            <select value={propType} onChange={e => setPropType(e.target.value as 'bestaand' | 'nieuwbouw')} className={inp}>
              <option value="bestaand">Bestaande bouw</option>
              <option value="nieuwbouw">Nieuwbouw</option>
            </select>
          </Field>
          <Field label="Resident in Spanje?">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button onClick={() => setIsResident(true)}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-all cursor-pointer ${isResident ? 'bg-[#0EAE96] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Ja
              </button>
              <button onClick={() => setIsResident(false)}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-all cursor-pointer ${!isResident ? 'bg-[#0EAE96] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                Nee
              </button>
            </div>
          </Field>
        </div>
      </Card>

      {/* Kosten koper — altijd zichtbaar */}
      {kkCalc && (
        <Card title="Kosten koper">
          <table className="w-full text-sm">
            <tbody>
              {propType === 'bestaand' ? (
                <Row label={`ITP${region?.itp_progressive ? ' (progressief)' : ` (${pct(region?.itp_percentage ?? 0)})`}`} value={kkCalc.itp} />
              ) : (
                <>
                  <Row label={`IVA (${pct(region?.iva_percentage ?? 0)})`} value={kkCalc.iva} />
                  <Row label={`AJD (${pct(region?.ajd_percentage ?? 0)})`} value={kkCalc.ajd} />
                </>
              )}
              <Row label="Notariskosten" value={kkCalc.notary} />
              <Row label="Kadaster / Registro" value={kkCalc.registro} />
              <Row label="Juridisch (advocaat)" value={kkCalc.lawyer} />
              {kkCalc.bankCosts > 0 && <Row label="Bankkosten + taxatie" value={kkCalc.bankCosts} />}
              <tr className="border-t-2 border-slate-200">
                <td className="py-2 font-bold text-slate-800">Totaal kosten koper</td>
                <td className="py-2 text-right font-bold text-slate-800">{fmt(kkCalc.total)} <span className="text-xs text-slate-400 ml-1">({((kkCalc.total / price) * 100).toFixed(1)}%)</span></td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {/* Financiering + Totale investering + Maandlasten — in juiste volgorde */}
      {mode !== 'flip' && (
        <>
          <Card title="Financiering">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Eigen geld (€)"><input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className={inp} /></Field>
              <Field label="Looptijd (jaar)"><input type="number" value={years} min={5} max={30} onChange={e => setYears(Number(e.target.value))} className={inp} /></Field>
              <Field label={`Rente: ${rate.toFixed(1)}%`}>
                <input type="range" min={0} max={10} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full accent-[#004B46]" />
              </Field>
              <Field label="Aflossing">
                <select className={inp} defaultValue="annuitair">
                  <option value="annuitair">Annuïtair</option>
                  <option value="lineair">Lineair</option>
                  <option value="aflossingsvrij">Aflossingsvrij</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm pt-3 border-t border-slate-100">
              <div><span className="text-slate-500">Hypotheek</span><div className="font-bold text-slate-800">{fmt(mortgage)}</div></div>
              <div><span className="text-slate-500">LTV</span><div className={`font-bold ${ltvWarning ? 'text-red-500' : 'text-slate-800'}`}>{ltv.toFixed(1)}% {ltvWarning && <span className="text-xs">(max {maxLTV}%)</span>}</div></div>
              <div><span className="text-slate-500">Maandlast hypotheek</span><div className="font-bold text-[#0EAE96]">{fmt(Math.round(monthlyMortgage))}</div></div>
            </div>
            {ltvWarning && <div className="mt-3 flex items-center gap-2 text-xs text-red-600"><AlertTriangle size={14} /> LTV overschrijdt maximum voor {isResident ? 'resident' : 'niet-resident'} ({maxLTV}%). Spaanse banken financieren max {maxLTV}%.</div>}
          </Card>

          <Card title="Totale investering">
            <table className="w-full text-sm">
              <tbody>
                <Row label="Aankoopprijs" value={price} />
                <Row label="Kosten koper" value={kkCalc?.total ?? 0} />
                <tr className="border-t border-slate-200">
                  <td className="py-2 font-semibold text-slate-700">Totale investering</td>
                  <td className="py-2 text-right font-bold text-slate-800">{fmt(totalInvestment)}</td>
                </tr>
                <tr><td className="py-2 text-slate-500">Eigen geld nodig</td><td className="py-2 text-right text-slate-700">{fmt(ownMoneyNeeded)}</td></tr>
              </tbody>
            </table>
          </Card>

          <Card title="Maandlasten">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="IBI/mnd"><input type="number" value={ibiMonthly} onChange={e => setIbiMonthly(Number(e.target.value))} className={inp} /></Field>
              <Field label="VvE/mnd"><input type="number" value={vveMonthly} onChange={e => setVveMonthly(Number(e.target.value))} className={inp} /></Field>
              <Field label="Verzekering/mnd"><input type="number" value={insuranceMonthly} onChange={e => setInsuranceMonthly(Number(e.target.value))} className={inp} /></Field>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between">
              <span className="text-sm font-semibold text-slate-700">Totaal per maand</span>
              <span className="font-bold text-[#0EAE96]">{fmt(Math.round(totalMonthly))}</span>
            </div>
          </Card>
        </>
      )}

      {/* VERHUUR */}
      {(mode === 'verhuur' || mode === 'sl') && (
        <Card title="Verhuur">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Field label="Maandhuur (€)"><input type="number" value={monthlyRent} onChange={e => setMonthlyRent(Number(e.target.value))} className={inp} /></Field>
            <Field label="Beheer %"><input type="number" value={managementPct} step={0.5} onChange={e => setManagementPct(Number(e.target.value))} className={inp} /></Field>
            <Field label="Onderhoud %"><input type="number" value={maintenancePct} step={0.5} onChange={e => setMaintenancePct(Number(e.target.value))} className={inp} /></Field>
          </div>
          {monthlyRent > 0 && (
            <table className="w-full text-sm border-t border-slate-100 pt-3">
              <tbody>
                <Row label="Bruto jaarhuur" value={rentCalc.yearlyRent} bold />
                <Row label="− Beheer" value={-rentCalc.mgmt} />
                <Row label="− Onderhoud" value={-rentCalc.maint} />
                <Row label="− Hypotheekrente" value={-rentCalc.mortgageInterest} />
                <Row label="− IBI + VvE + verzekering" value={-(rentCalc.ibiYearly + rentCalc.vveYearly + rentCalc.insYearly)} />
                <tr className="border-t border-slate-200">
                  <td className="py-2 font-semibold">Netto winst vóór belasting</td>
                  <td className="py-2 text-right font-semibold">{fmt(rentCalc.netBeforeTax)}</td>
                </tr>
                <Row label="− IRNR 19%" value={-rentCalc.irnr} />
                <tr className="border-t-2 border-[#0EAE96]">
                  <td className="py-2 font-bold text-[#0EAE96]">Netto winst na belasting</td>
                  <td className="py-2 text-right font-bold text-[#0EAE96]">{fmt(rentCalc.netAfterTax)}</td>
                </tr>
                <tr><td className="py-2 text-slate-500">Rendement op aankoopprijs</td><td className="py-2 text-right">{rentCalc.yieldOnPrice.toFixed(1)}%</td></tr>
                <tr><td className="py-2 text-slate-500">Rendement op eigen geld</td><td className="py-2 text-right font-semibold">{rentCalc.yieldOnEquity.toFixed(1)}%</td></tr>
              </tbody>
            </table>
          )}

          {mode === 'verhuur' && (
            <label className="flex items-center gap-2 mt-4 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={showProjection} onChange={e => setShowProjection(e.target.checked)} className="rounded border-gray-300" />
              Toon meerjaren projectie (10 jaar)
            </label>
          )}
        </Card>
      )}

      {/* SL */}
      {mode === 'sl' && (
        <Card title="SL (Sociedad Limitada)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Field label="SL leeftijd">
              <select value={slAge} onChange={e => setSlAge(e.target.value as 'new' | 'old')} className={inp}>
                <option value="new">&lt; 2 jaar (15% VPB)</option>
                <option value="old">2+ jaar (25% VPB)</option>
              </select>
            </Field>
            <Field label="SL administratie/jaar"><input type="number" value={slAdmin} onChange={e => setSlAdmin(Number(e.target.value))} className={inp} /></Field>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Bruto jaarhuur" value={slCalc.grossRent} />
              <Row label="− Alle aftrekbare kosten" value={-slCalc.deductibles} />
              <tr className="border-t border-slate-200"><td className="py-2 font-semibold">Belastbare winst SL</td><td className="py-2 text-right font-semibold">{fmt(slCalc.taxableProfit)}</td></tr>
              <Row label={`− VPB (${slCalc.vpbRate}%)`} value={-slCalc.vpb} />
              <tr className="border-t-2 border-[#0EAE96]">
                <td className="py-2 font-bold text-[#0EAE96]">Netto winst in SL</td>
                <td className="py-2 text-right font-bold text-[#0EAE96]">{fmt(slCalc.netInSL)}</td>
              </tr>
              <tr><td colSpan={2} className="pt-3 text-xs text-slate-400 italic">Dividenduitkering is een aparte gespreksvraag voor de fiscalist (NL Box 2-impact).</td></tr>
            </tbody>
          </table>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Privé vs SL</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th></th><th className="font-normal py-1">Privé (IRNR)</th><th className="font-normal py-1">Via SL (VPB)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="py-1 text-slate-600">Spaanse belasting</td><td>19% netto</td><td>{slCalc.vpbRate}% winst</td></tr>
                <tr><td className="py-1 text-slate-600">Aftrekbare kosten</td><td>Beperkt</td><td>Volledig + afschrijving</td></tr>
                <tr className="border-t border-slate-100"><td className="py-2 font-semibold">Netto na belasting</td><td className="font-semibold">{fmt(rentCalc.netAfterTax)}</td><td className="font-semibold">{fmt(slCalc.netInSL)}</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-500 italic mt-3">SL is fiscaal voordelig vanaf 2-3 panden of bij herinvestering. Privé is eenvoudiger en goedkoper bij 1 pand.</p>
          </div>
        </Card>
      )}

      {/* NL vs ES */}
      {/* FLIP */}
      {mode === 'flip' && (
        <Card title="Renovatie / Flip">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Field label="Renovatiebudget (€)"><input type="number" value={renoBudget} onChange={e => setRenoBudget(Number(e.target.value))} className={inp} /></Field>
            <Field label="Verwachte verkoop (€)"><input type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))} className={inp} /></Field>
            <Field label="Renovatie (mnd)"><input type="number" value={renoMonths} onChange={e => setRenoMonths(Number(e.target.value))} className={inp} /></Field>
            <Field label="Verkoop (mnd)"><input type="number" value={saleMonths} onChange={e => setSaleMonths(Number(e.target.value))} className={inp} /></Field>
            <Field label="Makelaarscourtage %"><input type="number" value={agentPct} step={0.5} onChange={e => setAgentPct(Number(e.target.value))} className={inp} /></Field>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Aankoopprijs" value={price} />
              <Row label="Kosten koper" value={kkCalc?.total ?? 0} />
              <Row label="Renovatiebudget" value={renoBudget} />
              <Row label="Bouwbegeleiding (5%)" value={flipCalc.buildingSupervision} />
              <Row label="Onvoorzien (10%)" value={flipCalc.unforeseen} />
              <tr className="border-t border-slate-200"><td className="py-2 font-semibold">Totale investering</td><td className="py-2 text-right font-semibold">{fmt(flipCalc.totalInv)}</td></tr>
              <tr><td colSpan={2} className="pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verkoopfase</td></tr>
              <Row label="Verkoopprijs" value={sellPrice} />
              <Row label={`− Makelaar (${agentPct}%)`} value={-flipCalc.agentFee} />
              <Row label="− Plusvalía municipal" value={-flipCalc.plusvalia} />
              <tr className="border-t border-slate-200"><td className="py-2 font-semibold">Bruto winst</td><td className={`py-2 text-right font-semibold ${flipCalc.capitalGain > 0 ? '' : 'text-red-500'}`}>{fmt(flipCalc.capitalGain)}</td></tr>
              <Row label="− Vermogenswinstbelasting 19%" value={-flipCalc.capitalGainsTax} />
              <tr className="border-t-2 border-[#0EAE96]">
                <td className="py-2 font-bold text-[#0EAE96]">Netto winst</td>
                <td className={`py-2 text-right font-bold ${flipCalc.netProfit > 0 ? 'text-[#0EAE96]' : 'text-red-500'}`}>{fmt(flipCalc.netProfit)}</td>
              </tr>
              <tr><td className="py-2 text-slate-500">ROI</td><td className="py-2 text-right">{flipCalc.roi.toFixed(1)}%</td></tr>
              <tr><td className="py-2 text-slate-500">ROI per jaar ({renoMonths + saleMonths} mnd)</td><td className="py-2 text-right font-semibold">{flipCalc.roiYearly.toFixed(1)}%</td></tr>
            </tbody>
          </table>
          {flipCalc.netProfit < 0 && <div className="mt-3 flex items-center gap-2 text-xs text-red-600"><AlertTriangle size={14} /> Negatieve marge — verlies op deze flip</div>}
        </Card>
      )}

      {/* MEERJAREN PROJECTIE */}
      {(mode === 'verhuur' || mode === 'sl') && showProjection && (
        <Card title="Meerjaren projectie">
          <div className="mb-3">
            <Field label="Huurindexatie %"><input type="number" value={rentIndex} step={0.1} onChange={e => setRentIndex(Number(e.target.value))} className={inp} /></Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left">
                {['Jaar', 'Hypotheek', 'Huur', 'Cashflow', 'Cumulatief', 'Restschuld'].map(h => <th key={h} className="py-2 text-xs text-slate-400 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {projection.map(row => (
                  <tr key={row.year} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{row.year}</td>
                    <td className="py-2 text-slate-600">{fmt(row.mortgage)}</td>
                    <td className="py-2 text-slate-600">{fmt(row.rent)}</td>
                    <td className={`py-2 font-medium ${row.cashflow > 0 ? 'text-[#0EAE96]' : 'text-red-500'}`}>{fmt(row.cashflow)}</td>
                    <td className="py-2 font-semibold">{fmt(row.cumCashflow)}</td>
                    <td className="py-2 text-slate-500">{fmt(row.remainingMortgage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
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

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  const neg = value < 0
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td className="py-1.5 text-slate-600">{label}</td>
      <td className={`py-1.5 text-right tabular-nums ${neg ? 'text-red-500' : ''}`}>{fmt(Math.abs(value))}</td>
    </tr>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 bg-white'
