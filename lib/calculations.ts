/**
 * Business logic voor commissie-berekeningen en KPI's
 */

const REGIO_NORMALIZATION: Record<string, string> = {
  'CBN': 'Costa Blanca Noord',
  'CBZ': 'Costa Blanca Zuid',
}

export function normalizeRegio(regio: string | null | undefined): string {
  if (!regio) return 'Onbekend'
  return REGIO_NORMALIZATION[regio.trim()] ?? regio.trim()
}

export interface CommissieInput {
  aankoopprijs: number
  commissie_pct: number | null
  type_deal: string
  // Commissiestructuur
  eigen_netwerk: boolean                  // 1.2: 55/45 split
  makelaar_pct: number                    // handmatig % (alleen bij standaard/custom)
  is_overdracht: boolean                  // 1.5/1.6: split tussen twee consultants
  overdracht_scenario: 'standaard' | 'eigen_netwerk' | 'tweede_aankoop' | 'custom' | null
  makelaar2_pct: number                   // alleen bij custom overdracht
  partner_deal: boolean                   // 1.3: referral partner
  partner_pct: number                     // % van CS aandeel (standaard 0.20)
  area_manager_pct: number                // 1.4: 0 = geen, 0.10 of 0.15
  commissie_per_type: Record<string, number>
  minimum_fee: number
  skip_min_fee?: boolean                  // handmatige override: minimum fee niet toepassen
}

export const BTW_RATE = 0.21

export interface CommissieResult {
  commissie_pct: number
  bruto_commissie: number          // ex-BTW
  bruto_commissie_incl_btw: number // alleen bij min fee: het factuurbedrag incl. BTW
  min_fee_toegepast: boolean
  makelaar_pct_effectief: number
  makelaar2_pct_effectief: number
  makelaar_commissie: number
  makelaar2_commissie: number
  cs_aandeel: number
  partner_commissie: number
  area_manager_commissie: number
  netto_commissie_cs: number
}

export function berekenCommissie(input: CommissieInput): CommissieResult {
  const {
    aankoopprijs, commissie_pct, type_deal,
    eigen_netwerk, makelaar_pct,
    is_overdracht, overdracht_scenario, makelaar2_pct,
    partner_deal, partner_pct,
    area_manager_pct,
    commissie_per_type, minimum_fee,
  } = input

  // 1. Commissie %
  const effectief_commissie_pct = commissie_pct ?? commissie_per_type[type_deal.toLowerCase()] ?? 0.02

  // 2. Bruto commissie (met minimum fee, tenzij handmatig uitgeschakeld)
  // Minimum fee is incl. BTW — alle verdere berekeningen op ex-BTW basis
  const berekend = aankoopprijs * effectief_commissie_pct
  const min_fee_toegepast = berekend < minimum_fee && !input.skip_min_fee
  const bruto_commissie_incl_btw = min_fee_toegepast ? minimum_fee : berekend
  const bruto_commissie = min_fee_toegepast ? minimum_fee / (1 + BTW_RATE) : berekend

  // 3. Effectieve makelaarpercentages op basis van deal-type
  let m1 = makelaar_pct
  let m2 = 0

  if (eigen_netwerk && !is_overdracht) {
    // 1.2 Eigen netwerk: consultant 55%, CS 45%
    m1 = 0.55
    m2 = 0
  } else if (is_overdracht) {
    switch (overdracht_scenario) {
      case 'standaard':      m1 = 0.20; m2 = 0.20; break  // 1.5 standaard 20/20
      case 'eigen_netwerk':  m1 = 0.15; m2 = 0.40; break  // 1.5 eigen netwerk overdracht
      case 'tweede_aankoop': m1 = 0.05; m2 = 0.35; break  // 1.6 tweede aankoop andere regio
      case 'custom':         m1 = makelaar_pct; m2 = makelaar2_pct; break
      default:               m1 = 0.20; m2 = 0.20; break
    }
  }

  // 4. Makelaar commissies
  const makelaar_commissie = bruto_commissie * m1
  const makelaar2_commissie = bruto_commissie * m2

  // 5. CS aandeel (na aftrek van alle makelaars)
  const cs_aandeel = bruto_commissie - makelaar_commissie - makelaar2_commissie

  // 6. Partner commissie — 1.3: berekend over CS aandeel (niet over bruto!)
  const partner_commissie = partner_deal ? cs_aandeel * partner_pct : 0

  // 7. Area manager commissie — 1.4: berekend over CS aandeel
  const area_manager_commissie = area_manager_pct > 0 ? cs_aandeel * area_manager_pct : 0

  // 8. Netto CS
  const netto_commissie_cs = cs_aandeel - partner_commissie - area_manager_commissie

  return {
    commissie_pct: effectief_commissie_pct,
    bruto_commissie,
    bruto_commissie_incl_btw,
    min_fee_toegepast,
    makelaar_pct_effectief: m1,
    makelaar2_pct_effectief: m2,
    makelaar_commissie,
    makelaar2_commissie,
    cs_aandeel,
    partner_commissie,
    area_manager_commissie,
    netto_commissie_cs,
  }
}

export function formatEuro(bedrag: number | null | undefined): string {
  if (bedrag === null || bedrag === undefined) return '—'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(bedrag)
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatGetal(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('nl-NL').format(value)
}

export function berekenTargetStatus(
  huidigeDeals: number,
  targetDeals: number,
  dagVanJaar: number
): { onTrack: boolean; prognose: number; pct: number } {
  const tijdRatio = dagVanJaar / 365
  const dealRatio = huidigeDeals / targetDeals
  const onTrack = dealRatio >= tijdRatio
  const verstrekenMaanden = Math.max(1, Math.ceil((dagVanJaar / 365) * 12))
  const prognose = Math.round((huidigeDeals / verstrekenMaanden) * 12)
  return { onTrack, prognose, pct: Math.min(100, dealRatio * 100) }
}

export function getDagVanJaar(datum: Date = new Date()): number {
  const start = new Date(datum.getFullYear(), 0, 0)
  const diff = datum.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const MAANDEN = [
  'Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec',
]
