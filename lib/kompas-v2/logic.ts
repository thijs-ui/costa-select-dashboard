// ============================================================================
// Costa Kompas v2 — pure scoring + selectie (TS port).
// Bij wijzigingen: synchroniseer met costa-kompas/src/utils/kompas-v2.js.
// ============================================================================

import {
  QUESTIONS, DIMENSIONS, ANSWER_SCORE, DIMENSION_CAP,
  type DimensionId, type Question, type Doel,
} from './data'

const WEIGHT_MIN = 1
const WEIGHT_MAX = 5

export type Weights = Partial<Record<DimensionId, number>>

// ─── Adaptieve vraag-selectie ────────────────────────────────────────────────
export function getActiveQuestions(weights: Weights): Question[] {
  const active: Question[] = []
  for (const dim of DIMENSIONS) {
    const w = weights?.[dim.id] ?? 0
    const maxRank = w <= 1 ? 1 : w <= 3 ? 2 : 3
    const dimQs = QUESTIONS
      .filter(q => q.dimension === dim.id && q.rank <= maxRank)
      .sort((a, b) => a.rank - b.rank)
    active.push(...dimQs)
  }
  return active
}

// ─── Doel-aanpassing (Taak 7) ────────────────────────────────────────────────
export function applyDoelAdjustment(
  weights: Weights,
  doel: Doel | string | null | undefined,
  adjustments: Record<string, Partial<Record<DimensionId, number>>>,
): Weights {
  const result: Weights = { ...(weights || {}) }
  const adj = (doel && adjustments?.[doel]) || {}
  for (const [dim, delta] of Object.entries(adj)) {
    const key = dim as DimensionId
    const base = result[key] ?? 3
    result[key] = Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, base + (delta as number)))
  }
  return result
}

// ─── 30%-cap per dimensie ────────────────────────────────────────────────────
export function applyDimensionCap(dimRaws: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = { ...dimRaws }
  const originalTotal = Object.values(result).reduce((a, b) => a + b, 0)
  if (originalTotal <= 0) return result
  const capValue = DIMENSION_CAP * originalTotal

  for (const d of Object.keys(result)) {
    if (result[d] > capValue) result[d] = capValue
  }

  let deficit = originalTotal - Object.values(result).reduce((a, b) => a + b, 0)
  for (let iter = 0; iter < 10 && deficit > 1e-9; iter++) {
    const under = Object.keys(result).filter(d => result[d] < capValue - 1e-9)
    if (under.length === 0) break

    const curSum = under.reduce((acc, d) => acc + result[d], 0)
    if (curSum <= 0) {
      const even = deficit / under.length
      let assigned = 0
      for (const d of under) {
        const add = Math.min(even, capValue - result[d])
        result[d] += add
        assigned += add
      }
      deficit -= assigned
    } else {
      const boosts: Record<string, number> = {}
      let assigned = 0
      for (const d of under) {
        const share = result[d] / curSum
        boosts[d] = Math.min(deficit * share, capValue - result[d])
        assigned += boosts[d]
      }
      for (const d of under) result[d] += boosts[d]
      deficit -= assigned
    }
  }
  return result
}

// ─── Hard filters ────────────────────────────────────────────────────────────
export interface FilterResult {
  active: boolean
  reasons: string[]
}

export function filterRegions(
  regionIds: string[],
  filterAnswers: Record<string, unknown>,
  medianPrices: Record<string, number>,
  typeAvailability: Record<string, Record<string, string>>,
  uiTypeMap: Record<string, string>,
): Record<string, FilterResult> {
  const out: Record<string, FilterResult> = {}
  const budget = Number(filterAnswers?.budget) || null
  const typeUi = filterAnswers?.type as string | undefined

  for (const id of regionIds) {
    const reasons: string[] = []

    if (budget && medianPrices?.[id] && medianPrices[id] > budget) {
      const m = medianPrices[id].toLocaleString('nl-NL')
      const b = budget.toLocaleString('nl-NL')
      reasons.push(`Mediaanprijs €${m} ligt boven budget €${b}`)
    }

    if (typeUi && typeUi !== 'beide' && uiTypeMap?.[typeUi]) {
      const key = uiTypeMap[typeUi]
      const avail = typeAvailability?.[id]?.[key]
      if (avail === 'nee') {
        reasons.push(`${typeUi === 'appartement' ? 'Appartementen' : "Villa's"} niet beschikbaar`)
      }
    }

    out[id] = { active: reasons.length === 0, reasons }
  }
  return out
}

