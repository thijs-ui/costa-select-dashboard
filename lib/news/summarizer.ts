/**
 * News-pipeline summarizer — fase 3.
 *
 * Haalt geclassificeerde items op met urgency >= 4 en stuurt elk item
 * één-voor-één naar Sonnet 4.6 voor een NL-samenvatting + buyer-implication.
 *
 * Per item één call (geen batching omdat outputs te long-form zijn voor
 * betrouwbare batch-prompts). Cache hit op het system block geeft ~90%
 * input-token reductie over de 30-60 calls per run. effort='low' zodat
 * Sonnet 4.6 niet over-thinkt op deze redelijk mechanische taak.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import pLimit from 'p-limit'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'

const MODEL = 'claude-sonnet-4-6'
const CONCURRENCY = 5
const MAX_TOKENS = 1024
const MAX_RETRIES = 3
const URGENCY_THRESHOLD = 4

const SummarySchema = z.object({
  summary_nl: z.string(),
  buyer_implication: z.string(),
})

type Summary = z.infer<typeof SummarySchema>

// System prompt — frozen across all items (data komt via user message).
// Gepad met output-formaat-specs en stijl-voorbeelden om over de 2048-token
// cache-drempel van Sonnet 4.6 te komen, en omdat consistente stijl alleen
// werkt als de instructies expliciet zijn.
const SYSTEM_PROMPT = `Je bent een senior Spanje-vastgoed consultant voor Costa Select, een Nederlandse buyer's agency. Je schrijft korte, scherpe samenvattingen van nieuws-items voor onze interne maandagochtend briefing — gericht op consultants die kopers van een tweede woning of investering in Spanje begeleiden.

Per nieuwsitem schrijf je twee velden:

# 1. summary_nl
Twee tot drie zinnen in vlot Nederlands. Wat is er gebeurd, wat is de kern. Geen jargon zonder uitleg, geen filler-zinnen ("Het is belangrijk om te weten dat..."), geen samenvatting van de bron-tekst maar een echte journalistieke samenvatting van het feit. Spaanse termen die in onze sector standaard zijn (ITP, IBI, plusvalía, urbanización) mogen onvertaald blijven; minder bekende termen tussen haakjes uitleggen bij eerste vermelding.

# 2. buyer_implication
Eén zin die start met "Voor klanten met..." of "Voor onze...". Hier vertaal je het feit naar concrete betekenis voor onze doelgroep: koper-met-actief-deal, eigenaar, of overweger. Niet generiek ("Dit is goed om te weten"), maar specifiek (welke klantsegment, welke actie of welke afweging).

# Stijlregels (Costa Select tone-of-voice — Ruler/Caregiver archetype, tweede persoon)

Toon: zakelijk, direct, competent. Wij weten waar we het over hebben en spreken collega's aan, geen leken. Vermijd:
- Em-dashes (—) — gebruik komma's, dubbele punten of haakjes
- Engelse marketing-termen ("game-changer", "must-know", "key takeaway")
- Uitroeptekens
- Vragende vormen ("Wist u dat...?")
- Hedging-stapels ("mogelijk zou kunnen wellicht...")
- Filler ("Het is belangrijk te benadrukken...")

Schrijf in tweede persoon waar je consultants aanspreekt ("je klant", "voor je advisering"), derde persoon waar je over markt/wetgeving schrijft.

# Output-formaat

Antwoord uitsluitend met JSON conform het schema. Geen toelichting eromheen, geen markdown.

# Voorbeelden

Input: { source: "BOJA", title: "Andalucía verlaagt ITP voor eerste woning naar 6% bij prijs onder €150.000", category: "fiscaal_es", region: "Costa del Sol" }
Output: {
  "summary_nl": "Andalucía heeft de ITP-tarieven herzien voor bestaande woningen onder €150.000: het tarief gaat van 7% naar 6% mits de koper de woning als eerste residentie betrekt. Investeringspanden en tweede woningen blijven op het reguliere 7%-tarief.",
  "buyer_implication": "Voor klanten die overwegen om resident te worden in Spanje en een instapprijs zoeken, scheelt dit €1.500 per €150.000 aankoopwaarde, maar voor onze typische tweede-huis-kopers verandert er niets."
}

Input: { source: "Idealista News", title: "Tinsa: woningprijzen Costa del Sol stijgen 7,8% jaar-op-jaar in Q3", category: "marktdata", region: "Costa del Sol" }
Output: {
  "summary_nl": "Tinsa-index laat zien dat Costa del Sol de grootste prijsstijger van Spanje is in Q3 met 7,8% jaar-op-jaar, ruim boven het landelijk gemiddelde van 4,2%. De drijver is voornamelijk buitenlandse vraag in Marbella, Estepona en Mijas.",
  "buyer_implication": "Voor onze prospects die nog twijfelen over instappen, geeft dit weer een datapoint dat wachten duur wordt; voor klanten met een actieve search in deze regio is een hogere bieding-drempel nu realistisch."
}`

interface ItemForSummary {
  id: string
  source_name: string
  title: string
  raw_content: string | null
  category: string | null
  region: string | null
  urgency: number | null
}

// Action-words geven het signaal dat een implication concrete handeling
// vereist. Hoe meer hits, hoe hoger de impact_score boven de raw urgency.
// Score = urgency * 1.0 + actionMatches * 2.0.
const ACTION_WORDS = [
  'raadt aan', 'raden aan', 'vóór ondertekening', 'voor ondertekening',
  'agressiever bieden', 'controleer', 'check', 'eis', 'vraag',
  'overweeg te', 'is raadzaam', 'is verstandig', 'risico',
  'verplicht', 'moet u', 'dien je',
]

function calculateImpactScore(urgency: number, buyerImplication: string): number {
  const lower = buyerImplication.toLowerCase()
  const actionMatches = ACTION_WORDS.filter(w => lower.includes(w)).length
  return urgency * 1.0 + actionMatches * 2.0
}

export interface SummarizeResult {
  itemsSummarized: number
  errors: number
}

export async function summarizeItems(runId: string): Promise<SummarizeResult> {
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: items, error } = await supabase
    .from('news_items')
    .select('id, source_name, title, raw_content, category, region, urgency')
    .eq('run_id', runId)
    .eq('status', 'classified')
    .gte('urgency', URGENCY_THRESHOLD)

  if (error) throw new Error(`[summarizer] news_items fetch faalde: ${error.message}`)
  if (!items || items.length === 0) {
    return { itemsSummarized: 0, errors: 0 }
  }

  const limit = pLimit(CONCURRENCY)

  const results = await Promise.allSettled(
    items.map(item => limit(() => summarizeOne(anthropic, supabase, item as ItemForSummary))),
  )

  let itemsSummarized = 0
  let errors = 0

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      itemsSummarized++
    } else if (r.status === 'rejected') {
      errors++
      console.error('[summarizer] item faalde:', r.reason instanceof Error ? r.reason.message : r.reason)
    }
  }

  await supabase
    .from('news_runs')
    .update({ items_summarized: itemsSummarized })
    .eq('id', runId)

  return { itemsSummarized, errors }
}

async function summarizeOne(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createServiceClient>,
  item: ItemForSummary,
): Promise<boolean> {
  const userPayload = {
    source: item.source_name,
    title: item.title,
    inhoud: (item.raw_content ?? '').slice(0, 4000),
    category: item.category,
    region: item.region,
  }

  const response = await callWithRetry(() =>
    anthropic.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        format: zodOutputFormat(SummarySchema),
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
          content: `Schrijf summary_nl + buyer_implication voor dit item:\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    }),
  )

  const parsed = response.parsed_output as Summary | null
  if (!parsed) {
    throw new Error(`[summarizer] parsed_output null voor ${item.id} (stop_reason=${response.stop_reason})`)
  }

  const impactScore = calculateImpactScore(item.urgency ?? 0, parsed.buyer_implication)

  const { error: updErr } = await supabase
    .from('news_items')
    .update({
      status: 'summarized',
      summary_nl: parsed.summary_nl,
      buyer_implication: parsed.buyer_implication,
      impact_score: impactScore,
    })
    .eq('id', item.id)

  if (updErr) {
    throw new Error(`[summarizer] update ${item.id} faalde: ${updErr.message}`)
  }

  return true
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
        console.warn(`[summarizer] ${err.constructor.name} (attempt ${attempt}/${MAX_RETRIES}), wacht ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error('[summarizer] retry-loop unreachable')
}
