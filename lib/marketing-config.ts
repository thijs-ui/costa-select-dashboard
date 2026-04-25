// Marketing-content config — 6 categorieën, één gedeelde generator.
// `apiCategory` en `apiSubcategory` zijn de strings die naar /api/marketing
// gaan (snake_case) — bestaande data in marketing_content gebruikt deze ids.
//
// Het laatste veld (`promptInstructions`) is wat de generator backend
// in `content_type_instructions` zet. Tijdens de eerste design-redesign
// zat dat in elke page.tsx; nu één bron van waarheid.

export interface McLanguage { id: 'nl' | 'en' | 'es'; label: string; name: string }
export interface McLength { id: 'kort' | 'middel' | 'lang'; label: string; sub: string }
export interface McRewriteTarget { id: string; label: string }

export interface McPlatform {
  id: string                    // bundle-id (URL/state)
  apiSubcategory: string        // wat naar /api/marketing als subcategory gaat
  label: string
  hint?: string
  maxChars?: number
  promptInstructions: string    // → content_type_instructions
}

export interface McCategory {
  id: string                    // korte code
  slug: string                  // /marketing/<slug>
  apiCategory: string           // wat naar /api/marketing als category gaat
  eyebrow: string
  nav: string                   // korte sidebar/nav-label
  icon: McIconName
  title: string
  subtitle: string
  promptPlaceholder: string
  showLengthSelector: boolean
  platforms: McPlatform[]
}

export type McIconName =
  | 'megaphone' | 'mail' | 'share' | 'book' | 'video' | 'globe'
  | 'sparkles' | 'wand' | 'copy' | 'rotate' | 'save' | 'star'
  | 'wand-rewrite' | 'check' | 'check-circle' | 'chevron-down'
  | 'arrow-right' | 'edit-3'

export const MC_LANGUAGES: McLanguage[] = [
  { id: 'nl', label: 'NL', name: 'Nederlands' },
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'es', label: 'ES', name: 'Español' },
]

export const MC_LENGTHS: McLength[] = [
  { id: 'kort', label: 'Kort', sub: '~50 woorden' },
  { id: 'middel', label: 'Middel', sub: '~120 woorden' },
  { id: 'lang', label: 'Lang', sub: '~250 woorden' },
]

export const MC_REWRITE_TARGETS: McRewriteTarget[] = [
  { id: 'linkedin', label: 'LinkedIn post' },
  { id: 'instagram', label: 'Instagram caption' },
  { id: 'facebook', label: 'Facebook post' },
  { id: 'meta_ads', label: 'Meta Ads copy' },
  { id: 'linkedin_ads', label: 'LinkedIn Ads copy' },
  { id: 'email', label: 'E-mail bericht' },
  { id: 'blog', label: 'Blog-intro' },
  { id: 'brochure', label: 'Brochure-tekst' },
]

