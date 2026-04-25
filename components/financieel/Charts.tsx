'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatEuro } from '@/lib/calculations'

export interface FinChartData {
  maand: string
  omzet: number
  kosten: number
  winst: number
  cumulatief: number
  deals?: number
}

const AXIS_TICK = { fontSize: 10.5, fill: '#7A8C8B' }
const GRID_STROKE = 'rgba(0,75,70,0.08)'
const TOOLTIP_STYLE = {
  border: '1px solid rgba(0,75,70,0.16)',
  borderRadius: 10,
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  background: '#ffffff',
  padding: '8px 10px',
  color: '#004B46',
} as const

const eurFormatter = (v: number) => `€${(v / 1000).toFixed(0)}k`

function tooltipFormat(value: unknown): [string, string] {
  return [formatEuro(Number(value)), '']
}

export function FinOmzetChart({ data, height = 220 }: { data: FinChartData[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="maand" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={eurFormatter} />
        <Tooltip formatter={tooltipFormat} contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(0,75,70,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
        <Bar dataKey="omzet" name="Netto omzet" fill="#004B46" radius={[4, 4, 0, 0]} />
        <Bar dataKey="kosten" name="Kosten" fill="#F5AF40" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function FinCumulatiefChart({ data, height = 220 }: { data: FinChartData[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fin-cumulatief-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5AF40" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#F5AF40" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="maand" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={eurFormatter} />
        <Tooltip formatter={tooltipFormat} contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgba(0,75,70,0.18)' }} />
        <Area
          type="monotone"
          dataKey="cumulatief"
          name="Cumulatief resultaat"
          stroke="#D4921A"
          strokeWidth={2}
          fill="url(#fin-cumulatief-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function FinWinstChart({ data, height = 200 }: { data: FinChartData[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="maand" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={eurFormatter} />
        <Tooltip formatter={tooltipFormat} contentStyle={TOOLTIP_STYLE} />
        <Line
          dataKey="winst"
          name="Brutowinst"
          stroke="#004B46"
          strokeWidth={2}
          dot={{ r: 3, fill: '#004B46' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ── Stacked area: omzet + kosten + winst-line ───────── */
export function FinStackedAreaChart({
  data,
  height = 260,
}: {
  data: FinChartData[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fin-stack-omzet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004B46" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#004B46" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fin-stack-kosten" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c24040" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#c24040" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="maand" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={eurFormatter} />
        <Tooltip formatter={tooltipFormat} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
        <Area
          type="monotone"
          dataKey="omzet"
          name="Netto omzet"
          stroke="#004B46"
          strokeWidth={2}
          fill="url(#fin-stack-omzet)"
        />
        <Area
          type="monotone"
          dataKey="kosten"
          name="Kosten"
          stroke="#c24040"
          strokeWidth={1.8}
          strokeDasharray="3 3"
          fill="url(#fin-stack-kosten)"
        />
        <Line
          type="monotone"
          dataKey="winst"
          name="Brutowinst"
          stroke="#D4921A"
          strokeWidth={2.4}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Donut (custom SVG, brand-palette) ────────────────── */
export interface DonutSlice {
  label: string
  value: number
  color?: string
}

const DONUT_PALETTE = [
  '#004B46',
  '#0A6B63',
  '#F5AF40',
  '#D4921A',
  '#FFE5BD',
  '#7A8C8B',
  '#c24040',
  '#10b981',
]

export function FinDonut({
  data,
  size = 200,
  total: totalOverride,
  totalLabel = 'Totaal',
}: {
  data: DonutSlice[]
  size?: number
  total?: number
  totalLabel?: string
}) {
  const total = totalOverride ?? data.reduce((s, d) => s + d.value, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 20
  const rIn = r * 0.62
  const arcs = data.reduce<{
    path: string
    color: string
    pct: number
    label: string
    value: number
  }[]>((acc, d, i) => {
    const start = acc.length > 0
      ? -Math.PI / 2 + (acc.reduce((s, a) => s + a.value, 0) / Math.max(1, total)) * Math.PI * 2
      : -Math.PI / 2
    const frac = total > 0 ? d.value / total : 0
    const end = start + frac * Math.PI * 2
    const large = frac > 0.5 ? 1 : 0
    const x0 = cx + Math.cos(start) * r
    const y0 = cy + Math.sin(start) * r
    const x1 = cx + Math.cos(end) * r
    const y1 = cy + Math.sin(end) * r
    const xi0 = cx + Math.cos(start) * rIn
    const yi0 = cy + Math.sin(start) * rIn
    const xi1 = cx + Math.cos(end) * rIn
    const yi1 = cy + Math.sin(end) * rIn
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${rIn} ${rIn} 0 ${large} 0 ${xi0} ${yi0} Z`
    acc.push({
      path,
      color: d.color ?? DONUT_PALETTE[i % DONUT_PALETTE.length],
      pct: Math.round(frac * 100),
      label: d.label,
      value: d.value,
    })
    return acc
  }, [])

  return (
    <div className="fin-donut-wrap">
      <svg
        className="fin-donut-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} />
        ))}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontFamily="Bricolage Grotesque"
          fontWeight="700"
          fontSize="20"
          fill="#004B46"
        >
          {formatEuro(total).replace(/\s/g, ' ')}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="10"
          letterSpacing="0.1em"
          fill="#7A8C8B"
          fontFamily="Raleway"
        >
          {totalLabel.toUpperCase()}
        </text>
      </svg>
      <div className="fin-donut-legend">
        {arcs.map((a, i) => (
          <div className="fin-donut-row" key={i}>
            <span className="swatch" style={{ background: a.color }} />
            <span className="lbl">{a.label}</span>
            <span className="pct">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
