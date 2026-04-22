// ============================================================================
// Costa Kompas v2 — bank-selector (Fase 7 TS port).
// Synct met costa-kompas/src/data/kompas-v2-banks.js.
// ============================================================================

import {
  QUESTIONS as GENERAL_QUESTIONS,
  DIMENSIONS as GENERAL_DIMENSIONS,
  REGION_POSITIONS as GENERAL_REGION_POSITIONS,
  type Question,
  type Dimension,
} from './data'
import {
  INVESTOR_QUESTIONS,
  INVESTOR_DIMENSIONS,
  INVESTOR_REGION_POSITIONS,
} from './investor-data'

export interface QuestionBank {
  id: 'general' | 'investor'
  questions: Question[]
  dimensions: Dimension[]
  regionPositions: Record<string, Record<string, number>>
}

export const GENERAL_BANK: QuestionBank = {
  id: 'general',
  questions: GENERAL_QUESTIONS,
  dimensions: GENERAL_DIMENSIONS,
  regionPositions: GENERAL_REGION_POSITIONS,
}

export const INVESTOR_BANK: QuestionBank = {
  id: 'investor',
  questions: INVESTOR_QUESTIONS,
  dimensions: INVESTOR_DIMENSIONS,
  regionPositions: INVESTOR_REGION_POSITIONS,
}

export function getBankForProfile(profile: string | null | undefined): QuestionBank {
  return profile === 'investering' ? INVESTOR_BANK : GENERAL_BANK
}
