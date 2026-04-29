'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Building2,
  CalendarDays,
  ChevronDown,
  Hammer,
  Home,
  Info,
  MapPin,
  PiggyBank,
  Receipt,
  RotateCcw,
  Scale,
  Share2,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'

// ════════════════════ Constants & tokens ════════════════════

const DEFAULT_RATE_RESIDENT = 3.2
const DEFAULT_RATE_NON_RESIDENT = 4.0
const MAX_LTV_RESIDENT = 80
const MAX_LTV_NON_RESIDENT = 70

const RENO_SETTINGS = {
  supervision_pct: 5,
  contingency_pct: 10,
  plusvalia_pct: 0.5,
  cgt_pct: 19,
  irnr_pct: 19,
  vpb_young_pct: 15,
  vpb_mature_pct: 25,
  building_value_pct: 70,
  depreciation_pct: 3,
}

type ModeId = 'eigen' | 'verhuur' | 'sl' | 'flip'

const CALC_MODES: { id: ModeId; label: string; desc: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }> }[] = [
  { id: 'eigen', label: 'Eigen gebruik', desc: 'Tweede woning voor persoonlijk gebruik', icon: Home },
  { id: 'verhuur', label: 'Verhuur (privé)', desc: 'Privé-investering met verhuur', icon: Wallet },
  { id: 'sl', label: 'Investering SL', desc: 'Via Sociedad Limitada', icon: Building2 },
  { id: 'flip', label: 'Renovatie / Flip', desc: 'Aankoop + renovatie + verkoop', icon: Hammer },
]

// ════════════════════ Types ════════════════════
interface Bracket {
  threshold: number | null
  rate: number
}

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

interface CalcState {
  mode: ModeId
  price: number
  regionId: string
  propType: 'existing' | 'new'
  isResident: boolean

  ltvPct: number // 0–100, stap 5 — bron-van-waarheid voor financiering. Eigen geld + hypotheek worden hieruit afgeleid.
  rate: number
  years: number
  amortType: 'annuity' | 'linear' | 'interest-only'

  ibiMonthly: number
  vveMonthly: number
  insuranceMonthly: number

  monthlyRent: number
  managementPct: number
  maintenancePct: number

  slAge: 'young' | 'mature'
  slAdmin: number

  renoBudget: number
  sellPrice: number
  renoMonths: number
  saleMonths: number
  agentPct: number

  showProjection: boolean
  rentIndex: number
}

type PartialState = Partial<CalcState>

const DEFAULT_STATE: CalcState = {
  mode: 'verhuur',
  price: 485000,
  regionId: '',
  propType: 'existing',
  isResident: false,
  ltvPct: 60,
  rate: 4.0,
  years: 20,
  amortType: 'annuity',
  ibiMonthly: 85,
  vveMonthly: 170,
  insuranceMonthly: 45,
  monthlyRent: 2800,
  managementPct: 15,
  maintenancePct: 5,
  slAge: 'young',
  slAdmin: 2500,
  renoBudget: 75000,
  sellPrice: 640000,
  renoMonths: 6,
  saleMonths: 3,
  agentPct: 4,
  showProjection: false,
  rentIndex: 2.5,
}

// Example scenarios per mode
const EXAMPLE_SCENARIOS: Record<ModeId, Array<{ label: string } & PartialState>> = {
  eigen: [
    {
      label: 'Villa Marbella — 2e woning',
      price: 485000, propType: 'existing', isResident: false,
      ltvPct: 60, rate: 4.0, years: 20,
      ibiMonthly: 90, vveMonthly: 180, insuranceMonthly: 45,
    },
    {
      label: 'Appartement Jávea — eigen gebruik',
      price: 320000, propType: 'existing', isResident: false,
      ltvPct: 60, rate: 4.0, years: 25,
      ibiMonthly: 55, vveMonthly: 120, insuranceMonthly: 35,
    },
  ],
  verhuur: [
    {
      label: 'Torre del Mar — vakantieverhuur',
      price: 275000, propType: 'existing', isResident: false,
      ltvPct: 60, rate: 4.0, years: 20,
      ibiMonthly: 50, vveMonthly: 95, insuranceMonthly: 32,
      monthlyRent: 1850, managementPct: 15, maintenancePct: 6,
    },
    {
      label: 'Alicante centro — long term',
      price: 215000, propType: 'existing', isResident: false,
      ltvPct: 60, rate: 4.0, years: 25,
      ibiMonthly: 40, vveMonthly: 85, insuranceMonthly: 28,
      monthlyRent: 1100, managementPct: 8, maintenancePct: 5,
    },
  ],
  sl: [
    {
      label: 'Penthouse Estepona — via SL',
      price: 650000, propType: 'existing', isResident: false,
      ltvPct: 60, rate: 4.0, years: 20,
      ibiMonthly: 110, vveMonthly: 240, insuranceMonthly: 65,
      monthlyRent: 3400, managementPct: 15, maintenancePct: 5,
      slAge: 'young', slAdmin: 2500,
    },
    {
      label: 'Ibiza portfolio — 2+ jaar SL',
      price: 1200000, propType: 'existing', isResident: false,
      ltvPct: 50, rate: 4.0, years: 20,
      ibiMonthly: 220, vveMonthly: 480, insuranceMonthly: 140,
      monthlyRent: 6500, managementPct: 18, maintenancePct: 6,
      slAge: 'mature', slAdmin: 3800,
    },
  ],
  flip: [
    {
      label: 'Fixer-upper Nerja — 8 mnd flip',
      price: 180000, propType: 'existing', isResident: false,
      renoBudget: 85000, sellPrice: 345000, renoMonths: 5, saleMonths: 3, agentPct: 4,
    },
    {
      label: 'Rooftop Barcelona — ambitieus',
      price: 420000, propType: 'existing', isResident: false,
      renoBudget: 160000, sellPrice: 720000, renoMonths: 7, saleMonths: 4, agentPct: 4.5,
    },
  ],
}

// ════════════════════ Calc engine ════════════════════

