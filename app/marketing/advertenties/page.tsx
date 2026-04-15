'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'meta_ads', label: 'Meta Ads', instructions: 'Genereer Meta Ads copy in vier formaten:\n1. Primary text (max 125 tekens) — het haakje\n2. Headline (max 40 tekens) — kernboodschap\n3. Description (max 30 tekens) — CTA\n4. Long copy (max 1000 tekens) — uitgebreide versie\n\nLabel elk formaat duidelijk. Kort, punchy, actiegericht.' },
  { key: 'google_ads', label: 'Google Ads', instructions: 'Genereer Google Ads copy:\n- 5 Headlines (elk max 30 tekens)\n- 3 Descriptions (elk max 90 tekens)\n\nZoekintentie-gericht. Gebruik zoekwoorden die de doelgroep zou typen. Genereer varianten voor A/B testing. Label elk duidelijk.' },
  { key: 'linkedin_ads', label: 'LinkedIn Ads', instructions: 'Genereer LinkedIn Ads copy:\n- Intro text (max 150 tekens)\n- Headline (max 70 tekens)\n- Description (max 100 tekens)\n\nProfessioneel, gericht op investeerders of beslissers. Geen hype, wel urgentie door informatiewaarde.' },
]

export default function AdvertentiesPage() {
  return (
    <PageLayout title="Advertenties" subtitle="Genereer advertentieteksten voor Meta, Google en LinkedIn">
      <ContentGenerator category="advertenties" platforms={PLATFORMS} placeholder="Campagne-onderwerp of product..." />
    </PageLayout>
  )
}
