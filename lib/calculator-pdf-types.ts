// Shared view-model voor calculator-PDF.
// Client (calculators/page.tsx) bouwt dit op uit CalcState + region; server
// formatteert alleen — geen calculaties op server om DRY te blijven.

export type CalcMode = 'eigen' | 'verhuur' | 'sl' | 'flip'

export interface KkRow {
  t: string
  s?: string
  val: number
  pct?: number | null
}

export interface RentalView {
  monthlyRent: number
  annualGross: number
  occupancy: number
  effectiveRent: number
  managementPct: number
  managementCost: number
  maintenancePct: number
  maintenanceCost: number
  fixedCosts: number
  netOperating: number
  irnrPct: number | null
  irnrTax: number | null
  netAfterTax: number | null
  yieldOnPrice: number
  yieldOnEquity: number
}

export interface SlView {
  buildingValue: number
  depreciationPct: number
  depreciation: number
  interestDeductible: number
  adminCost: number
  grossProfit: number
  taxableProfit: number
  vpbPctYoung: number
  vpbPctMature: number
  vpbAge: 'young' | 'mature'
  vpb: number
  netInSL: number
  voordeelVsPrive: number
}

export interface CompareRow {
  l: string
  s?: string
  prive: number
  sl: number
  delta: number
  winner: 'prive' | 'sl' | null
}

export interface CompareView {
  rows: CompareRow[]
  totalPrive: number
  totalSL: number
  totalDelta: number
  winner: 'prive' | 'sl'
}

export interface ProjectionRow {
  y: number
  hyp: number
  huur: number
  kosten: number
  cashflow: number
  cum: number
  restschuld: number
}

export interface RenoView {
  budget: number
  supervisionPct: number
  supervisionCost: number
  contingencyPct: number
  contingencyCost: number
  renoMonths: number
  saleMonths: number
  durationMonths: number
  sellPrice: number
  agentPct: number
  agentFee: number
  plusvaliaPct: number
  plusvalia: number
  cgtPct: number
  totalInvestment: number
  grossProfit: number
  cgt: number
  netProfit: number
  roi: number
  roiPerYear: number
}

export interface CalculatorViewModel {
  mode: CalcMode
  modeLabel: string
  klantnaam: string
  consultant: string
  dateIso: string
  // basisgegevens
  region: string
  regionShort: string
  regionId: string
  propType: string  // 'Bestaand' / 'Nieuwbouw'
  isResident: boolean
  residentLabel: string
  price: number
  // kosten koper
  kkRows: KkRow[]
  kkTotal: number
  kkPct: number
  // financiering
  ltv: number
  ltvMax: number
  rate: number
  years: number
  mortgage: number
  downPayment: number
  // totale investering
  totalInleg: number
  totalAankoop: number
  totalKK: number
  totalSom: number
  // maandlasten
  monthly: {
    mortgage: number
    ibi: number
    vve: number
    insurance: number
    total: number
  }
  // optioneel — alleen aanwezig voor relevante modes
  rental?: RentalView
  sl?: SlView
  compare?: CompareView
  projection?: ProjectionRow[]
  reno?: RenoView
}
