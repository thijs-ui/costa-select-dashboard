import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export const maxDuration = 90

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BASE_SYSTEM_PROMPT = `Je bent de marketingcopywriter van Costa Select, een Nederlandse aankoopmakelaardij gespecialiseerd in Spaans vastgoed aan de kust. Je schrijft voor kopers in het segment €300.000 – €1.000.000+, voornamelijk Nederlanders en Belgen die een tweede woning of investering zoeken.

TONE OF VOICE:
Costa Select combineert twee archetypes:
- Ruler: helder, gestructureerd, doelgericht. Niet beloven maar onderbouwen. Niet overtuigen maar begeleiden naar inzicht.
- Caregiver: persoonlijk, betrokken, begrip voor wat een aankoop werkelijk betekent.

WOORDGEBRUIK:
Gebruik: kwaliteit, rust, vertrouwen, overzicht, selectie, zorgvuldig, doordacht, lange termijn, waarde, begeleiden, persoonlijk, ervaring, kennis, vrijheid, regie, helder, premium, perspectief, keuze, structuur, slim, bewust, genieten, thuis.

Vermijd ALTIJD: goedkoop, snel scoren, nu of nooit, mega, knaller, once in a lifetime, stunt, deal, koopje, hype, trend, massaal, pushen, garantie, risicoloos, speculeren, flippen, maximaal rendement, instant, viral, wow, perfect, fantastisch, ongekend, no-brainer, succes verzekerd.

SCHRIJFREGELS:
- Geen lange inleidingen. Begin direct met de inhoud.
- Eén gedachte per zin.
- Vermijd passieve constructies.
- Gebruik concrete cijfers waar mogelijk.
- Schrijf als een vertrouwde adviseur, niet als een verkoper.`

const LANG_MAP: Record<string, string> = {
  nl: 'het Nederlands',
  en: 'het Engels',
  es: 'het Spaans',
}

// Tag mapping per categorie/subcategorie
const TAG_MAP: Record<string, string[]> = {
  'social_media:linkedin': ['mkt-linkedin'],
  'social_media:instagram': ['mkt-instagram'],
  'social_media:facebook': ['mkt-facebook'],
  'advertenties:meta_ads': ['mkt-meta-ads', 'mkt-facebook-ads'],
  'advertenties:google_ads': ['mkt-google-ads'],
  'advertenties:linkedin_ads': ['mkt-linkedin-ads'],
  'website_blog:blogartikel': ['mkt-blog', 'mkt-longform'],
  'website_blog:landingspagina': ['mkt-landing'],
  'email:nieuwsbrief': ['mkt-email', 'mkt-nieuwsbrief'],
  'email:followup': ['mkt-email', 'mkt-followup'],
  'video:youtube': ['mkt-video', 'mkt-youtube'],
  'video:short': ['mkt-video', 'mkt-shorts'],
  'brochures:nieuwbouw': ['mkt-brochure', 'mkt-nieuwbouw'],
}

async function getKennisbankExamples(category: string, subcategory: string): Promise<string[]> {
  const key = `${category}:${subcategory}`
  const tags = TAG_MAP[key]
  if (!tags || tags.length === 0) return []

  try {
    const supabase = createServiceClient()
    // Zoek kb_chunks met matching tags (overlap)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('kb_chunks') as any)
      .select('content')
      .overlaps('tags', tags)
      .limit(3)

    return (data ?? []).map((d: { content: string }) => d.content).filter(Boolean)
  } catch {
    return []
  }
}

async function getFavoriteExamples(category: string, subcategory: string): Promise<string[]> {
  try {
    const supabase = createServiceClient()
    let query = supabase
      .from('marketing_content')
      .select('content')
      .eq('is_favorite', true)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(3)
    if (subcategory) query = query.eq('subcategory', subcategory)

    const { data } = await query
    return (data ?? []).map((d: { content: string }) => d.content).filter(Boolean)
  } catch {
    return []
  }
}

// POST: genereer content
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const limited = await checkRateLimit(auth.id, 'EXPENSIVE')
  if (limited) return limited

  const body = await request.json()
  const { category, subcategory, language, prompt, extra_context, content_type_instructions, length } = body

  if (!prompt) return NextResponse.json({ error: 'Prompt is verplicht' }, { status: 400 })

  // Haal voorbeelden op
  const [kbExamples, favExamples] = await Promise.all([
    getKennisbankExamples(category, subcategory),
    getFavoriteExamples(category, subcategory),
  ])

  let systemPrompt = `${BASE_SYSTEM_PROMPT}\n\nTAAL: Schrijf in ${LANG_MAP[language] || 'het Nederlands'}.\n\n${content_type_instructions || ''}`

  if (length) {
    systemPrompt += `\n\nLENGTE: ${length}`
  }

  if (kbExamples.length > 0) {
    systemPrompt += `\n\nVOORBEELDEN UIT KENNISBANK (algemene referenties):\n${kbExamples.map((e, i) => `--- Voorbeeld ${i + 1} ---\n${e.substring(0, 2000)}`).join('\n\n')}\n\nGebruik deze als referentie voor stijl, structuur en toon. Kopieer ze niet letterlijk.`
  }

  if (favExamples.length > 0) {
    systemPrompt += `\n\nJOUW EERDERE TOPCONTENT (specifieke favorieten):\n${favExamples.map((e, i) => `--- Favoriet ${i + 1} ---\n${e.substring(0, 2000)}`).join('\n\n')}\n\nDeze zijn door Costa Select gemarkeerd als zeer succesvol. Match die kwaliteit.`
  }

  const userPrompt = `${prompt}${extra_context ? `\n\nExtra context: ${extra_context}` : ''}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = message.content[0].type === 'text' ? message.content[0].text : ''

    // Genereer een korte titel (max 60 tekens) op basis van de content
    let title = ''
    try {
      const titleMsg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Geef een korte, beschrijvende titel (max 60 tekens, in het Nederlands) voor deze marketing content. Gebruik de naam/onderwerp dat erin voorkomt. Geen inleiding, alleen de titel zelf, zonder aanhalingstekens.\n\nContent:\n${content.substring(0, 1000)}`,
        }],
      })
      title = (titleMsg.content[0].type === 'text' ? titleMsg.content[0].text : '').trim().replace(/^["']|["']$/g, '').substring(0, 80)
    } catch { /* fallback: lege titel */ }

    return NextResponse.json({ content, title })
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
  const status = searchParams.get('status')

  let query = supabase.from('marketing_content').select('*').order('created_at', { ascending: false }).limit(100)
  if (category) query = query.eq('category', category)
  if (language) query = query.eq('language', language)
  if (favorite === 'true') query = query.eq('is_favorite', true)
  if (status) query = query.eq('publish_status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PUT: content updaten
export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

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
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('marketing_content').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
