import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth/permissions'
import { getUserRole } from '@/lib/auth/roles'

// GET: stops voor een trip
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tripId = searchParams.get('trip_id')
  if (!tripId) return NextResponse.json({ error: 'trip_id is verplicht' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('viewing_stops')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: stop toevoegen
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()

  // Ownership check via parent trip
  const { data: trip } = await supabase
    .from('viewing_trips')
    .select('created_by')
    .eq('id', body.trip_id)
    .single()

  const role = await getUserRole(auth.id)
  if (trip?.created_by !== auth.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Bepaal sort_order
  const { data: existing } = await supabase
    .from('viewing_stops')
    .select('sort_order')
    .eq('trip_id', body.trip_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('viewing_stops')
    .insert({
      trip_id: body.trip_id,
      sort_order: nextOrder,
      dossier_id: body.dossier_id || null,
      address: body.address,
      property_title: body.property_title || null,
      listing_url: body.listing_url || null,
      price: body.price || null,
      viewing_duration_minutes: body.viewing_duration_minutes || 30,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT: stop updaten
export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  // Ownership check: stop → trip → created_by
  const { data: stop } = await supabase
    .from('viewing_stops')
    .select('viewing_trips(created_by)')
    .eq('id', id)
    .single() as { data: { viewing_trips: { created_by: string | null } | null } | null }

  const role = await getUserRole(auth.id)
  if (stop?.viewing_trips?.created_by !== auth.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('viewing_stops').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: stop verwijderen
export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  // Ownership check: stop → trip → created_by
  const { data: stop } = await supabase
    .from('viewing_stops')
    .select('viewing_trips(created_by)')
    .eq('id', id)
    .single() as { data: { viewing_trips: { created_by: string | null } | null } | null }

  const role = await getUserRole(auth.id)
  if (stop?.viewing_trips?.created_by !== auth.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('viewing_stops').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
