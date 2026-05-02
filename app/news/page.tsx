// Placeholder voor het nieuws-archief. De maandagochtend Slack-briefing
// linkt naar /news; volledige archief-UI volgt in een latere iteratie.
// Tot die tijd voorkomen we dat de dashboard-link in #cs-news een 404 oplevert.
import { PageLayout } from '@/components/page-layout'
import { Newspaper } from 'lucide-react'

export default function NewsArchivePage() {
  return (
    <PageLayout title="Nieuws-archief">
      <div
        style={{
          margin: '40px 32px',
          padding: '48px 32px',
          background: '#fff',
          border: '1px solid rgba(0,75,70,0.12)',
          borderRadius: 14,
          textAlign: 'center',
          color: '#004B46',
        }}
      >
        <Newspaper size={32} strokeWidth={1.5} color="#0EAE96" style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Archief komt binnenkort
        </h2>
        <p style={{ fontSize: 13, color: '#7A8C8B', maxWidth: 420, margin: '0 auto', lineHeight: 1.55 }}>
          De wekelijkse Costa Select briefing verschijnt elke maandagochtend in #cs-news.
          Het doorzoekbare archief van eerdere edities volgt hier in een volgende iteratie.
        </p>
      </div>
    </PageLayout>
  )
}
