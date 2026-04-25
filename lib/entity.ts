import { useState, useEffect, useCallback } from 'react'

export type Entity = 'cbn' | 'overig' | 'beide'

export const ENTITY_LABELS: Record<Entity, string> = {
  cbn: 'CS',
  overig: 'CSV',
  beide: 'Beide',
}

export function isCBNRegio(regio: string | null | undefined): boolean {
  if (!regio) return false
  const r = regio.toLowerCase().trim()
  return r === 'cbn' || r === 'costa blanca noord' || r.includes('blanca noord')
}

export function matchesEntity(regio: string | null | undefined, entity: Entity): boolean {
  if (entity === 'beide') return true
  return entity === 'cbn' ? isCBNRegio(regio) : !isCBNRegio(regio)
}

// Voor kosten/settings rows die een expliciete entiteit-kolom hebben.
// 'beide' matcht alles.
export function matchesEntiteit(entiteit: string | undefined | null, entity: Entity): boolean {
  if (entity === 'beide') return true
  const value = (entiteit ?? 'overig') as string
  return value === entity
}

export function useEntity(): { entity: Entity; setEntity: (e: Entity) => void } {
  const [entity, setEntityState] = useState<Entity>('overig')

  useEffect(() => {
    const stored = localStorage.getItem('cs_entity') as Entity | null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'cbn' || stored === 'overig' || stored === 'beide') setEntityState(stored)
  }, [])

  const setEntity = useCallback((e: Entity) => {
    setEntityState(e)
    localStorage.setItem('cs_entity', e)
  }, [])

  return { entity, setEntity }
}
