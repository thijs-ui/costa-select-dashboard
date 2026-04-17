import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/auth/permissions'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  linkedin: 'LinkedIn post: professioneel, mag langer en diepgaander. Gebruik alinea\'s. Eindig met CTA of vraag. Max 3000 tekens. Max 3-5 hashtags onderaan.',
  instagram: 'Instagram caption: eerste zin moet direct pakken. Eindig met CTA. Max 2200 tekens. Max 15 hashtags onderaan. Gebruik emoji\'s spaarzaam.',
  facebook: 'Facebook post: toegankelijker en persoonlijker. Max 2000 tekens. Geen hashtags. Eindig met CTA.',
  meta_ads: 'Meta Ads copy in 4 formaten: Primary text (max 300), Headline (max 40), Description (max 30), Long copy (max 1000). Label elk duidelijk.',
  linkedin_ads: 'LinkedIn Ads: Intro text (max 150), Headline (max 70), Description (max 200). Professioneel, gericht op investeerders.',
  email: 'Email nieuwsbrief: pakkende onderwerpregel + preview-tekst + intro + 2-3 content-blokken met CTA per blok. Label onderwerpregel apart.',
  blog: 'SEO-geoptimaliseerd blogartikel van 800-1500 woorden met H2/H3 koppen. Markdown.',
  brochure: 'Brochure-tekst met structuur: intro, project/onderwerp details, locatie, CTA.',
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { content, sourcePlatform, targetPlatform } = await request.json()
  if (!content || !targetPlatform) return NextResponse.json({ error: 'content en targetPlatform zijn verplicht' }, { status: 400 })

  const instruction = PLATFORM_INSTRUCTIONS[targetPlatform] || ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Je bent de marketingcopywriter van Costa Select. Behoud de tone of voice: helder, direct, eerlijk, geen overdrijving. Behoud dezelfde praatpunten en insteek — alleen de vorm aanpassen aan het doelplatform.`,
      messages: [{
        role: 'user',
        content: `Herschrijf deze content${sourcePlatform ? ` (origineel voor ${sourcePlatform})` : ''} voor ${targetPlatform}:\n\n${content}\n\nPlatform-instructies: ${instruction}\n\nBehoud exact dezelfde kernboodschap, praatpunten en insteek. Alleen de vorm, lengte en structuur aanpassen aan het nieuwe platform.`,
      }],
    })

    const newContent = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ content: newContent })
  } catch (err) {
    console.error('Rewrite failed:', err)
    return NextResponse.json({ error: 'Herschrijven mislukt' }, { status: 500 })
  }
}
