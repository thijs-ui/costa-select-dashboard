import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { scrapeCostaSelect, isCostaSelectUrl } from '@/lib/scrapers/costaselect'
import { scrapeIdealista, isIdealistaUrl } from '@/lib/scrapers/idealista'
import { requireAdmin } from '@/lib/auth/permissions'

export const maxDuration = 120

async function enrichFromUrl(url: string): Promise<Record<string, unknown>> {
  try {
    if (isCostaSelectUrl(url)) {
      console.log('[enrich] Scraping CostaSelect:', url)
      const data = await scrapeCostaSelect(url)
      console.log('[enrich] CostaSelect result:', data.adres, data.vraagprijs, data.fotos.length, 'fotos')
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
      console.log('[enrich] Scraping Idealista:', url)
      const data = await scrapeIdealista(url)
      console.log('[enrich] Idealista result:', data.adres, data.vraagprijs, data.fotos.length, 'fotos')
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
    console.log('[enrich] URL not recognized as CostaSelect or Idealista:', url)
  } catch (err) {
    console.error('[enrich] Failed for', url, err)
  }
  return {}
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

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
    console.log('[items POST] item received:', { url, title: item.title, thumbnail: item.thumbnail })
    if (url && !item.title && !item.thumbnail) {
      console.log('[items POST] Triggering enrich for:', url)
      enriched = await enrichFromUrl(url)
      console.log('[items POST] Enriched result:', enriched)
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
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()
  const ids: string[] = body.item_ids ?? (body.item_id ? [body.item_id] : [])

  if (ids.length === 0) {
    return NextResponse.json({ error: 'item_id of item_ids is verplicht' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('shortlist_items')
    .delete()
    .in('id', ids)
    .eq('shortlist_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
