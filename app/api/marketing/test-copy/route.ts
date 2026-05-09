// Sanity-check voor de copy-generator. Pakt de eerste candidate uit
// selectWeeklyCandidates(), genereert alle 6 copy-velden (3 templated +
// 3 via Claude) en retourneert ze.

import { NextResponse } from 'next/server'
import { selectWeeklyCandidates } from '@/lib/marketing/bots-query'
import { generateAdCopy } from '@/lib/marketing/copy-generator'
import {
  generateFbHeadline,
  generateCreativeProjectName,
  generateCreativePrice,
} from '@/lib/marketing/copy-templates'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const candidates = await selectWeeklyCandidates()
    if (candidates.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Geen kandidaten gevonden' },
        { status: 404 },
      )
    }

    const listing = candidates[0]
    const claude = await generateAdCopy(listing)

    return NextResponse.json({
      ok: true,
      listing: {
        id: listing.id,
        project_name: listing.project_name,
        city: listing.city,
        region: listing.region,
        price_from: listing.price_from,
        property_type: listing.property_type,
      },
      generated: {
        fb_headline: generateFbHeadline(listing.city ?? '', listing.price_from),
        fb_primary_text_simple: claude.primary_text_simple,
        fb_primary_text_variant: claude.primary_text_variant,
        creative_project_name: generateCreativeProjectName(listing.project_name),
        creative_price: generateCreativePrice(listing.price_from),
        creative_description: claude.creative_description,
      },
      lengths: {
        primary_text_simple: claude.primary_text_simple.length,
        primary_text_variant: claude.primary_text_variant.length,
        creative_description: claude.creative_description.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
