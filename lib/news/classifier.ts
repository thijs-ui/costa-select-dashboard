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
import { KEYWORDS, REGION_PLACES } from '@/lib/news/config'

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 20
const CONCURRENCY = 5
const MAX_TOKENS = 8192
const MAX_RETRIES = 3

const CATEGORIES = ['juridisch_es', 'fiscaal_es', 'fiscaal_nl', 'regio', 'marktdata', 'spelers'] as const
const SLACK_CHANNELS = [
  'algemeen', 'spanje', 'valencia',
  'costa_blanca_noord', 'costa_blanca_zuid',
  'costa_brava', 'costa_calida', 'costa_del_sol', 'costa_dorada',
] as const

const ResultSchema = z.object({
  results: z.array(
    z.object({
      i: z.string(),
      relevant: z.boolean(),
      category: z.enum(CATEGORIES),
      region: z.string(),
      slack_channel: z.enum(SLACK_CHANNELS),
      audience_invest: z.boolean(),
      urgency: z.number().min(1).max(10),
    }),
  ),
})

type ClassificationResult = z.infer<typeof ResultSchema>

// Volledige system prompt — bevat instructies, alle keywords per categorie,
// slack-routing regels, audience_invest criteria, en 3 worked voorbeelden.
// Cache-control plakt op deze blob; per-batch verschilt alleen het user-message
// met items, dus elke batch na de eerste is een cache-hit (Haiku 4.5 cache-
// drempel = 4096 tokens, deze prompt zit ruim daarboven).
const SYSTEM_PROMPT = `Je bent een classificatie-engine voor Costa Select, een Nederlandse buyer's agency voor Spaans vastgoed. Onze doelgroep zijn Nederlandse en Belgische investeerders en kopers van een tweede woning in Spanje, met focus op Costa del Sol, Costa Blanca (Noord en Zuid), Costa Cálida, Mallorca en Ibiza.

Je krijgt een batch nieuwsitems als JSON-array. Per item bepaal je zeven velden: relevant, category, region, slack_channel, audience_invest, urgency.

# 1. relevant (boolean, verplicht)

true = relevant voor onze doelgroep — raakt het kopen, bezitten, verhuren, fiscaal behandelen, of waardeontwikkeling van Spaans vastgoed door buitenlandse investeerders.

false = niet relevant. Voorbeelden: politiek nieuws zonder vastgoed-impact, sport, entertainment, regionaal nieuws over schoolfeesten/festivals, criminaliteit zonder vastgoed-context, technologie-nieuws, internationaal niet-vastgoed nieuws, lokale verkiezingen zonder beleidswijziging die vastgoed raakt.

EXTRA STRENG bij commerciële content — zet relevant=false bij:
- Marketing-positionering / bedrijfs-pluche van een specifiek bedrijf zonder harde cijfers, transactie-data of fundamentele markt-impact (bv. "X profileert zich als marktleider", "Y benadrukt klantbeleving", "Z combineert technologie en service")
- Advertorials / sponsored content / branded interviews waarin een bedrijf zichzelf prijst
- Listings / te-koop-aanbiedingen voor één specifieke woning (bv. "2bed apartment in Denia €399k")
- Algemene marketingtaal zonder concrete cijfers, regelgeving of marktbewegingen

Vuistregel: zonder een feit dat een consultant moet weten om beter advies te geven, is het filler. Filler hoort niet in de pipeline.

Ook bij relevant=false vul je álle velden in (kies redelijke defaults: category bv. 'regio', region 'Onbekend', slack_channel 'algemeen', audience_invest false, urgency 1). Onze post-processing leest alleen de andere velden bij relevant=true, maar het schema vereist ze.

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

# 5. slack_channel (string-enum)

Kies precies één van: algemeen, spanje, valencia, costa_blanca_noord, costa_blanca_zuid, costa_brava, costa_calida, costa_del_sol, costa_dorada.

PRIMAIRE REGEL — REGIO HEEFT VOORRANG: als de titel of inhoud van het item een specifieke plaatsnaam noemt die voorkomt in REGION_PLACES (zie hieronder), kies je het bijbehorende regio-kanaal. Dit geldt ONGEACHT de category. Een fiscaal_es item over een ITP-decreet specifiek voor Andalucía gaat dus naar 'costa_del_sol', NIET naar 'spanje'. Een marktdata item dat Marbella's luxury-segment bespreekt gaat naar 'costa_del_sol', NIET naar 'spanje'.

Plaats-detectie volgorde:
  1. Costa del Sol plaatsen aanwezig → 'costa_del_sol'
  2. Costa Blanca Noord plaatsen aanwezig (incl. Gandía/Gandia) → 'costa_blanca_noord'
  3. Costa Blanca Zuid plaatsen aanwezig → 'costa_blanca_zuid'
  4. Costa Brava plaatsen aanwezig → 'costa_brava'
  5. Costa Cálida plaatsen aanwezig (incl. Murcia stad) → 'costa_calida'
  6. Costa Dorada plaatsen aanwezig → 'costa_dorada'
  7. Valencia stad of plaats uit valencia-lijst aanwezig (EXCL. Castellón) → 'valencia'

UITZONDERING — geen regio-kanaal:
  - Castellón / Peñíscola / Benicàssim / Oropesa → 'spanje' (geen apart kanaal)
  - Madrid, Sevilla, andere Spaanse regio's zonder eigen kanaal → 'spanje'
  - Balearen (Mallorca/Ibiza/Menorca/Formentera) → 'spanje' bij urgency >= 7, anders 'algemeen'
  - Canarische Eilanden → 'spanje' bij urgency >= 7, anders 'algemeen'
  - Categorie 'fiscaal_nl': altijd 'algemeen' (Nederlandse fiscale regels zijn niet regio-specifiek)
  - Geen plaatsnaam herkenbaar / EU-breed / internationaal: 'algemeen'
  - Spaans landelijk nieuws (BOE-decreet zonder geografische scope, ECB-rente, Tinsa-index nationaal): 'spanje'

VOORKOM TYPISCHE FOUTEN:
- "Marbella" in titel → ALTIJD 'costa_del_sol', nooit 'spanje'
- "Murcia" in titel → 'costa_calida', niet 'spanje' (Murcia stad valt onder Costa Cálida-coverage)
- Item dat MEERDERE plaatsen uit verschillende regio's noemt: kies het regio-kanaal dat het zwaartepunt vormt; bij gelijke weging → 'spanje'

NATIONAAL-OVERRULE (belangrijk — breekt regio-priority):

Als het item taalcues bevat die nationale of multi-regio scope aanduiden, gaat het naar 'spanje' (of 'algemeen' bij EU-brede strekking) ongeacht welke plaatsnamen er ook in titel of content voorkomen. Dit voorkomt dat een nationaal verhaal dat één Costa-stad als voorbeeld noemt verkeerd in dat regio-kanaal belandt.

Cues die nationaal-overrule triggeren:

Spaans:
- "todo el país", "toda España", "a nivel nacional"
- "todas las regiones", "todas las comunidades"
- "un centenar de ciudades", "decenas de ciudades", "varias ciudades"
- "en toda la geografía", "en todo el territorio"
- "ciudades de toda España"

Nederlands:
- "in heel Spanje", "door heel Spanje"
- "in tientallen steden", "in honderd steden"
- "landelijk", "op nationaal niveau"

Engels:
- "across Spain", "throughout Spain", "nationwide"
- "in dozens of cities", "in hundreds of cities"
- "across the country"

Voorbeeld: "Clamor por el acceso a la vivienda en un centenar de ciudades en el Día del Trabajo" — ondanks mogelijke vermelding van Málaga of Marbella in de content, gaat dit naar 'spanje' omdat de scope nationaal is ("centenar de ciudades").

Belangrijk onderscheid — overrule geldt ALLEEN bij echte nationale scope:
- Een artikel dat één regio diepgaand behandelt en daarbij andere regio's noemt ter context BLIJFT regio-gerouteerd. Voorbeeld: "Marbella's prijzen stijgen 8%, vergelijkbaar met Madrid en Barcelona" → blijft 'costa_del_sol'.
- Een artikel dat 2-3 specifieke gemeentes uit één regio noemt → blijft regio-gerouteerd. Voorbeeld: "Decreet voor Marbella, Estepona en Mijas" → 'costa_del_sol'.
- Alleen taalcues die expliciet 'multi-regio' of 'landelijk' suggeren triggeren de overrule.

REGION_PLACES referentie (welke plaatsen in welk regio-kanaal vallen):
${JSON.stringify(REGION_PLACES, null, 2)}

# 6. audience_invest (boolean)

Default: false. We verwachten 5-15% true rate over een normale week. Wees streng — alleen items voor onze CSI-klanten (Costa Select Invest, ultra-high-net-worth segment).

Zet TRUE als het item past in een van deze 14 categorieën:
- Family office activiteit Spanje
- Vermogensbeheerders met Spanje-expansie
- Hotel-groep uitbreidingen 50M+
- Private equity vastgoed-deals
- Grote ontwikkelaar-bewegingen (institutional level)
- Prime market data (top 5%)
- Beckham Law wijzigingen
- Wealth tax / impuesto solidaridad wijzigingen
- Golden Visa / residencias-routes
- Yacht / aviation gerelateerd vastgoed
- Branded residences (Four Seasons / Mandarin / Aman residences)
- Trophy property transacties (>5M public sales)
- Corporate HQ-relocations Spanje (multinationals)
- Tax ruling / DGT consultas voor non-residenten

Zet FALSE bij standaard marktnieuws, generieke woningprijzen-rapporten, regio-decreten zonder UHNWI-context, hypotheek-nieuws onder 1M segment, lokale ontwikkelingen zonder institutional/luxury angle.

EXPLICIET FALSE (veelvoorkomende false-positives — vermijd deze):
- Algemene "buitenlandse kopers" demografie en trendrapporten — ook al noemt 't niet-EU/EU-cijfers, dat is generieke markt-statistiek, niet UHNWI
- Brede prijs-indices (Tinsa IMIE, Sociedad de Tasación) — alleen TRUE als 't expliciet over prime/luxury segment of top 5% gaat
- Algemene rente/euribor/ECB-bewegingen — TRUE alleen als specifiek over private banking, family office hypotheek-rates, of jumbo-loans
- Standaard nieuws over ontwikkelaars en vastgoedbeurzen — TRUE alleen als institutional deal (PE-kapitaal, M&A boven 50M, IPO)
- Resale-markt sentiment, "tijd-tot-verkopen", consumer-housing trends — altijd FALSE
- Politieke retoriek over buitenlandse kopers (incl. 100%-taks debat zónder concrete wetswijziging) — FALSE; alleen TRUE bij gepubliceerde DGT-consulta of fiscale wetswijziging die residents/non-residents direct raakt

Standaardregel: als het item even goed in een gewone Bloomberg-NL artikel zou kunnen verschijnen, is 't NIET invest. Invest = nis-content voor private banking en family offices.

# Keyword-referentie (voor jouw context, niet om mechanisch te matchen)

juridisch_es: ${KEYWORDS.juridisch_es.join(', ')}
fiscaal_es: ${KEYWORDS.fiscaal_es.join(', ')}
fiscaal_nl: ${KEYWORDS.fiscaal_nl.join(', ')}
regio: ${KEYWORDS.regio.join(', ')}
marktdata: ${KEYWORDS.marktdata.join(', ')}
spelers: ${KEYWORDS.spelers.join(', ')}

# Voorbeelden

Voorbeeld 1 — hoge urgency, costa_del_sol routing:
Input: { "i": "abc", "title": "Junta de Andalucía publica decreto que limita licencias turísticas en Marbella, Estepona y Mijas", "source": "boja" }
Output: { "i": "abc", "relevant": true, "category": "juridisch_es", "region": "Costa del Sol", "slack_channel": "costa_del_sol", "audience_invest": false, "urgency": 9 }

Voorbeeld 2 — UHNWI/invest, costa_del_sol routing met audience_invest:
Input: { "i": "def", "title": "Mandarin Oriental announces branded residences in Marbella with €15M-€40M units", "source": "mansion_global" }
Output: { "i": "def", "relevant": true, "category": "spelers", "region": "Costa del Sol", "slack_channel": "costa_del_sol", "audience_invest": true, "urgency": 7 }

Voorbeeld 3 — landelijke marktdata, geen regio:
Input: { "i": "ghi", "title": "Tinsa: Spaanse woningprijzen stijgen 4,2% jaar-op-jaar in Q3", "source": "elconfidencial_vivienda" }
Output: { "i": "ghi", "relevant": true, "category": "marktdata", "region": "Spanje (nationaal)", "slack_channel": "spanje", "audience_invest": false, "urgency": 5 }

Voorbeeld 4 — niet relevant, defaults voor verplichte velden:
Input: { "i": "jkl", "title": "Real Madrid wint Champions League finale tegen Manchester City", "source": "diariosur" }
Output: { "i": "jkl", "relevant": false, "category": "regio", "region": "Onbekend", "slack_channel": "algemeen", "audience_invest": false, "urgency": 1 }

Voorbeeld 5 — buitenlandse koper-trend (lijkt invest, is generiek):
Input: { "i": "mno", "title": "Non-EU foreign buyers take a hit in 2025 after political backlash", "source": "spanish_property_insight" }
Output: { "i": "mno", "relevant": true, "category": "marktdata", "region": "Spanje (nationaal)", "slack_channel": "spanje", "audience_invest": false, "urgency": 6 }
Reden: brede demografische marktdata raakt onze hele klantbase, niet specifiek UHNWI. NIET invest.

Voorbeeld 6 — commerciële puff piece (NIET relevant):
Input: { "i": "pqr", "title": "Cubo's Holiday Homes: maximizando la rentabilidad del propietario y la excelencia en la experiencia del viajero", "source": "diariosur" }
Output: { "i": "pqr", "relevant": false, "category": "spelers", "region": "Onbekend", "slack_channel": "algemeen", "audience_invest": false, "urgency": 1 }
Reden: marketing-positionering door één property-management bedrijf zonder transactiedata, marktcijfers of regelgevings-context. Filler.

Voorbeeld 7 — regio HEEFT voorrang op category (Marbella → costa_del_sol):
Input: { "i": "stu", "title": "International market boosts demand for luxury housing in Marbella by 30%", "source": "surinenglish" }
Output: { "i": "stu", "relevant": true, "category": "marktdata", "region": "Costa del Sol", "slack_channel": "costa_del_sol", "audience_invest": false, "urgency": 5 }
Reden: marktdata-categorie maar Marbella in titel — regio wint, dus costa_del_sol kanaal, niet spanje.

# Output-formaat

Antwoord uitsluitend met JSON conform het schema. Eén results-array, één entry per input-item, met de meegestuurde i (UUID) als identifier. ALLE velden zijn altijd verplicht — bij relevant=false vul je redelijke defaults zoals in voorbeeld 4.`

