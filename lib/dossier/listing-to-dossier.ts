// Map een rauwe Bots-DB listing-rij naar de DossierData-shape die
// <DossierPDF> verwacht. Geëxtraheerd uit /api/dossier/generate-from-newbuild
// zodat zowel die route als de marketing-pipeline dezelfde mapping kunnen
// gebruiken.

import type { DossierData } from '@/components/dossier/DossierPDF'

// Loose type — Bots-DB listing-rijen zijn niet typed in de codebase.
// We pakken de velden die we kennen + raw_data/details_data fallbacks.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawBotsListing = Record<string, any>

interface BotsUnit {
  typology?: string | null
  sub_typology?: string | null
  rooms?: number | null
  size_m2?: number | null
  price?: number | null
  floor?: string | null
  is_exterior?: boolean | null
  has_terrace?: boolean | null
}

/**
 * Verzamelt alle foto-URLs uit een listing. Probeert main_image_url,
 * images-jsonb, details_data.multimedia.images, en raw_data.multimedia
 * als fallback-bron. Dedupt op URL.
 */
function extractPhotos(listing: RawBotsListing): string[] {
  const photos: string[] = []
  const seen = new Set<string>()

  if (listing.main_image_url) {
    photos.push(listing.main_image_url)
    seen.add(listing.main_image_url)
  }

  if (listing.images && Array.isArray(listing.images)) {
    for (const img of listing.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  if (listing.details_data?.multimedia?.images && Array.isArray(listing.details_data.multimedia.images)) {
    for (const img of listing.details_data.multimedia.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  if (photos.length === 0 && listing.raw_data?.multimedia?.images) {
    for (const img of listing.raw_data.multimedia.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  return photos
}

/**
 * Map raw bots listing → DossierData voor PDF-render. Voor newDevelopment
 * gebruiken we 'presentatie' als default brochure_type (geen AI pitch).
 */
export function botsListingToDossierData(
  listing: RawBotsListing,
  units: BotsUnit[] = [],
  brochureType: 'presentatie' | 'pitch' = 'presentatie',
): DossierData {
  // Plot/kavel kan op verschillende paden staan afhankelijk van de Apify-actor-versie.
  const plotSize =
    listing.details_data?.plotSize ??
    listing.raw_data?.plotSize ??
    listing.details_data?.lotSize ??
    listing.raw_data?.lotSize ??
    listing.details_data?.lotSurface ??
    listing.raw_data?.lotSurface ??
    null

  const property: DossierData['property'] = {
    adres: listing.title || listing.address || 'Onbekend',
    regio: listing.province || '',
    type: listing.property_type || 'nieuwbouw',
    vraagprijs: listing.price || 0,
    oppervlakte: listing.size_m2 || 0,
    kavel: typeof plotSize === 'number' && plotSize > 0 ? plotSize : null,
    slaapkamers: listing.rooms || 0,
    badkamers: listing.bathrooms || 0,
    omschrijving: listing.description || '',
    fotos: extractPhotos(listing),
    url: listing.url || '',
  }

  // units_data is optioneel maar nuttig voor newDevelopment-projecten.
  const units_data = units.map(u => ({
    typology: u.typology || u.sub_typology || 'Onbekend',
    rooms: u.rooms ?? null,
    size_m2: u.size_m2 ?? null,
    price: u.price ?? null,
    floor: u.floor ?? null,
    is_exterior: u.is_exterior ?? null,
    has_terrace: u.has_terrace ?? null,
  }))

  return {
    property,
    regioInfo: '',
    brochure_type: brochureType,
    generatedAt: new Date().toISOString(),
    ...(units_data.length > 0 ? { units_data } : {}),
  }
}
