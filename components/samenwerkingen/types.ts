export type SamType = 'agencies' | 'partners' | 'team'
export type SamView = 'table' | 'cards'
export type SamSortDir = 'asc' | 'desc'
export type Lang = 'nl' | 'en' | 'es' | 'de'

export interface Agency {
  id: string
  name: string
  region: string
  city: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  property_types: string[] | null
  commission_notes: string | null
  reliability_score: number | null
  notes: string | null
  is_active: boolean
  is_preferred?: boolean
  languages?: Lang[]
  last_contact_days?: number | null
}

export interface Partner {
  id: string
  name: string
  type: PartnerType
  region: string | null
  regions: string[] | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  specialism: string | null
  internal_notes: string | null
  commission_arrangement: string | null
  is_active?: boolean
  is_preferred?: boolean
  reliability_score?: number | null
  languages?: Lang[]
  last_contact_days?: number | null
}

export interface TeamMember {
  id: string
  name: string
  role: string | null                  // free-text functie ('Senior consultant', 'Marketing', etc.)
  region: string | null
  regions: string[] | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  internal_notes: string | null
  reliability_score: number | null
  is_active?: boolean
  is_preferred?: boolean
  last_contact_days?: number | null
}

export type PartnerType =
  | 'financieel_adviseur'
  | 'hypotheekadviseur'
  | 'notaris'
  | 'belastingadviseur'
  | 'advocaat'
  | 'gestor'
  | 'architect'
  | 'aannemer'
  | 'taxateur'
  | 'verzekeringsadviseur'
  | 'interieurontwerper'
  | 'beheerder'
  | 'anders'

export const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: 'financieel_adviseur', label: 'Financieel adviseur' },
  { value: 'hypotheekadviseur', label: 'Hypotheekadviseur' },
  { value: 'notaris', label: 'Notaris' },
  { value: 'belastingadviseur', label: 'Belastingadviseur' },
  { value: 'advocaat', label: 'Advocaat' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'architect', label: 'Architect' },
  { value: 'aannemer', label: 'Aannemer' },
  { value: 'taxateur', label: 'Taxateur' },
  { value: 'verzekeringsadviseur', label: 'Verzekeringsadviseur' },
  { value: 'interieurontwerper', label: 'Interieurontwerper' },
  { value: 'beheerder', label: 'Beheerder' },
  { value: 'anders', label: 'Anders' },
]

export const TYPE_LABELS: Record<PartnerType, string> = {
  financieel_adviseur: 'Financieel adviseur',
  hypotheekadviseur: 'Hypotheekadviseur',
  notaris: 'Notaris',
  belastingadviseur: 'Belastingadviseur',
  advocaat: 'Advocaat',
  gestor: 'Gestor',
  architect: 'Architect',
  aannemer: 'Aannemer',
  taxateur: 'Taxateur',
  verzekeringsadviseur: 'Verzekeringsadviseur',
  interieurontwerper: 'Interieurontwerper',
  beheerder: 'Beheerder',
  anders: 'Anders',
}

export const LANG_LABELS: Record<Lang, string> = { nl: 'NL', en: 'EN', es: 'ES', de: 'DE' }

export const REGIONS_AGENCY = [
  'Spanje',
  'Costa Brava',
  'Costa Dorada',
  'Costa de Valencia',
  'Valencia stad',
  'Costa Blanca Noord',
  'Costa Blanca Zuid',
  'Costa Cálida',
  'Costa del Sol',
  'Barcelona',
  'Madrid',
  'Balearen',
  'Canarische Eilanden',
  'Costa Tropical',
  'Costa de la Luz',
]

// Partners en team gebruiken dezelfde uitgebreide regio-lijst als agencies +
// 'Spanje' als opt-in voor 'werkt in heel Spanje'. Zo voorkomen we drift
// tussen lijsten en kunnen ook partners in alle regio's zichtbaar zijn.
export const REGIONS_PARTNER = REGIONS_AGENCY

export const REGIONS_TEAM = REGIONS_AGENCY

export const REL_LABEL: Record<number, string> = {
  1: 'Onbetrouwbaar',
  2: 'Wisselvallig',
  3: 'Oké',
  4: 'Goed',
  5: 'Topper',
}

export type SortKey =
  | 'name'
  | 'region'
  | 'type'
  | 'reliability_score'
  | 'last_contact_days'

export interface SortState {
  key: SortKey
  dir: SamSortDir
}

export interface LastContactInfo {
  label: string
  cls: 'fresh' | 'warm' | 'cold' | ''
}

export function fmtLastContact(days: number | null | undefined): LastContactInfo {
  if (days == null) return { label: '—', cls: '' }
  if (days <= 7) return { label: `${days}d geleden`, cls: 'fresh' }
  if (days <= 30) return { label: `${days}d geleden`, cls: 'warm' }
  return { label: `${days}d geleden`, cls: 'cold' }
}

// Helper: krijg effectieve regio-lijst voor een partner of teamlid. Valt
// terug van array → single → 'Spanje' fallback voor display.
export function effectiveRegions(item: { regions?: string[] | null; region?: string | null }): string[] {
  if (item.regions && item.regions.length > 0) return item.regions
  if (item.region) return [item.region]
  return ['Spanje']
}
