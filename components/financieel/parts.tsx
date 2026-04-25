'use client'

import { ArrowDownRight, ArrowUpRight, Download, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { DATE_PRESETS, type DatePreset } from '@/lib/date-utils'
import { ENTITY_LABELS, type Entity } from '@/lib/entity'

/* ── Header ──────────────────────────────────────────── */
export function FinHeader({
  title,
  subtitle,
  eyebrow = 'Costa Select · Financieel',
  children,
}: {
  title: string
  subtitle?: string
  eyebrow?: string
  children?: ReactNode
}) {
  return (
    <header className="fin-header">
      <div className="titles">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {children && <div className="fin-header-right">{children}</div>}
    </header>
  )
}

/* ── Period picker ───────────────────────────────────── */
export function FinPeriodPicker({
  value,
  onChange,
}: {
  value: DatePreset
  onChange: (v: DatePreset) => void
}) {
  return (
    <div className="fin-period" role="tablist" aria-label="Periode">
      {DATE_PRESETS.map(p => (
        <button
          key={p.value}
          type="button"
          className={value === p.value ? 'on' : ''}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

/* ── Entity switch (3 opties: cbn / overig / beide) ──── */
const ENTITY_ORDER: Entity[] = ['cbn', 'overig', 'beide']

export function FinEntitySwitch({
  value,
  onChange,
}: {
  value: Entity
  onChange: (e: Entity) => void
}) {
  return (
    <div className="fin-entity" role="tablist" aria-label="Entiteit">
      {ENTITY_ORDER.map(e => (
        <button
          key={e}
          type="button"
          className={value === e ? 'on' : ''}
          onClick={() => onChange(e)}
        >
          {ENTITY_LABELS[e]}
        </button>
      ))}
    </div>
  )
}

/* ── Sparkline (standalone SVG) ──────────────────────── */
export function FinSparkline({
  data,
  color = 'var(--sun-dark)',
  areaColor = 'rgba(245,175,64,0.16)',
  height = 38,
}: {
  data: number[]
  color?: string
  areaColor?: string
  height?: number
}) {
  if (!data || data.length < 2) {
    return <div className="fin-spark" style={{ height }} />
  }
  const w = 240
  const h = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = w / (data.length - 1)
  const pts = data.map((v, i) => [i * stepX, h - 4 - ((v - min) / range) * (h - 8)])
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  const area = `${path} L ${w},${h} L 0,${h} Z`
  return (
    <svg
      className="fin-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ height, width: '100%' }}
    >
      <path d={area} fill={areaColor} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* ── Delta pill ──────────────────────────────────────── */
export function FinDelta({
  value,
  positiveDirection = 'up',
}: {
  value: number | null | undefined
  positiveDirection?: 'up' | 'down'
}) {
  if (value == null || !isFinite(value)) {
    return <span className="fin-delta neu">—</span>
  }
  const isPositive = positiveDirection === 'up' ? value > 0 : value < 0
  const isNegative = positiveDirection === 'up' ? value < 0 : value > 0
  const cls = value === 0 ? 'neu' : isPositive ? 'pos' : isNegative ? 'neg' : 'neu'
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : null
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`fin-delta ${cls}`}>
      {Icon && <Icon />}
      {sign}
      {value.toFixed(0)}%
    </span>
  )
}

/* ── KPI ─────────────────────────────────────────────── */
export type FinKpiTone = 'default' | 'accent' | 'positive' | 'negative'

export function FinKpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  spark,
  delta,
  deltaPositive = true,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: LucideIcon
  tone?: FinKpiTone
  spark?: number[]
  delta?: number | null
  deltaPositive?: boolean
}) {
  return (
    <div className={`fin-kpi ${tone !== 'default' ? tone : ''}`}>
      <span className="fin-kpi-label">{label}</span>
      <span className="fin-kpi-value">{value}</span>
      {spark && spark.length > 1 && <FinSparkline data={spark} />}
      {(sub || delta != null) && (
        <span className="fin-kpi-foot">
          <span className="fin-kpi-sub">
            {Icon && <Icon />} {sub}
          </span>
          {delta != null && (
            <FinDelta
              value={delta}
              positiveDirection={deltaPositive ? 'up' : 'down'}
            />
          )}
        </span>
      )}
    </div>
  )
}

/* ── Hero KPI (deepsea bg + sun glow + 2-col span) ───── */
export function FinKpiHero({
  label,
  value,
  sub,
  spark,
  delta,
  deltaPositive = true,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  spark?: number[]
  delta?: number | null
  deltaPositive?: boolean
}) {
  return (
    <div className="fin-kpi hero">
      <span className="fin-kpi-label">{label}</span>
      <span className="fin-kpi-value">{value}</span>
      {spark && spark.length > 1 && (
        <FinSparkline data={spark} color="var(--sun)" areaColor="rgba(245,175,64,0.22)" />
      )}
      {(sub || delta != null) && (
        <span className="fin-kpi-foot">
          <span className="fin-kpi-sub">{sub}</span>
          {delta != null && (
            <FinDelta value={delta} positiveDirection={deltaPositive ? 'up' : 'down'} />
          )}
        </span>
      )}
    </div>
  )
}

/* ── KPI grid wrapper ────────────────────────────────── */
export function FinKpiGrid({
  cols = 4,
  children,
}: {
  cols?: 3 | 4
  children: ReactNode
}) {
  return <div className={`fin-kpi-row ${cols === 3 ? 'cols-3' : ''}`}>{children}</div>
}

/* ── Section ─────────────────────────────────────────── */
export function FinSection({
  title,
  meta,
  children,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="fin-section">
      <div className="fin-section-head">
        <h2 className="fin-section-title">{title}</h2>
        {meta && <span className="fin-section-meta">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

/* ── Target bar (3-state pill) ───────────────────────── */
export function FinTargetBar({
  label,
  pct,
  vals,
  foot,
  variant = 'deepsea',
}: {
  label: ReactNode
  pct: number
  vals?: ReactNode
  foot?: ReactNode
  variant?: 'deepsea' | 'sun'
}) {
  const safe = Math.max(0, Math.min(100, pct))
  const pillCls = safe < 60 ? 'behind' : safe < 85 ? 'warn' : 'ok'
  const pillTxt = safe < 60 ? 'Achter' : safe < 85 ? 'Bijna' : 'On track'

  return (
    <div className="fin-target">
      <div className="fin-target-head">
        <span className="fin-target-label">{label}</span>
        <span className="fin-target-pct">{safe}%</span>
      </div>
      {vals && <div className="fin-target-vals">{vals}</div>}
      <div className={`fin-target-bar ${variant === 'sun' ? 'sun' : ''}`}>
        <div className="fill" style={{ width: `${safe}%` }} />
      </div>
      <div className="fin-target-foot">
        <span className={`fin-target-pill ${pillCls}`}>{pillTxt}</span>
        {foot && <span>{foot}</span>}
      </div>
    </div>
  )
}

/* ── Export button ───────────────────────────────────── */
export function FinExport({
  onClick,
  label = 'Export CSV',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button type="button" className="fin-btn" onClick={onClick}>
      <Download /> {label}
    </button>
  )
}

/* ── Empty ───────────────────────────────────────────── */
export function FinEmpty({
  title,
  text,
}: {
  title: string
  text?: string
}) {
  return (
    <div className="fin-empty">
      <h3 className="fin-empty-title">{title}</h3>
      {text && <p className="fin-empty-text">{text}</p>}
    </div>
  )
}

/* ── Chart card wrapper ──────────────────────────────── */
export function FinChartCard({
  title,
  period,
  children,
}: {
  title: string
  period?: string
  children: ReactNode
}) {
  return (
    <div className="fin-chart-card">
      <div className="fin-chart-head">
        <h3 className="fin-chart-title">{title}</h3>
        {period && <span className="fin-chart-period">{period}</span>}
      </div>
      {children}
    </div>
  )
}
