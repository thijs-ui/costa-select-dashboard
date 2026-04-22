import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SECTION_PROMPTS: Record<string, string> = {
  voordelen: 'Genereer 3-5 concrete voordelen (bullet points) van deze woning. Geef terug als JSON array van strings: ["punt 1", "punt 2", ...]',
  nadelen: 'Genereer 2-4 eerlijke nadelen/aandachtspunten (bullet points) van deze woning. Geef terug als JSON array van strings: ["punt 1", "punt 2", ...]',
  buurtcontext: `Schrijf een uitgebreide buurtanalyse van minimaal 150 woorden en maximaal 250 woorden. Behandel: 1) KARAKTER: type wijk, sfeer, type bewoners (lokaal Spaans, expats, gepensioneerden, gezinnen). 2) VOORZIENINGEN: wat op loopafstand, noem afstanden in minuten. 3) BEREIKBAARHEID: afstand luchthaven, snelweg. 4) ONTWIKKELING: prijstrend, nieuwbouwprojecten. 5) VOOR WIE GESCHIKT: welk type koper. Schrijf als lokale expert, geen Wikipedia. Geef terug als JSON string (geen array).`,
  investering: 'Geef een kort oordeel over het investeringspotentieel: geschatte huurinkomsten, yield, touristenverhuur. Geef terug als JSON string (geen array). Als er te weinig data is, geef een lege string.',
  advies: 'Schrijf 1 alinea Costa Select advies: voor wie is deze woning geschikt en waarom wel/niet aanbevelen. Geef terug als JSON string (geen array).',
}

const SYSTEM_PROMPT = `Je bent een ervaren vastgoedconsultant van Costa Select, een Nederlandse aankoopmakelaardij in Spanje.

Schrijfstijl:
- Helder, direct, geen overdrijving
- Eerlijk over nadelen — dat bouwt vertrouwen
- Geen woorden als: goedkoop, snel scoren, koopje, no-brainer, fantastisch, perfect, garantie
- Wel woorden als: kwaliteit, doordacht, zorgvuldig, perspectief, waarde
- Schrijf in jij-vorm richting de koper
- Eén gedachte per zin
- Schrijf in het Nederlands
- Baseer je ALLEEN op de meegeleverde data. Verzin geen feiten.`

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const limited = await checkRateLimit(auth.id, 'EXPENSIVE')
  if (limited) return limited

  const { section, property_data } = await request.json()

  if (!section || !SECTION_PROMPTS[section]) {
    return NextResponse.json({ error: 'Ongeldige sectie' }, { status: 400 })
  }

  if (!property_data) {
    return NextResponse.json({ error: 'Geen woningdata' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `WONINGDATA:\n${JSON.stringify(property_data, null, 2)}\n\n${SECTION_PROMPTS[section]}\n\nGeef ALLEEN de JSON terug, geen andere tekst.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse: kan een array of string zijn
    const jsonMatch = text.match(/(\[[\s\S]*\]|"[\s\S]*")/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json({ content: parsed })
    }

    // Fallback: hele tekst als string
    return NextResponse.json({ content: text.trim() })
  } catch (err) {
    console.error('Regenerate failed:', err)
    return NextResponse.json({ error: 'AI-generatie mislukt' }, { status: 500 })
  }
}
