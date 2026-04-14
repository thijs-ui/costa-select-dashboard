import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('dossier_history')
      .select('id, adres, regio, type, vraagprijs, url, brochure_type, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[dossier/history] DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[dossier/history] Returning ${data?.length ?? 0} items`)
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[dossier/history] Unexpected error:', err)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { dossier } = body
  if (!dossier?.property) {
    return NextResponse.json({ error: 'Geen dossier data' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dossier_history')
    .insert({
      adres: dossier.property.adres || 'Onbekend',
      regio: dossier.property.regio || '',
      type: dossier.property.type || '',
      vraagprijs: dossier.property.vraagprijs || 0,
      url: dossier.property.url || '',
      dossier_data: dossier,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
