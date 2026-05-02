/**
 * News-pipeline newsletter generator — fase 4 (3-concept versie).
 *
 * Pakt top 10 items op impact_score uit een run en laat Sonnet 4.6 ÉÉN
 * onderwerp kiezen waar drie verschillende klant-newsletter concepten over
 * geschreven worden (informatief / alarmerend / kans-georiënteerd).
 *
 * Output gaat in-memory naar de Slack-laag en wordt naar #marketing-ideeën
 * gepost — niet in DB opgeslagen om schema-overhead te voorkomen (kan later
 * via een newsletter_concepts tabel als we historie willen).
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { PIPELINE_CONFIG } from '@/lib/news/config'

const MODEL = PIPELINE_CONFIG.models.newsletter
const MAX_TOKENS = 4096
const TOP_N = 10
const MAX_RETRIES = 3

const ConceptSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

const NewsletterSchema = z.object({
  selected_item_id: z.string(),
  selected_topic_reasoning: z.string(),
  concepts: z.object({
    informatief: ConceptSchema,
    alarmerend: ConceptSchema,
    kans: ConceptSchema,
  }),
})

export type NewsletterConcepts = z.infer<typeof NewsletterSchema>

export interface NewsletterResult {
  selectedItem: {
    id: string
    title: string
    url: string | null
    source_name: string
  } | null
  selectedTopicReasoning: string
  concepts: NewsletterConcepts['concepts']
}

const SYSTEM_PROMPT = `Je bent een senior content-strateeg voor Costa Select, een Nederlandse buyer's agency voor Spaans vastgoed.

# Taak

Je krijgt de top 10 items van deze week (gesorteerd op impact_score). Je doet twee dingen:

1. SELECTEER het ENE item met de meeste klant-impact dat zich het beste leent voor een nieuwsbrief. Niet noodzakelijk het hoogste impact_score-item — kies wat onze Nederlandse/Belgische klanten het meest raakt en thematisch het sterkst is voor brede klant-communicatie.

2. SCHRIJF DRIE newsletter-concepten over dat ENE onderwerp, in drie verschillende tones. Allemaal voor dezelfde feiten, alleen anders gekaderd.

# De drie concepten

## Concept 1 — INFORMATIEF & FEITELIJK
Rustige analyse-tone, getallen-gedreven. Voor klanten die feiten willen zonder framing. Toon: neutraal, journalistiek, zoals een goede sectoranalist.

## Concept 2 — DIRECT & ALARMEREND
Urgentie-tone, "wat dit voor u betekent". Voor klanten die duidelijke signalen willen. Toon: alert, actie-georiënteerd, maar zonder paniek of marketingtaal. Geen uitroeptekens, geen "DRINGEND".

## Concept 3 — KANS-GEORIËNTEERD
Optimistische framing, "hier ligt een kans". Voor klanten die actief en vooruitkijkend zijn. Toon: nuchter-positief, mogelijkheden-georiënteerd, niet over-enthousiast.

# Stijlregels (alle drie de concepten)

- Lengte: 200-300 woorden body
- Eigen subject line per concept (max 60 tekens, scanbaar)
- Opening: "Beste [voornaam],"
- Sluiting: "Met hartelijke groet,\\n\\n[ondertekenaar]"
- Tweede persoon ("u"). Niet "je".
- Platte tekst, klaar voor Outlook. GEEN markdown, GEEN bullets met sterretjes, GEEN headings met hekjes.
- Alinea's gescheiden door dubbele newlines.
- Spaanse termen die in onze sector standaard zijn (ITP, IBI, plusvalía, urbanización) mogen onvertaald.
- Geen em-dashes (—). Gebruik komma's, dubbele punten of haakjes.
- Geen Engelse marketing-termen.
- Geen vragende vorm.
- Geen filler ("Het is belangrijk te benadrukken..."). Begin de zin gewoon met de informatie.
- Geen uitroeptekens.

# selected_topic_reasoning

Maximaal 50 woorden. Interne motivatie waarom je dit onderwerp koos uit de 10 — niet voor de klant. Eerlijk over wat je liet vallen en waarom dit het sterkst is voor brede klant-communicatie.

# Output

JSON conform het schema. selected_item_id is de exacte i-string van het gekozen item uit de input.`

export async function generateNewsletter(runId: string): Promise<NewsletterResult | null> {
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: items, error } = await supabase
    .from('news_items')
    .select('id, title, source_name, url, summary_nl, buyer_implication, category, region, urgency, impact_score, audience_invest')
    .eq('run_id', runId)
    .eq('status', 'summarized')
    .order('impact_score', { ascending: false, nullsFirst: false })
    .limit(TOP_N)

  if (error) throw new Error(`[newsletter] fetch faalde: ${error.message}`)
  if (!items || items.length === 0) return null

  const userPayload = items.map(i => ({
    i: i.id,
    titel: i.title,
    samenvatting: i.summary_nl,
    klant_implicatie: i.buyer_implication,
    bron: i.source_name,
    categorie: i.category,
    region: i.region,
    urgency: i.urgency,
    impact_score: i.impact_score,
    audience_invest: i.audience_invest,
  }))

  const response = await callWithRetry(() =>
    anthropic.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        format: zodOutputFormat(NewsletterSchema),
        effort: 'low',
      },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Top ${items.length} items van deze week:\n\n${JSON.stringify(userPayload, null, 2)}\n\nKies één onderwerp en schrijf drie concepten.`,
        },
      ],
    }),
  )

  const parsed = response.parsed_output as NewsletterConcepts | null
  if (!parsed) {
    throw new Error(`[newsletter] parsed_output null (stop_reason=${response.stop_reason})`)
  }

  const selectedItem = items.find(i => i.id === parsed.selected_item_id) ?? null
  return {
    selectedItem: selectedItem
      ? {
          id: selectedItem.id,
          title: selectedItem.title,
          url: selectedItem.url,
          source_name: selectedItem.source_name,
        }
      : null,
    selectedTopicReasoning: parsed.selected_topic_reasoning,
    concepts: parsed.concepts,
  }
}

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isLast = attempt === MAX_RETRIES
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
        if (isLast) throw err
        const waitMs = 5000 * Math.pow(2, attempt - 1)
        console.warn(`[newsletter] ${err.constructor.name} attempt ${attempt}/${MAX_RETRIES}, wacht ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error('[newsletter] retry-loop unreachable')
}
