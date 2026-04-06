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
    .select('dossier_data')
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
  const { adres } = await request.json()

  if (!adres || typeof adres !== 'string') {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('dossier_history')
    .update({ adres })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