function calcITP(price: number, region: RegionalSettings | null): number {
  if (!region || !price) return 0
  if (region.itp_progressive && region.itp_progressive.length) {
    let sum = 0
    let prev = 0
    for (const b of region.itp_progressive) {
      const top = b.threshold == null ? price : Math.min(b.threshold, price)
      if (top > prev) sum += (top - prev) * (b.rate / 100)
      prev = top
      if (b.threshold == null || price <= b.threshold) break
    }
    return sum
  }
  return price * (region.itp_percentage / 100)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

interface BuyerCostRow {
  key: string
  label: string
  sub: string
  value: number
}

interface BuyerCosts {
  rows: BuyerCostRow[]
  total: number
  pct: number
}

function calcBuyerCosts(
  price: number,
  region: RegionalSettings | null,
  propType: 'existing' | 'new',
  hasMortgage: boolean
): BuyerCosts {
  if (!region || !price) return { rows: [], total: 0, pct: 0 }

  const rows: BuyerCostRow[] = []
  if (propType === 'new') {
    const iva = price * (region.iva_percentage / 100)
    rows.push({ key: 'iva', label: 'IVA', sub: `${fmtPct(region.iva_percentage)} op aankoopprijs`, value: iva })
    const ajd = price * (region.ajd_percentage / 100)
    rows.push({ key: 'ajd', label: 'AJD', sub: `${fmtPct(region.ajd_percentage)} zegelrecht`, value: ajd })
  } else {
    const itp = calcITP(price, region)
    const effective = price > 0 ? (itp / price) * 100 : 0
    const sub = region.itp_progressive
      ? `Progressief — effectief ${fmtPct(effective, 2)}`
      : `${fmtPct(region.itp_percentage)} op aankoopprijs`
    rows.push({ key: 'itp', label: 'ITP', sub, value: itp })
  }

  const notary = clamp(price * (region.notary_percentage / 100), region.notary_min, region.notary_max)
  rows.push({
    key: 'notary',
    label: 'Notariskosten',
    sub: `${fmtPct(region.notary_percentage)} (min ${fmtEUR(region.notary_min)} / max ${fmtEUR(region.notary_max)})`,
    value: notary,
  })

  const registro = clamp(price * (region.registro_percentage / 100), region.registro_min, region.registro_max)
  rows.push({
    key: 'registro',
    label: 'Kadaster / Registro',
    sub: `${fmtPct(region.registro_percentage)} (min ${fmtEUR(region.registro_min)} / max ${fmtEUR(region.registro_max)})`,
    value: registro,
  })

  const lawyer = Math.max(price * (region.lawyer_percentage / 100), region.lawyer_minimum)
  rows.push({
    key: 'lawyer',
    label: 'Juridisch (advocaat)',
    sub: `${fmtPct(region.lawyer_percentage)} · minimum ${fmtEUR(region.lawyer_minimum)}`,
    value: lawyer,
  })

  if (hasMortgage) {
    rows.push({
      key: 'bank',
      label: 'Bankkosten + taxatie',
      sub: 'Forfaitair, bij hypotheek < 100%',
      value: 1200,
    })
  }

  const total = rows.reduce((sum, r) => sum + r.value, 0)
  return { rows, total, pct: price > 0 ? (total / price) * 100 : 0 }
}

function monthlyAnnuity(loan: number, annualRatePct: number, years: number): number {
  if (loan <= 0 || years <= 0) return 0
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return loan / n
  return loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function calcRental(state: CalcState, buyer: BuyerCosts) {
  const annualRent = state.monthlyRent * 12
  const management = annualRent * (state.managementPct / 100)
  const maintenance = annualRent * (state.maintenancePct / 100)
  const downPayment = state.price * (1 - state.ltvPct / 100)
  const mortgage = Math.max(0, state.price * (state.ltvPct / 100))
  const monthlyPayment = monthlyAnnuity(mortgage, state.rate, state.years)
  const annualInterestApprox = monthlyPayment * 12 * 0.6
  const fixedCostsYear = (state.ibiMonthly + state.vveMonthly + state.insuranceMonthly) * 12
  const preTax = annualRent - management - maintenance - annualInterestApprox - fixedCostsYear
  const irnr = Math.max(0, preTax) * (RENO_SETTINGS.irnr_pct / 100)
  const netAfterTax = preTax - irnr
  const yieldOnPrice = state.price > 0 ? (netAfterTax / state.price) * 100 : 0
  const equityInvested = downPayment + buyer.total
  const yieldOnEquity = equityInvested > 0 ? (netAfterTax / equityInvested) * 100 : 0
  return {
    annualRent, management, maintenance, annualInterestApprox, fixedCostsYear,
    preTax, irnr, netAfterTax, yieldOnPrice, yieldOnEquity, monthlyPayment, equityInvested,
  }
}

function calcSL(state: CalcState, rental: ReturnType<typeof calcRental>) {
  const buildingValue = state.price * (RENO_SETTINGS.building_value_pct / 100)
  const depreciation = buildingValue * (RENO_SETTINGS.depreciation_pct / 100)
  // Echte cash-uitgaven (geen afschrijving — dat is een papieren kost).
  const realCosts =
    rental.management + rental.maintenance + rental.annualInterestApprox +
    rental.fixedCostsYear + state.slAdmin
  // Fiscaal aftrekbaar = echte kosten + afschrijving (alleen voor belastinggrondslag).
  const deductible = realCosts + depreciation
  const taxable = Math.max(0, rental.annualRent - deductible)
  const vpbPct = state.slAge === 'young' ? RENO_SETTINGS.vpb_young_pct : RENO_SETTINGS.vpb_mature_pct
  const vpb = taxable * (vpbPct / 100)
  // Cash in de SL = huur − echte kosten − VPB. Afschrijving is een tax-shield,
  // geen werkelijke uitgave — dus NIET hier aftrekken.
  const netInSL = rental.annualRent - realCosts - vpb
  return { buildingValue, depreciation, deductible, taxable, vpbPct, vpb, netInSL, realCosts }
}

function calcFlip(state: CalcState, buyer: BuyerCosts) {
  const supervision = state.renoBudget * (RENO_SETTINGS.supervision_pct / 100)
  const contingency = state.renoBudget * (RENO_SETTINGS.contingency_pct / 100)
  const totalInvest = state.price + buyer.total + state.renoBudget + supervision + contingency
  const agent = state.sellPrice * (state.agentPct / 100)
  const plusvalia = state.sellPrice * (RENO_SETTINGS.plusvalia_pct / 100)
  const grossProfit = state.sellPrice - agent - plusvalia - totalInvest
  const cgt = Math.max(0, grossProfit) * (RENO_SETTINGS.cgt_pct / 100)
  const netProfit = grossProfit - cgt
  const roi = totalInvest > 0 ? (netProfit / totalInvest) * 100 : 0
  const months = state.renoMonths + state.saleMonths
  const roiPerYear = months > 0 ? (roi / months) * 12 : 0
  return { supervision, contingency, totalInvest, agent, plusvalia, grossProfit, cgt, netProfit, roi, roiPerYear, months }
}

interface ProjectionRow {
  year: number
  rent: number
  mortgagePaid: number
  cashflow: number
  cumulative: number
  balance: number
}

function calcProjection(state: CalcState, years = 10): ProjectionRow[] {
  const rows: ProjectionRow[] = []
  const mortgage0 = Math.max(0, state.price * (state.ltvPct / 100))
  const monthlyPayment = monthlyAnnuity(mortgage0, state.rate, state.years)
  const rIdx = 1 + state.rentIndex / 100
  let cumulative = 0
  let balance = mortgage0
  const fixedStart = (state.ibiMonthly + state.vveMonthly + state.insuranceMonthly) * 12

  for (let y = 1; y <= years; y++) {
    const rent = state.monthlyRent * 12 * Math.pow(rIdx, y - 1)
    const mortgagePaid = monthlyPayment * 12
    const interestY = balance * (state.rate / 100)
    const principalY = Math.max(0, mortgagePaid - interestY)
    balance = Math.max(0, balance - principalY)
    const ops = (rent * (state.managementPct + state.maintenancePct)) / 100 + fixedStart
    const preTaxY = rent - ops - interestY
    const taxY = Math.max(0, preTaxY) * (RENO_SETTINGS.irnr_pct / 100)
    const cashflow = rent - mortgagePaid - ops - taxY
    cumulative += cashflow
    rows.push({ year: y, rent, mortgagePaid, cashflow, cumulative, balance })
  }
  return rows
}

// ════════════════════ Formatters ════════════════════

function fmtEUR(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const sign = n < 0 ? '−' : ''
  const abs = Math.abs(Math.round(n))
  return sign + '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(abs)
}

function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return '—'
  return (
    new Intl.NumberFormat('nl-NL', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n) +
    '%'
  )
}

// ════════════════════ Page ════════════════════

export default function CalculatorPage() {
  const [state, setState] = useState<CalcState>(DEFAULT_STATE)
  const [regions, setRegions] = useState<RegionalSettings[]>([])
  const [regionsLoaded, setRegionsLoaded] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)

  const patch = (p: PartialState) => setState(s => ({ ...s, ...p }))

  // Load regions on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/regional-settings')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setRegions(data)
            // Default: Costa del Sol / first
            const preferred =
              data.find((r: RegionalSettings) =>
                r.region.toLowerCase().includes('costa del sol') ||
                r.region.toLowerCase().includes('andalucía') ||
                r.region.toLowerCase().includes('andalucia')
              ) || data[0]
            setState(s => ({ ...s, regionId: preferred.id }))
          }
        }
      } catch {
        /* ignore */
      }
      setRegionsLoaded(true)
    }
    load()
  }, [])

  // Rate auto-adjusts when resident toggles — handled inline in the resident Toggle onChange
  const setResident = (isResident: boolean) =>
    setState(s => ({
      ...s,
      isResident,
      rate: isResident ? DEFAULT_RATE_RESIDENT : DEFAULT_RATE_NON_RESIDENT,
    }))

  const region = useMemo(() => regions.find(r => r.id === state.regionId) || null, [regions, state.regionId])

  const downPayment = state.price * (1 - state.ltvPct / 100)
  const mortgage = Math.max(0, state.price * (state.ltvPct / 100))
  const hasMortgage = mortgage > 0
  const maxLTV = state.isResident ? MAX_LTV_RESIDENT : MAX_LTV_NON_RESIDENT
  const ltv = state.price > 0 ? (mortgage / state.price) * 100 : 0
  const ltvWarn = hasMortgage && ltv > maxLTV
  const monthlyPayment = monthlyAnnuity(mortgage, state.rate, state.years)
  const monthlyTotal = monthlyPayment + state.ibiMonthly + state.vveMonthly + state.insuranceMonthly
  const fin = { downPayment, mortgage, hasMortgage, maxLTV, ltv, ltvWarn, monthlyPayment, monthlyTotal }

  const buyer = useMemo(
    () => calcBuyerCosts(state.price, region, state.propType, hasMortgage),
    [state.price, region, state.propType, hasMortgage]
  )
  const rental = useMemo(() => calcRental(state, buyer), [state, buyer])
  const sl = useMemo(() => calcSL(state, rental), [state, rental])
  const flip = useMemo(() => calcFlip(state, buyer), [state, buyer])
  const projection = useMemo(
    () => (state.showProjection ? calcProjection(state, 10) : []),
    [state]
  )

  const modeMeta = CALC_MODES.find(m => m.id === state.mode) || CALC_MODES[0]

  function loadExample(ex: { label: string } & PartialState) {
    setState(s => ({ ...s, ...ex }))
    setExamplesOpen(false)
  }

  function reset() {
    setState({ ...DEFAULT_STATE, regionId: state.regionId })
  }

  return (
    <div
      className="flex flex-col bg-marble"
      style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}
    >
      <CalcHeader
        mode={state.mode}
        examplesOpen={examplesOpen}
        setExamplesOpen={setExamplesOpen}
        onLoadExample={loadExample}
        onReset={reset}
      />

      <div className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: '22px 36px 80px' }}>
          <div
            className="grid"
            style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 24, alignItems: 'start' }}
          >
            <div className="min-w-0">
              {/* Mode picker */}
              <ModePicker mode={state.mode} onChange={m => patch({ mode: m })} />

              {/* Hero stats */}
              <HeroStats
                mode={state.mode}
                state={state}
                buyer={buyer}
                fin={fin}
                rental={rental}
                sl={sl}
                flip={flip}
              />

              {/* 1 — Basisgegevens */}
              <Section num={1} title="Basisgegevens">
                <Grid cols={4}>
                  <Field label="Aankoopprijs (€)">
                    <MoneyInput value={state.price} onChange={v => patch({ price: v })} />
                  </Field>
                  <Field label="Regio">
                    {regions.length === 0 && regionsLoaded ? (
                      <div
                        className="font-body"
                        style={{ fontSize: 12, color: '#7A8C8B', padding: '9px 0' }}
                      >
                        Geen regio&apos;s geladen.
                      </div>
                    ) : (
                      <CalcSelect
                        value={state.regionId}
                        onChange={e => patch({ regionId: e.target.value })}
                        disabled={regions.length === 0}
                      >
                        {regions.length === 0 && <option value="">Laden...</option>}
                        {regions.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.region}
                          </option>
                        ))}
                      </CalcSelect>
                    )}
                  </Field>
                  <Field label="Type woning">
                    <Toggle
                      value={state.propType}
                      onChange={v => patch({ propType: v as 'existing' | 'new' })}
                      options={[
                        { value: 'existing', label: 'Bestaande bouw' },
                        { value: 'new', label: 'Nieuwbouw' },
                      ]}
                    />
                  </Field>
                  <Field label="Resident in Spanje?">
                    <Toggle
                      value={state.isResident ? 'yes' : 'no'}
                      onChange={v => setResident(v === 'yes')}
                      options={[
                        { value: 'yes', label: 'Ja' },
                        { value: 'no', label: 'Nee' },
                      ]}
                    />
                  </Field>
                </Grid>
              </Section>

              {/* 2 — Kosten koper */}
              <Section
                num={2}
                title="Kosten koper"
                eyebrow={state.propType === 'new' ? 'Nieuwbouw (IVA + AJD)' : 'Bestaande bouw (ITP)'}
              >
                <BuyerCostsTable buyer={buyer} />
              </Section>

              {/* 3 — Financiering */}
              {state.mode !== 'flip' && (
                <Section num={3} title="Financiering">
                  <LtvSlider
                    value={state.ltvPct}
                    onChange={v => patch({ ltvPct: v })}
                    maxLTV={fin.maxLTV}
                    isResident={state.isResident}
                  />

                  {fin.hasMortgage && (
                    <Grid cols={3}>
                      <Field label="Looptijd (jaar)">
                        <CalcInput
                          type="number"
                          min={5}
                          max={30}
                          value={state.years}
                          onChange={e => patch({ years: Number(e.target.value) || 20 })}
                        />
                      </Field>
                      <Field label="Rente">
                        <RateSlider
                          value={state.rate}
                          onChange={v => patch({ rate: v })}
                          resident={state.isResident}
                          warn={false}
                        />
                      </Field>
                      <Field label="Aflossing">
                        <CalcSelect
                          value={state.amortType}
                          onChange={e => patch({ amortType: e.target.value as CalcState['amortType'] })}
                        >
                          <option value="annuity">Annuïtair</option>
                          <option value="linear" disabled>Lineair</option>
                          <option value="interest-only" disabled>Aflossingsvrij</option>
                        </CalcSelect>
                      </Field>
                    </Grid>
                  )}

                  <DerivedRow>
                    <DerivedItem
                      label="Eigen geld ex. K.K."
                      sub={`${fmtPct(100 - state.ltvPct)} van aankoopprijs`}
                      value={fmtEUR(fin.downPayment)}
                    />
                    <DerivedItem
                      label="Hypotheek"
                      sub={fin.hasMortgage ? `${state.ltvPct}% van aankoopprijs` : 'Geen hypotheek'}
                      value={fmtEUR(fin.mortgage)}
                    />
                    {fin.hasMortgage && (
                      <DerivedItem
                        label="Maandlast hypotheek"
                        sub={`Annuïtair · ${state.years} jaar`}
                        value={fmtEUR(fin.monthlyPayment)}
                        accent="sea"
                      />
                    )}
                  </DerivedRow>

                  {fin.ltvWarn && (
                    <Warning>
                      <b>LTV overschrijdt maximum</b> voor {state.isResident ? 'resident' : 'niet-resident'} (
                      {fin.maxLTV}%). Spaanse banken financieren max {fin.maxLTV}%.
                    </Warning>
                  )}
                </Section>
              )}

              {/* 4 — Totale investering */}
              {state.mode !== 'flip' && (
                <Section num={4} title="Totale investering" compact>
                  <Table>
                    <tbody>
                      <SimpleRow label="Aankoopprijs" value={fmtEUR(state.price)} />
                      <SimpleRow label="Kosten koper" value={fmtEUR(buyer.total)} />
                      <TotalRow label="Totale investering" value={fmtEUR(state.price + buyer.total)} />
                      <SimpleRow
                        label="Eigen geld nodig"
                        sub="Eigen geld + kosten koper"
                        value={fmtEUR(fin.downPayment + buyer.total)}
                      />
                    </tbody>
                  </Table>
                </Section>
              )}

              {/* 5 — Maandlasten */}
              {state.mode !== 'flip' && (
                <Section num={5} title="Maandlasten">
                  <Grid cols={4}>
                    <Field label="IBI / mnd">
                      <MoneyInput value={state.ibiMonthly} onChange={v => patch({ ibiMonthly: v })} />
                    </Field>
                    <Field label="VvE / mnd">
                      <MoneyInput value={state.vveMonthly} onChange={v => patch({ vveMonthly: v })} />
                    </Field>
                    <Field label="Verzekering / mnd">
                      <MoneyInput
                        value={state.insuranceMonthly}
                        onChange={v => patch({ insuranceMonthly: v })}
                      />
                    </Field>
                    <Field label="Hypotheek / mnd">
                      <MoneyInput value={Math.round(fin.monthlyPayment)} onChange={() => {}} readOnly />
                    </Field>
                  </Grid>
                  <div
                    className="flex items-baseline justify-between"
                    style={{
                      marginTop: 14,
                      padding: '12px 16px',
                      background: '#FFFAEF',
                      borderRadius: 10,
                      border: '1px solid rgba(0,75,70,0.08)',
                    }}
                  >
                    <span
                      className="font-body font-bold uppercase"
                      style={{ fontSize: 11, letterSpacing: '0.12em', color: '#5F7472' }}
                    >
                      Totaal per maand
                    </span>
                    <span
                      className="font-heading font-bold"
                      style={{ fontSize: 24, letterSpacing: '-0.01em', color: '#0EAE96' }}
                    >
                      {fmtEUR(fin.monthlyTotal)}
                    </span>
                  </div>
                </Section>
              )}

              {/* 6 — Verhuur */}
              {(state.mode === 'verhuur' || state.mode === 'sl') && (
                <Section num={6} title="Verhuur">
                  <Grid cols={4} style={{ marginBottom: 18 }}>
                    <Field label="Maandhuur (€)">
                      <MoneyInput value={state.monthlyRent} onChange={v => patch({ monthlyRent: v })} />
                    </Field>
                    <Field label="Beheer %" info="Courtage voor beheerder / verhuurplatform">
                      <PctInput value={state.managementPct} onChange={v => patch({ managementPct: v })} />
                    </Field>
                    <Field label="Onderhoud %" info="Reservering groot-/klein onderhoud">
                      <PctInput value={state.maintenancePct} onChange={v => patch({ maintenancePct: v })} />
                    </Field>
                    {state.mode === 'verhuur' && (
                      <Field label="Meerjaren projectie">
                        <CheckboxRow
                          checked={state.showProjection}
                          onChange={v => patch({ showProjection: v })}
                          label="Toon 10 jaar"
                        />
                      </Field>
                    )}
                  </Grid>

                  {state.monthlyRent > 0 ? (
                    <Table>
                      <tbody>
                        <SubtotalRow label="Bruto jaarhuur" value={fmtEUR(rental.annualRent)} />
                        <MinusRow
                          label="− Beheer"
                          sub={`${fmtPct(state.managementPct)} van huur`}
                          value={fmtEUR(-rental.management)}
                        />
                        <MinusRow
                          label="− Onderhoud"
                          sub={`${fmtPct(state.maintenancePct)} van huur`}
                          value={fmtEUR(-rental.maintenance)}
                        />
                        <MinusRow
                          label="− Hypotheekrente"
                          sub="≈ 60% van jaarbetaling in jaar 1"
                          value={fmtEUR(-rental.annualInterestApprox)}
                        />
                        <MinusRow
                          label="− IBI + VvE + verzekering"
                          sub="Vaste lasten per jaar"
                          value={fmtEUR(-rental.fixedCostsYear)}
                        />
                        <SubtotalRow label="Netto winst vóór belasting" value={fmtEUR(rental.preTax)} />
                        {state.mode === 'verhuur' && (
                          <>
                            <MinusRow
                              label="− IRNR 19%"
                              sub="Inkomstenbelasting niet-resident"
                              value={fmtEUR(-rental.irnr)}
                            />
                            <TotalRow
                              label="Netto winst na belasting"
                              value={fmtEUR(rental.netAfterTax)}
                              accent="sea"
                              negative={rental.netAfterTax < 0}
                            />
                            <SimpleRow
                              label="Rendement op aankoopprijs"
                              value={fmtPct(rental.yieldOnPrice)}
                            />
                            <SimpleRow
                              label="Rendement op eigen geld"
                              value={fmtPct(rental.yieldOnEquity)}
                            />
                          </>
                        )}
                      </tbody>
                    </Table>
                  ) : (
                    <EmptyRegionNote>Vul maandhuur in om uitsplitsing te zien.</EmptyRegionNote>
                  )}
                </Section>
              )}

              {/* 7 — SL */}
              {state.mode === 'sl' && (
                <Section num={7} title="SL (Sociedad Limitada)">
                  <Grid cols={3} style={{ marginBottom: 18 }}>
                    <Field label="SL leeftijd">
                      <CalcSelect
                        value={state.slAge}
                        onChange={e => patch({ slAge: e.target.value as 'young' | 'mature' })}
                      >
                        <option value="young">{'< 2 jaar (15% VPB)'}</option>
                        <option value="mature">2+ jaar (25% VPB)</option>
                      </CalcSelect>
                    </Field>
                    <Field label="SL administratie / jaar (€)">
                      <MoneyInput value={state.slAdmin} onChange={v => patch({ slAdmin: v })} />
                    </Field>
                    <Field
                      label="Afschrijving (€/jaar)"
                      info="3% per jaar op 70% van aankoopprijs (gebouwwaarde)"
                    >
                      <MoneyInput value={Math.round(sl.depreciation)} onChange={() => {}} readOnly />
                    </Field>
                  </Grid>

                  <Table>
                    <tbody>
                      <SubtotalRow label="Bruto jaarhuur" value={fmtEUR(rental.annualRent)} />
                      <MinusRow
                        label="− Operationele kosten"
                        sub="Beheer + onderhoud + rente + IBI/VvE/verz. + admin"
                        value={fmtEUR(-sl.realCosts)}
                      />
                      <SubtotalRow label="Operationele winst" value={fmtEUR(rental.annualRent - sl.realCosts)} />
                      <MinusRow
                        label={`− VPB ${fmtPct(sl.vpbPct, 0)}`}
                        sub={`Op belastbare grondslag ${fmtEUR(sl.taxable)} = operationele winst − afschrijving ${fmtEUR(sl.depreciation)}`}
                        value={fmtEUR(-sl.vpb)}
                      />
                      <TotalRow
                        label="Netto cash in SL"
                        value={fmtEUR(sl.netInSL)}
                        accent="sea"
                        negative={sl.netInSL < 0}
                      />
                    </tbody>
                  </Table>

                  <Footnote>
                    <b>Tax-shield —</b> de afschrijving van {fmtEUR(sl.depreciation)} verlaagt
                    alleen de VPB-grondslag, niet de cash-uitstroom. Bij {fmtPct(sl.vpbPct, 0)} VPB
                    levert dit {fmtEUR(sl.depreciation * sl.vpbPct / 100)} per jaar belasting-besparing op
                    — de cash blijft in de SL.
                  </Footnote>

                  <Footnote>
                    <b>Let op —</b> dividenduitkering is een aparte gespreksvraag voor de fiscalist (NL&nbsp;Box&nbsp;2-impact).
                  </Footnote>
                </Section>
              )}

              {/* 8 — Privé vs SL */}
              {state.mode === 'sl' && state.monthlyRent > 0 && (
                <Section num={8} title="Privé vs SL — vergelijking" compact>
                  <PrivevsSLCompare rental={rental} sl={sl} />
                  <Footnote>
                    <b>Vuistregel —</b> SL is fiscaal voordelig vanaf 2-3 panden of bij herinvestering. Privé
                    is eenvoudiger en goedkoper bij 1 pand.
                  </Footnote>
                </Section>
              )}

              {/* Flip — vervangt Financiering/Totaal/Maandlasten */}
              {state.mode === 'flip' && (
                <Section num={3} title="Renovatie / Flip">
                  <Grid cols={5} style={{ marginBottom: 18 }}>
                    <Field label="Renovatiebudget (€)">
                      <MoneyInput value={state.renoBudget} onChange={v => patch({ renoBudget: v })} />
                    </Field>
                    <Field label="Verwachte verkoop (€)">
                      <MoneyInput value={state.sellPrice} onChange={v => patch({ sellPrice: v })} />
                    </Field>
                    <Field label="Renovatie (mnd)">
                      <CalcInput
                        type="number"
                        min={1}
                        value={state.renoMonths}
                        onChange={e => patch({ renoMonths: Number(e.target.value) || 1 })}
                      />
                    </Field>
                    <Field label="Verkoop (mnd)">
                      <CalcInput
                        type="number"
                        min={1}
                        value={state.saleMonths}
                        onChange={e => patch({ saleMonths: Number(e.target.value) || 1 })}
                      />
                    </Field>
                    <Field label="Makelaarscourtage %">
                      <PctInput value={state.agentPct} onChange={v => patch({ agentPct: v })} />
                    </Field>
                  </Grid>

                  <Table>
                    <tbody>
                      <SimpleRow label="Aankoopprijs" value={fmtEUR(state.price)} />
                      <SimpleRow label="Kosten koper" value={fmtEUR(buyer.total)} />
                      <SimpleRow label="Renovatiebudget" value={fmtEUR(state.renoBudget)} />
                      <SimpleRow label="Bouwbegeleiding (5%)" value={fmtEUR(flip.supervision)} />
                      <SimpleRow label="Onvoorzien (10%)" value={fmtEUR(flip.contingency)} />
                      <SubtotalRow label="Totale investering" value={fmtEUR(flip.totalInvest)} />
                      <SectionHeadRow>Verkoopfase</SectionHeadRow>
                      <SimpleRow label="Verkoopprijs" value={fmtEUR(state.sellPrice)} />
                      <MinusRow label={`− Makelaar (${fmtPct(state.agentPct)})`} value={fmtEUR(-flip.agent)} />
                      <MinusRow label="− Plusvalía municipal (0.5%)" value={fmtEUR(-flip.plusvalia)} />
                      <SubtotalRow
                        label="Bruto winst"
                        value={fmtEUR(flip.grossProfit)}
                        negative={flip.grossProfit < 0}
                      />
                      <MinusRow label="− Vermogenswinstbelasting 19%" value={fmtEUR(-flip.cgt)} />
                      <TotalRow
                        label="Netto winst"
                        value={fmtEUR(flip.netProfit)}
                        accent="sea"
                        negative={flip.netProfit < 0}
                      />
                      <SimpleRow label="ROI" value={fmtPct(flip.roi)} />
                      <SimpleRow label={`ROI per jaar (${flip.months} mnd)`} value={fmtPct(flip.roiPerYear)} />
                    </tbody>
                  </Table>

                  {flip.netProfit < 0 && (
                    <Warning>
                      <b>Negatieve marge — verlies op deze flip.</b> Overweeg hogere verkoopprijs, lager
                      reno-budget of andere regio.
                    </Warning>
                  )}
                </Section>
              )}

              {/* 9 — Meerjaren projectie */}
              {state.mode === 'verhuur' && state.showProjection && state.monthlyRent > 0 && (
                <Section num={9} title="Meerjaren projectie (10 jaar)">
                  <Grid cols={4} style={{ marginBottom: 16 }}>
                    <Field label="Huurindexatie %" info="Jaarlijkse huurverhoging">
                      <PctInput value={state.rentIndex} onChange={v => patch({ rentIndex: v })} />
                    </Field>
                  </Grid>
                  <ProjectionChart rows={projection} />
                  <ProjectionTable rows={projection} />
                </Section>
              )}
            </div>

            {/* Sticky summary */}
            <aside
              style={{
                position: 'sticky',
                top: 8,
              }}
            >
              <SummaryCard
                state={state}
                modeMeta={modeMeta}
                region={region}
                buyer={buyer}
                fin={fin}
                rental={rental}
                sl={sl}
                flip={flip}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════ HEADER ════════════════════
