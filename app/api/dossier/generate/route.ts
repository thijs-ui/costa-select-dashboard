import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { docs } from '@/lib/kennisbank-docs'

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
  // Try exact match first
  let slug = REGIO_TO_SLUG[regio]

  // Try partial match
  if (!slug) {
    const regioLower = regio.toLowerCase()
    for (const [key, val] of Object.entries(REGIO_TO_SLUG)) {
      if (key.toLowerCase().includes(regioLower) || regioLower.includes(key.toLowerCase())) {
        slug = val
        break
      }
    }
  }

  // Try from docs list
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
    // Clean up mammoth artifacts and limit to first 2000 chars for Claude context
    return content
      .replace(/<a id="[^"]*"><\/a>/g, '')
      .replace(/\\\./g, '.')
      .replace(/\\\-/g, '-')
      .substring(0, 2000)
  } catch {
    return ''
  }
}

export async function POST(request: Request) {
  const body = await request.json()

  const {
    mode, // 'url' | 'manual'
    url,
    adres,
    regio,
    type,
    vraagprijs,
    oppervlakte,
    slaapkamers,
    badkamers,
    omschrijving,
    fotos,
  } = body

  let propertyData: Record<string, unknown>

  if (mode === 'url' && url) {
    // Fetch property via woningbot lookup API (direct, no AI)
    try {
      const woningbotUrl = process.env.WONINGBOT_API_URL || 'http://localhost:3001'
      const woningbotKey = process.env.WONINGBOT_API_KEY || ''

      const res = await fetch(`${woningbotUrl}/api/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': woningbotKey,
        },
        body: JSON.stringify({ url }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Lookup failed')
      }

      const prop = await res.json()

      propertyData = {
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
    } catch (err) {
      console.error('Property lookup failed:', err)
      return NextResponse.json(
        { error: 'Kon de woning niet ophalen via de URL. Probeer handmatige invoer.' },
        { status: 400 }
      )
    }
  } else {
    propertyData = {
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

  // Get regio content from kennisbank
  const regioContent = getRegioContent(String(propertyData.regio))

  // Claude analysis
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
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Je bent een senior vastgoedadviseur bij Costa Select, een Nederlandse aankoopmakelaar in Spanje.

Genereer een professionele analyse voor dit object voor een Nederlandse klant.
Schrijf in het Nederlands. Toon: informatief, helder, eerlijk — geen verkooppraatjes.

OBJECT:
${JSON.stringify(propertyData, null, 2)}

${regioContent ? `REGIO-INFORMATIE:\n${regioContent}\n` : ''}

Geef terug als JSON:
{
  "samenvatting": "2-3 zinnen objectieve samenvatting",
  "prijsanalyse": "Analyse van de prijs t.o.v. de markt (2-3 zinnen)",
  "sterke_punten": ["punt 1", "punt 2", "punt 3"],
  "aandachtspunten": ["punt 1", "punt 2"],
  "juridische_risicos": ["risico 1", "risico 2"],
  "verhuurpotentieel": "Kort oordeel over verhuurmogelijkheden",
  "advies_consultant": "1 alinea advies voor de consultant"
}

Geef ALLEEN de JSON terug, geen andere tekst.`
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      analyse = JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error('Claude analysis failed:', err)
    analyse.samenvatting = 'Analyse kon niet worden gegenereerd. Probeer het opnieuw.'
    analyse.advies_consultant = 'De AI-analyse is niet beschikbaar. Beoordeel het object handmatig.'
  }

  return NextResponse.json({
    property: propertyData,
    regioInfo: regioContent ? regioContent.substring(0, 500) : 'Geen regio-informatie beschikbaar.',
    analyse,
    generatedAt: new Date().toISOString(),
  })
}
