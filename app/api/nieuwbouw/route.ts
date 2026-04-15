import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET: lichte data voor kaart + tabel
export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const full = searchParams.get('id')

  // Volledige data voor één project (zijpaneel)
  if (full) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', full)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Lichte data voor kaart
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, latitude, longitude, price, status, property_type, municipality, province, rooms, bathrooms, size_m2, is_new_development, main_image_url, is_active')
    .eq('is_active', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
