// ============================================================================
// Shared types for Nieuwbouwkaart page + subcomponents
// Shapes matchen de Supabase-rijen uit costa-select-nieuwbouw (db/schema.sql).
// ============================================================================

export interface ListingImage {
  url: string
  tag?: string | null
}

export interface Listing {
  id: string
  property_code: string
  url: string | null
  external_reference: string | null
  province: string | null
  region: string | null
  municipality: string | null
  district: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  location_id: string | null
  property_type: string | null
  operation: string
  title: string | null
  description: string | null
  price: number | null
  price_per_m2: number | null
  size_m2: number | null
  rooms: number | null
  bathrooms: number | null
  floor: string | null
  status: string | null
  is_new_development: boolean | null
  is_exterior: boolean | null
  has_lift: boolean | null
  has_parking: boolean | null
  parking_included_in_price: boolean | null
  has_swimming_pool: boolean | null
  has_terrace: boolean | null
  has_air_conditioning: boolean | null
  has_garden: boolean | null
  has_storage_room: boolean | null
  num_photos: number | null
  main_image_url: string | null
  images: ListingImage[] | null
  agency_name: string | null
  contact_phone: string | null
  agent_logo_url: string | null
  first_seen_at: string
  last_seen_at: string
  is_active: boolean
  // joined:
  units?: Unit[]
  amenities?: Amenity[]
}

export interface Unit {
  id: string
  listing_id: string
  unit_id: string
  operation: string
  typology: string | null        // 'flat' | 'duplex' | 'penthouse' | ...
  sub_typology: string | null
  price: number | null
  size_m2: number | null
  rooms: number | null
  floor: string | null
  is_exterior: boolean | null
  has_terrace: boolean | null
  has_garden: boolean | null
  parking_included_in_price: boolean | null
}

// Shape van de reeds bestaande Google-Places koppeling in het dashboard.
// Pas aan indien je interne naam afwijkt.
export interface Amenity {
  kind: 'beach' | 'golf' | 'airport' | 'supermarket' | 'school' | 'hospital' | 'restaurant' | string
  name: string          // bv. "Playa de la Fontanilla"
  distance_km: number
  travel_min: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface ListingFilters {
  search: string
  region: string         // '' = all (Costa Blanca Noord/Zuid, Costa Cálida, Costa del Sol, Valencia)
  propertyType: string   // '' = all; matched tegen unit.typology (lowercase: 'flat', 'chalet', etc.)
  priceMin: number | null
  priceMax: number | null
  roomsMin: number | null
  roomsMax: number | null
}

// Mapping van Idealista DB-types (units.typology / listings.property_type)
// naar leesbare NL-labels. Spiegelt mapPropertyType in idealista-direct.js.
// Gebruikt door: filter-dropdown, popup detail-pill, QuickStats.
export function humanizePropertyType(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = String(raw).toLowerCase()
  if (t === 'flat' || t === 'apartment')                          return 'Appartement'
  if (t === 'penthouse')                                          return 'Penthouse'
  if (t === 'duplex')                                             return 'Duplex'
  if (t === 'chalet' || t === 'villa' || t === 'detachedhouse')   return 'Villa'
  if (t === 'townhouse' || t === 'semidetachedhouse'
      || t === 'terracedhouse')                                   return 'Townhouse'
  if (t === 'countryhouse' || t === 'finca')                      return 'Finca'
  if (t === 'studio')                                             return 'Studio'
  if (t === 'loft')                                               return 'Loft'
  if (t === 'bungalow')                                           return 'Bungalow'
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

/**
 * Verzamel alle unit-typologies uit een listing (deduped, gesorteerd).
 * Dit is wat we als 'echte' property-types tonen — listing.property_type is bij
 * Idealista vrijwel altijd 'newDevelopment' wat geen filter-waarde is.
 */
export function listingTypologies(l: { units?: Unit[] | null }): string[] {
  const set = new Set<string>()
  for (const u of (l.units ?? [])) {
    if (u.typology) set.add(String(u.typology).toLowerCase())
  }
  return [...set].sort()
}
