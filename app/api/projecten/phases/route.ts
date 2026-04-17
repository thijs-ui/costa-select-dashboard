import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const body = await request.json()
  const { data, error } = await supabase.from('project_phases').insert({
    project_id: body.project_id,
    name: body.name,
    sort_order: body.sort_order ?? 0,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('project_phases').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('project_phases').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
