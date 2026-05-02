/**
 * News-pipeline summarizer — fase 3 met drielaags review.
 *
 * Per item:
 *   1. Sonnet schrijft summary_nl + buyer_implication.
 *   2. Hard regex-checks (em-dashes, AI-marker filler, "Voor"-prefix,
 *      actie-werkwoord) — bij elke hit forceren we rewrite.
 *   3. Soft regex-checks (lengte, getal voor fiscaal/marktdata) — bij
 *      ≥2 hits forceren we rewrite.
 *   4. Bij rewrite: één extra Sonnet-call met expliciete fix-lijst.
 *
 * Na alle items: één batch-tone-review via Haiku (10 items per call,
 * concurrency 3). Items die de tone-check niet doorstaan krijgen één
 * extra rewrite-call.
 *
 * Per-item resultaat in review_metadata jsonb voor monitoring (rewritten
 * bool + reasons array).
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import pLimit from 'p-limit'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { PIPELINE_CONFIG } from '@/lib/news/config'

const MODEL = PIPELINE_CONFIG.models.summarize
const TONE_REVIEW_MODEL = PIPELINE_CONFIG.models.classify // Haiku
const CONCURRENCY = 5
const TONE_REVIEW_CONCURRENCY = 3
const TONE_REVIEW_BATCH_SIZE = 10
const MAX_TOKENS = 1024
const MAX_RETRIES = 3
const URGENCY_THRESHOLD = 4

const SummarySchema = z.object({
  summary_nl: z.string(),
  buyer_implication: z.string(),
})
type Summary = z.infer<typeof SummarySchema>

const ToneReviewSchema = z.object({
  results: z.array(
    z.object({
      i: z.string(),
      tone_pass: z.boolean(),
      reason: z.string().optional(),
    }),
  ),
})
type ToneReview = z.infer<typeof ToneReviewSchema>

const SYSTEM_PROMPT = `Je bent een senior Spanje-vastgoed consultant voor Costa Select, een Nederlandse buyer's agency. Je schrijft korte, scherpe samenvattingen van nieuws-items voor onze interne maandagochtend briefing — gericht op consultants die kopers van een tweede woning of investering in Spanje begeleiden.

Per nieuwsitem schrijf je twee velden:

# 1. summary_nl
Twee tot drie zinnen in vlot Nederlands. Wat is er gebeurd, wat is de kern. Geen jargon zonder uitleg, geen filler-zinnen ("Het is belangrijk om te weten dat..."), geen samenvatting van de bron-tekst maar een echte journalistieke samenvatting van het feit. Spaanse termen die in onze sector standaard zijn (ITP, IBI, plusvalía, urbanización) mogen onvertaald blijven; minder bekende termen tussen haakjes uitleggen bij eerste vermelding.

# 2. buyer_implication
Eén zin die start met "Voor klanten met..." of "Voor onze...". Hier vertaal je het feit naar concrete betekenis voor onze doelgroep: koper-met-actief-deal, eigenaar, of overweger. Niet generiek ("Dit is goed om te weten"), maar specifiek (welke klantsegment, welke actie of welke afweging). De zin MOET starten met het woord "Voor" en een duidelijk actie-werkwoord bevatten (raakt, betekent, raadt, controleer, etc.).

# Stijlregels (Costa Select tone-of-voice — Ruler/Caregiver archetype, tweede persoon)

Toon: zakelijk, direct, competent. Wij weten waar we het over hebben en spreken collega's aan, geen leken. Vermijd:
- Em-dashes (— en –). Gebruik komma's, dubbele punten, haakjes of nieuwe zinnen.
- Engelse marketing-termen ("game-changer", "must-know", "key takeaway")
- Uitroeptekens
- Vragende vormen ("Wist u dat...?")
- Hedging-stapels ("mogelijk zou kunnen wellicht...")
- Filler-zinnen ("Het is belangrijk", "Het is essentieel", "In het algemeen", "Kortom", "Tot slot", "Bovendien is het")

Schrijf in tweede persoon waar je consultants aanspreekt ("je klant", "voor je advisering"), derde persoon waar je over markt/wetgeving schrijft.

# KRITIEK — Géén bedrijfs-zelfreferentie

NOOIT in summary of buyer_implication:
- De naam "Costa Select" gebruiken
- Claims maken over wat ons bedrijf doet, biedt, integreert, verankert, vastlegt, controleert of begeleidt ("Costa Select doet X", "wij verankeren Y", "wij begeleiden klanten bij Z", "ons aanbod omvat...")
- First-person plural als subject van een actie ("wij verankeren", "we integreren", "we nemen dit mee")

Onze consultants en partners lezen deze briefing — als we claims over onze service maken die niet kloppen, liegen we. WEL toegestaan:
- "Voor onze klanten met..." / "Voor onze prospects..." (bezittelijk, scope-marker)
- "Voor consultants is dit een signaal om..."
- "Voor klanten in een actieve search verdient deze checklist een plek in de bezichtigingsroutine"
- "Voor klanten met een tweede woning betekent dit een hogere belastingdruk"

NIET toegestaan:
- "Voor onze klanten verankert Costa Select deze stappen in onze begeleiding"
- "Voor klanten kan Costa Select adviseren om..."
- "Wij raden onze klanten aan om..."

Beschrijf de IMPLICATIE voor de klant, niet de actie van het bedrijf. De zin gaat over wat het feit voor de klant betekent of waar de consultant op moet letten — niet over wat wij ermee doen.

# Lengte-eisen
- summary_nl: 30-80 woorden
- buyer_implication: 15-40 woorden

# Concrete getallen
Bij categorieën fiscaal_es, fiscaal_nl en marktdata MOET een concreet getal in summary of implication voorkomen (percentage, bedrag, jaartal, aantal). Zonder cijfers is het filler.

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
}

# Kritieke fout-paar (FOUT vs GOED)

Voorbeeld waar het MIS gaat — buyer_implication maakt claim over Costa Select:

FOUT: "Voor klanten in een actieve search verankert Costa Select deze drie stappen in de bezichtigingsbegeleiding, zodat omgevingsrisico's boven tafel komen vóór ondertekening."

Reden: claim over wat Costa Select doet/integreert. Onze consultants en partners lezen dit en weten niet of dat klopt — dus we mogen het niet schrijven.

GOED: "Voor klanten in een actieve search verdienen deze drie checks (politie-info, gesprekken met meerdere bewoners, straatbezoek op verschillende tijdstippen) een vaste plek in de bezichtigingsroutine vóór ondertekening."

Reden: beschrijft wat de klant of consultant kan doen met de info, maakt geen claim over ons bedrijf.`

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

// ─── Niveau 1: Hard fails (regex, geen AI-call) ───────────────────────────

const HARD_FAIL_PATTERNS: RegExp[] = [
  /—/g, // em-dash
  /–/g, // en-dash
  /\bhet is belangrijk om te weten\b/i,
  /\bhet is essentieel\b/i,
  /\bin het algemeen\b/i,
  /\bkortom\b/i,
  /\btot slot\b/i,
  /\bbovendien is het\b/i,
  /\bhet valt op dat\b/i,
  /\bhet is belangrijk te benadrukken\b/i,
  /\bhet dient opgemerkt te worden\b/i,
  /\bit is important to note\b/i,
  /\bit's worth noting\b/i,
  /\bin conclusion\b/i,
  /\bfurthermore\b/i,

  // KRITIEK — geen bedrijfs-zelfreferentie. Costa Select mag nooit in
  // de output verschijnen, en first-person plural mag nooit subject zijn
  // van een actie (geen claims over wat wij doen).
  /\bCosta Select\b/,
  // 2a: subject-first ("wij verankeren", "we adviseren")
  /\b(wij|we)\s+(verankert?|verankeren|integreren|integreert|bieden|biedt|adviseren|adviseert|controleren|controleert|doen|maken|verzorgen|verzorgt|nemen\s+mee|leveren|levert|combineren|combineert|verwerken|verwerkt|stellen\s+vast|raden\s+(?:onze\s+klanten\s+)?aan)\b/i,
  // 2b: V2-inversie ("verankeren we", "raden wij aan", "nemen wij mee").
  // Separable-verbs splitsen in V2; we matchen op het verb-root + wij/we.
  /\b(verankert?|verankeren|integreren|integreert|bieden|biedt|adviseren|adviseert|controleren|controleert|doen|maken|verzorgen|verzorgt|nemen|leveren|levert|combineren|combineert|verwerken|verwerkt|stellen|raden)\s+(wij|we)\b/i,
  // 3: bezittelijk + service-noun ("onze service", "ons aanbod")
  /\b(ons\s+(?:aanbod|team|bedrijf|advies|begeleiding|proces|werk)|onze\s+(?:service|begeleiding|aanpak|werkwijze|expertise))\b/i,
]

interface FailResult {
  hasFails: boolean
  issues: string[]
}

function checkHardFails(summary: string, buyerImplication: string): FailResult {
  const issues: string[] = []
  const combined = `${summary} ${buyerImplication}`

  for (const pattern of HARD_FAIL_PATTERNS) {
    if (pattern.test(combined)) {
      issues.push(`AI-marker: ${pattern.source}`)
    }
  }

  if (!buyerImplication.trim().startsWith('Voor')) {
    issues.push('buyer_implication start niet met "Voor"')
  }

  const actionVerbs =
    /\b(raadt|adviseert|kan|moet|geef|controleer|check|eis|vraag|overweeg|biedt|levert|verandert|raakt|betekent|scheelt|wint|verliest|vereist|dwingt|bepaalt|waarschuwt|opent|sluit|maakt mogelijk)\b/i
  if (!actionVerbs.test(buyerImplication)) {
    issues.push('buyer_implication mist actie-werkwoord')
  }

  return { hasFails: issues.length > 0, issues }
}

// ─── Niveau 2: Soft checks (regex, alleen rewrite bij ≥2 hits) ────────────

interface SoftFailResult {
  count: number
  issues: string[]
}

function checkSoftFails(
  item: ItemForSummary,
  summary: string,
  buyerImplication: string,
): SoftFailResult {
  const issues: string[] = []

  const summaryWords = summary.trim().split(/\s+/).length
  if (summaryWords < 30) issues.push(`summary te kort (${summaryWords}w, min 30)`)
  if (summaryWords > 80) issues.push(`summary te lang (${summaryWords}w, max 80)`)

  const implWords = buyerImplication.trim().split(/\s+/).length
  if (implWords < 15) issues.push(`buyer_implication te kort (${implWords}w, min 15)`)
  if (implWords > 40) issues.push(`buyer_implication te lang (${implWords}w, max 40)`)

  if (
    item.category === 'fiscaal_es' ||
    item.category === 'fiscaal_nl' ||
    item.category === 'marktdata'
  ) {
    const hasNumber = /\d+(?:[.,]\d+)?(?:\s*%|\s*€|\s*procent|\s*tot|\s*op|\s*basispunten?)/i.test(
      `${summary} ${buyerImplication}`,
    )
    if (!hasNumber) issues.push('geen concreet getal in fiscaal/marktdata item')
  }

  return { count: issues.length, issues }
}

// ─── Rewrite (Sonnet, alleen bij hard-fail of ≥2 soft) ────────────────────

async function rewriteItem(
  anthropic: Anthropic,
  item: ItemForSummary,
  originalSummary: string,
  originalImplication: string,
  issues: string[],
): Promise<Summary> {
  const fixInstruction = `

# HERSCHRIJF-INSTRUCTIE

De vorige versie had deze problemen:
${issues.map(i => `- ${i}`).join('\n')}

Schrijf opnieuw en los expliciet bovenstaande problemen op. Houd de eerder geformuleerde stijl- en lengte-regels aan.`

  const response = await callWithRetry(() =>
    anthropic.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        format: zodOutputFormat(SummarySchema),
        effort: 'low',
      },
      system: [{ type: 'text', text: SYSTEM_PROMPT + fixInstruction }],
      messages: [
        {
          role: 'user',
          content: `Bron: ${item.source_name}
Titel: ${item.title}
Inhoud: ${(item.raw_content ?? '').slice(0, 4000)}
Categorie: ${item.category}
Regio: ${item.region}

Vorige summary: ${originalSummary}
Vorige buyer_implication: ${originalImplication}

Schrijf opnieuw en los de genoemde problemen op.`,
        },
      ],
    }),
  )

  const parsed = response.parsed_output as Summary | null
  if (!parsed) {
    // Fallback: behoud origineel ipv crashen
    console.warn(`[summarizer] rewrite parsed_output null voor ${item.id}, behoud origineel`)
    return { summary_nl: originalSummary, buyer_implication: originalImplication }
  }
  return parsed
}

// ─── Niveau 3: batch tone-review (Haiku) ──────────────────────────────────

interface ProcessedItem {
  id: string
  summary_nl: string
  buyer_implication: string
}

async function batchToneReview(
  anthropic: Anthropic,
  items: ProcessedItem[],
): Promise<Map<string, { pass: boolean; reason?: string }>> {
  const TONE_SYSTEM = `Je bent een tone-reviewer voor Costa Select content.

Costa Select tone-of-voice:
- Ruler/Caregiver archetypes: zakelijk-warm, autoritatief maar zorgzaam
- Tweede persoon waar consultant-georiënteerd ("voor klanten met...")
- Geen jargon zonder uitleg
- Geen marketing-fluff ("game-changer", "revolutionair", "uniek", "ongekend")
- Concrete getallen waar mogelijk
- Nederlands of Vlaams, geen anglicismen ("disrupted", "leveragen", "boost", "scope")

Beoordeel per item: past tone bij Costa Select?
tone_pass = true als alle vier kloppen:
1. Geen marketing-fluff
2. Tweede persoon waar passend
3. Geen anglicismen
4. Concreet, geen vaagheden

Bij tone_pass = false: geef korte reden (1 zin).`

  const batches = chunk(items, TONE_REVIEW_BATCH_SIZE)
  const out = new Map<string, { pass: boolean; reason?: string }>()
  const limit = pLimit(TONE_REVIEW_CONCURRENCY)

  await Promise.all(
    batches.map(batch =>
      limit(async () => {
        try {
          const response = await callWithRetry(() =>
            anthropic.messages.parse({
              model: TONE_REVIEW_MODEL,
              max_tokens: 2048,
              output_config: { format: zodOutputFormat(ToneReviewSchema) },
              system: [{ type: 'text', text: TONE_SYSTEM, cache_control: { type: 'ephemeral' } }],
              messages: [
                {
                  role: 'user',
                  content: `Beoordeel de tone van deze ${batch.length} items:\n\n${JSON.stringify(
                    batch.map(b => ({ i: b.id, s: b.summary_nl, b: b.buyer_implication })),
                    null,
                    2,
                  )}`,
                },
              ],
            }),
          )

          const parsed = response.parsed_output as ToneReview | null
          if (!parsed) return
          for (const r of parsed.results) {
            out.set(r.i, { pass: r.tone_pass, reason: r.reason })
          }
        } catch (err) {
          console.error('[summarizer] tone-review batch faalde:', err instanceof Error ? err.message : err)
        }
      }),
    ),
  )

  return out
}

// ─── Hoofdflow ────────────────────────────────────────────────────────────

export interface SummarizeResult {
  itemsSummarized: number
  itemsRewritten: number
  itemsToneFailed: number
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
    .eq('is_cluster_leader', true)
    .gte('urgency', URGENCY_THRESHOLD)

  if (error) throw new Error(`[summarizer] news_items fetch faalde: ${error.message}`)
  if (!items || items.length === 0) {
    return { itemsSummarized: 0, itemsRewritten: 0, itemsToneFailed: 0, errors: 0 }
  }

  const limit = pLimit(CONCURRENCY)
  const summarizeStats = { rewritten: 0, errors: 0 }

  const results = await Promise.allSettled(
    items.map(item =>
      limit(() => summarizeOne(anthropic, supabase, item as ItemForSummary, summarizeStats)),
    ),
  )

  let itemsSummarized = 0
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) itemsSummarized++
    else if (r.status === 'rejected') {
      summarizeStats.errors++
      console.error('[summarizer] item faalde:', r.reason instanceof Error ? r.reason.message : r.reason)
    }
  }

  // Niveau 3: batch tone-review op alles wat is gesummariseerd.
  let toneFailed = 0
  if (itemsSummarized > 0) {
    const { data: processed } = await supabase
      .from('news_items')
      .select('id, summary_nl, buyer_implication, source_name, title, raw_content, category, region, urgency, review_metadata')
      .eq('run_id', runId)
      .eq('status', 'summarized')

    if (processed && processed.length > 0) {
      const toneResults = await batchToneReview(
        anthropic,
        processed.map(p => ({ id: p.id, summary_nl: p.summary_nl, buyer_implication: p.buyer_implication })),
      )

      const toneFails = processed.filter(p => {
        const r = toneResults.get(p.id)
        return r && !r.pass
      })
      toneFailed = toneFails.length

      // Eén extra rewrite per tone-fail.
      const toneLimit = pLimit(CONCURRENCY)
      await Promise.all(
        toneFails.map(p =>
          toneLimit(async () => {
            const reason = toneResults.get(p.id)?.reason ?? 'tone past niet bij Costa Select'
            try {
              const rewritten = await rewriteItem(
                anthropic,
                p as ItemForSummary,
                p.summary_nl,
                p.buyer_implication,
                ['tone_review_failed: ' + reason],
              )
              const prevReasons = (p.review_metadata as { reasons?: string[] } | null)?.reasons ?? []
              const newImpactScore = calculateImpactScore(p.urgency ?? 0, rewritten.buyer_implication)
              await supabase
                .from('news_items')
                .update({
                  summary_nl: rewritten.summary_nl,
                  buyer_implication: rewritten.buyer_implication,
                  impact_score: newImpactScore,
                  review_metadata: {
                    rewritten: true,
                    reasons: [...prevReasons, `tone_review_failed: ${reason}`],
                  },
                })
                .eq('id', p.id)
              summarizeStats.rewritten++
            } catch (err) {
              console.error(`[summarizer] tone-rewrite ${p.id} faalde:`, err instanceof Error ? err.message : err)
            }
          }),
        ),
      )
    }
  }

  await supabase.from('news_runs').update({ items_summarized: itemsSummarized }).eq('id', runId)

  return {
    itemsSummarized,
    itemsRewritten: summarizeStats.rewritten,
    itemsToneFailed: toneFailed,
    errors: summarizeStats.errors,
  }
}

async function summarizeOne(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createServiceClient>,
  item: ItemForSummary,
  stats: { rewritten: number; errors: number },
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
      output_config: { format: zodOutputFormat(SummarySchema), effort: 'low' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
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

  // Niveau 1 + 2 checks.
  const hard = checkHardFails(parsed.summary_nl, parsed.buyer_implication)
  const soft = checkSoftFails(item, parsed.summary_nl, parsed.buyer_implication)

  let final: Summary = parsed
  let rewriteReasons: string[] = []
  if (hard.hasFails || soft.count >= 2) {
    rewriteReasons = [...hard.issues, ...soft.issues]
    try {
      final = await rewriteItem(anthropic, item, parsed.summary_nl, parsed.buyer_implication, rewriteReasons)
      stats.rewritten++
    } catch (err) {
      console.error(`[summarizer] rewrite ${item.id} faalde, behoud origineel:`, err instanceof Error ? err.message : err)
      // val terug op origineel
    }
  }

  const impactScore = calculateImpactScore(item.urgency ?? 0, final.buyer_implication)
  const reviewMetadata = rewriteReasons.length > 0
    ? { rewritten: true, reasons: rewriteReasons }
    : { rewritten: false }

  const { error: updErr } = await supabase
    .from('news_items')
    .update({
      status: 'summarized',
      summary_nl: final.summary_nl,
      buyer_implication: final.buyer_implication,
      impact_score: impactScore,
      review_metadata: reviewMetadata,
    })
    .eq('id', item.id)

  if (updErr) throw new Error(`[summarizer] update ${item.id} faalde: ${updErr.message}`)
  return true
}

// ─── helpers ──────────────────────────────────────────────────────────────

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isLast = attempt === MAX_RETRIES
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
        if (isLast) throw err
        const waitMs = 5000 * Math.pow(2, attempt - 1)
        console.warn(`[summarizer] ${err.constructor.name} attempt ${attempt}/${MAX_RETRIES}, wacht ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error('[summarizer] retry-loop unreachable')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
