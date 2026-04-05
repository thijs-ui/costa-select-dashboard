// ─── Costa Kompas Scoring Algorithm ─────────────────────────────────────────

import { type Position, type Question, type Region, REGIONS } from './data'

/**
 * Calculate match score between user answer and region position.
 * - User N (neutral) => 0 (no opinion, no score)
 * - User matches region => 1
 * - Region is N (neutral) => 0.5 (partial match)
 * - Mismatch => 0
 */
export function matchScore(userAnswer: Position, regionPos: Position): number {
  if (userAnswer === 'N') return 0
  if (userAnswer === regionPos) return 1
  if (regionPos === 'N') return 0.5
  return 0
}

export interface RegionScore {
  region: Region
  score: number
  percentage: number
  categoryScores: Record<string, { score: number; max: number; percentage: number }>
}

/**
 * Calculate scores for all regions based on answers, weights, and available regions.
 */
export function calculateScores(
  questions: Question[],
  answers: Record<string, Position>,
  weights: Record<string, number>,
  availableRegionIds: string[]
): RegionScore[] {
  const regionIndexMap = new Map(REGIONS.map((r, i) => [r.id, i]))

  return REGIONS.filter((r) => availableRegionIds.includes(r.id)).map((region) => {
    const regionIdx = regionIndexMap.get(region.id)!
    let totalScore = 0
    let maxPossible = 0
    const categoryScores: Record<string, { score: number; max: number; percentage: number }> = {}

    for (const q of questions) {
      const userAnswer = answers[q.id]
      if (!userAnswer || userAnswer === 'N') continue

      const weight = weights[q.cat] ?? 1
      const regionPos = q.pos[regionIdx]
      const score = matchScore(userAnswer, regionPos) * weight
      const maxScore = 1 * weight

      totalScore += score
      maxPossible += maxScore

      if (!categoryScores[q.cat]) {
        categoryScores[q.cat] = { score: 0, max: 0, percentage: 0 }
      }
      categoryScores[q.cat].score += score
      categoryScores[q.cat].max += maxScore
    }

    // Calculate category percentages
    for (const cat of Object.keys(categoryScores)) {
      const cs = categoryScores[cat]
      cs.percentage = cs.max > 0 ? Math.round((cs.score / cs.max) * 100) : 0
    }

    const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0

    return { region, score: totalScore, percentage, categoryScores }
  }).sort((a, b) => b.percentage - a.percentage)
}
