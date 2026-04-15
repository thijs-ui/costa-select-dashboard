'use client'
import { PageLayout } from '@/components/page-layout'
import ContentGenerator from '@/components/marketing/ContentGenerator'

const PLATFORMS = [
  { key: 'nieuwsbrief', label: 'Nieuwsbrief', instructions: 'Schrijf een nieuwsbrief. Structuur: pakkende onderwerpregel + preview-tekst (max 90 tekens) + intro (2-3 zinnen) + 2-3 content-blokken met kop + alinea + CTA per blok. Afsluitend blok met persoonlijke noot. Label de onderwerpregel en preview-tekst apart.' },
  { key: 'project_aankondiging', label: 'Project-aankondiging', instructions: 'Schrijf een email gericht op één nieuwbouwproject of kans. Onderwerpregel + korte intro + project-highlights + CTA naar brochure of afspraak. Label de onderwerpregel apart.' },
  { key: 'followup', label: 'Follow-up mail', instructions: 'Schrijf een follow-up email na een bezichtiging of gesprek. Persoonlijk, kort, 1 duidelijke volgende stap. Label de onderwerpregel apart.' },
  { key: 'drip', label: 'Drip campagne', instructions: 'Genereer een reeks van 3-5 emails met een rode draad. Per email: onderwerpregel + korte tekst + CTA. Geef timing-suggestie (dag 1, dag 3, dag 7, etc.). Nummer elke email duidelijk.' },
]

export default function EmailPage() {
  return (
    <PageLayout title="Email" subtitle="Genereer nieuwsbrieven, project-aankondigingen en drip campagnes">
      <ContentGenerator category="email" platforms={PLATFORMS} placeholder="Onderwerp van de email..." />
    </PageLayout>
  )
}
