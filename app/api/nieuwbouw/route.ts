import { NextResponse } from 'next/server'
import { createBotsClient } from '@/lib/supabase-bots'
import { requireAuth } from '@/lib/auth/permissions'

// GET: data uit het Bots Supabase project
export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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

  // Volledige data voor kaart (incl. units + nearby_amenities voor nieuwe UI)
  const { data, error } = await supabase
    .from('listings')
    .select('*, units(*)')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
