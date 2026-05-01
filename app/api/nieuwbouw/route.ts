import { NextResponse } from 'next/server'
import { createBotsClient } from '@/lib/supabase-bots'
import { requireAuth } from '@/lib/auth/permissions'

export const maxDuration = 60

// Expliciete kolom-lijst voor de kaart-fetch — `select('*')` haalde óók
// de raw_data + details_data JSONB mee (per listing tot honderden KB) wat
// met units-join op > paar honderd projecten Postgres' statement_timeout
// triggerde (code 57014). Hier alleen wat de UI daadwerkelijk gebruikt.
const LISTING_COLS = [
  'id', 'property_code', 'url',
  'province', 'municipality', 'district', 'address',
  'latitude', 'longitude',
  'property_type', 'title', 'description',
  'price', 'price_per_m2', 'size_m2', 'rooms', 'bathrooms',
  'status', 'is_new_development', 'is_exterior',
  'has_lift', 'has_parking', 'parking_included_in_price',
  'has_swimming_pool', 'has_terrace', 'has_air_conditioning',
  'has_garden', 'has_storage_room',
  'num_photos', 'main_image_url', 'images',
  'agency_name', 'contact_phone', 'agent_logo_url',
  'last_seen_at',
  'nearby_amenities',
].join(', ')

const UNIT_COLS = 'id, listing_id, typology, sub_typology, price, size_m2, rooms, floor, is_exterior, has_terrace, has_garden, parking_included_in_price'

// GET: data uit het Bots Supabase project
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Bots-env vroeg checken — anders crasht createClient() niet maar geeft
  // wel cryptische "Invalid API key" terug. Expliciete diagnose helpt debug.
  if (!process.env.BOTS_SUPABASE_URL || !process.env.BOTS_SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error: `Bots Supabase env ontbreekt — BOTS_SUPABASE_URL=${process.env.BOTS_SUPABASE_URL ? 'set' : 'MISSING'}, BOTS_SUPABASE_SERVICE_ROLE_KEY=${process.env.BOTS_SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'}`,
    }, { status: 500 })
  }

  const supabase = createBotsClient()
  const { searchParams } = new URL(request.url)
  const full = searchParams.get('id')

  // Volledige data voor één project (zijpaneel) + units
  if (full) {
    const [listingRes, unitsRes] = await Promise.all([
      supabase.from('listings').select('*').eq('id', full).single(),
      supabase.from('units').select('id, typology, sub_typology, price, size_m2, rooms, floor').eq('listing_id', full).order('price', { ascending: true }),
    ])
    if (listingRes.error) return NextResponse.json({ error: listingRes.error.message }, { status: 500 })
    return NextResponse.json({ ...listingRes.data, units: unitsRes.data ?? [] })
  }

  // Kaart-fetch: alleen kolommen die de UI gebruikt, geen raw_data/details_data.
  const { data, error } = await supabase
    .from('listings')
    .select(`${LISTING_COLS}, units(${UNIT_COLS})`)
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('title')

  if (error) {
    console.error('[api/nieuwbouw] listings query failed:', error)
    return NextResponse.json({ error: `Bots Supabase: ${error.message} (code=${error.code ?? 'n/a'})` }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}
