'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'nieuwbouw', label: 'Nieuwbouwproject', instructions: 'Schrijf brochure-tekst voor een nieuwbouwproject. Secties: intro (over het project), over het project (architectuur, indeling), kenmerken & faciliteiten, materialen & afwerking, locatie & omgeving, beschikbare units (placeholder). Gebruik markdown met H2 koppen per sectie.' },
  { key: 'regio', label: 'Regio-brochure', instructions: 'Schrijf tekst over een specifieke regio als aanvulling op projectbrochures. Behandel: sfeer, levensstijl, bereikbaarheid, marktpositie, waarom hier kopen. 600-1000 woorden.' },
  { key: 'corporate', label: 'Corporate brochure', instructions: 'Schrijf over Costa Select zelf: wie zijn we, wat doen we, hoe werken we, waarom kiezen voor ons. Premium tone of voice, vertrouwenwekkend.' },
]

export default function BrochuresPage() {
  return (
    <PageLayout title="Brochures" subtitle="Genereer teksten voor project-, regio- en corporate brochures">
      <ContentGenerator category="brochures" platforms={PLATFORMS} placeholder="Projectnaam of onderwerp..." />
    </PageLayout>
  )
}
