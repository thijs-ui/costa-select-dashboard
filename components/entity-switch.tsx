'use client'

import { Entity, ENTITY_LABELS } from '@/lib/entity'

const SUBLABELS: Record<Entity, string> = {
  cbn: 'Costa Blanca Noord',
  overig: 'CBZ, CDS, CD, CB & Valencia',
  beide: 'Beide entiteiten',
}

interface Props {
  value: Entity
  onChange: (e: Entity) => void
}

export default function EntitySwitch({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Entiteit:</span>
      {(['overig', 'cbn'] as Entity[]).map((e) => (
        <button
          key={e}
          onClick={() => onChange(e)}
          title={SUBLABELS[e]}
          style={
            value === e
              ? { backgroundColor: '#004B46', color: '#FFFFFF', border: '1px solid #004B46' }
              : { backgroundColor: '#FFFFFF', color: '#7A8C8B', border: '1px solid rgba(0,75,70,0.15)' }
          }
          className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors hover:opacity-90 whitespace-nowrap"
        >
          {ENTITY_LABELS[e]}
        </button>
      ))}
    </div>
  )
}
