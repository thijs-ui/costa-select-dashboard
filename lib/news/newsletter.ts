/**
 * News-pipeline newsletter generator — fase 4.
 *
 * Pakt de top 5 items op urgency uit een run en laat Sonnet 4.6 een
 * concept-klantnieuwsbrief schrijven (Nederlands, klant-georiënteerd).
 * Output is een platte JSON met subject + body, klaar om in Outlook te
 * plakken — geen markdown, geen HTML.
 */

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { PIPELINE_CONFIG } from '@/lib/news/config'

const MODEL = PIPELINE_CONFIG.models.newsletter
const MAX_TOKENS = 2048
const TOP_N = 5
const MAX_RETRIES = 3

const NewsletterSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

export type Newsletter = z.infer<typeof NewsletterSchema>

const SYSTEM_PROMPT = `Je schrijft de wekelijkse klantnieuwsbrief voor Costa Select, een Nederlandse buyer's agency die kopers van een tweede woning of investering in Spanje begeleidt. De ontvangers zijn Nederlandse en Belgische klanten — sommigen bezitten al een Spaans pand, anderen zijn in een actief zoekproces, weer anderen oriënteren zich nog.

Je krijgt 5 nieuws-items uit de afgelopen week (titel, samenvatting, koper-implicatie, bron) en je schrijft daar één samenhangende nieuwsbrief over.

# Output

JSON met twee velden: subject (onderwerpregel) en body (de nieuwsbrief-tekst zelf).

# subject
Concrete, scanbare onderwerpregel zonder buzzwords. Geen "Belangrijk:" prefix, geen uitroeptekens. Kort genoeg om in Outlook-overzicht volledig zichtbaar te zijn (~50 tekens). Liefst met datum-context ("week van X mei") of het sterkste item van de week als hook.

# body
200-300 woorden. Platte tekst, klaar om in Outlook te plakken. GEEN markdown, GEEN bullets met sterretjes, GEEN headings met hekjes. Wel: gewone alinea's gescheiden door dubbele newlines. Witregels mogen tussen onderwerpen.

Begin met "Beste {voornaam},". Sluit af met:
"Met hartelijke groet,

[ondertekenaar]"

Het mailmerge-veld {voornaam} en de placeholder [ondertekenaar] laat je letterlijk zo staan — wij vullen die in vóór verzenden.

# Stijl (Costa Select tone-of-voice — Ruler/Caregiver, tweede persoon)

- Tweede persoon ("u"). Niet "je" — onze klantcommunicatie blijft op u-niveau, anders dan onze interne briefings.
- Zakelijk-warm. Wij weten waar we het over hebben en delen dat helder, zonder neerbuigend te zijn en zonder te overdrijven.
- Geen jargon zonder uitleg. Termen als ITP, IBI, plusvalía mogen, maar leg ze één keer uit als ze in de tekst voorkomen ("ITP, de Spaanse overdrachtsbelasting").
- Geen em-dashes (—). Gebruik komma's, dubbele punten, of haakjes.
- Geen Engelse marketing-termen ("game-changer", "must-know").
- Geen vragende vorm ("Wist u dat...?").
- Geen filler ("Het is belangrijk te benadrukken dat..."). Begin de zin gewoon met de informatie.
- Geen uitroeptekens.

# Structuur

Eerste alinea: één of twee zinnen waarin u meegeeft wat de rode draad of het opvallendste nieuws van de week is.

Middendeel: 2-4 alinea's, één per onderwerp dat u behandelt. Niet alle 5 items in detail — selecteer wat klanten écht raakt en groepeer waar dat logisch is. Vermeld bij feiten kort de bron in de tekst zelf ("volgens Tinsa", "het Boletín Oficial publiceerde", "El Confidencial meldt").

Laatste alinea voor de afsluiting: één zin die uitnodigt tot contact bij specifieke vragen of een lopend traject. Niet wervend ("neem nu contact op!"), wel attent ("mocht u twijfelen of dit op uw situatie van toepassing is, dan kijken wij daar graag samen naar").

# Voorbeeld

subject: "Spaans vastgoed — week 18: rente, prijzen en regelgeving"

body: "Beste {voornaam},

De Spaanse vastgoedmarkt liet deze week een aantal bewegingen zien die voor u relevant kunnen zijn, vooral als u in een actief koop- of verkooptraject zit of recent een tweede woning heeft aangeschaft.

Tinsa publiceerde nieuwe prijscijfers: de Costa del Sol blijft koploper met 7,8% prijsstijging op jaarbasis, ruim boven het Spaanse gemiddelde van 4,2%. Drijvende factor is de buitenlandse vraag in Marbella, Estepona en Mijas. Voor u betekent dit dat afwachten in deze regio in de praktijk duurder wordt.

Tegelijk zien Spaanse makelaars een afkoeling in andere delen van het land. Aanbod blijft langer staan en bieden onder de vraagprijs is minder uitzonderlijk dan zes maanden geleden, vooral op resale-objecten waarvan de vraagprijs niet is bijgesteld.

Op fiscaal vlak speelt het debat over een mogelijke 100%-belasting voor niet-EU-kopers door. Notarisdata laat zien dat dit voornemen alleen al een effect heeft: 17% minder aankopen door niet-EU-buitenlanders in 2025. Voor onze Nederlandse en Belgische klanten verandert er praktisch niets, maar de marktdynamiek schuift wel.

Mocht u twijfelen of een van deze ontwikkelingen op uw situatie van toepassing is, dan kijken wij daar graag samen naar.

Met hartelijke groet,

[ondertekenaar]"`

export async function generateNewsletter(runId: string): Promise<Newsletter | null> {
  const supabase = createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: items, error } = await supabase
    .from('news_items')
    .select('title, summary_nl, buyer_implication, source_name, urgency')
    .eq('run_id', runId)
    .eq('status', 'summarized')
    .order('urgency', { ascending: false })
    .limit(TOP_N)

  if (error) throw new Error(`[newsletter] fetch faalde: ${error.message}`)
  if (!items || items.length === 0) return null

  const userPayload = items.map((i, idx) => ({
    nr: idx + 1,
    titel: i.title,
    samenvatting: i.summary_nl,
    klant_implicatie: i.buyer_implication,
    bron: i.source_name,
    urgency: i.urgency,
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
          content: `Schrijf de nieuwsbrief op basis van deze ${items.length} items van deze week:\n\n${JSON.stringify(userPayload, null, 2)}`,
        },
      ],
    }),
  )

  const parsed = response.parsed_output as Newsletter | null
  if (!parsed) {
    throw new Error(`[newsletter] parsed_output null (stop_reason=${response.stop_reason})`)
  }
  return parsed
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
