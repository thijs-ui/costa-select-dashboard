import { useState, useEffect, useCallback } from 'react'

export type Entity = 'cbn' | 'overig'

export const ENTITY_LABELS: Record<Entity, string> = {
  cbn: 'CS',
  overig: 'CSV',
}

export function isCBNRegio(regio: string | null | undefined): boolean {
  if (!regio) return false
  const r = regio.toLowerCase().trim()
  return r === 'cbn' || r === 'costa blanca noord' || r.includes('blanca noord')
}

export function matchesEntity(regio: string | null | undefined, entity: Entity): boolean {
  return entity === 'cbn' ? isCBNRegio(regio) : !isCBNRegio(regio)
}

export function useEntity(): { entity: Entity; setEntity: (e: Entity) => void } {
  const [entity, setEntityState] = useState<Entity>('overig')

  useEffect(() => {
    const stored = localStorage.getItem('cs_entity') as Entity | null
    if (stored === 'cbn' || stored === 'overig') setEntityState(stored)
  }, [])

  const setEntity = useCallback((e: Entity) => {
    setEntityState(e)
    localStorage.setItem('cs_entity', e)
  }, [])

  return { entity, setEntity }
}
