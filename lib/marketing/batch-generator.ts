// Per-candidate orchestrator: voor 1 listing → DB-row insert → copy →
// ad + brochure → DB-row update. Throws NIET; vangt alle errors en
// retourneert altijd een GenerateResult zodat Promise.allSettled in de
// cron 1 failure niet tot 19 doet meeslepen.

import crypto from 'crypto'
import type { BotsListing } from './bots-query'
import { generateAdCopy } from './copy-generator'
import {
  generateFbHeadline,
  generateCreativeProjectName,
  generateCreativePrice,
} from './copy-templates'
import { generateAdAssets } from './ad-generator'
import { generateBrochureForAd } from './brochure-generator'
import { createServiceClient } from '@/lib/supabase'

export interface GenerateResult {
  candidateId: string
  listingId: string
  status: 'success' | 'failed'
  error?: string
  durationMs: number
}

/**
 * Pre-flight check: heeft listing alle verplichte velden? Returns null
 * als OK, anders foutmelding.
 */
function checkRequiredFields(listing: BotsListing): string | null {
  if (!listing.project_name) return 'Geen project_name'
  if (!listing.hero_photo_url) return 'Geen hero foto beschikbaar'
  if (!listing.city) return 'Geen city ingevuld'
  if (!listing.price_from || listing.price_from <= 0) return 'Geen geldige prijs'
  return null
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * Verwerk één candidate end-to-end.
 *
 * Schrijft een 'pending' rij vooraf, runt copy + ad + brochure parallel,
 * en update de rij met de gegenereerde content. Status blijft 'pending'
 * (= klaar voor review) — review-UI in stap 6 muteert naar approved/
 * rejected/posted.
 */
export async function generateForCandidate(
  batchId: string,
  weekIso: string,
  listing: BotsListing,
): Promise<GenerateResult> {
  const candidateId = crypto.randomUUID()
  const startTime = Date.now()
  const supabase = createServiceClient()

  // 1. Pre-flight: skip als verplichte velden ontbreken.
  const missingFieldError = checkRequiredFields(listing)
  if (missingFieldError) {
    await supabase.from('ad_candidates').insert({
      id: candidateId,
      batch_id: batchId,
      bots_listing_id: listing.id,
      project_name: listing.project_name ?? '(onbekend)',
      city: listing.city,
      region: listing.region,
      price_from: listing.price_from,
      hero_photo_url: listing.hero_photo_url,
      source_url: listing.source_url,
      status: 'pending',
      generation_error: `Skipped: ${missingFieldError}`,
    })
    return {
      candidateId,
      listingId: listing.id,
      status: 'failed',
      error: missingFieldError,
      durationMs: Date.now() - startTime,
    }
  }

  // 2. Insert pending rij vooraf — zo blijft 'm zichtbaar in DB ook bij
  // timeout in de generatie-fase.
  const { error: insertError } = await supabase.from('ad_candidates').insert({
    id: candidateId,
    batch_id: batchId,
    bots_listing_id: listing.id,
    project_name: listing.project_name,
    city: listing.city,
    region: listing.region,
    price_from: listing.price_from,
    bedrooms_range: listing.bedrooms,
    property_type: listing.property_type,
    hero_photo_url: listing.hero_photo_url,
    source_url: listing.source_url,
    status: 'pending',
  })
  if (insertError) {
    return {
      candidateId,
      listingId: listing.id,
      status: 'failed',
      error: `DB insert: ${insertError.message}`,
      durationMs: Date.now() - startTime,
    }
  }

  // 3. Genereer alles. Catch globaal en update rij met error.
  try {
    const copy = await generateAdCopy(listing)

    // checkRequiredFields heeft listing.city al gevalideerd — non-null safe.
    const fbHeadline = generateFbHeadline(listing.city as string, listing.price_from)
    const creativeName = generateCreativeProjectName(listing.project_name)
    const creativePrice = generateCreativePrice(listing.price_from)

    // Ad MOET lukken; brochure mag falen (we vullen 'm in als beschikbaar).
    const [adResult, brochureResult] = await Promise.allSettled([
      generateAdAssets(listing, creativePrice, copy.creative_description, weekIso, candidateId),
      generateBrochureForAd(listing, weekIso, candidateId),
    ])

    if (adResult.status === 'rejected') {
      throw new Error(`Canva ad faalde: ${errorMessage(adResult.reason)}`)
    }
    const ad = adResult.value
    const brochureUrl = brochureResult.status === 'fulfilled' ? brochureResult.value : null
    const brochureError = brochureResult.status === 'rejected'
      ? errorMessage(brochureResult.reason)
      : null

    // 4. Update rij met gegenereerde content.
    const { error: updateError } = await supabase
      .from('ad_candidates')
      .update({
        fb_headline: fbHeadline,
        fb_primary_text_simple: copy.primary_text_simple,
        fb_primary_text_variant: copy.primary_text_variant,
        creative_project_name: creativeName,
        creative_price: creativePrice,
        creative_description: copy.creative_description,
        canva_ad_url: ad.canvaAdPngUrl,
        canva_design_id: ad.canvaDesignId,
        brochure_url: brochureUrl,
        status: 'pending',
        generation_error: brochureError ? `Brochure faalde (ad OK): ${brochureError}` : null,
      })
      .eq('id', candidateId)

    if (updateError) throw new Error(`DB update: ${updateError.message}`)

    return {
      candidateId,
      listingId: listing.id,
      status: 'success',
      durationMs: Date.now() - startTime,
    }
  } catch (err) {
    const message = errorMessage(err)
    await supabase
      .from('ad_candidates')
      .update({ generation_error: message })
      .eq('id', candidateId)

    return {
      candidateId,
      listingId: listing.id,
      status: 'failed',
      error: message,
      durationMs: Date.now() - startTime,
    }
  }
}
