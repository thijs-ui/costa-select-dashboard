import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createUserClient } from '../../../lib/supabase/user-client'
import { requireAuth, requireAdmin } from '../../../lib/auth/permissions'
import { getUserRole } from '../../../lib/auth/roles'

const TRIP_COLUMNS = 'id, client_name, client_email, client_phone, trip_date, start_time, start_address, lunch_time, lunch_duration_minutes, notes, created_by, created_at'

// GET: alle trips ophalen (admin ziet alles, anders alleen eigen trips)
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const role = await getUserRole(auth.id)
  const supabase = await createUserClient()

  let query = supabase
    .from('viewing_trips')
    .select(`${TRIP_COLUMNS}, viewing_stops(id)`)
    .order('trip_date', { ascending: true })

  if (role !== 'admin') {
    query = query.eq('created_by', auth.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const trips = (data ?? []).map(t => ({
    ...t,
    stop_count: t.viewing_stops?.length ?? 0,
    viewing_stops: undefined,
  }))

  return NextResponse.json(trips)
}

// POST: nieuwe trip aanmaken
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('viewing_trips')
    .insert({
      client_name: body.client_name,
      client_email: body.client_email || null,
      client_phone: body.client_phone || null,
      trip_date: body.trip_date,
      start_time: body.start_time || '09:00',
      start_address: body.start_address || null,
      lunch_time: body.lunch_time || '13:00',
      lunch_duration_minutes: body.lunch_duration_minutes || 60,
      notes: body.notes || null,
      created_by: body.created_by || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PUT: trip updaten
export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const { error } = await supabase.from('viewing_trips').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: trip verwijderen
export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const { error } = await supabase.from('viewing_trips').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
