import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createUserClient } from '../../../lib/supabase/user-client'
import { requireAuth } from '../../../lib/auth/permissions'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = await createUserClient()

  const { data, error } = await supabase
    .from('shortlists')
    .select('id, klant_naam, notities, created_at, updated_at, shortlist_items(count)')
    .eq('created_by', auth.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[woninglijst] GET error:', error)
    return NextResponse.json([], { status: 200 })
  }

  const result = (data ?? []).map(s => ({
    ...s,
    item_count: (s.shortlist_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const { klant_naam, created_by } = await request.json()

  if (!klant_naam?.trim()) {
    return NextResponse.json({ error: 'Klant naam is verplicht' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('shortlists')
    .insert({ klant_naam: klant_naam.trim(), created_by: created_by || null })
    .select('id, klant_naam')
    .single()

  if (error) {
    console.error('[woninglijst] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
