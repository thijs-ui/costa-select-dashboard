import type { Specialist } from '@/lib/kompas-v2/meta'

export default function SpecialistButtons({
  specialist,
  stacked,
}: {
  specialist: Specialist | undefined
  stacked?: boolean
}) {
  if (!specialist) return null
  const waHref = specialist.whatsapp
    ? `https://wa.me/${specialist.whatsapp.replace(/[^\d]/g, '')}`
    : '#'
  const telHref = specialist.phone ? `tel:${specialist.phone.replace(/\s+/g, '')}` : '#'

  return (
    <div className={`specialist ${stacked ? 'specialist--stacked' : ''}`}>
      <div className="specialist__meta">
        <div className="specialist__role">Spreek onze {specialist.role}</div>
        <div className="specialist__name">{specialist.name}</div>
      </div>
      <div className="specialist__buttons">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--tiny specialist__wa"
          title="Chat via WhatsApp"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.52 3.48A11.84 11.84 0 0 0 12 0C5.37 0 0 5.37 0 12a11.9 11.9 0 0 0 1.7 6.13L0 24l6.02-1.58A11.9 11.9 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 21.82a9.8 9.8 0 0 1-5-1.36l-.36-.21-3.57.94.95-3.48-.23-.36A9.8 9.8 0 1 1 12 21.82zm5.38-7.32c-.29-.15-1.7-.84-1.97-.93-.26-.1-.45-.15-.64.15s-.73.92-.9 1.11c-.17.19-.33.22-.62.07-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.44-1.72-1.61-2.02-.17-.29-.02-.44.13-.59.13-.13.29-.34.44-.51.15-.17.2-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.54-.87-2.12-.23-.55-.46-.47-.64-.48h-.54c-.19 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.43s1.04 2.82 1.19 3.02c.15.19 2.05 3.13 4.96 4.39.69.3 1.23.48 1.65.62.69.22 1.32.19 1.82.11.56-.08 1.7-.69 1.94-1.36.24-.67.24-1.25.17-1.37-.07-.12-.27-.19-.56-.34z" />
          </svg>
          WhatsApp
        </a>
        <a href={telHref} className="btn btn--tiny specialist__tel" title={`Bel ${specialist.name}`}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Bel
        </a>
      </div>
    </div>
  )
}
