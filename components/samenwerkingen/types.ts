export type SamType = 'agencies' | 'partners'
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

export type PartnerType =
  | 'financieel_adviseur'
  | 'hypotheekadviseur'
  | 'notaris'
  | 'belastingadviseur'
  | 'anders'

export const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
  { value: 'financieel_adviseur', label: 'Financieel adviseur' },
  { value: 'hypotheekadviseur', label: 'Hypotheekadviseur' },
  { value: 'notaris', label: 'Notaris' },
  { value: 'belastingadviseur', label: 'Belastingadviseur' },
  { value: 'anders', label: 'Anders' },
]

export const TYPE_LABELS: Record<PartnerType, string> = {
  financieel_adviseur: 'Financieel adviseur',
  hypotheekadviseur: 'Hypotheekadviseur',
  notaris: 'Notaris',
  belastingadviseur: 'Belastingadviseur',
  anders: 'Anders',
}

export const LANG_LABELS: Record<Lang, string> = { nl: 'NL', en: 'EN', es: 'ES', de: 'DE' }

export const REGIONS_AGENCY = [
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

export const REGIONS_PARTNER = [
  'Costa Brava',
  'Costa Dorada',
  'Valencia',
  'Costa Blanca Noord',
  'Costa Blanca Zuid',
  'Alicante',
  'Costa del Sol',
]

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
