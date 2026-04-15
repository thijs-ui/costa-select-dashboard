import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('agencies')
    .insert({
      name: body.name,
      region: body.region,
      city: body.city || null,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      website: body.website || null,
      property_types: body.property_types || null,
      commission_notes: body.commission_notes || null,
      reliability_score: body.reliability_score || null,
      notes: body.notes || null,
      created_by: body.created_by || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase.from('agencies').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = createServiceClient()
  const { id } = await request.json()

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const { error } = await supabase.from('agencies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