function CalcHeader({
  mode,
  examplesOpen,
  setExamplesOpen,
  onLoadExample,
  onReset,
}: {
  mode: ModeId
  examplesOpen: boolean
  setExamplesOpen: (v: boolean) => void
  onLoadExample: (ex: { label: string } & PartialState) => void
  onReset: () => void
}) {
  const examples = EXAMPLE_SCENARIOS[mode] || []
  const modeLabel = CALC_MODES.find(m => m.id === mode)?.label ?? ''
  return (
    <div
      className="flex justify-between items-end bg-marble shrink-0"
      style={{
        gap: 24,
        padding: '26px 36px 22px',
        borderBottom: '1px solid rgba(0,75,70,0.12)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="font-body font-bold uppercase text-sun-dark"
          style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10 }}
        >
          Scenario-tool
        </div>
        <h1
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
        >
          Calculator<span style={{ color: '#F5AF40' }}>.</span>
        </h1>
        <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', margin: 0 }}>
          Modulaire scenario-calculator voor Spaans vastgoed — vier modes, één werkruimte.
        </p>
      </div>
      <div className="flex items-center" style={{ gap: 10 }}>
        <CalcButton variant="ghost" onClick={onReset} title="Reset naar defaults">
          <RotateCcw size={13} strokeWidth={2} /> Reset
        </CalcButton>
        <div className="relative">
          <CalcButton variant="ghost" onClick={() => setExamplesOpen(!examplesOpen)}>
            <Sparkles size={13} strokeWidth={2} /> Voorbeelden
            <ChevronDown size={13} strokeWidth={2} />
          </CalcButton>
          {examplesOpen && (
            <div
              className="calc-anim-slide-down absolute bg-white"
              style={{
                top: 'calc(100% + 6px)',
                right: 0,
                width: 320,
                border: '1px solid rgba(0,75,70,0.14)',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(7,42,36,0.12)',
                overflow: 'hidden',
                zIndex: 10,
              }}
              onMouseLeave={() => setExamplesOpen(false)}
            >
              <div
                className="font-body font-bold uppercase"
                style={{
                  padding: '12px 16px',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#7A8C8B',
                  borderBottom: '1px solid rgba(0,75,70,0.08)',
                  background: '#FFFAEF',
                }}
              >
                Voorbeelden · {modeLabel}
              </div>
              {examples.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => onLoadExample(ex)}
                  className="w-full text-left font-body cursor-pointer transition-colors"
                  style={{
                    padding: '12px 16px',
                    fontSize: 13,
                    color: '#004B46',
                    background: 'transparent',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(0,75,70,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#E6F0EF')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="font-semibold">{ex.label}</span>
                  <span style={{ fontSize: 11, color: '#7A8C8B' }}>
                    {ex.price ? fmtEUR(ex.price) : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CalcButton variant="primary" title="(placeholder) Scenario delen">
          <Share2 size={13} strokeWidth={2} /> Scenario delen
        </CalcButton>
      </div>
    </div>
  )
}

// ════════════════════ MODE PICKER ════════════════════
function ModePicker({ mode, onChange }: { mode: ModeId; onChange: (m: ModeId) => void }) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}
    >
      {CALC_MODES.map(m => {
        const Icon = m.icon
        const selected = mode === m.id
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="text-left cursor-pointer transition-all relative"
            style={{
              padding: '16px 18px',
              background: selected ? '#E6F0EF' : '#FFFFFF',
              border: selected ? '1.5px solid #0EAE96' : '1.5px solid rgba(0,75,70,0.14)',
              borderRadius: 12,
              boxShadow: selected ? '0 0 0 3px rgba(14,174,150,0.12)' : 'none',
            }}
            onMouseEnter={e => {
              if (!selected) e.currentTarget.style.borderColor = 'rgba(0,75,70,0.3)'
            }}
            onMouseLeave={e => {
              if (!selected) e.currentTarget.style.borderColor = 'rgba(0,75,70,0.14)'
            }}
          >
            {selected && (
              <span
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#0EAE96',
                }}
              />
            )}
            <div
              className="flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: selected ? '#0EAE96' : '#FEF6E4',
                color: selected ? '#FFFFFF' : '#D4921A',
                marginBottom: 10,
              }}
            >
              <Icon size={16} strokeWidth={1.8} />
            </div>
            <div
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 14.5, letterSpacing: '-0.005em', marginBottom: 3 }}
            >
              {m.label}
            </div>
            <div className="font-body" style={{ fontSize: 11.5, color: '#5F7472', lineHeight: 1.4 }}>
              {m.desc}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ════════════════════ HERO STATS ════════════════════
function HeroStats({
  mode,
  state,
  buyer,
  fin,
  rental,
  sl,
  flip,
}: {
  mode: ModeId
  state: CalcState
  buyer: BuyerCosts
  fin: {
    downPayment: number
    mortgage: number
    hasMortgage: boolean
    maxLTV: number
    ltv: number
    ltvWarn: boolean
    monthlyPayment: number
    monthlyTotal: number
  }
  rental: ReturnType<typeof calcRental>
  sl: ReturnType<typeof calcSL>
  flip: ReturnType<typeof calcFlip>
}) {
  type HeroItem = {
    icon: React.ReactNode
    label: string
    value: string
    sub: string
    tone?: 'sea' | 'sun' | 'negative'
  }
  let items: HeroItem[] = []

  if (mode === 'eigen') {
    items = [
      {
        icon: <Wallet size={13} strokeWidth={2} />,
        label: 'Totaal inleg',
        value: fmtEUR(fin.downPayment + buyer.total),
        sub: 'Eigen geld + kosten koper',
      },
      {
        icon: <CalendarDays size={13} strokeWidth={2} />,
        label: 'Maandlasten',
        value: fmtEUR(fin.monthlyTotal),
        sub: 'Hypotheek + vaste lasten',
        tone: 'sea',
      },
      {
        icon: <TrendingUp size={13} strokeWidth={2} />,
        label: 'LTV',
        value: fmtPct(fin.ltv),
        sub: `Max ${fin.maxLTV}% · ${state.isResident ? 'resident' : 'non-resident'}`,
        tone: fin.ltvWarn ? 'negative' : 'sun',
      },
    ]
  } else if (mode === 'verhuur') {
    items = [
      {
        icon: <CalendarDays size={13} strokeWidth={2} />,
        label: 'Maandlasten',
        value: fmtEUR(fin.monthlyTotal),
        sub: 'Lasten per maand',
      },
      {
        icon: <PiggyBank size={13} strokeWidth={2} />,
        label: 'Netto winst / jaar',
        value: fmtEUR(rental.netAfterTax),
        sub: 'Na IRNR 19%',
        tone: rental.netAfterTax < 0 ? 'negative' : 'sea',
      },
      {
        icon: <TrendingUp size={13} strokeWidth={2} />,
        label: 'Rendement op eigen geld',
        value: fmtPct(rental.yieldOnEquity),
        sub: 'Netto / inleg',
        tone: rental.yieldOnEquity < 0 ? 'negative' : 'sun',
      },
    ]
  } else if (mode === 'sl') {
    items = [
      {
        icon: <Building2 size={13} strokeWidth={2} />,
        label: 'Netto winst in SL',
        value: fmtEUR(sl.netInSL),
        sub: `Na VPB ${fmtPct(sl.vpbPct, 0)}`,
        tone: sl.netInSL < 0 ? 'negative' : 'sea',
      },
      {
        icon: <Receipt size={13} strokeWidth={2} />,
        label: 'Belastbare winst',
        value: fmtEUR(sl.taxable),
        sub: 'Na aftrek + afschrijving',
      },
      {
        icon: <Scale size={13} strokeWidth={2} />,
        label: 'Voordeel t.o.v. privé',
        value: fmtEUR(sl.netInSL - rental.netAfterTax),
        sub: 'Netto-verschil per jaar',
        tone: sl.netInSL - rental.netAfterTax < 0 ? 'negative' : 'sun',
      },
    ]
  } else {
    items = [
      {
        icon: <Wallet size={13} strokeWidth={2} />,
        label: 'Totale investering',
        value: fmtEUR(flip.totalInvest),
        sub: 'Aankoop + kk + reno',
      },
      {
        icon: <PiggyBank size={13} strokeWidth={2} />,
        label: 'Netto winst',
        value: fmtEUR(flip.netProfit),
        sub: 'Na CGT 19%',
        tone: flip.netProfit < 0 ? 'negative' : 'sea',
      },
      {
        icon: <TrendingUp size={13} strokeWidth={2} />,
        label: 'ROI / jaar',
        value: fmtPct(flip.roiPerYear),
        sub: `${flip.months} mnd doorlooptijd`,
        tone: flip.roiPerYear < 0 ? 'negative' : 'sun',
      },
    ]
  }

  return (
    <div
      className="grid relative overflow-hidden"
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1,
        marginBottom: 20,
        background: '#004B46',
        backgroundImage:
          'radial-gradient(ellipse 60% 50% at 0% 100%, rgba(245,175,64,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(14,174,150,0.14) 0%, transparent 60%)',
        borderRadius: 14,
        padding: 2,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className="bg-deepsea"
          style={{
            padding: '18px 20px',
            background: '#004B46',
          }}
        >
          <div
            className="inline-flex items-center font-body font-bold uppercase"
            style={{
              gap: 8,
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'rgba(255,250,239,0.6)',
              marginBottom: 8,
            }}
          >
            {it.icon}
            {it.label}
          </div>
          <div
            className="font-heading font-bold"
            style={{
              fontSize: 26,
              letterSpacing: '-0.015em',
              lineHeight: 1.05,
              color:
                it.tone === 'sea'
                  ? '#0EAE96'
                  : it.tone === 'sun'
                  ? '#F5AF40'
                  : it.tone === 'negative'
                  ? '#FF8761'
                  : '#FFFAEF',
              marginBottom: 6,
            }}
          >
            {it.value}
          </div>
          <div
            className="font-body"
            style={{ fontSize: 11, color: 'rgba(255,250,239,0.55)' }}
          >
            {it.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════ PRIMITIVES ════════════════════
function Section({
  num,
  title,
  eyebrow,
  compact,
  children,
}: {
  num: number
  title: string
  eyebrow?: string
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className="bg-white"
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        marginBottom: 16,
        overflow: 'hidden',
      }}
    >
      <header
        className="flex items-center"
        style={{
          gap: 12,
          padding: '14px 20px',
          borderBottom: compact ? 'none' : '1px solid rgba(0,75,70,0.08)',
        }}
      >
        <span
          className="inline-flex items-center justify-center shrink-0 font-heading font-bold text-sun-dark"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: '#FEF6E4',
            fontSize: 11,
          }}
        >
          {String(num).padStart(2, '0')}
        </span>
        <h3
          className="flex-1 font-heading font-bold text-deepsea"
          style={{ fontSize: 15, letterSpacing: '-0.005em', margin: 0 }}
        >
          {title}
        </h3>
        {eyebrow && (
          <span
            className="font-body font-bold uppercase text-sun-dark"
            style={{ fontSize: 10, letterSpacing: '0.14em' }}
          >
            {eyebrow}
          </span>
        )}
      </header>
      <div style={{ padding: compact ? '12px 20px' : 20 }}>{children}</div>
    </section>
  )
}

function Grid({
  cols,
  children,
  style,
}: {
  cols: number
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Field({
  label,
  info,
  children,
}: {
  label: string
  info?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-w-0" style={{ gap: 5 }}>
      <label
        className="inline-flex items-center font-body font-bold uppercase"
        style={{
          gap: 5,
          fontSize: 10.5,
          color: '#7A8C8B',
          letterSpacing: '0.1em',
        }}
      >
        {label}
        {info && (
          <span title={info} className="cursor-help" style={{ color: '#D4921A' }}>
            <Info size={11} strokeWidth={2} />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function CalcInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { style, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full font-body bg-marble outline-none transition-all ${className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#004B46'
        e.currentTarget.style.background = '#FFFFFF'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.16)'
        e.currentTarget.style.background = '#FFFAEF'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  )
}

function CalcSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { style, className, ...rest } = props
  return (
    <select
      {...rest}
      className={`w-full font-body bg-marble outline-none transition-all cursor-pointer ${className ?? ''}`}
      style={{
        boxSizing: 'border-box',
        padding: '9px 12px',
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        fontSize: 13,
        color: '#004B46',
        ...style,
      }}
    />
  )
}

function MoneyInput({
  value,
  onChange,
  readOnly,
}: {
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
}) {
  return (
    <div
      className="flex items-center bg-marble transition-all relative"
      style={{
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        background: readOnly ? '#FFFAEF' : '#FFFAEF',
      }}
    >
      <span
        className="font-body font-semibold"
        style={{
          padding: '0 0 0 12px',
          color: '#7A8C8B',
          fontSize: 13,
        }}
      >
        €
      </span>
      <input
        type="number"
        inputMode="decimal"
        readOnly={readOnly}
        className="flex-1 font-body bg-transparent outline-none"
        value={value === 0 ? '' : value}
        onChange={e => {
          if (readOnly) return
          const v = e.target.value === '' ? 0 : Number(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        style={{
          padding: '9px 12px 9px 6px',
          fontSize: 13,
          color: readOnly ? '#5F7472' : '#004B46',
          border: 'none',
        }}
        onFocus={e => {
          if (readOnly) return
          const parent = e.currentTarget.parentElement!
          parent.style.borderColor = '#004B46'
          parent.style.background = '#FFFFFF'
          parent.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
        }}
        onBlur={e => {
          const parent = e.currentTarget.parentElement!
          parent.style.borderColor = 'rgba(0,75,70,0.16)'
          parent.style.background = '#FFFAEF'
          parent.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

function PctInput({
  value,
  onChange,
  step = 0.1,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div
      className="flex items-center bg-marble transition-all relative"
      style={{
        border: '1.5px solid rgba(0,75,70,0.16)',
        borderRadius: 10,
        background: '#FFFAEF',
      }}
    >
      <input
        type="number"
        step={step}
        className="flex-1 font-body bg-transparent outline-none"
        value={value}
        onChange={e => {
          const v = e.target.value === '' ? 0 : Number(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        style={{
          padding: '9px 6px 9px 12px',
          fontSize: 13,
          color: '#004B46',
          border: 'none',
        }}
        onFocus={e => {
          const parent = e.currentTarget.parentElement!
          parent.style.borderColor = '#004B46'
          parent.style.background = '#FFFFFF'
          parent.style.boxShadow = '0 0 0 3px rgba(0,75,70,0.08)'
        }}
        onBlur={e => {
          const parent = e.currentTarget.parentElement!
          parent.style.borderColor = 'rgba(0,75,70,0.16)'
          parent.style.background = '#FFFAEF'
          parent.style.boxShadow = 'none'
        }}
      />
      <span
        className="font-body font-semibold"
        style={{
          padding: '0 12px 0 0',
          color: '#7A8C8B',
          fontSize: 13,
        }}
      >
        %
      </span>
    </div>
  )
}

function Toggle({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div
      className="inline-flex"
      style={{
        gap: 2,
        padding: 2,
        background: '#E6F0EF',
        borderRadius: 10,
      }}
    >
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="font-body font-semibold cursor-pointer transition-all"
            style={{
              padding: '7px 12px',
              fontSize: 12,
              borderRadius: 8,
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#004B46' : '#5F7472',
              border: 'none',
              boxShadow: active ? '0 1px 2px rgba(7,42,36,0.08)' : 'none',
              flex: 1,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function RateSlider({
  value,
  onChange,
  resident,
  warn,
}: {
  value: number
  onChange: (v: number) => void
  resident: boolean
  warn: boolean
}) {
  const min = 0
  const max = 10
  const pos = ((value - min) / (max - min)) * 100
  const defaultRate = resident ? DEFAULT_RATE_RESIDENT : DEFAULT_RATE_NON_RESIDENT
  const defaultPos = ((defaultRate - min) / (max - min)) * 100

  return (
    <div className="flex flex-col" style={{ gap: 6, paddingTop: 2 }}>
      <div
        className="flex justify-between items-baseline font-body"
        style={{ fontSize: 11, color: '#5F7472' }}
      >
        <span>Rente</span>
        <span
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 14, letterSpacing: '-0.01em' }}
        >
          {fmtPct(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        className={`calc-slider ${warn ? 'warn' : ''}`}
        style={{ ['--calc-pos' as string]: `${pos}%` }}
        onChange={e => onChange(Number(e.target.value))}
      />
      <div className="relative" style={{ height: 12 }}>
        <span
          className="absolute font-body"
          style={{
            left: `${defaultPos}%`,
            transform: 'translateX(-50%)',
            fontSize: 9.5,
            color: '#D4921A',
            fontWeight: 600,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {fmtPct(defaultRate)} {resident ? 'res.' : 'non-res.'}
        </span>
      </div>
    </div>
  )
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label
      className="inline-flex items-center cursor-pointer font-body"
      style={{ gap: 8, fontSize: 13, color: '#004B46', paddingTop: 9 }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#0EAE96' }}
      />
      {label}
    </label>
  )
}

// ════════════════════ TABLE ATOMS ════════════════════
function Table({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
      {children}
    </table>
  )
}

function BaseRow({
  label,
  sub,
  value,
  style,
  negative,
}: {
  label: string
  sub?: string
  value: string
  style?: React.CSSProperties
  negative?: boolean
}) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(0,75,70,0.06)', ...style }}>
      <td style={{ padding: '10px 0' }}>
        <div className="font-body" style={{ fontSize: 13, color: '#004B46' }}>
          {label}
        </div>
        {sub && (
          <div
            className="font-body"
            style={{ fontSize: 11, color: '#7A8C8B', marginTop: 2 }}
          >
            {sub}
          </div>
        )}
      </td>
      <td
        className="font-body tabular-nums"
        style={{
          padding: '10px 0',
          textAlign: 'right',
          fontSize: 13,
          color: negative ? '#c03e34' : '#004B46',
          fontWeight: 500,
        }}
      >
        {value}
      </td>
    </tr>
  )
}

function SimpleRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return <BaseRow label={label} sub={sub} value={value} />
}

function MinusRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <BaseRow
      label={label}
      sub={sub}
      value={value}
      style={{ color: '#5F7472' }}
    />
  )
}

function SubtotalRow({
  label,
  value,
  negative,
}: {
  label: string
  value: string
  negative?: boolean
}) {
  return (
    <tr style={{ borderTop: '1.5px solid rgba(0,75,70,0.18)' }}>
      <td
        className="font-heading font-bold"
        style={{
          padding: '12px 0',
          fontSize: 13.5,
          color: negative ? '#c03e34' : '#004B46',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </td>
      <td
        className="font-heading font-bold tabular-nums"
        style={{
          padding: '12px 0',
          textAlign: 'right',
          fontSize: 13.5,
          color: negative ? '#c03e34' : '#004B46',
          letterSpacing: '-0.005em',
        }}
      >
        {value}
      </td>
    </tr>
  )
}

function TotalRow({
  label,
  value,
  accent,
  negative,
}: {
  label: string
  value: string
  accent?: 'sea'
  negative?: boolean
}) {
  const color = negative ? '#c03e34' : accent === 'sea' ? '#0EAE96' : '#004B46'
  return (
    <tr style={{ borderTop: '2px solid rgba(14,174,150,0.5)' }}>
      <td
        className="font-heading font-bold"
        style={{
          padding: '14px 0',
          fontSize: 15,
          color,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </td>
      <td
        className="font-heading font-bold tabular-nums"
        style={{
          padding: '14px 0',
          textAlign: 'right',
          fontSize: 16,
          color,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </td>
    </tr>
  )
}

function SectionHeadRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={2}
        className="font-body font-bold uppercase text-sun-dark"
        style={{
          padding: '16px 0 8px',
          fontSize: 10,
          letterSpacing: '0.18em',
        }}
      >
        {children}
      </td>
    </tr>
  )
}

// ════════════════════ DERIVED ════════════════════
function DerivedRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid rgba(0,75,70,0.08)',
      }}
    >
      {children}
    </div>
  )
}

function DerivedItem({
  label,
  sub,
  value,
  accent,
  warn,
}: {
  label: string
  sub: string
  value: string
  accent?: 'sea'
  warn?: boolean
}) {
  const color = warn ? '#c03e34' : accent === 'sea' ? '#0EAE96' : '#004B46'
  return (
    <div>
      <div
        className="font-body font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          color: '#7A8C8B',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="font-heading font-bold"
        style={{ fontSize: 20, color, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 4 }}
      >
        {value}
      </div>
      <div className="font-body" style={{ fontSize: 11, color: '#7A8C8B' }}>
        {sub}
      </div>
    </div>
  )
}

// ════════════════════ WARNING / FOOTNOTE ════════════════════
function LtvSlider({
  value,
  onChange,
  maxLTV,
  isResident,
}: {
  value: number
  onChange: (v: number) => void
  maxLTV: number
  isResident: boolean
}) {
  const overMax = value > maxLTV
  const isCash = value === 0
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
        <span
          className="font-body font-bold uppercase"
          style={{ fontSize: 10, letterSpacing: '0.14em', color: '#7A8C8B' }}
        >
          Loan-to-value (LTV)
        </span>
        <span
          className="font-heading font-bold tabular-nums"
          style={{
            fontSize: 22,
            color: overMax ? '#c03e34' : isCash ? '#F5AF40' : '#004B46',
            letterSpacing: '-0.01em',
          }}
        >
          {value}%
          {isCash && (
            <span
              className="font-body"
              style={{
                fontSize: 11,
                fontWeight: 600,
                marginLeft: 8,
                color: '#D4921A',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              · cash-koper
            </span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: overMax ? '#c03e34' : '#004B46',
          cursor: 'pointer',
        }}
      />
      <div
        className="flex items-center justify-between font-body"
        style={{ fontSize: 11, color: '#7A8C8B', marginTop: 6 }}
      >
        <span>0% · cash</span>
        <span style={{ color: overMax ? '#c03e34' : '#7A8C8B' }}>
          Max {maxLTV}% · {isResident ? 'resident' : 'non-resident'}
        </span>
        <span>100% · volledig financieren</span>
      </div>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start font-body"
      style={{
        gap: 10,
        marginTop: 16,
        padding: '12px 14px',
        background: 'rgba(224,82,82,0.08)',
        border: '1px solid rgba(224,82,82,0.25)',
        borderRadius: 10,
        fontSize: 12.5,
        color: '#c03e34',
      }}
    >
      <AlertTriangle size={14} strokeWidth={2} className="shrink-0" style={{ marginTop: 2 }} />
      <div>{children}</div>
    </div>
  )
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start font-body"
      style={{
        gap: 10,
        marginTop: 16,
        padding: '12px 14px',
        background: '#FFFAEF',
        border: '1px solid rgba(0,75,70,0.08)',
        borderRadius: 10,
        fontSize: 12,
        color: '#5F7472',
        lineHeight: 1.55,
      }}
    >
      <Info size={14} strokeWidth={2} className="shrink-0" color="#D4921A" style={{ marginTop: 2 }} />
      <div>{children}</div>
    </div>
  )
}

function EmptyRegionNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center font-body"
      style={{
        gap: 10,
        padding: '14px 16px',
        background: '#FFFAEF',
        border: '1px dashed rgba(0,75,70,0.2)',
        borderRadius: 10,
        fontSize: 13,
        color: '#7A8C8B',
      }}
    >
      <MapPin size={14} strokeWidth={1.8} />
      {children}
    </div>
  )
}

// ════════════════════ BUYER COSTS TABLE ════════════════════
function BuyerCostsTable({ buyer }: { buyer: BuyerCosts }) {
  if (buyer.rows.length === 0) {
    return (
      <EmptyRegionNote>Kies regio + aankoopprijs om kosten koper te zien.</EmptyRegionNote>
    )
  }
  return (
    <Table>
      <tbody>
        {buyer.rows.map(r => (
          <tr key={r.key} style={{ borderBottom: '1px solid rgba(0,75,70,0.06)' }}>
            <td style={{ padding: '10px 0' }}>
              <div className="font-body" style={{ fontSize: 13, color: '#004B46' }}>
                {r.label}
              </div>
              <div
                className="font-body"
                style={{ fontSize: 11, color: '#7A8C8B', marginTop: 2 }}
              >
                {r.sub}
              </div>
            </td>
            <td
              className="font-body tabular-nums"
              style={{ padding: '10px 0', textAlign: 'right', fontSize: 13, color: '#004B46' }}
            >
              {fmtEUR(r.value)}
            </td>
          </tr>
        ))}
        <tr style={{ borderTop: '2px solid rgba(0,75,70,0.2)' }}>
          <td
            className="font-heading font-bold"
            style={{ padding: '14px 0', fontSize: 15, color: '#004B46', letterSpacing: '-0.005em' }}
          >
            Totaal kosten koper
          </td>
          <td style={{ padding: '14px 0', textAlign: 'right' }}>
            <div
              className="font-heading font-bold tabular-nums"
              style={{ fontSize: 16, color: '#004B46', letterSpacing: '-0.01em' }}
            >
              {fmtEUR(buyer.total)}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 11, color: '#7A8C8B', marginTop: 2 }}
            >
              {fmtPct(buyer.pct)} van prijs
            </div>
          </td>
        </tr>
      </tbody>
    </Table>
  )
}

// ════════════════════ COMPARE ════════════════════
function PrivevsSLCompare({
  rental,
  sl,
}: {
  rental: ReturnType<typeof calcRental>
  sl: ReturnType<typeof calcSL>
}) {
  const slWins = sl.netInSL > rental.netAfterTax
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <CompareCard
        winner={!slWins}
        title="Privé"
        tag="IRNR"
        rows={[
          { label: 'Spaanse belasting', value: fmtEUR(rental.irnr) },
          {
            label: 'Aftrekbare kosten',
            value: fmtEUR(
              rental.management +
                rental.maintenance +
                rental.annualInterestApprox +
                rental.fixedCostsYear
            ),
          },
        ]}
        heroLabel="Netto na belasting"
        heroValue={fmtEUR(rental.netAfterTax)}
      />
      <CompareCard
        winner={slWins}
        title="Via SL"
        tag={`VPB ${fmtPct(sl.vpbPct, 0)}`}
        rows={[
          { label: 'Spaanse belasting', value: fmtEUR(sl.vpb) },
          { label: 'Aftrekbare kosten', value: fmtEUR(sl.deductible) },
        ]}
        heroLabel="Netto na belasting"
        heroValue={fmtEUR(sl.netInSL)}
      />
    </div>
  )
}

function CompareCard({
  winner,
  title,
  tag,
  rows,
  heroLabel,
  heroValue,
}: {
  winner: boolean
  title: string
  tag: string
  rows: { label: string; value: string }[]
  heroLabel: string
  heroValue: string
}) {
  return (
    <div
      className="relative bg-white"
      style={{
        border: winner ? '1.5px solid #0EAE96' : '1.5px solid rgba(0,75,70,0.14)',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: winner ? '0 0 0 3px rgba(14,174,150,0.14)' : 'none',
      }}
    >
      {winner && (
        <div
          className="absolute inline-flex items-center font-body font-bold uppercase"
          style={{
            top: -10,
            right: 14,
            gap: 5,
            padding: '3px 10px',
            background: '#0EAE96',
            color: '#FFFFFF',
            fontSize: 10,
            letterSpacing: '0.12em',
            borderRadius: 999,
          }}
        >
          <Award size={11} strokeWidth={2.2} /> Voordeliger
        </div>
      )}
      <div
        className="flex items-center"
        style={{ gap: 8, marginBottom: 12 }}
      >
        <span
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 15, letterSpacing: '-0.005em' }}
        >
          {title}
        </span>
        <span
          className="font-body font-bold uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            padding: '2px 8px',
            background: '#FEF6E4',
            color: '#D4921A',
            borderRadius: 999,
          }}
        >
          {tag}
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex justify-between font-body"
          style={{
            padding: '6px 0',
            fontSize: 12.5,
            color: '#5F7472',
            borderBottom: '1px solid rgba(0,75,70,0.06)',
          }}
        >
          <span>{r.label}</span>
          <span className="tabular-nums" style={{ color: '#004B46' }}>
            {r.value}
          </span>
        </div>
      ))}
      <div
        className="flex justify-between items-baseline"
        style={{ paddingTop: 10, marginTop: 4 }}
      >
        <span
          className="font-body font-bold uppercase"
          style={{ fontSize: 10.5, letterSpacing: '0.12em', color: '#5F7472' }}
        >
          {heroLabel}
        </span>
        <span
          className="font-heading font-bold tabular-nums"
          style={{
            fontSize: 18,
            color: winner ? '#0EAE96' : '#004B46',
            letterSpacing: '-0.01em',
          }}
        >
          {heroValue}
        </span>
      </div>
    </div>
  )
}

// ════════════════════ PROJECTION CHART ════════════════════
function ProjectionChart({ rows }: { rows: ProjectionRow[] }) {
  if (!rows.length) return null
  const W = 720
  const H = 180
  const padL = 44
  const padR = 16
  const padT = 14
  const padB = 22
  const xs = rows.map(r => r.year)
  const cumVals = rows.map(r => r.cumulative)
  const cfVals = rows.map(r => r.cashflow)
  const maxV = Math.max(...cumVals, ...cfVals, 1)
  const minV = Math.min(...cumVals, ...cfVals, 0)
  const range = maxV - minV || 1

  const sx = (y: number) => padL + ((y - 1) / (rows.length - 1 || 1)) * (W - padL - padR)
  const sy = (v: number) => padT + (1 - (v - minV) / range) * (H - padT - padB)

  const cumPath = cumVals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(xs[i])} ${sy(v)}`).join(' ')
  const areaPath = `${cumPath} L ${sx(xs[xs.length - 1])} ${sy(0)} L ${sx(xs[0])} ${sy(0)} Z`
  const zeroY = sy(0)
  const barW = Math.min(22, ((W - padL - padR) / rows.length) * 0.6)

  return (
    <div
      className="bg-white"
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div className="flex justify-between items-baseline" style={{ marginBottom: 10 }}>
        <div
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 13, letterSpacing: '-0.005em' }}
        >
          Cumulatieve cashflow over 10 jaar
        </div>
        <div className="flex items-center font-body" style={{ gap: 14, fontSize: 11, color: '#5F7472' }}>
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0EAE96' }} />
            Jaarlijkse cashflow
          </span>
          <span className="inline-flex items-center" style={{ gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#004B46' }} />
            Cumulatief
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 180 }}
      >
        <defs>
          <linearGradient id="cumgrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#004B46" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#004B46" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1={padL}
          y1={zeroY}
          x2={W - padR}
          y2={zeroY}
          stroke="rgba(0,75,70,0.18)"
          strokeDasharray="3 3"
        />
        {rows.map(r => {
          const x = sx(r.year) - barW / 2
          const y0 = zeroY
          const y1 = sy(r.cashflow)
          const top = Math.min(y0, y1)
          const h = Math.abs(y1 - y0)
          const col = r.cashflow < 0 ? '#c03e34' : '#0EAE96'
          return (
            <rect
              key={r.year}
              x={x}
              y={top}
              width={barW}
              height={h || 1}
              rx="2"
              fill={col}
              opacity="0.85"
            />
          )
        })}
        <path d={areaPath} fill="url(#cumgrad)" />
        <path d={cumPath} fill="none" stroke="#004B46" strokeWidth="2" />
        <text x={padL - 4} y={padT + 4} fontSize="9" fill="#7A8C8B" textAnchor="end">
          {fmtEUR(maxV)}
        </text>
        <text x={padL - 4} y={zeroY + 3} fontSize="9" fill="#7A8C8B" textAnchor="end">
          € 0
        </text>
        {rows.map(
          r =>
            r.year % 2 === 1 && (
              <text
                key={`xl-${r.year}`}
                x={sx(r.year)}
                y={H - 6}
                fontSize="9"
                fill="#7A8C8B"
                textAnchor="middle"
              >
                J{r.year}
              </text>
            )
        )}
      </svg>
    </div>
  )
}

function ProjectionTable({ rows }: { rows: ProjectionRow[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: '1.5px solid rgba(0,75,70,0.16)' }}>
            {['Jaar', 'Hypotheek', 'Huur', 'Cashflow', 'Cumulatief', 'Restschuld'].map(h => (
              <th
                key={h}
                className="font-body font-bold uppercase text-left"
                style={{
                  padding: '10px 12px',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: '#7A8C8B',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.year} style={{ borderBottom: '1px solid rgba(0,75,70,0.06)' }}>
              <td
                className="font-heading font-bold"
                style={{ padding: '10px 12px', color: '#004B46' }}
              >
                J{r.year}
              </td>
              <td className="tabular-nums" style={{ padding: '10px 12px', color: '#5F7472' }}>
                {fmtEUR(r.mortgagePaid)}
              </td>
              <td className="tabular-nums" style={{ padding: '10px 12px', color: '#5F7472' }}>
                {fmtEUR(r.rent)}
              </td>
              <td
                className="tabular-nums"
                style={{
                  padding: '10px 12px',
                  color: r.cashflow < 0 ? '#c03e34' : '#0EAE96',
                  fontWeight: 600,
                }}
              >
                {fmtEUR(r.cashflow)}
              </td>
              <td
                className="tabular-nums"
                style={{
                  padding: '10px 12px',
                  color: r.cumulative < 0 ? '#c03e34' : '#004B46',
                  fontWeight: 600,
                }}
              >
                {fmtEUR(r.cumulative)}
              </td>
              <td className="tabular-nums" style={{ padding: '10px 12px', color: '#5F7472' }}>
                {fmtEUR(r.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════ SUMMARY ════════════════════
function SummaryCard({
  state,
  modeMeta,
  region,
  buyer,
  fin,
  rental,
  sl,
  flip,
}: {
  state: CalcState
  modeMeta: (typeof CALC_MODES)[number]
  region: RegionalSettings | null
  buyer: BuyerCosts
  fin: {
    downPayment: number
    mortgage: number
    hasMortgage: boolean
    maxLTV: number
    ltv: number
    ltvWarn: boolean
    monthlyPayment: number
    monthlyTotal: number
  }
  rental: ReturnType<typeof calcRental>
  sl: ReturnType<typeof calcSL>
  flip: ReturnType<typeof calcFlip>
}) {
  const Icon = modeMeta.icon
  const ltvPos = Math.min(100, Math.max(0, fin.ltv))
  const totalInv =
    state.mode === 'flip'
      ? state.price + buyer.total + state.renoBudget + flip.supervision + flip.contingency
      : state.price + buyer.total

  return (
    <div
      className="bg-white"
      style={{
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div
        className="inline-flex items-center font-body font-semibold"
        style={{
          gap: 6,
          padding: '5px 10px',
          background: '#E6F0EF',
          color: '#004B46',
          fontSize: 11,
          borderRadius: 999,
          marginBottom: 14,
        }}
      >
        <Icon size={12} strokeWidth={2} />
        {modeMeta.label}
      </div>

      <div
        className="font-heading font-bold text-deepsea"
        style={{ fontSize: 22, letterSpacing: '-0.01em', lineHeight: 1 }}
      >
        {fmtEUR(state.price)}
      </div>
      <div
        className="font-body"
        style={{ fontSize: 12, color: '#7A8C8B', marginTop: 4 }}
      >
        {region ? region.region : '—'}
      </div>

      <SummaryDivider />

      <SummaryRow label="Kosten koper" value={fmtEUR(buyer.total)} />
      <SummaryRow label="Totale investering" value={fmtEUR(totalInv)} />

      {state.mode !== 'flip' && (
        <>
          <SummaryRow label="Eigen geld" value={fmtEUR(fin.downPayment + buyer.total)} />
          <SummaryDivider />
          <div style={{ marginBottom: 4 }}>
            <div className="flex justify-between items-baseline">
              <span
                className="font-body font-bold uppercase"
                style={{ fontSize: 10, letterSpacing: '0.12em', color: '#7A8C8B' }}
              >
                LTV
              </span>
              <span
                className="font-heading font-bold tabular-nums"
                style={{
                  fontSize: 14,
                  color: fin.ltvWarn ? '#c03e34' : '#004B46',
                }}
              >
                {fmtPct(fin.ltv)}
              </span>
            </div>
            <div
              className="relative"
              style={{
                height: 8,
                borderRadius: 999,
                background: '#FFFAEF',
                border: '1px solid rgba(0,75,70,0.12)',
                marginTop: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${ltvPos}%`,
                  height: '100%',
                  background: fin.ltvWarn ? '#c03e34' : '#0EAE96',
                  transition: 'width 0.2s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  bottom: -2,
                  width: 2,
                  background: '#F5AF40',
                  left: `${fin.maxLTV}%`,
                }}
              />
            </div>
            <div
              className="font-body"
              style={{ fontSize: 10, color: '#7A8C8B', marginTop: 4 }}
            >
              Max {fin.maxLTV}% · markeerlijn
            </div>
          </div>
        </>
      )}

      <SummaryDivider />

      {state.mode === 'eigen' && (
        <SummaryHeroRow label="Maandlast" value={fmtEUR(fin.monthlyTotal)} accent="sea" />
      )}
      {state.mode === 'verhuur' && (
        <>
          <SummaryRow label="Maandlast" value={fmtEUR(fin.monthlyTotal)} />
          <SummaryHeroRow
            label="Rendement eig. geld"
            value={fmtPct(rental.yieldOnEquity)}
            accent={rental.yieldOnEquity < 0 ? 'warn' : 'sea'}
          />
        </>
      )}
      {state.mode === 'sl' && (
        <>
          <SummaryRow label="Belastbaar SL" value={fmtEUR(sl.taxable)} />
          <SummaryHeroRow
            label="Netto in SL"
            value={fmtEUR(sl.netInSL)}
            accent={sl.netInSL < 0 ? 'warn' : 'sea'}
          />
        </>
      )}
      {state.mode === 'flip' && (
        <>
          <SummaryRow label="Verkoopprijs" value={fmtEUR(state.sellPrice)} />
          <SummaryHeroRow
            label="Netto winst"
            value={fmtEUR(flip.netProfit)}
            accent={flip.netProfit < 0 ? 'warn' : 'sea'}
          />
          <SummaryRow
            label="ROI / jaar"
            value={fmtPct(flip.roiPerYear)}
            warn={flip.roiPerYear < 0}
          />
        </>
      )}
    </div>
  )
}

