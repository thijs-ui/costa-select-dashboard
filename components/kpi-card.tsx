interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber'
}

const colorMap: Record<NonNullable<KpiCardProps['color']>, string> = {
  default: '#004B46',
  green: '#0EAE96',
  red: '#E05252',
  blue: '#004B46',
  amber: '#F5AF40',
}

export default function KpiCard({ label, value, sub, color = 'default' }: KpiCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0,75,70,0.12)',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-body, sans-serif)',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#7A8C8B',
          fontWeight: 500,
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading, sans-serif)',
          fontSize: '22px',
          fontWeight: 600,
          color: colorMap[color],
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: '12px',
            color: '#7A8C8B',
            marginTop: '4px',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
