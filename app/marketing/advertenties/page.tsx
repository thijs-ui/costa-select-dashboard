'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  {
    key: 'meta_ads', label: 'Meta Ads',
    instructions: `Je genereert Meta Ads (Facebook/Instagram) copy. Output EXACT in dit formaat:

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
    key: 'google_ads', label: 'Google Ads',
    instructions: `Je genereert Google Ads copy. Output EXACT in dit formaat — exact 15 headlines en exact 5 descriptions. Geen 14, geen 16. Exact 15 en 5.

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
    key: 'linkedin_ads', label: 'LinkedIn Ads',
    instructions: `Je genereert LinkedIn Ads copy. Output EXACT in dit formaat:

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
]

export default function AdvertentiesPage() {
  return (
    <PageLayout title="Advertenties" subtitle="Genereer advertentieteksten voor Meta, Google en LinkedIn">
      <ContentGenerator category="advertenties" platforms={PLATFORMS} placeholder="Campagne-onderwerp of product..." showLengthSelector />
    </PageLayout>
  )
}
