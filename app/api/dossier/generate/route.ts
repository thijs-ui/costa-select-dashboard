import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { docs } from '@/lib/kennisbank-docs'
import { createServiceClient } from '@/lib/supabase'
import { scrapeCostaSelect, isCostaSelectUrl } from '@/lib/scrapers/costaselect'
import { scrapeIdealista, isIdealistaUrl } from '@/lib/scrapers/idealista'

// Allow longer execution for Apify + Claude calls
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Map regio names to kennisbank slugs
const REGIO_TO_SLUG: Record<string, string> = {
  'Costa Brava': 'CS-012-costa-brava',
  'Costa Dorada': 'CS-013-costa-dorada',
  'Costa de Valencia': 'CS-014-costa-de-valencia',
  'Valencia stad': 'CS-015-valencia-stad',
  'Costa Blanca Noord': 'CS-016-costa-blanca-noord',
  'Costa Blanca Zuid': 'CS-017-costa-blanca-zuid',
  'Costa Cálida': 'CS-018-costa-calida',
  'Costa del Sol': 'CS-019-costa-del-sol',
  'Madrid': 'CS-020-madrid',
  'Barcelona': 'CS-021-barcelona',
  'Málaga': 'CS-022-malaga-sevilla-granada',
  'Costa Tropical': 'CS-023-costa-tropical',
  'Costa de la Luz': 'CS-024-costa-de-la-luz',
  'Balearen': 'CS-025-balearen',
  'Canarische Eilanden': 'CS-026-canarische-eilanden',
}

function getRegioContent(regio: string): string {
  let slug = REGIO_TO_SLUG[regio]

  if (!slug) {
    const regioLower = regio.toLowerCase()
    for (const [key, val] of Object.entries(REGIO_TO_SLUG)) {
      if (key.toLowerCase().includes(regioLower) || regioLower.includes(key.toLowerCase())) {
        slug = val
        break
      }
    }
  }

  if (!slug) {
    const doc = docs.find(d =>
      d.title.toLowerCase().includes(regio.toLowerCase()) ||
      regio.toLowerCase().includes(d.title.toLowerCase())
    )
    if (doc) slug = doc.slug
  }

  if (!slug) return ''

  try {
    const filePath = path.join(process.cwd(), 'content', 'kennisbank', `${slug}.md`)
    const content = fs.readFileSync(filePath, 'utf-8')
    return content
      .replace(/<a id="[^"]*"><\/a>/g, '')
      .replace(/\\\./g, '.')
      .replace(/\\\-/g, '-')
      .substring(0, 2000)
  } catch {
    return ''
  }
}

