import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const limited = await checkRateLimit(auth.id, 'LIGHT')
  if (limited) return limited

  const { query } = await request.json()

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query is verplicht' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Preprocess query voor websearch_to_tsquery('simple'):
  // - 'simple' config doet geen Dutch-stemming, dus 'microklimaat' ≠ 'microklimaten'
  // - websearch is default AND, dus "Wat is het microklimaat in Nerja"
  //   matcht alleen chunks die ALLE 6 woorden bevatten — vrijwel altijd 0.
  // Strip stopwoorden + maak OR-logic via ' or '-separator. ts_rank zorgt
  // dat chunks met meer matches hoger eindigen.
  const STOPWORDS = new Set([
    'de', 'het', 'een', 'en', 'of', 'is', 'in', 'op', 'aan', 'naar', 'voor',
    'met', 'bij', 'om', 'door', 'over', 'uit', 'van', 'tot', 'als', 'dan',
    'dat', 'die', 'deze', 'dit', 'er', 'wat', 'wie', 'hoe', 'waar', 'wanneer',
    'waarom', 'welke', 'mijn', 'jouw', 'zijn', 'haar', 'hun', 'ons', 'we', 'ik',
    'je', 'jij', 'hij', 'zij', 'ze', 'me', 'mij', 'niet', 'wel', 'maar',
    'ook', 'nog', 'zo', 'heel', 'veel', 'meer', 'minder', 'kan', 'moet',
    'gaat', 'wordt', 'kunnen', 'zullen', 'hebben', 'heb', 'heeft', 'had',
    'the', 'and', 'or', 'on', 'at', 'to', 'for',
  ])
  const tokens = query.trim().toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  const searchQuery = tokens.length > 0 ? tokens.join(' or ') : query.trim()

  const { data: chunks, error: searchError } = await supabase
    .rpc('search_kb', { query: searchQuery, match_count: 8 })

  if (searchError) {
    console.error('Search error:', searchError)
    return NextResponse.json({ error: 'Zoekfout' }, { status: 500 })
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({
      answer: 'Ik kon geen relevante informatie vinden in de kennisbank voor deze vraag. Probeer een andere zoekterm.',
      sources: [],
    })
  }

  // Bouw context op uit chunks
  const context = chunks
    .map((c: { doc_title: string; doc_code: string; heading: string | null; content: string }) =>
      `[${c.doc_code} — ${c.doc_title}${c.heading ? ` > ${c.heading}` : ''}]\n${c.content}`
    )
    .join('\n\n---\n\n')

  // Unieke bronnen
  const sources = [...new Map(
    chunks.map((c: { doc_slug: string; doc_code: string; doc_title: string }) => [
      c.doc_slug,
      { slug: c.doc_slug, code: c.doc_code, title: c.doc_title },
    ])
  ).values()]

  // Genereer antwoord met Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `Je bent een kennisassistent voor Costa Select, een Nederlandse aankoopmakelaar actief in Spanje.
Beantwoord vragen op basis van de meegeleverde documentatie.
Antwoord altijd in het Nederlands. Wees beknopt maar volledig.
Als de documentatie het antwoord niet bevat, zeg dat eerlijk.
Verwijs waar relevant naar het documentnummer (bijv. CS-001).`,
    messages: [
      {
        role: 'user',
        content: `Documentatie:\n\n${context}\n\n---\n\nVraag: ${query}`,
      },
    ],
  })

  const answer = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ answer, sources })
}
