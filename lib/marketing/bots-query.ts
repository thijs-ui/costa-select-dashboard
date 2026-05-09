// Wekelijkse selectie van ad-kandidaten uit de Bots-DB.
//
// Strategie: 200 nieuwste listings in target-regio's met num_photos>=3,
// price + description + main_image_url ingevuld. Daarna excluden we alles
// dat al ooit in ad_candidates is gebruikt (bots_listing_id) en pakken de
// 20 nieuwste die overblijven.

import { createBotsClient } from '@/lib/supabase-bots'
import { createServiceClient } from '@/lib/supabase'

// Exact zoals in de Bots-DB region-kolom (1-op-1 match — geverifieerd).
export const TARGET_REGIONS = [
  'Costa del Sol',
  'Costa Blanca Noord',
  'Costa Blanca Zuid',
  'Costa Cálida',
] as const

const MIN_PHOTOS = 3
const TARGET_COUNT = 20
const FETCH_BUFFER = 200

// Genormaliseerde shape — wat downstream-code (copy generator, ad_candidates
// insert) verwacht. Geen rauwe Bots-velden meer.
export interface BotsListing {
  id: string
  project_name: string         // raw_data.promoName ?? title (skip als beide null)
  city: string | null
  region: string
  price_from: number
  bedrooms: string | null      // rooms-int gestringd, of null
  property_type: string | null
  hero_photo_url: string       // main_image_url (vereist; skip als null)
  photo_count: number
  description: string
  source_url: string | null
  created_at: string
}

// Subset van listings-kolommen die we ophalen — geen 'images' of 'raw_data'
// als geheel om payload klein te houden.
interface BotsListingRow {
  id: string
  title: string | null
  municipality: string | null
  region: string | null
  price: number | null
  rooms: number | null
  property_type: string | null
  main_image_url: string | null
  num_photos: number | null
  description: string | null
  url: string | null
  created_at: string | null
  raw_data: { promoName?: string | null } | null
}

export async function selectWeeklyCandidates(): Promise<BotsListing[]> {
  // 1. Alle ooit gebruikte listing-ids uit dashboard-DB.
  const dashboard = createServiceClient()
  const { data: usedRows, error: usedError } = await dashboard
    .from('ad_candidates')
    .select('bots_listing_id')
  if (usedError) {
    throw new Error(`ad_candidates query faalde: ${usedError.message}`)
  }
  const usedIds = new Set(
    (usedRows ?? []).map(r => r.bots_listing_id as string),
  )

  // 2. Bots-DB query: hard filters DB-side, soft filters in JS.
  const bots = createBotsClient()
  const { data, error } = await bots
    .from('listings')
    .select(
      'id, title, municipality, region, price, rooms, property_type, ' +
      'main_image_url, num_photos, description, url, created_at, raw_data',
    )
    .in('region', TARGET_REGIONS as unknown as string[])
    .gte('num_photos', MIN_PHOTOS)
    .not('price', 'is', null)
    .not('description', 'is', null)
    .not('main_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(FETCH_BUFFER)

  if (error) {
    throw new Error(`Bots listings query faalde: ${error.message}`)
  }
  if (!data) return []

  // 3. Normaliseren + niet-eerder-gebruikt filter + project_name resolutie.
  // Cast via unknown omdat Supabase-JS de select-string niet typed kan inferren.
  const candidates: BotsListing[] = []
  for (const row of data as unknown as BotsListingRow[]) {
    if (usedIds.has(row.id)) continue

    const projectName = row.raw_data?.promoName?.trim() || row.title?.trim() || null
    if (!projectName) continue
    if (!row.main_image_url) continue        // type-narrowing — DB-filter dekt 't al
    if (row.price == null) continue
    if (!row.description) continue
    if (!row.region) continue
    if (!row.created_at) continue

    candidates.push({
      id: row.id,
      project_name: projectName,
      city: row.municipality,
      region: row.region,
      price_from: row.price,
      bedrooms: row.rooms != null ? String(row.rooms) : null,
      property_type: row.property_type,
      hero_photo_url: row.main_image_url,
      photo_count: row.num_photos ?? 0,
      description: row.description,
      source_url: row.url,
      created_at: row.created_at,
    })

    if (candidates.length >= TARGET_COUNT) break
  }

  return candidates
}
