'use client'

import { OmzetChart, CumulatiefChart } from '@/components/dashboard-charts'

interface ChartData {
  maand: string
  omzet: number
  kosten: number
  winst: number
  cumulatief: number
  deals: number
}

export default function DashboardClient({ chartData }: { chartData: ChartData[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Omzet & kosten per maand</h2>
        <OmzetChart data={chartData} />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Cumulatief resultaat</h2>
        <CumulatiefChart data={chartData} />
      </div>
    </div>
  )
}
