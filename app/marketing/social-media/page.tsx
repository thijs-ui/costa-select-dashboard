'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', maxChars: 3000, instructions: 'Schrijf een LinkedIn post. Professionele toon, mag langer en diepgaander. Gebruik alinea\'s. Eindig met een duidelijke CTA of vraag. Max 3-5 hashtags onderaan, gescheiden van de tekst.' },
  { key: 'instagram', label: 'Instagram', maxChars: 2200, instructions: 'Schrijf een Instagram caption. Eerste zin moet direct pakken (wordt afgekapt na ~125 tekens). Eindig met 1 CTA. Max 15 relevante hashtags onderaan. Gebruik emoji\'s spaarzaam (max 3-4).' },
  { key: 'facebook', label: 'Facebook', maxChars: 2000, instructions: 'Schrijf een Facebook post. Toegankelijker dan LinkedIn, persoonlijker. Mag wat losser maar blijf professioneel. Eindig met een CTA. Geen hashtags.' },
]

export default function SocialMediaPage() {
  return (
    <PageLayout title="Social Media" subtitle="Genereer posts voor LinkedIn, Instagram en Facebook">
      <ContentGenerator category="social_media" platforms={PLATFORMS} placeholder="Schrijf een post over..." />
    </PageLayout>
  )
}
