// Genereert de 3 Claude-aangedreven copy-velden per listing:
//   - primary_text_simple   (volgt CS-MKT-004 letterlijk)
//   - primary_text_variant  (zelfde feiten, andere lifestyle-opening)
//   - creative_description  (1 zin op de visual zelf)
//
// CS-MKT-004 wordt live uit kb_chunks gehaald — geen hardcoded copy in
// source zodat updates aan de doc automatisch doorwerken.

import Anthropic from '@anthropic-ai/sdk'
import type { BotsListing } from './bots-query'
import { createServiceClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Sonnet 4.6 is de huidige Claude — actueler dan de in de spec genoemde
// 4-20250514 build. Override-baar via env voor experimenten.
const CLAUDE_MODEL = process.env.MARKETING_CLAUDE_MODEL ?? 'claude-sonnet-4-6'

const MAX_RETRIES = 2
const PRIMARY_TEXT_MIN = 180
// Variant trof 363-374 chars op de 360-grens. Bumped naar 400 zodat we
// kosten-efficiënt blijven (geen 4e poging) en de lifestyle-opener
// volledig de ruimte krijgt.
const PRIMARY_TEXT_MAX = 400

// creative_description: 1-3 zinnen totaal, max 6 woorden TOTAAL,
// max 20 chars per zin. Geen leestekens binnen een zin.
const CREATIVE_DESC_MAX_SENTENCES = 3
const CREATIVE_DESC_MAX_TOTAL_WORDS = 6
const CREATIVE_DESC_MAX_CHARS_PER_SENTENCE = 20

interface CreativeDescIssue {
  message: string
}

function validateCreativeDescription(s: string): CreativeDescIssue | null {
  const sentences = s.split(/\.\s*/).map(x => x.trim()).filter(Boolean)
  if (sentences.length === 0) {
    return { message: 'creative_description is leeg' }
  }
  if (sentences.length > CREATIVE_DESC_MAX_SENTENCES) {
    return { message: `creative_description heeft ${sentences.length} zinnen (max ${CREATIVE_DESC_MAX_SENTENCES})` }
  }
  let totalWords = 0
  for (const sent of sentences) {
    if (sent.length > CREATIVE_DESC_MAX_CHARS_PER_SENTENCE) {
      return { message: `zin '${sent}' is ${sent.length} chars (max ${CREATIVE_DESC_MAX_CHARS_PER_SENTENCE})` }
    }
    if (/[,;:!?]/.test(sent)) {
      return { message: `zin '${sent}' bevat verboden leesteken (alleen slot-punt)` }
    }
    totalWords += sent.split(/\s+/).filter(Boolean).length
  }
  if (totalWords > CREATIVE_DESC_MAX_TOTAL_WORDS) {
    return { message: `creative_description heeft ${totalWords} woorden totaal (max ${CREATIVE_DESC_MAX_TOTAL_WORDS})` }
  }
  return null
}

export interface ClaudeOutput {
  primary_text_simple: string
  primary_text_variant: string
  creative_description: string
}

/**
 * Haal CS-MKT-004 live op uit kb_chunks. Concat alle chunks op
 * chunk_index zodat een doc met meerdere chunks ook werkt.
 */
async function fetchCsMkt004(): Promise<string> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('kb_chunks')
    .select('content, chunk_index')
    .eq('doc_code', 'CS-MKT-004')
    .order('chunk_index', { ascending: true })

  if (error) {
    throw new Error(`CS-MKT-004 fetch faalde: ${error.message}`)
  }
  if (!data || data.length === 0) {
    throw new Error(
      'CS-MKT-004 niet gevonden in kb_chunks — importeer het document eerst.',
    )
  }
  return data.map(c => c.content as string).join('\n\n')
}

interface AnthropicTextBlock { type: 'text'; text: string }