interface ItemForClassification {
  id: string
  title: string
  source_name: string
  matched_keywords: string[] | null
}

interface ClassifiedItem {
  i: string
  relevant: boolean
  category: typeof CATEGORIES[number]
  region: string
  slack_channel: typeof SLACK_CHANNELS[number]
  audience_invest: boolean
  urgency: number
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
    .eq('is_cluster_leader', true)

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
  // i is nu de UUID van het item zelf — geen mapping meer nodig.
  const validIds = new Set(batch.map(i => i.id))
  const userPayload = batch.map(item => ({
    i: item.id,
    title: item.title,
    source: item.source_name,
    matched_keywords: item.matched_keywords ?? [],
  }))

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
      if (!validIds.has(r.i)) {
        console.warn(`[classifier] onbekende i=${r.i} in response, skip`)
        return
      }

      // Atomische update: status + alle velden in één query. Bij irrelevant
      // alleen status='archived' — defaults uit het schema worden niet
      // opgeslagen om ruis in queries te voorkomen.
      const update: Record<string, unknown> = r.relevant
        ? {
            status: 'classified',
            category: r.category,
            region: r.region,
            slack_channel: r.slack_channel,
            audience_invest: r.audience_invest,
            urgency: r.urgency,
          }
        : { status: 'archived' }

      const { error: updErr } = await supabase
        .from('news_items')
        .update(update)
        .eq('id', r.i)

      if (updErr) {
        console.error(`[classifier] update ${r.i} faalde: ${updErr.message}`)
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
