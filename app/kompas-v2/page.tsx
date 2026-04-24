'use client'

import { useEffect, useMemo, useReducer } from 'react'
import Chrome from '@/components/kompas-v2/Chrome'
import Profile from '@/components/kompas-v2/steps/Profile'
import Filters from '@/components/kompas-v2/steps/Filters'
import WeightsStep from '@/components/kompas-v2/steps/Weights'
import QuestionStep from '@/components/kompas-v2/steps/Question'
import Results from '@/components/kompas-v2/steps/Results'
import {
  CONSULTANT_COVERAGE,
  DIMENSIONS,
  DOEL_WEIGHT_ADJUSTMENTS,
  MEDIAN_PRICES,
  REGIONS,
  REGION_POSITIONS,
  SERVICE_BONUS,
  TYPE_AVAILABILITY,
  UI_TYPE_MAP,
  type DimensionId,
  type Doel,
} from '@/lib/kompas-v2/data'
import {
  applyDoelAdjustment,
  calculateScores,
  filterRegions,
  getActiveQuestions,
  rankRegions,
  type Weights,
} from '@/lib/kompas-v2/logic'

const STEPS = ['profile', 'filters', 'weights', 'questions', 'results'] as const
type Step = (typeof STEPS)[number]

type Answer = 'A' | 'B' | 'C'
interface FilterAnswers {
  type?: 'appartement' | 'woning' | 'beide'
  budget?: number
}

interface State {
  step: Step
  doel: Doel | null
  filters: FilterAnswers
  weights: Weights
  answers: Record<string, Answer>
  qIdx: number
}

type Action =
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_DOEL'; doel: Doel }
  | { type: 'SET_FILTER'; key: keyof FilterAnswers; value: FilterAnswers[keyof FilterAnswers] }
  | { type: 'SET_WEIGHT'; dim: DimensionId; value: number }
  | { type: 'ANSWER'; qid: string; letter: Answer }
  | { type: 'PREV_Q' }
  | { type: 'GOTO_QUESTIONS' }
  | { type: 'BACK_TO_WEIGHTS' }
  | { type: 'RESET' }

function initialState(): State {
  const w: Weights = {}
  DIMENSIONS.forEach(d => {
    w[d.id] = 3
  })
  return {
    step: 'profile',
    doel: null,
    filters: {},
    weights: w,
    answers: {},
    qIdx: 0,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_DOEL':
      return { ...state, doel: action.doel, step: 'filters' }
    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } }
    case 'SET_WEIGHT':
      return { ...state, weights: { ...state.weights, [action.dim]: action.value } }
    case 'ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.qid]: action.letter },
        qIdx: state.qIdx + 1,
      }
    case 'PREV_Q':
      return { ...state, qIdx: Math.max(0, state.qIdx - 1) }
    case 'GOTO_QUESTIONS':
      return { ...state, step: 'questions', qIdx: 0 }
    case 'BACK_TO_WEIGHTS':
      return { ...state, step: 'weights' }
    case 'RESET':
      return initialState()
    default:
      return state
  }
}

export default function KompasV2Page() {
  const [state, dispatch] = useReducer(reducer, null, initialState)

  const effectiveWeights = useMemo(
    () => applyDoelAdjustment(state.weights, state.doel, DOEL_WEIGHT_ADJUSTMENTS),
    [state.weights, state.doel]
  )

  const activeQuestions = useMemo(
    () => getActiveQuestions(effectiveWeights),
    [effectiveWeights]
  )

  const regionFilter = useMemo(
    () =>
      filterRegions(
        REGIONS.map(r => r.id),
        state.filters as Record<string, unknown>,
        MEDIAN_PRICES,
        TYPE_AVAILABILITY,
        UI_TYPE_MAP
      ),
    [state.filters]
  )

  const activePositions = useMemo(() => {
    const out: Record<string, Record<string, number>> = {}
    for (const [id, pos] of Object.entries(REGION_POSITIONS)) {
      if (regionFilter[id]?.active) out[id] = pos
    }
    return out
  }, [regionFilter])

  const ranked = useMemo(() => {
    if (state.step !== 'results') return []
    const raw = calculateScores(
      state.answers,
      effectiveWeights,
      activePositions,
      CONSULTANT_COVERAGE,
      SERVICE_BONUS
    )
    return rankRegions(raw, effectiveWeights)
  }, [state.step, state.answers, effectiveWeights, activePositions])

  const eliminated = useMemo(() => {
    return REGIONS.filter(r => !regionFilter[r.id]?.active).map(r => ({
      id: r.id,
      name: r.name,
      subtitle: r.subtitle,
      reasons: regionFilter[r.id]?.reasons ?? [],
    }))
  }, [regionFilter])

  // Auto-advance to results when answered all questions
  useEffect(() => {
    if (
      state.step === 'questions' &&
      state.qIdx >= activeQuestions.length &&
      activeQuestions.length > 0
    ) {
      const t = setTimeout(() => dispatch({ type: 'SET_STEP', step: 'results' }), 100)
      return () => clearTimeout(t)
    }
  }, [state.step, state.qIdx, activeQuestions.length])

  function onRestart() {
    if (confirm('De Kompas opnieuw beginnen? Je antwoorden gaan verloren.')) {
      dispatch({ type: 'RESET' })
    }
  }

  const stepIdx = STEPS.indexOf(state.step)

  return (
    <div className={`kompas-root ${state.step === 'results' ? 'is-results' : ''}`}>
      {state.step !== 'results' && <Chrome stepIdx={stepIdx} onRestart={onRestart} />}
      <div className="kompas-main">
        {state.step === 'profile' && (
          <Profile onSelect={d => dispatch({ type: 'SET_DOEL', doel: d })} />
        )}
        {state.step === 'filters' && (
          <Filters
            filters={state.filters}
            setFilter={(k, v) => dispatch({ type: 'SET_FILTER', key: k, value: v })}
            eliminatedCount={eliminated.length}
            onNext={() => dispatch({ type: 'SET_STEP', step: 'weights' })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 'profile' })}
          />
        )}
        {state.step === 'weights' && (
          <WeightsStep
            weights={state.weights}
            setWeight={(d, v) => dispatch({ type: 'SET_WEIGHT', dim: d, value: v })}
            totalQuestions={activeQuestions.length}
            onNext={() => dispatch({ type: 'GOTO_QUESTIONS' })}
            onBack={() => dispatch({ type: 'SET_STEP', step: 'filters' })}
          />
        )}
        {state.step === 'questions' && activeQuestions[state.qIdx] && (
          <QuestionStep
            question={activeQuestions[state.qIdx]}
            index={state.qIdx}
            total={activeQuestions.length}
            onAnswer={letter =>
              dispatch({ type: 'ANSWER', qid: activeQuestions[state.qIdx].id, letter })
            }
            onBack={() =>
              state.qIdx > 0
                ? dispatch({ type: 'PREV_Q' })
                : dispatch({ type: 'BACK_TO_WEIGHTS' })
            }
          />
        )}
        {state.step === 'results' && (
          <Results
            ranked={ranked}
            eliminated={eliminated}
            weights={effectiveWeights}
            onBack={() => dispatch({ type: 'SET_STEP', step: 'questions' })}
            onReset={() => dispatch({ type: 'RESET' })}
          />
        )}
      </div>
    </div>
  )
}
