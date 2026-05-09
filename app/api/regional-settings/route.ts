import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth, requireAdmin } from '../../../lib/auth/permissions'

export async function GET() {
  // Lezen mag iedere ingelogde user (incl. consultant) — calculator + dossier
  // hebben de regio-tarieven nodig. RLS op regional_settings is admin-only,
  // dus we lezen via service-client. Data is niet gevoelig (publieke
  // belasting-percentages); auth-check stelt alleen 'ingelogd' verplicht.
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('regional_settings')
    .select('*')
    .order('region')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PUT(request: Request) {
  // Muteren = admin-only. Voor nu nog service-client, zodat dit werkt
  // ongeacht of er al een INSERT/UPDATE RLS-policy voor admins staat.
  // Kan later overgaan naar user-client zodra RLS 'admin-write' toelaat.
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  updates.updated_at = new Date().toISOString()

  const { error } = await supabase.from('regional_settings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('regional_settings')
    .insert({ region: body.region, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
