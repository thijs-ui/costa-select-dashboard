import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

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
  const supabase = createServiceClient()
  const body = await request.json()

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
  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const { error } = await supabase.from('viewing_stops').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: stop verwijderen
export async function DELETE(request: Request) {
  const supabase = createServiceClient()
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const { error } = await supabase.from('viewing_stops').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
