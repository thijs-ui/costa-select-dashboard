import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { createBotsClient } from '@/lib/supabase-bots'
import { requireAuth } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PITCH_SYSTEM = `Je bent een ervaren vastgoedconsultant van Costa Select, een Nederlandse aankoopmakelaardij in Spanje. Analyseer dit nieuwbouwproject voor klanten die een tweede huis of investering zoeken.

Schrijfstijl: helder, direct, geen overdrijving. Eerlijk over nadelen. Schrijf in jij-vorm richting de koper. Schrijf in het Nederlands.`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPhotos(listing: any): string[] {
  const photos: string[] = []
  const seen = new Set<string>()

  // main_image_url als eerste
  if (listing.main_image_url) { photos.push(listing.main_image_url); seen.add(listing.main_image_url) }

  // images JSONB: kan array van {url, tag} objecten zijn, of array van strings
  if (listing.images && Array.isArray(listing.images)) {
    for (const img of listing.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  // details_data kan ook images bevatten
  if (listing.details_data?.multimedia?.images && Array.isArray(listing.details_data.multimedia.images)) {
    for (const img of listing.details_data.multimedia.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  // raw_data fallback
  if (photos.length === 0 && listing.raw_data?.multimedia?.images) {
    for (const img of listing.raw_data.multimedia.images) {
      const url = typeof img === 'string' ? img : img?.url
      if (url && !seen.has(url)) { photos.push(url); seen.add(url) }
    }
  }

  return photos
}

async function downloadAndStorePhotos(photos: string[], dossierId: string): Promise<string[]> {
  // Maak een eigen service client voor storage (service_role bypast storage RLS)
  const { createClient } = await import('@supabase/supabase-js')
  const storageClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const storedUrls: string[] = []
  // Cap op 15: bovenkant van wat we in de PDF willen tonen. Mits de listing
  // dat aantal heeft (Idealista heeft vaak 10-25 foto's), pakken we ze allemaal.
  const maxPhotos = Math.min(photos.length, 15)

  for (let i = 0; i < maxPhotos; i++) {
    try {
      const res = await fetch(photos[i], {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      })
      if (!res.ok) { console.log(`Photo ${i} download failed: ${res.status}`); continue }

      const arrayBuf = await res.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : 'jpg'
      const filePath = `${dossierId}/${i + 1}.${ext}`

      const { error: uploadError } = await storageClient.storage.from('dossier-fotos').upload(filePath, uint8, {
        contentType,
        upsert: true,
      })

      if (uploadError) {
        console.log(`Photo ${i} upload failed:`, uploadError.message)
        continue
      }

      const { data: urlData } = storageClient.storage.from('dossier-fotos').getPublicUrl(filePath)
      storedUrls.push(urlData.publicUrl)
      console.log(`Photo ${i} stored:`, urlData.publicUrl)
    } catch (err) {
      console.log(`Photo ${i} error:`, err)
    }
  }

  console.log(`Stored ${storedUrls.length}/${maxPhotos} photos`)
  return storedUrls.length > 0 ? storedUrls : photos.slice(0, 15)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const limited = await checkRateLimit(auth.id, 'EXPENSIVE')
  if (limited) return limited

  const { listing_id, mode, client_id } = await request.json()

  if (!listing_id) return NextResponse.json({ error: 'listing_id verplicht' }, { status: 400 })

  const bots = createBotsClient()
  const dashboard = createServiceClient()

  // 1. Haal listing + units op uit Bots Supabase
  const [listingRes, unitsRes] = await Promise.all([
    bots.from('listings').select('*').eq('id', listing_id).single(),
    bots.from('units').select('*').eq('listing_id', listing_id).order('price', { ascending: true }),
  ])

  if (listingRes.error || !listingRes.data) {
    return NextResponse.json({ error: 'Project niet gevonden' }, { status: 404 })
  }

  const listing = listingRes.data
  const units = unitsRes.data ?? []

  // 2. Map naar dossier_data format
  // Plot/kavel extracten uit Idealista raw data — Apify-actor exposes 'plotSize'
  // op top-level item; fallback paths voor andere actor-versies.
  const plotSize =
    listing.details_data?.plotSize ??
    listing.raw_data?.plotSize ??
    listing.details_data?.lotSize ??
    listing.raw_data?.lotSize ??
    listing.details_data?.lotSurface ??
    listing.raw_data?.lotSurface ??
    null

  const propertyData = {
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
    kenmerken: {
      zwembad: listing.has_swimming_pool,
      terras: listing.has_terrace,
      parking: listing.has_parking,
      tuin: listing.has_garden,
      airco: listing.has_air_conditioning,
      lift: listing.has_lift,
    },
    ontwikkelaar: listing.agency_name || '',
    gemeente: listing.municipality || '',
    nearby_amenities: listing.nearby_amenities || null,
  }

  // Units data snapshot
  const unitsData = units.map((u: Record<string, unknown>) => ({
    typology: u.typology || u.sub_typology || 'Onbekend',
    rooms: u.rooms,
    size_m2: u.size_m2,
    price: u.price,
    floor: u.floor,
    is_exterior: u.is_exterior,
    has_terrace: u.has_terrace,
  }))

  // 3. Pitch mode: genereer AI analyse
  let analyse = null
  let pitchContent = null

  if (mode === 'pitch') {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: PITCH_SYSTEM,
        messages: [{
          role: 'user',
          content: `Analyseer dit nieuwbouwproject:\n\n${JSON.stringify(propertyData, null, 2)}\n\nBeschikbare units (${units.length}):\n${JSON.stringify(unitsData.slice(0, 20), null, 2)}\n\nGenereer als JSON:\n{\n  "samenvatting": "2-3 zinnen",\n  "prijsanalyse": "2-3 zinnen over prijsniveau en waarde",\n  "voordelen": ["punt 1", "punt 2", "punt 3"],\n  "nadelen": ["punt 1", "punt 2"],\n  "buurtcontext": "150-250 woorden buurtanalyse",\n  "investering": "investeringspotentieel met concrete unit-prijzen",\n  "advies": "1 alinea Costa Select advies",\n  "juridische_risicos": ["risico 1"],\n  "verhuurpotentieel": "kort oordeel"\n}\n\nGeef ALLEEN de JSON terug.`,
        }],
      })

      const text = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        analyse = {
          samenvatting: parsed.samenvatting || '',
          prijsanalyse: parsed.prijsanalyse || '',
          sterke_punten: parsed.voordelen || [],
          aandachtspunten: parsed.nadelen || [],
          juridische_risicos: parsed.juridische_risicos || [],
          verhuurpotentieel: parsed.verhuurpotentieel || '',
          advies_consultant: parsed.advies || '',
        }
        pitchContent = {
          voordelen: parsed.voordelen || [],
          nadelen: parsed.nadelen || [],
          buurtcontext: parsed.buurtcontext || '',
          investering: parsed.investering || '',
          advies: parsed.advies || '',
        }
      }
    } catch (err) {
      console.error('Pitch generation failed:', err)
    }
  }

  const dossierResult = {
    property: propertyData,
    regioInfo: '',
    brochure_type: mode || 'presentatie',
    ...(analyse ? { analyse } : {}),
    ...(pitchContent ? { pitch_content: pitchContent } : {}),
    generatedAt: new Date().toISOString(),
  }

  // 4. Sla op in Dashboard Supabase (eerst zonder storage-fotos)
  const { data: dossier, error } = await dashboard.from('dossier_history').insert({
    adres: propertyData.adres,
    regio: propertyData.regio,
    type: propertyData.type,
    vraagprijs: propertyData.vraagprijs,
    url: propertyData.url,
    dossier_data: dossierResult,
    brochure_type: mode || 'presentatie',
    source: 'idealista_newbuild',
    bots_listing_id: listing_id,
    units_data: unitsData,
    created_by: auth.id,
    ...(pitchContent ? { pitch_content: pitchContent, pitch_generated_at: new Date().toISOString() } : {}),
  }).select('id').single()

  if (error) {
    console.error('Save dossier failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 5. Download foto's naar Supabase Storage (voor PDF-generatie)
  const originalFotos = propertyData.fotos || []
  if (originalFotos.length > 0) {
    const storedFotos = await downloadAndStorePhotos(originalFotos, dossier.id)
    // Update dossier_data met storage URLs
    dossierResult.property.fotos = storedFotos
    await dashboard.from('dossier_history').update({
      dossier_data: dossierResult,
    }).eq('id', dossier.id)
  }

  return NextResponse.json({ id: dossier.id, dossier_data: dossierResult, units_data: unitsData })
}
