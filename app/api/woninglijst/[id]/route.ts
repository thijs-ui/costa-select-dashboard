import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('shortlists')
    .select('*, shortlist_items(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Shortlist niet gevonden' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const supabase = createServiceClient()

  // Update item note
  if (body.item_id && body.item_notities !== undefined) {
    const { error } = await supabase
      .from('shortlist_items')
      .update({ notities: body.item_notities })
      .eq('id', body.item_id)
      .eq('shortlist_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Update shortlist itself
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.klant_naam !== undefined) updates.klant_naam = body.klant_naam
  if (body.notities !== undefined) updates.notities = body.notities

  const { error } = await supabase
    .from('shortlists')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('shortlists')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