export const MC_CATEGORIES: McCategory[] = [
  {
    id: 'advertenties',
    slug: 'advertenties',
    apiCategory: 'advertenties',
    eyebrow: 'Marketing',
    nav: 'Advertenties',
    icon: 'megaphone',
    title: 'Advertentie­teksten',
    subtitle: 'Genereer advertentieteksten voor Meta, Google en LinkedIn — kort, scanbaar, met duidelijke call-to-action.',
    promptPlaceholder: 'Bijv. nieuwbouw 2-onder-1-kap in Almería, gericht op Nederlandse 50-plussers, vanaf €295.000…',
    showLengthSelector: true,
    platforms: [
      {
        id: 'meta-ads', apiSubcategory: 'meta_ads', label: 'Meta Ads',
        hint: 'Facebook + Instagram', maxChars: 125,
        promptInstructions: `Je genereert Meta Ads (Facebook/Instagram) copy. Output EXACT in dit formaat:

Primary text:
[tekst] (X tekens)

Headline (max 40 tekens):
[tekst] (X tekens)

Description (max 30 tekens):
[tekst] (X tekens)

Long copy:
[tekst] (X tekens)

Voor LENGTE 'kort': Primary text max 125 tekens, Long copy max 500 tekens.
Voor LENGTE 'middel': Primary text max 300 tekens, Long copy max 1000 tekens.
Voor LENGTE 'lang': Primary text max 600 tekens, Long copy max 1500 tekens.
Headline altijd max 40. Description altijd max 30. Tel tekens inclusief spaties.`,
      },
      {
        id: 'google-ads', apiSubcategory: 'google_ads', label: 'Google Ads',
        hint: 'Search · 3 koppen · 90 tekens', maxChars: 270,
        promptInstructions: `Je genereert Google Ads copy. Output EXACT in dit formaat — exact 15 headlines en exact 5 descriptions. Geen 14, geen 16. Exact 15 en 5.

Headlines (max 30 tekens per headline):
1. [tekst] (X tekens)
2. [tekst] (X tekens)
3. [tekst] (X tekens)
4. [tekst] (X tekens)
5. [tekst] (X tekens)
6. [tekst] (X tekens)
7. [tekst] (X tekens)
8. [tekst] (X tekens)
9. [tekst] (X tekens)
10. [tekst] (X tekens)
11. [tekst] (X tekens)
12. [tekst] (X tekens)
13. [tekst] (X tekens)
14. [tekst] (X tekens)
15. [tekst] (X tekens)

Descriptions (max 90 tekens per description):
1. [tekst] (X tekens)
2. [tekst] (X tekens)
3. [tekst] (X tekens)
4. [tekst] (X tekens)
5. [tekst] (X tekens)

Zoekintentie-gericht. Gebruik zoekwoorden die de doelgroep zou typen. Varianten voor A/B testing.`,
      },
      {
        id: 'linkedin-ads', apiSubcategory: 'linkedin_ads', label: 'LinkedIn Ads',
        hint: 'Sponsored content · zakelijk', maxChars: 600,
        promptInstructions: `Je genereert LinkedIn Ads copy. Output EXACT in dit formaat:

Intro text:
[tekst] (X tekens)

Headline (max 70 tekens):
[tekst] (X tekens)

Description:
[tekst] (X tekens)

Voor LENGTE 'kort': Intro text max 100 tekens, Description max 100 tekens.
Voor LENGTE 'middel': Intro text max 150 tekens, Description max 200 tekens.
Voor LENGTE 'lang': Intro text max 300 tekens, Description max 300 tekens.
Headline altijd max 70.

Professioneel, gericht op investeerders of beslissers. Geen hype, wel urgentie door informatiewaarde.`,
      },
    ],
  },
  {
    id: 'email',
    slug: 'email',
    apiCategory: 'email',
    eyebrow: 'Marketing',
    nav: 'Email',
    icon: 'mail',
    title: 'E-mail campagnes',
    subtitle: 'Genereer nieuwsbrieven, project-aankondigingen en drip campagnes — onderwerpregel + body in één keer.',
    promptPlaceholder: 'Bijv. maandelijkse nieuwsbrief over 3 nieuwe projecten in Costa Blanca, voor warme leads…',
    showLengthSelector: false,
    platforms: [
      { id: 'newsletter', apiSubcategory: 'nieuwsbrief', label: 'Nieuwsbrief',
        hint: 'Maandelijks · gemengde inhoud',
        promptInstructions: 'Schrijf een nieuwsbrief. Structuur: pakkende onderwerpregel + preview-tekst (max 90 tekens) + intro (2-3 zinnen) + 2-3 content-blokken met kop + alinea + CTA per blok. Afsluitend blok met persoonlijke noot. Label de onderwerpregel en preview-tekst apart.' },
      { id: 'announce', apiSubcategory: 'project_aankondiging', label: 'Project-aankondiging',
        hint: 'Eénmalig · één project',
        promptInstructions: 'Schrijf een email gericht op één nieuwbouwproject of kans. Onderwerpregel + korte intro + project-highlights + CTA naar brochure of afspraak. Label de onderwerpregel apart.' },
      { id: 'follow-up', apiSubcategory: 'followup', label: 'Follow-up mail',
        hint: 'Na bezichtiging of contact',
        promptInstructions: 'Schrijf een follow-up email na een bezichtiging of gesprek. Persoonlijk, kort, 1 duidelijke volgende stap. Label de onderwerpregel apart.' },
      { id: 'drip', apiSubcategory: 'drip', label: 'Drip campagne',
        hint: '5-staps · over 3 weken',
        promptInstructions: 'Genereer een reeks van 3-5 emails met een rode draad. Per email: onderwerpregel + korte tekst + CTA. Geef timing-suggestie (dag 1, dag 3, dag 7, etc.). Nummer elke email duidelijk.' },
    ],
  },
  {
    id: 'social',
    slug: 'social-media',
    apiCategory: 'social_media',
    eyebrow: 'Marketing',
    nav: 'Social media',
    icon: 'share',
    title: 'Social media',
    subtitle: 'Genereer posts voor LinkedIn, Instagram en Facebook — afgestemd op platform-lengte en toon.',
    promptPlaceholder: 'Bijv. 3 posts over de stijgende vraag naar nieuwbouw in Costa del Sol, link naar marktrapport…',
    showLengthSelector: false,
    platforms: [
      { id: 'linkedin', apiSubcategory: 'linkedin', label: 'LinkedIn',
        hint: 'Zakelijk · max 3000 tekens', maxChars: 3000,
        promptInstructions: 'Schrijf een LinkedIn post. Professionele toon, mag langer en diepgaander. Gebruik alinea\'s. Eindig met een duidelijke CTA of vraag. Max 3-5 hashtags onderaan, gescheiden van de tekst.' },
      { id: 'instagram', apiSubcategory: 'instagram', label: 'Instagram',
        hint: 'Visueel · max 2200 tekens', maxChars: 2200,
        promptInstructions: 'Schrijf een Instagram caption. Eerste zin moet direct pakken (wordt afgekapt na ~125 tekens). Eindig met 1 CTA. Max 15 relevante hashtags onderaan. Gebruik emoji\'s spaarzaam (max 3-4).' },
      { id: 'facebook', apiSubcategory: 'facebook', label: 'Facebook',
        hint: 'Conversational · max 2000 tekens', maxChars: 2000,
        promptInstructions: 'Schrijf een Facebook post. Toegankelijker dan LinkedIn, persoonlijker. Mag wat losser maar blijf professioneel. Eindig met een CTA. Geen hashtags.' },
    ],
  },
  {
    id: 'brochures',
    slug: 'brochures',
    apiCategory: 'brochures',
    eyebrow: 'Marketing',
    nav: 'Brochures',
    icon: 'book',
    title: 'Brochures',
    subtitle: 'Genereer teksten voor project-, regio- en corporate brochures — editorial en print-klaar.',
    promptPlaceholder: 'Bijv. brochure voor villa-project La Cala, accent op zeezicht, golf en internationale school…',
    showLengthSelector: false,
    platforms: [
      { id: 'project', apiSubcategory: 'nieuwbouw', label: 'Nieuwbouw­project',
        hint: '1 project · 4-6 secties',
        promptInstructions: 'Schrijf brochure-tekst voor een nieuwbouwproject. Secties: intro (over het project), over het project (architectuur, indeling), kenmerken & faciliteiten, materialen & afwerking, locatie & omgeving, beschikbare units (placeholder). Gebruik markdown met H2 koppen per sectie.' },
      { id: 'region', apiSubcategory: 'regio', label: 'Regio-brochure',
        hint: 'Regio-overzicht',
        promptInstructions: 'Schrijf tekst over een specifieke regio als aanvulling op projectbrochures. Behandel: sfeer, levensstijl, bereikbaarheid, marktpositie, waarom hier kopen. 600-1000 woorden.' },
      { id: 'corporate', apiSubcategory: 'corporate', label: 'Corporate brochure',
        hint: 'Over Costa Select',
        promptInstructions: 'Schrijf over Costa Select zelf: wie zijn we, wat doen we, hoe werken we, waarom kiezen voor ons. Premium tone of voice, vertrouwenwekkend.' },
    ],
  },
  {
    id: 'video',
    slug: 'video',
    apiCategory: 'video',
    eyebrow: 'Marketing',
    nav: 'Video',
    icon: 'video',
    title: 'Video content',
    subtitle: 'Genereer titels, beschrijvingen en scripts voor YouTube, Reels en Shorts.',
    promptPlaceholder: 'Bijv. video-tour van een 3-kamer appartement in Estepona, gericht op 45-60 jarige Nederlanders…',
    showLengthSelector: false,
    platforms: [
      { id: 'youtube-long', apiSubcategory: 'youtube', label: 'YouTube video',
        hint: 'Titel + beschrijving · long-form',
        promptInstructions: 'Genereer voor een YouTube video:\n- Titel (max 100 tekens, pakkend, zoekbaar)\n- Beschrijving (1000-2000 tekens met timestamps-structuur, links, CTA)\n- 10-15 tags\n\nLabel elk onderdeel duidelijk.' },
      { id: 'youtube-short', apiSubcategory: 'short', label: 'YouTube Short / Reel',
        hint: 'Titel + caption · 60 sec',
        promptInstructions: 'Schrijf een kort script voor 30-60 seconden. Haakje in eerste 3 seconden. Duidelijke CTA aan het einde. Schrijf als gesproken tekst.' },
      { id: 'script-long', apiSubcategory: 'script_lang', label: 'Videoscript (lang)',
        hint: '~3-5 min · met scene-cues',
        promptInstructions: 'Schrijf een volledig script voor een 3-10 minuten video. Structuur: haakje (5 sec) + intro (30 sec) + kern (2-8 min) + CTA + outro. Schrijf als gesproken tekst, niet als artikel. Gebruik [BEELD: ...] notaties voor visuele suggesties.' },
      { id: 'script-short', apiSubcategory: 'script_kort', label: 'Videoscript (kort)',
        hint: '~30-60 sec · vertical',
        promptInstructions: 'Schrijf een script voor een 30-90 seconden video (social media). Haakje + kern + CTA. Kort, punchy. Schrijf als gesproken tekst.' },
    ],
  },
  {
    id: 'website',
    slug: 'website-blog',
    apiCategory: 'website_blog',
    eyebrow: 'Marketing',
    nav: 'Website & Blog',
    icon: 'globe',
    title: 'Website & Blog',
    subtitle: 'Genereer blogartikelen, regiopagina’s en landingspagina’s — SEO-vriendelijk en op maat.',
    promptPlaceholder: 'Bijv. blogartikel "10 dingen om te weten voor je een huis koopt in Spanje", voor SEO op nieuwbouw + Costa…',
    showLengthSelector: false,
    platforms: [
      { id: 'blog', apiSubcategory: 'blogartikel', label: 'Blogartikel',
        hint: '800-1200 woorden · SEO',
        promptInstructions: 'Schrijf een SEO-geoptimaliseerd blogartikel van 800-1500 woorden. Genereer ook:\n- Meta title (max 60 tekens)\n- Meta description (max 155 tekens)\n- 3 suggesties voor interne links\n\nGebruik H2 en H3 subkoppen. Schrijf in markdown-formaat.' },
      { id: 'region', apiSubcategory: 'regiopagina', label: 'Regiopagina',
        hint: 'Cornerstone · evergreen',
        promptInstructions: 'Schrijf een informatiepagina over een specifieke regio van 600-1000 woorden. Structuur: intro, wat maakt deze regio bijzonder, type woningen, prijsniveau, bereikbaarheid, voor wie geschikt. Genereer ook meta title + description. Markdown-formaat.' },
      { id: 'landing', apiSubcategory: 'landingspagina', label: 'Landingspagina',
        hint: 'Conversie · 1 doel',
        promptInstructions: 'Schrijf conversie-gerichte tekst voor een landingspagina van 300-600 woorden. Korte intro, 3-5 voordelen/USP\'s, sociale proof-element, duidelijke CTA. Geen lange verhalen.' },
      { id: 'faq', apiSubcategory: 'faq', label: 'FAQ-sectie',
        hint: '6-10 vragen',
        promptInstructions: 'Genereer 5-10 veelgestelde vragen met antwoorden. Antwoorden max 3-4 zinnen per vraag. Gebruik Q: en A: format.' },
    ],
  },
]

export function mcGetCategory(idOrSlug: string): McCategory {
  return MC_CATEGORIES.find(c => c.id === idOrSlug || c.slug === idOrSlug) || MC_CATEGORIES[0]
}
