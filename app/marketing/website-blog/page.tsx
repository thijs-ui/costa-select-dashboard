'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'blogartikel', label: 'Blogartikel', instructions: 'Schrijf een SEO-geoptimaliseerd blogartikel van 800-1500 woorden. Genereer ook:\n- Meta title (max 60 tekens)\n- Meta description (max 155 tekens)\n- 3 suggesties voor interne links\n\nGebruik H2 en H3 subkoppen. Schrijf in markdown-formaat.' },
  { key: 'regiopagina', label: 'Regiopagina', instructions: 'Schrijf een informatiepagina over een specifieke regio van 600-1000 woorden. Structuur: intro, wat maakt deze regio bijzonder, type woningen, prijsniveau, bereikbaarheid, voor wie geschikt. Genereer ook meta title + description. Markdown-formaat.' },
  { key: 'landingspagina', label: 'Landingspagina', instructions: 'Schrijf conversie-gerichte tekst voor een landingspagina van 300-600 woorden. Korte intro, 3-5 voordelen/USP\'s, sociale proof-element, duidelijke CTA. Geen lange verhalen.' },
  { key: 'faq', label: 'FAQ-sectie', instructions: 'Genereer 5-10 veelgestelde vragen met antwoorden. Antwoorden max 3-4 zinnen per vraag. Gebruik Q: en A: format.' },
]

export default function WebsiteBlogPage() {
  return (
    <PageLayout title="Website & Blog" subtitle="Genereer blogartikelen, regiopagina's en landingspagina's">
      <ContentGenerator category="website_blog" platforms={PLATFORMS} placeholder="Onderwerp of zoekwoord..." />
    </PageLayout>
  )
}