async function scrapeProperty(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { mode, url, adres, regio, type, vraagprijs, oppervlakte, slaapkamers, badkamers, omschrijving, fotos } = body

  if (mode === 'url' && url) {
    if (isCostaSelectUrl(url as string)) {
      return { ...(await scrapeCostaSelect(url as string)) }
    }
    if (isIdealistaUrl(url as string)) {
      return { ...(await scrapeIdealista(url as string)) }
    }
    // Fallback: Woningbot lookup
    const woningbotUrl = process.env.WONINGBOT_API_URL || 'http://localhost:3001'
    const woningbotKey = process.env.WONINGBOT_API_KEY || ''
    const res = await fetch(`${woningbotUrl}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': woningbotKey },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Lookup failed')
    }
    const prop = await res.json()
    return {
      adres: prop.title || url,
      regio: prop.location || regio || 'Onbekend',
      type: prop.property_type || 'woning',
      vraagprijs: prop.price || 0,
      oppervlakte: prop.size_m2 || 0,
      slaapkamers: prop.bedrooms || 0,
      badkamers: prop.bathrooms || 0,
      omschrijving: prop.description || '',
      fotos: prop.images?.length > 0 ? prop.images : (prop.thumbnail ? [prop.thumbnail] : []),
      url,
    }
  }

  return {
    adres: adres || 'Onbekend adres',
    regio: regio || 'Onbekend',
    type: type || 'woning',
    vraagprijs: Number(vraagprijs) || 0,
    oppervlakte: Number(oppervlakte) || 0,
    slaapkamers: Number(slaapkamers) || 0,
    badkamers: Number(badkamers) || 0,
    omschrijving: omschrijving || '',
    fotos: fotos || [],
  }
}

const PITCH_SYSTEM_PROMPT = `Je bent een ervaren vastgoedconsultant van Costa Select, een Nederlandse aankoopmakelaardij in Spanje. Je analyseert woningen voor klanten die een tweede huis of investering zoeken.

Schrijfstijl:
- Helder, direct, geen overdrijving
- Eerlijk over nadelen — dat bouwt vertrouwen
- Geen woorden als: goedkoop, snel scoren, koopje, no-brainer, fantastisch, perfect, garantie
- Wel woorden als: kwaliteit, doordacht, zorgvuldig, perspectief, waarde
- Schrijf in jij-vorm richting de koper
- Eén gedachte per zin, geen bijzinnen bij bijzinnen
- Schrijf in het Nederlands`

export async function POST(request: Request) {
  const body = await request.json()
  const brochureType: 'presentatie' | 'pitch' = body.brochure_type || 'pitch'

  let propertyData: Record<string, unknown>
  try {
    propertyData = await scrapeProperty(body)
  } catch (err) {
    console.error('Property lookup failed:', err)
    return NextResponse.json(
      { error: 'Kon de woning niet ophalen via de URL. Probeer handmatige invoer.' },
      { status: 400 }
    )
  }

  const regioContent = getRegioContent(String(propertyData.regio))

  // Presentatie-modus: alleen feitelijke data, geen AI
  if (brochureType === 'presentatie') {
    const dossierResult = {
      property: propertyData,
      regioInfo: regioContent ? regioContent.substring(0, 500) : '',
      brochure_type: 'presentatie' as const,
      generatedAt: new Date().toISOString(),
    }

    // Save to history
    try {
      const supabase = createServiceClient()
      await supabase.from('dossier_history').insert({
        adres: String(propertyData.adres || 'Onbekend'),
        regio: String(propertyData.regio || ''),
        type: String(propertyData.type || ''),
        vraagprijs: Number(propertyData.vraagprijs) || 0,
        url: String(propertyData.url || ''),
        dossier_data: dossierResult,
        brochure_type: 'presentatie',
      })
    } catch (err) {
      console.error('Failed to save dossier to history:', err)
    }

    return NextResponse.json(dossierResult)
  }

  // Pitch-modus: scrapen + Claude analyse
  let aiRegioInfo = ''
  let pitchContent = {
    voordelen: [] as string[],
    nadelen: [] as string[],
    buurtcontext: '',
    investering: '',
    advies: '',
  }

  // Bestaande analyse (voor backwards compatibility met bestaande dossiers)
  let analyse = {
    samenvatting: '',
    prijsanalyse: '',
    sterke_punten: [] as string[],
    aandachtspunten: [] as string[],
    juridische_risicos: [] as string[],
    verhuurpotentieel: '',
    advies_consultant: '',
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: PITCH_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyseer deze woning en genereer een pitch-rapport.

WONINGDATA:
${JSON.stringify(propertyData, null, 2)}

${regioContent ? `REGIO-INFORMATIE UIT ONZE DATABASE:\n${regioContent}\n` : `Let op: we hebben geen regio-informatie in onze database voor "${propertyData.regio}". Gebruik je eigen kennis over deze locatie in Spanje om de buurtcontext te schrijven. Wees transparant als je over het bredere gebied schrijft.\n`}

Genereer de volgende secties:

1. VOORDELEN (3-5 bullet points, concreet en specifiek aan deze woning)
2. NADELEN / AANDACHTSPUNTEN (2-4 bullet points, eerlijk en specifiek)
3. BUURTCONTEXT — Schrijf een uitgebreide buurtanalyse van minimaal 150 woorden en maximaal 250 woorden. Behandel:
   - KARAKTER VAN DE BUURT: Wat voor type wijk? Residentieel, toeristisch, gemengd? Welk type bewoners (lokaal Spaans, expats, gepensioneerden, gezinnen)?
   - VOORZIENINGEN: Wat is er op loopafstand? Supermarkt, restaurants, strand, haven, scholen, medische voorzieningen. Noem afstanden in minuten waar mogelijk.
   - BEREIKBAARHEID: Afstand tot luchthaven, snelweg. Hoe bereikbaar voor iemand uit Nederland/België?
   - ONTWIKKELING: Hoe ontwikkelt de buurt zich? Nieuwbouwprojecten? Prijstrend?
   - VOOR WIE GESCHIKT: Welk type koper past bij deze buurt?
   Schrijf als een lokale expert, niet als iemand die Wikipedia heeft gelezen. Gebruik concrete details.
4. INVESTERINGSPOTENTIEEL (geschatte huurinkomsten, yield, touristenverhuur — als er genoeg data is, anders lege string)
5. COSTA SELECT ADVIES (1 alinea: voor wie geschikt, waarom wel/niet aanbevelen)

Geef ook een samenvatting, prijsanalyse en regio-informatie.

Geef terug als JSON:
{
  "samenvatting": "2-3 zinnen objectieve samenvatting",
  "prijsanalyse": "Analyse van de prijs t.o.v. de markt (2-3 zinnen)",
  "voordelen": ["punt 1", "punt 2", "punt 3"],
  "nadelen": ["punt 1", "punt 2"],
  "buurtcontext": "150-250 woorden uitgebreide buurtanalyse",
  "investering": "Kort oordeel over investeringspotentieel (of lege string)",
  "regio_info": "3-5 zinnen over de regio waar deze woning zich bevindt",
  "advies": "1 alinea Costa Select advies",
  "juridische_risicos": ["risico 1", "risico 2"],
  "verhuurpotentieel": "Kort oordeel over verhuurmogelijkheden"
}

Geef ALLEEN de JSON terug, geen andere tekst.`
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      pitchContent = {
        voordelen: parsed.voordelen || [],
        nadelen: parsed.nadelen || [],
        buurtcontext: parsed.buurtcontext || '',
        investering: parsed.investering || '',
        advies: parsed.advies || '',
      }
      analyse = {
        samenvatting: parsed.samenvatting || '',
        prijsanalyse: parsed.prijsanalyse || '',
        sterke_punten: parsed.voordelen || [],
        aandachtspunten: parsed.nadelen || [],
        juridische_risicos: parsed.juridische_risicos || [],
        verhuurpotentieel: parsed.verhuurpotentieel || '',
        advies_consultant: parsed.advies || '',
      }
      // AI-gegenereerde regio-info als fallback
      if (!regioContent && parsed.regio_info) {
        aiRegioInfo = parsed.regio_info
      }
    }
  } catch (err) {
    console.error('Claude analysis failed:', err)
    analyse.samenvatting = 'Analyse kon niet worden gegenereerd. Probeer het opnieuw.'
    analyse.advies_consultant = 'De AI-analyse is niet beschikbaar. Beoordeel het object handmatig.'
  }

  const dossierResult = {
    property: propertyData,
    regioInfo: regioContent ? regioContent.substring(0, 500) : aiRegioInfo,
    analyse,
    pitch_content: pitchContent,
    brochure_type: 'pitch' as const,
    generatedAt: new Date().toISOString(),
  }

  // Save to history
  try {
    const supabase = createServiceClient()
    await supabase.from('dossier_history').insert({
      adres: String(propertyData.adres || 'Onbekend'),
      regio: String(propertyData.regio || ''),
      type: String(propertyData.type || ''),
      vraagprijs: Number(propertyData.vraagprijs) || 0,
      url: String(propertyData.url || ''),
      dossier_data: dossierResult,
      brochure_type: 'pitch',
      pitch_content: pitchContent,
      pitch_generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Failed to save dossier to history:', err)
  }

  return NextResponse.json(dossierResult)
}
