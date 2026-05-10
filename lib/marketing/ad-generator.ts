// Orchestrator voor 1 listing → Canva ad PNG in onze storage.
//
// Flow: hero foto naar Canva uploaden als asset → autofill brand
// template → export als PNG → mirror naar Supabase Storage zodat we
// een eigen signed URL hebben die niet over 24u verloopt.

import type { BotsListing } from './bots-query'
import {
  autofillBrandTemplate,
  exportDesignAsPng,
  uploadCanvaAssetFromUrl,
} from '@/lib/canva/client'
import { generateCreativeLocation } from './copy-templates'
import { uploadToStorage } from './storage'

// Hardgecodeerd: het brand template-ID uit stap 4A. Bij wijziging één plek
// updaten. Field-namen (price/location/description/hero-image) staan ook
// hier hard omdat ze 1-op-1 corresponderen met deze specifieke template.
const AD_BRAND_TEMPLATE_ID = 'EAHJQyjwbgw'

export interface AdAssets {
  canvaDesignId: string
  canvaDesignUrl: string
  canvaAdPngUrl: string
}

/**
 * Voor 1 listing: genereer Canva ad PNG en upload naar Supabase Storage.
 *
 * @param listing De project-data
 * @param creativePrice Tekst voor visual: "vanaf €835.000"
 * @param creativeDescription Tekst voor visual: korte zin ≤90 chars
 * @param weekIso Voor storage path, bv. "2026-W19"
 * @param candidateId Voor storage path
 */
export async function generateAdAssets(
  listing: BotsListing,
  creativePrice: string,
  creativeDescription: string,
  weekIso: string,
  candidateId: string,
): Promise<AdAssets> {
  if (!listing.hero_photo_url) {
    throw new Error(`Listing ${listing.id} heeft geen hero_photo_url`)
  }
  if (!listing.city) {
    throw new Error(`Listing ${listing.id} heeft geen city`)
  }

  // 1. Hero-foto naar Canva uploaden als asset.
  const assetName = `${listing.project_name.slice(0, 50)}-hero-${candidateId.slice(0, 8)}`
  const heroAssetId = await uploadCanvaAssetFromUrl(listing.hero_photo_url, assetName)

  // 2. Autofill — let op: 'hero-image' met streepje (niet underscore).
  const designTitle = `${listing.project_name} — week ${weekIso}`
  const { designId, designUrl } = await autofillBrandTemplate(
    AD_BRAND_TEMPLATE_ID,
    {
      price: { type: 'text', text: creativePrice },
      location: { type: 'text', text: generateCreativeLocation(listing.city) },
      description: { type: 'text', text: creativeDescription },
      'hero-image': { type: 'image', asset_id: heroAssetId },
    },
    designTitle,
  )

  // 3. Export als PNG (Canva-hosted URL, ~24u geldig).
  const { pngUrl: canvaPngUrl } = await exportDesignAsPng(designId)

  // 4. Mirror naar onze storage zodat de URL persistent is.
  const storagePath = `${weekIso}/${candidateId}/ad.png`
  const ourUrl = await uploadToStorage(canvaPngUrl, storagePath, 'image/png')

  return {
    canvaDesignId: designId,
    canvaDesignUrl: designUrl,
    canvaAdPngUrl: ourUrl,
  }
}
