'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatEuro } from '@/lib/calculations'

interface ChartData {
  maand: string
  omzet: number
  kosten: number
  winst: number
  cumulatief: number
}

export function OmzetChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="maand" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatEuro(Number(value)), '']}
          contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="omzet" name="Netto omzet" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        <Bar dataKey="kosten" name="Kosten" fill="#fca5a5" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CumulatiefChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="maand" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [formatEuro(Number(value)), '']}
          contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
        />
        <Line
          dataKey="cumulatief"
          name="Cumulatief resultaat"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#8b5cf6' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
