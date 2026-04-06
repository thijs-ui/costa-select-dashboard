import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { items } = await request.json()

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Geen woningen opgegeven' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const rows = items.map((item: Record<string, unknown>) => ({
    shortlist_id: id,
    title: item.title || '',
    url: item.url || '',
    price: item.price || null,
    location: item.location || '',
    bedrooms: item.bedrooms || null,
    bathrooms: item.bathrooms || null,
    size_m2: item.size_m2 || null,
    thumbnail: item.thumbnail || null,
    source: item.source || '',
    notities: item.notities || '',
  }))

  const { error } = await supabase.from('shortlist_items').insert(rows)

  if (error) {
    console.error('[woninglijst/items] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update shortlist timestamp
  await supabase
    .from('shortlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: true, count: rows.length })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { item_id } = await request.json()

  if (!item_id) {
    return NextResponse.json({ error: 'item_id is verplicht' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('shortlist_items')
    .delete()
    .eq('id', item_id)
    .eq('shortlist_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
