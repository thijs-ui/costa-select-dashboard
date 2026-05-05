// ============================================================================
// components/page-header.tsx
//
// Standaard pagina-header gebruikt door Calculator, Presentatie, Samenwerkingen,
// Kennisbank, Training, Woningbot. Eyebrow (oranje uppercase) → title (donkergroen
// Bricolage met optionele sun-gekleurde punt) → subtitle → right-aligned actions
// → divider.
//
// Houd alle 3 nieuwere pagina's (Shortlists, Nieuwbouwkaart, Costa Kompas) in
// lijn met deze pattern zodat consultants overal hetzelfde anker zien.
// ============================================================================
'use client'

interface PageHeaderProps {
  eyebrow: string
  title: string
  /**
   * Punt achter de title in sun-kleur (#F5AF40). Default true voor pagina's met
   * "Calculator." / "Woningpresentatie." / "Costa Kompas." stijl. Zet false voor
   * meerwoord-titles waar punt vreemd voelt.
   */
  titlePeriod?: boolean
  subtitle?: string
  /** Optionele inline pill naast de title (count, badge, etc.). */
  badge?: React.ReactNode
  /** Right-aligned action area (knoppen, stat-chips, etc.). */
  actions?: React.ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  titlePeriod = true,
  subtitle,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className="flex justify-between items-end bg-marble shrink-0"
      style={{
        gap: 24,
        padding: '26px 36px 22px',
        borderBottom: '1px solid rgba(0,75,70,0.12)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="font-body font-bold uppercase text-sun-dark"
          style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10 }}
        >
          {eyebrow}
        </div>
        <h1
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 4px' }}
        >
          {title}
          {titlePeriod && <span style={{ color: '#F5AF40' }}>.</span>}
          {badge && <span style={{ marginLeft: 12, verticalAlign: 4 }}>{badge}</span>}
        </h1>
        {subtitle && (
          <p className="font-body" style={{ fontSize: 13, color: '#7A8C8B', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center shrink-0" style={{ gap: 10 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
