'use client'

// Shared atoms gebruikt door /bezichtigingen (overview) en /bezichtigingen/[id] (detail).
// Geëxtraheerd om de Next.js anti-pattern "import from ../page" te vermijden,
// die in dev werkt maar in productie runtime-issues kan geven.

export function BzHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex justify-between items-end bg-marble shrink-0"
      style={{
        gap: 24,
        padding: '26px 36px 22px',
        borderBottom: '1px solid rgba(0,75,70,0.12)',
      }}
    >
      {children}
    </div>
  )
}

export function BzEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-body font-bold uppercase text-sun-dark"
      style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 10 }}
    >
      {children}
    </div>
  )
}

export function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center font-body font-bold text-deepsea"
      style={{
        gap: 6,
        padding: '3px 10px',
        background: '#E6F0EF',
        fontSize: 11,
        borderRadius: 999,
        letterSpacing: '0.02em',
        marginLeft: 10,
        verticalAlign: 4,
      }}
    >
      {children}
    </span>
  )
}

export function BzButton({
  variant,
  disabled,
  onClick,
  children,
  className,
}: {
  variant: 'primary' | 'sun' | 'ghost' | 'subtle'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  const styles = {
    primary: {
      background: '#004B46',
      color: '#FFFAEF',
      border: '1.5px solid #004B46',
      fontWeight: 600,
      hoverBg: '#0A6B63',
    },
    sun: {
      background: '#F5AF40',
      color: '#004B46',
      border: '1.5px solid #F5AF40',
      fontWeight: 700,
      hoverBg: '#D4921A',
    },
    ghost: {
      background: '#FFFFFF',
      color: '#004B46',
      border: '1.5px solid rgba(0,75,70,0.18)',
      fontWeight: 600,
      hoverBg: '#E6F0EF',
    },
    subtle: {
      background: 'transparent',
      color: '#5F7472',
      border: '1.5px solid transparent',
      fontWeight: 500,
      hoverBg: '#E6F0EF',
    },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-body cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap ${className ?? ''}`}
      style={{
        padding: '9px 14px',
        borderRadius: 10,
        fontSize: 12,
        letterSpacing: '0.02em',
        gap: 7,
        background: styles.background,
        color: styles.color,
        border: styles.border,
        fontWeight: styles.fontWeight,
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.background = styles.hoverBg
        if (variant === 'primary' || variant === 'sun') {
          e.currentTarget.style.borderColor = styles.hoverBg
        } else if (variant === 'ghost') {
          e.currentTarget.style.borderColor = '#004B46'
        } else if (variant === 'subtle') {
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.background = styles.background
        e.currentTarget.style.border = styles.border
        e.currentTarget.style.color = styles.color
      }}
    >
      {children}
    </button>
  )
}

export function EmptyCard({
  icon,
  title,
  text,
  cta,
}: {
  icon: React.ReactNode
  title: string
  text: string
  cta?: React.ReactNode
}) {
  return (
    <div
      className="text-center bg-white"
      style={{
        border: '1px dashed rgba(0,75,70,0.2)',
        borderRadius: 14,
        padding: '48px 24px',
      }}
    >
      <div
        className="inline-flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: '#E6F0EF',
          color: '#004B46',
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <h3
        className="font-heading font-bold text-deepsea"
        style={{ fontSize: 18, margin: '0 0 6px' }}
      >
        {title}
      </h3>
      <p
        className="font-body"
        style={{ fontSize: 13, color: '#5F7472', margin: '0 0 14px' }}
      >
        {text}
      </p>
      {cta}
    </div>
  )
}