// ─── Scoring ─────────────────────────────────────────────────────────────────
function computeDimRaws(
  matches: Record<string, number>,
  weights: Weights,
  questionToDim: Record<string, DimensionId>,
): Record<string, number> {
  const dimRaws: Record<string, number> = Object.fromEntries(DIMENSIONS.map(d => [d.id, 0]))
  for (const qId of Object.keys(matches)) {
    const dimId = questionToDim[qId]
    if (!dimId) continue
    dimRaws[dimId] += matches[qId]
  }
  for (const dim of DIMENSIONS) {
    dimRaws[dim.id] *= weights?.[dim.id] ?? 0
  }
  return dimRaws
}

export interface ScoreResult {
  regionId: string
  score: number        // 0-1 ná bonus
  rawScore: number     // 0-1 vóór bonus
  hasCoverage: boolean
  dimMatches: Record<string, number>
}

export function calculateScores(
  answers: Record<string, 'A' | 'B' | 'C' | undefined>,
  weights: Weights,
  regionPositions: Record<string, Record<string, number>>,
  coverage: string[] = [],
  bonus = 0,
): ScoreResult[] {
  const activeQuestions = getActiveQuestions(weights)
  const questionToDim: Record<string, DimensionId> =
    Object.fromEntries(activeQuestions.map(q => [q.id, q.dimension]))

  const perfectMatches = Object.fromEntries(activeQuestions.map(q => [q.id, 4]))
  const perfectDimRaws = computeDimRaws(perfectMatches, weights, questionToDim)
  const perfectCapped = applyDimensionCap(perfectDimRaws)
  const maxTotal = Object.values(perfectCapped).reduce((a, b) => a + b, 0)

  return Object.keys(regionPositions).map(regionId => {
    const positions = regionPositions[regionId]
    const matches: Record<string, number> = {}
    const dimMatches: Record<string, number> = Object.fromEntries(DIMENSIONS.map(d => [d.id, 0]))

    for (const q of activeQuestions) {
      const letter = answers?.[q.id]
      const userScore = letter ? ANSWER_SCORE[letter] : 0
      const pos = positions?.[q.id] ?? 0
      const m = 4 - Math.abs(userScore - pos)
      matches[q.id] = m
      dimMatches[q.dimension] += m
    }

    const dimRaws = computeDimRaws(matches, weights, questionToDim)
    const capped = applyDimensionCap(dimRaws)
    const total = Object.values(capped).reduce((a, b) => a + b, 0)
    const rawPct = maxTotal > 0 ? total / maxTotal : 0

    const hasCoverage = coverage.includes(regionId)
    const finalPct = hasCoverage ? Math.min(1.0, rawPct * (1 + bonus)) : rawPct

    return { regionId, score: finalPct, rawScore: rawPct, hasCoverage, dimMatches }
  })
}

// ─── Ranking + tiebreakers ───────────────────────────────────────────────────
export function rankRegions(
  results: ScoreResult[],
  weights: Weights,
  tieThreshold = 0.01,
): ScoreResult[] {
  const dims = Object.keys(weights || {})
  const topDim = dims.length > 0
    ? dims.reduce((best, d) => ((weights[d as DimensionId] ?? 0) > (weights[best as DimensionId] ?? -Infinity) ? d : best), dims[0])
    : ''
  return [...results].sort((a, b) => {
    if (Math.abs(a.score - b.score) > tieThreshold) return b.score - a.score
    if (a.hasCoverage !== b.hasCoverage) return a.hasCoverage ? -1 : 1
    const aM = a.dimMatches?.[topDim] ?? 0
    const bM = b.dimMatches?.[topDim] ?? 0
    if (aM !== bM) return bM - aM
    return a.regionId.localeCompare(b.regionId)
  })
}
