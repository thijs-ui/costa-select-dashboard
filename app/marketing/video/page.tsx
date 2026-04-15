'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube video', instructions: 'Genereer voor een YouTube video:\n- Titel (max 100 tekens, pakkend, zoekbaar)\n- Beschrijving (1000-2000 tekens met timestamps-structuur, links, CTA)\n- 10-15 tags\n\nLabel elk onderdeel duidelijk.' },
  { key: 'short', label: 'YouTube Short / Reel', instructions: 'Schrijf een kort script voor 30-60 seconden. Haakje in eerste 3 seconden. Duidelijke CTA aan het einde. Schrijf als gesproken tekst.' },
  { key: 'script_lang', label: 'Videoscript (lang)', instructions: 'Schrijf een volledig script voor een 3-10 minuten video. Structuur: haakje (5 sec) + intro (30 sec) + kern (2-8 min) + CTA + outro. Schrijf als gesproken tekst, niet als artikel. Gebruik [BEELD: ...] notaties voor visuele suggesties.' },
  { key: 'script_kort', label: 'Videoscript (kort)', instructions: 'Schrijf een script voor een 30-90 seconden video (social media). Haakje + kern + CTA. Kort, punchy. Schrijf als gesproken tekst.' },
]

export default function VideoPage() {
  return (
    <PageLayout title="Video" subtitle="Genereer titels, beschrijvingen en scripts voor video content">
      <ContentGenerator category="video" platforms={PLATFORMS} placeholder="Video-concept of onderwerp..." />
    </PageLayout>
  )
}
