import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BASE_SYSTEM_PROMPT = `Je bent de marketingcopywriter van Costa Select, een Nederlandse aankoopmakelaardij gespecialiseerd in Spaans vastgoed aan de kust. Je schrijft voor kopers in het segment €300.000 – €1.000.000+, voornamelijk Nederlanders en Belgen die een tweede woning of investering zoeken.

TONE OF VOICE:
Costa Select combineert twee archetypes:
- Ruler: helder, gestructureerd, doelgericht. Niet beloven maar onderbouwen. Niet overtuigen maar begeleiden naar inzicht.
- Caregiver: persoonlijk, betrokken, begrip voor wat een aankoop werkelijk betekent.

Resultaat: een stem die richting geeft zonder te pushen, helder is zonder afstandelijk te worden, en vertrouwen biedt zonder te overdrijven.

WOORDGEBRUIK:
Gebruik: kwaliteit, rust, vertrouwen, overzicht, selectie, zorgvuldig, doordacht, lange termijn, waarde, begeleiden, persoonlijk, ervaring, kennis, vrijheid, regie, helder, premium, perspectief, keuze, structuur, slim, bewust, genieten, thuis.

Vermijd ALTIJD: goedkoop, snel scoren, nu of nooit, mega, knaller, once in a lifetime, stunt, deal, koopje, hype, trend, massaal, pushen, garantie, risicoloos, speculeren, flippen, maximaal rendement, instant, viral, wow, perfect, fantastisch, ongekend, no-brainer, succes verzekerd.

SCHRIJFREGELS:
- Geen lange inleidingen. Begin direct met de inhoud.
- Eén gedachte per zin. Geen bijzinnen bij bijzinnen.
- Vermijd passieve constructies.
- Gebruik concrete cijfers waar mogelijk.
- Schrijf als een vertrouwde adviseur, niet als een verkoper.`

const LANG_MAP: Record<string, string> = {
  nl: 'het Nederlands',
  en: 'het Engels',
  es: 'het Spaans',
}

// POST: genereer content
export async function POST(request: Request) {
  const body = await request.json()
  const { category, subcategory, language, prompt, extra_context, content_type_instructions } = body

  if (!prompt) return NextResponse.json({ error: 'Prompt is verplicht' }, { status: 400 })

  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nTAAL: Schrijf in ${LANG_MAP[language] || 'het Nederlands'}. Als de taal Engels of Spaans is, behoud dezelfde tone of voice.\n\n${content_type_instructions || ''}`

  const userPrompt = `${prompt}${extra_context ? `\n\nExtra context: ${extra_context}` : ''}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ content })
  } catch (err) {
    console.error('Marketing generate failed:', err)
    return NextResponse.json({ error: 'Content genereren mislukt' }, { status: 500 })
  }
}

// GET: bibliotheek ophalen
export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const language = searchParams.get('language')
  const favorite = searchParams.get('favorite')

  let query = supabase.from('marketing_content').select('*').order('created_at', { ascending: false }).limit(50)
  if (category) query = query.eq('category', category)
  if (language) query = query.eq('language', language)
  if (favorite === 'true') query = query.eq('is_favorite', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PUT: content updaten
export async function PUT(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  updates.updated_at = new Date().toISOString()
  const { error } = await supabase.from('marketing_content').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: content verwijderen
export async function DELETE(request: Request) {
  const supabase = createServiceClient()
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('marketing_content').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
