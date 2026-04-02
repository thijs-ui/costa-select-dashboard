'use client'

import { DATE_PRESETS, DatePreset } from '@/lib/date-utils'

interface DateFilterProps {
  value: DatePreset
  onChange: (preset: DatePreset) => void
}

export default function DateFilter({ value, onChange }: DateFilterProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {DATE_PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={
            value === p.value
              ? { backgroundColor: '#004B46', color: '#FFFFFF', border: '1px solid #004B46' }
              : { backgroundColor: '#FFFFFF', color: '#7A8C8B', border: '1px solid rgba(0,75,70,0.15)' }
          }
          className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors hover:opacity-90 whitespace-nowrap"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