function extractText(content: Array<{ type: string }>): string {
  return content
    .filter((b): b is AnthropicTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}

/**
 * Genereer copy voor één listing. Retried automatisch (tot MAX_RETRIES+1
 * pogingen) als de output niet parseerbaar is of buiten de char-limieten valt.
 */
export async function generateAdCopy(listing: BotsListing): Promise<ClaudeOutput> {
  const csMkt004 = await fetchCsMkt004()

  const systemPrompt = `Je bent de marketing copywriter van Costa Select. Je schrijft Facebook ad copy voor nieuwbouwprojecten in Spanje, gericht op Nederlandstalige kopers van 35-54 jaar.

Tone of voice: Ruler (autoriteit, betrouwbaarheid) + Caregiver (zorgzaam, ontzorgend).

VASTE FORMULE EN VOORBEELDEN (CS-MKT-004):
${csMkt004}

REGELS:
- Schrijf in het Nederlands
- GEEN industry jargon (BREEAM, energielabels, EPC, EBL)
- GEEN vage marketingclaims ("uniek", "exclusief", "kans van een leven", "nu of nooit", "gegarandeerd rendement")
- WEL concrete cijfers en feiten (aantal woningen, slaapkamers, afstand tot voorzieningen)
- Vaste afsluiter: "Costa Select zorgt voor een zorgeloze begeleiding van begin tot eind."
- Vaste CTA-stijl met emoji: "🌅 [Concrete actie]"

JE GENEREERT 3 OUTPUTS:

1. **primary_text_simple**: Volg CS-MKT-004 letterlijk. 4 regels (volume+type / kenmerken+bereikbaarheid / CS-positionering / CTA). Tussen ${PRIMARY_TEXT_MIN}-${PRIMARY_TEXT_MAX} karakters.

2. **primary_text_variant**: Zelfde feiten en structuur, maar met een ANDERE openingshook. In plaats van feitelijk-eerst (zoals simpel) gebruik je een lifestyle/emotionele opening (bv. "Wakker worden met uitzicht op...", "Stel je voor: ochtenden op je terras..."). Eindig wel met dezelfde CS-positionering en CTA. Tussen ${PRIMARY_TEXT_MIN}-${PRIMARY_TEXT_MAX} karakters.

3. **creative_description**: ZEER KORTE staccato-zinnen voor op de visual zelf. STRIKT FORMAT:
   - 1 tot ${CREATIVE_DESC_MAX_SENTENCES} zinnen, gescheiden door een punt + spatie ("Zin een. Zin twee. Zin drie.")
   - MAXIMAAL ${CREATIVE_DESC_MAX_TOTAL_WORDS} WOORDEN TOTAAL over alle zinnen samen
   - Per zin MAXIMAAL ${CREATIVE_DESC_MAX_CHARS_PER_SENTENCE} karakters (incl. spaties, excl. de slot-punt)
   - Geen komma's of andere leestekens binnen een zin (alleen de slot-punt)
   - Geen project-naam of plaatsnaam in de description (die staan elders op de visual)
   - Uppercase niet nodig — Canva-template doet dat zelf
   Goede voorbeelden:
     "Moderne villa. Zeezicht. Privétuin."        (5 woorden, 3 zinnen)
     "Stylische appartementen. Nieuwbouw."        (3 woorden, 2 zinnen)
     "Zwembad. Aan golfbaan. Met zicht."          (5 woorden, 3 zinnen)
     "Mediterraan wonen. Op golfbaan. Modern."    (5 woorden, 3 zinnen)
   Foute voorbeelden:
     "Moderne villa met grote tuin in Algorfa."   ← te lang + plaatsnaam
     "Modern, ruim, licht. Privétuin. Garage."    ← komma's verboden
     "Zes appartementen. Zwembad. Tuin. Garage."  ← 4 zinnen + 7 woorden
     "La Finca Golf. Modern. Ruim."               ← project-naam verboden

Output STRIKT als JSON, geen extra tekst, geen markdown fences:
{
  "primary_text_simple": "...",
  "primary_text_variant": "...",
  "creative_description": "..."
}`

  const projectData = {
    name: listing.project_name,
    city: listing.city,
    region: listing.region,
    price_from_eur: listing.price_from,
    bedrooms: listing.bedrooms,
    type: listing.property_type,
    description_excerpt: listing.description?.slice(0, 1500),
  }

  const errors: string[] = []

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Project data:\n${JSON.stringify(projectData, null, 2)}\n\nGenereer de 3 outputs.`,
      }],
    })

    const text = extractText(response.content as Array<{ type: string }>)

    let parsed: ClaudeOutput
    try {
      const cleaned = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned) as ClaudeOutput
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'parse error'
      if (attempt > MAX_RETRIES) {
        throw new Error(
          `Claude output niet parseerbaar als JSON na ${MAX_RETRIES + 1} pogingen (${reason}): ${text.slice(0, 200)}`,
        )
      }
      continue
    }

    const validation: string[] = []
    if (typeof parsed.primary_text_simple !== 'string' ||
        parsed.primary_text_simple.length < PRIMARY_TEXT_MIN ||
        parsed.primary_text_simple.length > PRIMARY_TEXT_MAX) {
      validation.push(`primary_text_simple lengte ${parsed.primary_text_simple?.length ?? 'n/a'} buiten ${PRIMARY_TEXT_MIN}-${PRIMARY_TEXT_MAX}`)
    }
    if (typeof parsed.primary_text_variant !== 'string' ||
        parsed.primary_text_variant.length < PRIMARY_TEXT_MIN ||
        parsed.primary_text_variant.length > PRIMARY_TEXT_MAX) {
      validation.push(`primary_text_variant lengte ${parsed.primary_text_variant?.length ?? 'n/a'} buiten ${PRIMARY_TEXT_MIN}-${PRIMARY_TEXT_MAX}`)
    }
    if (typeof parsed.creative_description !== 'string') {
      validation.push('creative_description ontbreekt of is geen string')
    } else {
      const descIssue = validateCreativeDescription(parsed.creative_description)
      if (descIssue) validation.push(descIssue.message)
    }

    if (validation.length === 0) {
      return parsed
    }

    errors.push(`poging ${attempt}: ${validation.join(' · ')}`)
    if (attempt > MAX_RETRIES) {
      throw new Error(
        `Validatie faalde na ${MAX_RETRIES + 1} pogingen: ${errors.join(' | ')}`,
      )
    }
  }

  // Onbereikbaar — TS happy
  throw new Error('copy-generator: onbereikbare staat')
}
