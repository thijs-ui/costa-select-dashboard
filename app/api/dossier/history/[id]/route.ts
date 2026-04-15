import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('dossier_history')
    .select('dossier_data, financial_data, internal_notes')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Dossier niet gevonden' }, { status: 404 })
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

  const updates: Record<string, unknown> = {}
  if (body.adres && typeof body.adres === 'string') updates.adres = body.adres
  if (body.financial_data !== undefined) updates.financial_data = body.financial_data
  if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Geen updates opgegeven' }, { status: 400 })
  }

  const { error } = await supabase
    .from('dossier_history')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
