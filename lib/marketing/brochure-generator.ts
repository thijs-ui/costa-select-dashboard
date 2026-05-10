// Genereert een nieuwbouw-brochure (PDF, presentatie-modus) voor één
// listing en upload 'm naar Supabase Storage. Wrapt de gedeelde helpers:
//   - botsListingToDossierData (mapping)
//   - renderDossierPdfBuffer (PDF render)
//   - uploadBufferToStorage (storage)
//
// Géén DB-pollution: we slaan NIET op in dossier_history. De marketing-
// pipeline persisteert eigen rijen in ad_candidates met de signed URL.

import type { BotsListing } from './bots-query'
import { createBotsClient } from '@/lib/supabase-bots'
import { botsListingToDossierData } from '@/lib/dossier/listing-to-dossier'
import { renderDossierPdfBuffer } from '@/lib/dossier/render-pdf'
import { uploadBufferToStorage } from './storage'

/**
 * Voor 1 listing: genereer een nieuwbouw-brochure (presentatie-modus)
 * en upload naar Supabase Storage. Returns signed URL.
 *
 * Voor de marketing-pipeline gebruiken we ALTIJD:
 *   - newDevelopment-flow (botsListingToDossierData + de
 *     /api/dossier/generate-from-newbuild mapping, niet de resale-flow)
 *   - presentatie-modus (geen AI pitch — feitelijke brochure voor leads)
 */
export async function generateBrochureForAd(
  listing: BotsListing,
  weekIso: string,
  candidateId: string,
): Promise<string> {
  const bots = createBotsClient()

  // Refetch raw listing + units — onze BotsListing-shape is te lean voor
  // een full brochure (mist oppervlakte, badkamers, alle foto's, etc.).
  const [listingRes, unitsRes] = await Promise.all([
    bots.from('listings').select('*').eq('id', listing.id).single(),
    bots.from('units').select('*').eq('listing_id', listing.id).order('price', { ascending: true }),
  ])

  if (listingRes.error || !listingRes.data) {
    throw new Error(`Listing ${listing.id} niet gevonden in Bots-DB: ${listingRes.error?.message ?? 'unknown'}`)
  }

  const dossierData = botsListingToDossierData(
    listingRes.data,
    unitsRes.data ?? [],
    'presentatie',
  )

  // Marketing-override: de standaard newbuild-mapping zet 'title' (adres)
  // op de cover en 'province' (Alicante/Murcia) als regio. Voor de
  // marketing-brochure willen we juist de projectnaam + costa-branding,
  // identiek aan wat in de Canva-ad staat. Consultant-flow blijft
  // ongewijzigd.
  const promoName =
    (listingRes.data as { raw_data?: { promoName?: string } })?.raw_data?.promoName?.trim() ||
    listingRes.data.title?.trim() ||
    null
  if (promoName) dossierData.property.adres = promoName
  if (listing.region) dossierData.property.regio = listing.region

  const buffer = await renderDossierPdfBuffer(dossierData)

  const storagePath = `${weekIso}/${candidateId}/brochure.pdf`
  const signedUrl = await uploadBufferToStorage(buffer, storagePath, 'application/pdf')

  return signedUrl
}
