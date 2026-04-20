// Shared types for Deals page + subcomponents
// Extracted from original app/deals/page.tsx — shapes match Supabase rows 1:1.

export interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
}

export interface Deal {
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

export interface AppSettings {
  minimum_fee: number
  commissie_per_type: Record<string, number>
  regios: string[]
  deal_types: string[]
  bronnen: string[]
}
