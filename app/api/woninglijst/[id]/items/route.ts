import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { scrapeCostaSelect, isCostaSelectUrl } from '@/lib/scrapers/costaselect'
import { scrapeIdealista, isIdealistaUrl } from '@/lib/scrapers/idealista'

export const maxDuration = 120

async function enrichFromUrl(url: string): Promise<Record<string, unknown>> {
  try {
    if (isCostaSelectUrl(url)) {
      const data = await scrapeCostaSelect(url)
      return {
        title: data.adres,
        price: data.vraagprijs || null,
        location: data.regio,
        bedrooms: data.slaapkamers || null,
        bathrooms: data.badkamers || null,
        size_m2: data.oppervlakte || null,
        thumbnail: data.fotos[0] || null,
        source: 'costaselect',
      }
    }
    if (isIdealistaUrl(url)) {
      const data = await scrapeIdealista(url)
      return {
        title: data.adres,
        price: data.vraagprijs || null,
        location: data.regio,
        bedrooms: data.slaapkamers || null,
        bathrooms: data.badkamers || null,
        size_m2: data.oppervlakte || null,
        thumbnail: data.fotos[0] || null,
        source: 'idealista',
      }
    }
  } catch (err) {
    console.error('[woninglijst/items] Enrich failed for', url, err)
  }
  return {}
}

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

  const rows = await Promise.all(items.map(async (item: Record<string, unknown>) => {
    // Auto-enrich if only a URL is provided (no title/thumbnail)
    let enriched: Record<string, unknown> = {}
    const url = (item.url as string) || ''
    if (url && !item.title && !item.thumbnail) {
      enriched = await enrichFromUrl(url)
    }

    return {
      shortlist_id: id,
      title: item.title || enriched.title || url,
      url,
      price: item.price || enriched.price || null,
      location: item.location || enriched.location || '',
      bedrooms: item.bedrooms || enriched.bedrooms || null,
      bathrooms: item.bathrooms || enriched.bathrooms || null,
      size_m2: item.size_m2 || enriched.size_m2 || null,
      thumbnail: item.thumbnail || enriched.thumbnail || null,
      source: item.source || enriched.source || '',
      notities: item.notities || '',
    }
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
