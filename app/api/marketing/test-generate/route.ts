// Test-endpoint voor de complete pipeline op 1 listing.
//
// Flow: select kandidaat → genereer copy → templated headline →
// Canva-asset (parallel met brochure) → terug.
//
// Brochure is voorlopig gestubt op null — wacht op beslissing welk pad
// (A: gedeelde render-helper / B: interne API-calls / C: skip).

import { NextResponse } from 'next/server'
import { selectWeeklyCandidates } from '@/lib/marketing/bots-query'
import { generateAdCopy } from '@/lib/marketing/copy-generator'
import {
  generateFbHeadline,
  generateCreativeProjectName,
  generateCreativePrice,
} from '@/lib/marketing/copy-templates'
import { generateAdAssets } from '@/lib/marketing/ad-generator'
import { generateBrochureForAd } from '@/lib/marketing/brochure-generator'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Pipeline duurt 30-60s — laat 'm tot 120 lopen voor headroom.
export const maxDuration = 120

export async function GET() {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  const startTime = Date.now()
  const timings: Record<string, number> = {}

  try {
    let t = Date.now()
    const candidates = await selectWeeklyCandidates()
    timings.select_ms = Date.now() - t

    if (candidates.length === 0) {
      return NextResponse.json({ ok: false, error: 'Geen kandidaten' }, { status: 404 })
    }

    const listing = candidates[0]
    const candidateId = crypto.randomUUID()
    const weekIso = '2026-W-TEST'

    t = Date.now()
    const copy = await generateAdCopy(listing)
    timings.copy_ms = Date.now() - t

    const creativePrice = generateCreativePrice(listing.price_from)
    const creativeProjectName = generateCreativeProjectName(listing.project_name)
    const fbHeadline = generateFbHeadline(listing.city ?? '', listing.price_from)

    // Ad + brochure parallel — Canva async-jobs leven al lang, dus de
    // brochure-render (~3-8s) draait gratis mee in de bestaande wachttijd.
    t = Date.now()
    const [adAssets, brochureResult] = await Promise.all([
      generateAdAssets(listing, creativePrice, copy.creative_description, weekIso, candidateId),
      generateBrochureForAd(listing, weekIso, candidateId)
        .then(url => ({ ok: true as const, url }))
        .catch(err => ({
          ok: false as const,
          error: err instanceof Error ? err.message : 'Onbekende fout',
        })),
    ])
    timings.ad_assets_ms = Date.now() - t

    return NextResponse.json({
      ok: true,
      total_ms: Date.now() - startTime,
      timings,
      listing: {
        id: listing.id,
        project_name: listing.project_name,
        city: listing.city,
        region: listing.region,
        price_from: listing.price_from,
      },
      facebook_copy: {
        headline: fbHeadline,
        primary_text_simple: copy.primary_text_simple,
        primary_text_variant: copy.primary_text_variant,
      },
      creative_text: {
        project_name: creativeProjectName,
        price: creativePrice,
        description: copy.creative_description,
      },
      assets: {
        canva_design_id: adAssets.canvaDesignId,
        canva_design_url: adAssets.canvaDesignUrl,
        canva_ad_png: adAssets.canvaAdPngUrl,
        brochure_pdf: brochureResult.ok ? brochureResult.url : null,
        brochure_error: brochureResult.ok ? null : brochureResult.error,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json(
      { ok: false, error: message, total_ms: Date.now() - startTime, timings },
      { status: 500 },
    )
  }
}
