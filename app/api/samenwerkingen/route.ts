import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createUserClient } from '../../../lib/supabase/user-client'
import { requireAuth, requireAdmin } from '../../../lib/auth/permissions'

// TODO security: `internal_notes` en `commission_arrangement` horen volgens de UI
// ("alleen admins") niet zichtbaar voor makelaar/backoffice. In deze migratie
// behouden we huidige gedrag (iedere ingelogde user ziet ze) — afschermen
// vergt ook een wijziging in de edit-modal en valt buiten deze scope.
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = await createUserClient()
  // select('*') zodat de query niet faalt als een nieuwe kolom (zoals regions)
  // nog niet via migratie is toegevoegd. Onbekende kolommen worden gewoon
  // genegeerd door de frontend.
  const { data, error } = await supabase.from('partners').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()
  // Bouw insert dynamisch op zodat we kolommen die nog niet in DB staan
  // (na migratie) automatisch overslaan. Eerst proberen we alle nieuwe velden;
  // op schema-cache error fallen we terug op de basisset.
  const fullInsert: Record<string, unknown> = {
    name: body.name,
    type: body.type || 'anders',
    region: body.region || null,
    regions: Array.isArray(body.regions) && body.regions.length > 0 ? body.regions : null,
    contact_name: body.contact_name || null,
    contact_phone: body.contact_phone || null,
    contact_email: body.contact_email || null,
    website: body.website || null,
    specialism: body.specialism || null,
    internal_notes: body.internal_notes || null,
    commission_arrangement: body.commission_arrangement || null,
  }
  let { data, error } = await supabase.from('partners').insert(fullInsert).select().single()
  if (error && /column .* does not exist|schema cache/i.test(error.message)) {
    // Migratie nog niet gedraaid — probeer met de oude minimale set
    const minimalInsert: Record<string, unknown> = {
      name: body.name,
      type: body.type || 'anders',
      region: body.region || null,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      website: body.website || null,
    }
    const retry = await supabase.from('partners').insert(minimalInsert).select().single()
    data = retry.data
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  updates.updated_at = new Date().toISOString()
  const { error } = await supabase.from('partners').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
