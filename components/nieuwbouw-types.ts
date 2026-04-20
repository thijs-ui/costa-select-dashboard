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
  province: string       // '' = all
  propertyType: string   // '' = all
  priceMin: number | null
  priceMax: number | null
  roomsMin: number | null
  roomsMax: number | null
  nearBeach: boolean
}
