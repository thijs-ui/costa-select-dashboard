/**
 * News-pipeline classifier — fase 2.
 *
 * Haalt scraped items op (status='scraped'), batchet ze per 20, en stuurt
 * elke batch naar Haiku 4.5 voor classificatie. Resultaat per item:
 *   - relevant=false → status='archived', geen verdere velden
 *   - relevant=true  → status='classified' + category, region, urgency
 *
 * Gebruikt messages.parse() + Zod-schema voor gegarandeerde JSON-output,
 * cache_control op het system block voor ~30% input-token-reductie over
 * de 5-6 batches per run, en p-limit voor concurrency=5.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import pLimit from 'p-limit'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { KEYWORDS } from '@/lib/news/config'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 20
const CONCURRENCY = 5
const MAX_TOKENS = 8192
const MAX_RETRIES = 3

const CATEGORIES = ['juridisch_es', 'fiscaal_es', 'fiscaal_nl', 'regio', 'marktdata', 'spelers'] as const

const ResultSchema = z.object({
  results: z.array(
    z.object({
      i: z.number().int(),
      relevant: z.boolean(),
      category: z.enum(CATEGORIES).optional(),
      region: z.string().optional(),
      urgency: z.number().int().min(1).max(10).optional(),
    }),
  ),
})

type ClassificationResult = z.infer<typeof ResultSchema>

// Volledige system prompt — bevat instructies, alle keywords per categorie,
// en 3 worked voorbeelden om het model tone + edge-cases te leren én om de
// prompt boven de 4096-token cache-drempel te krijgen (Haiku 4.5 minimum).
// Cache-control plakt op deze hele blob; per-batch verschilt alleen het
// user-message met items, dus elke batch na de eerste is een cache-hit.
const SYSTEM_PROMPT = `Je bent een classificatie-engine voor Costa Select, een Nederlandse buyer's agency voor Spaans vastgoed. Onze doelgroep zijn Nederlandse en Belgische investeerders en kopers van een tweede woning in Spanje, met focus op Costa del Sol, Costa Blanca (Noord en Zuid), Costa Cálida, Mallorca en Ibiza.

Je krijgt een batch nieuwsitems als JSON-array. Per item bepaal je vier velden: relevant, category, region, urgency.

# 1. relevant (boolean, verplicht)

true = relevant voor onze doelgroep — raakt het kopen, bezitten, verhuren, fiscaal behandelen, of waardeontwikkeling van Spaans vastgoed door buitenlandse investeerders.

false = niet relevant. Voorbeelden: politiek nieuws zonder vastgoed-impact, sport, entertainment, regionaal nieuws over schoolfeesten/festivals, criminaliteit zonder vastgoed-context, technologie-nieuws, internationaal niet-vastgoed nieuws, lokale verkiezingen zonder beleidswijziging die vastgoed raakt.

Bij relevant=false vul je ALLEEN de velden i en relevant in. Sla category, region en urgency over.

# 2. category (string-enum, alleen bij relevant=true)

Kies exact één van: juridisch_es, fiscaal_es, fiscaal_nl, regio, marktdata, spelers.

- juridisch_es: Spaanse wetgeving, urbanistische regels, vergunningen, decreten over vakantieverhuur (vivienda turística), okupatie, ruimtelijke plannen (PGOU, LISTA, LOTUP), DAFO/SAFO-regularisatie, bouwvergunningen, status fuera de ordenación, suelo rústico/urbanizable, Ley de Vivienda
- fiscaal_es: Spaanse belastingen die buitenlanders raken — ITP (transmisión patrimonial), AJD (zegelrecht), IVA op nieuwbouw, IRNR (no residentes), modelo 210, modelo 720, vermogensbelasting (impuesto patrimonio + impuesto solidaridad), plusvalía municipal, IBI, Beckham-regime
- fiscaal_nl: Nederlandse fiscale regels die Spaans tweede-huis bezit raken — Box 3 vermogensrendement, werkelijk rendement, hypotheekrenteaftrek voor buitenlandse woningen, schenk- en erfbelasting bij grensoverschrijdend vastgoed, progressievoorbehoud verdragstoepassing
- regio: regio-ontwikkelingen — nieuwe infrastructuur (AVE, AP-7, A-7, luchthavens, metrolijnen), grote nieuwbouw-promociones, hotel/resort-openingen door luxe-merken (Four Seasons, Mandarin Oriental, Six Senses, W, Rosewood, Aman, Soho House), specifieke gemeentes en kuststrook-nieuws
- marktdata: prijsindices (Tinsa IMIE, Sociedad de Tasación), transactievolumes, vraag-aanbod-data, hypotheek-tarieven en ECB/euríbor-bewegingen, koop door buitenlanders (extranjeros vivienda), portal-data van Idealista en Fotocasa, INE-statistieken
- spelers: nieuws over ontwikkelaars (AEDAS, Metrovacesa, Insur, Taylor Wimpey, Neinor, Aedas Homes, Vía Célere), private-equity en vastgoed-fondsen (Blackstone, Cerberus, Azora, KKR), luxe-makelaars (Engel & Völkers, Lucas Fox, Knight Frank, Savills, Sotheby's, Christie's), fusies en acquisities

# 3. region (string, alleen bij relevant=true)

Vrije tekst. Houd kort en consistent. Voorbeelden van goede waarden:
- "Costa del Sol", "Costa Blanca Noord", "Costa Blanca Zuid", "Costa Cálida", "Mallorca", "Ibiza" — voor regio-specifiek nieuws
- "Marbella", "Estepona", "Jávea" — als één gemeente specifiek genoemd wordt
- "Spanje (nationaal)" — voor landelijke wetgeving of fiscaal nieuws
- "Comunidad Valenciana", "Andalucía" — voor autonome-regio-niveau
- "Nederland" — voor fiscaal_nl items
- "Onbekend" — als geen regio-info te halen is

# 4. urgency (integer 1-10, alleen bij relevant=true)

Kalibreer streng. Standaard is een item een 4 of 5; gebruik 8+ alleen als consultants het écht nu moeten weten.

- 1-3: marginale relevantie, achtergrond-informatie of zeer indirect
- 4-5: goed om te weten, niet urgent
- 6-7: consultants moeten dit weten, raakt advisering richting klanten
- 8-9: raakt actieve klantdeals direct, mogelijk juridische of financiële impact
- 10: alarm — wetswijziging die NU klant-impact heeft, marktshock, grote speler valt om

# Keyword-referentie (voor jouw context, niet om mechanisch te matchen)

juridisch_es: ${KEYWORDS.juridisch_es.join(', ')}
fiscaal_es: ${KEYWORDS.fiscaal_es.join(', ')}
fiscaal_nl: ${KEYWORDS.fiscaal_nl.join(', ')}
regio: ${KEYWORDS.regio.join(', ')}
marktdata: ${KEYWORDS.marktdata.join(', ')}
spelers: ${KEYWORDS.spelers.join(', ')}

# Voorbeelden

Voorbeeld 1 — hoge urgency (juridisch met directe deal-impact):
Input: { "i": 1, "title": "Junta de Andalucía publica decreto que limita licencias turísticas en Marbella, Estepona y Mijas", "source": "boja", "matched_keywords": ["licencia turística", "Marbella", "Estepona", "Mijas"] }
Output: { "i": 1, "relevant": true, "category": "juridisch_es", "region": "Costa del Sol", "urgency": 9 }
Reden: nieuwe restrictie op vakantieverhuur in drie kerngemeentes — raakt actieve klanten met verhuur-investering plannen direct.

Voorbeeld 2 — middel urgency (marktdata achtergrond):
Input: { "i": 2, "title": "Tinsa: Spaanse woningprijzen stijgen 4,2% jaar-op-jaar in Q3", "source": "elconfidencial_vivienda", "matched_keywords": ["Tinsa", "precio vivienda"] }
Output: { "i": 2, "relevant": true, "category": "marktdata", "region": "Spanje (nationaal)", "urgency": 5 }
Reden: nuttige marktdata voor advies, geen acute deal-impact.

Voorbeeld 3 — niet relevant:
Input: { "i": 3, "title": "Real Madrid wint Champions League finale tegen Manchester City", "source": "diariosur", "matched_keywords": [] }
Output: { "i": 3, "relevant": false }
Reden: sport, geen vastgoed-relatie.

# Output-formaat

Antwoord uitsluitend met JSON conform het schema. Eén results-array, één entry per input-item, in dezelfde volgorde, met de meegestuurde i als identifier. Bij relevant=false alleen i + relevant; alle andere velden weglaten.`

interface ItemForClassification {
  id: string
  title: string
  source_name: string
  matched_keywords: string[] | null
}

interface ClassifiedItem {
  i: number
  relevant: boolean
  category?: typeof CATEGORIES[number]
  region?: string
  urgency?: number
}

export interface ClassifyResult {
  itemsClassified: number
  itemsArchived: number
  errors: number
}

export async function classifyItems(runId: string): Promise<ClassifyResult> {
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: items, error } = await supabase
    .from('news_items')
    .select('id, title, source_name, matched_keywords')
    .eq('run_id', runId)
    .eq('status', 'scraped')

  if (error) throw new Error(`[classifier] news_items fetch faalde: ${error.message}`)
  if (!items || items.length === 0) {
    return { itemsClassified: 0, itemsArchived: 0, errors: 0 }
  }

  const batches = chunk(items as ItemForClassification[], BATCH_SIZE)
  const limit = pLimit(CONCURRENCY)

  const batchResults = await Promise.allSettled(
    batches.map(batch => limit(() => classifyBatch(anthropic, supabase, batch))),
  )

  let itemsClassified = 0
  let itemsArchived = 0
  let errors = 0

  for (const r of batchResults) {
    if (r.status === 'fulfilled') {
      itemsClassified += r.value.classified
      itemsArchived += r.value.archived
    } else {
      errors++
      console.error('[classifier] batch faalde:', r.reason instanceof Error ? r.reason.message : r.reason)
    }
  }

  // items_classified = totaal succesvol verwerkt (classified + archived samen).
  await supabase
    .from('news_runs')
    .update({ items_classified: itemsClassified + itemsArchived })
    .eq('id', runId)

  return { itemsClassified, itemsArchived, errors }
}

async function classifyBatch(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createServiceClient>,
  batch: ItemForClassification[],
): Promise<{ classified: number; archived: number }> {
  const idMap = new Map<number, string>()
  const userPayload = batch.map((item, idx) => {
    idMap.set(idx, item.id)
    return {
      i: idx,
      title: item.title,
      source: item.source_name,
      matched_keywords: item.matched_keywords ?? [],
    }
  })

  const response = await callWithRetry(() =>
    anthropic.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
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
          content: `Classificeer onderstaande batch van ${batch.length} items:\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ResultSchema) },
    }),
  )

  const parsed = response.parsed_output as ClassificationResult | null
  if (!parsed) {
    throw new Error(`[classifier] parsed_output null (stop_reason=${response.stop_reason})`)
  }

  let classified = 0
  let archived = 0

  await Promise.all(
    parsed.results.map(async (r: ClassifiedItem) => {
      const dbId = idMap.get(r.i)
      if (!dbId) {
        console.warn(`[classifier] onbekende i=${r.i} in response, skip`)
        return
      }

      // Atomische update: status + alle velden in één query.
      const update: Record<string, unknown> = r.relevant
        ? {
            status: 'classified',
            category: r.category ?? null,
            region: r.region ?? null,
            urgency: r.urgency ?? null,
          }
        : { status: 'archived' }

      const { error: updErr } = await supabase
        .from('news_items')
        .update(update)
        .eq('id', dbId)

      if (updErr) {
        console.error(`[classifier] update ${dbId} faalde: ${updErr.message}`)
      } else if (r.relevant) {
        classified++
      } else {
        archived++
      }
    }),
  )

  return { classified, archived }
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
        console.warn(`[classifier] ${err.constructor.name} (attempt ${attempt}/${MAX_RETRIES}), wacht ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error('[classifier] retry-loop unreachable')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