function SummaryDivider() {
  return <div style={{ height: 1, background: 'rgba(0,75,70,0.08)', margin: '14px 0' }} />
}

function SummaryRow({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="flex justify-between items-baseline" style={{ padding: '4px 0' }}>
      <span
        className="font-body"
        style={{ fontSize: 12, color: '#5F7472' }}
      >
        {label}
      </span>
      <span
        className="font-body font-semibold tabular-nums"
        style={{ fontSize: 13, color: warn ? '#c03e34' : '#004B46' }}
      >
        {value}
      </span>
    </div>
  )
}

function SummaryHeroRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'sea' | 'warn'
}) {
  const color = accent === 'warn' ? '#c03e34' : '#0EAE96'
  return (
    <div className="flex justify-between items-baseline" style={{ padding: '6px 0 2px' }}>
      <span
        className="font-body font-bold uppercase"
        style={{ fontSize: 10, letterSpacing: '0.12em', color: '#7A8C8B' }}
      >
        {label}
      </span>
      <span
        className="font-heading font-bold tabular-nums"
        style={{ fontSize: 18, color, letterSpacing: '-0.01em' }}
      >
        {value}
      </span>
    </div>
  )
}

// ════════════════════ BUTTON ════════════════════
function CalcButton({
  variant,
  onClick,
  title,
  children,
}: {
  variant: 'primary' | 'ghost'
  onClick?: () => void
  title?: string
  children: React.ReactNode
}) {
  const styles = {
    primary: {
      background: '#004B46',
      color: '#FFFAEF',
      border: '1.5px solid #004B46',
      fontWeight: 600,
      hoverBg: '#0A6B63',
      hoverBorder: '#0A6B63',
    },
    ghost: {
      background: '#FFFFFF',
      color: '#004B46',
      border: '1.5px solid rgba(0,75,70,0.18)',
      fontWeight: 600,
      hoverBg: '#E6F0EF',
      hoverBorder: '#004B46',
    },
  }[variant]

  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center font-body cursor-pointer transition-all whitespace-nowrap"
      style={{
        padding: '9px 14px',
        borderRadius: 10,
        fontSize: 12,
        letterSpacing: '0.02em',
        gap: 7,
        background: styles.background,
        color: styles.color,
        border: styles.border,
        fontWeight: styles.fontWeight,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = styles.hoverBg
        e.currentTarget.style.border = `1.5px solid ${styles.hoverBorder}`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = styles.background
        e.currentTarget.style.border = styles.border
      }}
    >
      {children}
    </button>
  )
}
