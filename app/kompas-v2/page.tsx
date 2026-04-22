'use client'

// Costa Kompas v2 — minimale functionele port voor design-handoff.
// Logica en data komen uit lib/kompas-v2/. UI is basic; Claude Design
// pakt de polish op.

import { useMemo, useReducer, useState } from 'react'
import { Compass, ChevronLeft, ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import {
  REGIONS, CONSULTANT_COVERAGE,
  SERVICE_BONUS, MEDIAN_PRICES, TYPE_AVAILABILITY, DOEL_WEIGHT_ADJUSTMENTS,
  UI_TYPE_MAP, type Doel, type DimensionId,
} from '@/lib/kompas-v2/data'
import { getBankForProfile } from '@/lib/kompas-v2/banks'
import {
  getActiveQuestions, applyDoelAdjustment, filterRegions,
  calculateScores, rankRegions, type Weights,
} from '@/lib/kompas-v2/logic'

type Step = 'profile' | 'filters' | 'weights' | 'questions' | 'results'

type FilterAnswers = { type?: 'appartement' | 'woning' | 'beide'; budget?: number }

interface State {
  step: Step
  doel: Doel | null
  filterAnswers: FilterAnswers
  weights: Weights
  answers: Record<string, 'A' | 'B' | 'C'>
  questionIndex: number
}

type Action =
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_DOEL'; doel: Doel }
  | { type: 'SET_FILTER'; key: keyof FilterAnswers; value: FilterAnswers[keyof FilterAnswers] }
  | { type: 'SET_WEIGHT'; dim: string; value: number }  // string, want bank bepaalt de ids
  | { type: 'ANSWER'; qid: string; letter: 'A' | 'B' | 'C' }
  | { type: 'PREV_Q' }
  | { type: 'RESET' }

// Default weights vullen we leeg in en laten het per bank initialiseren bij
// profiel-keuze. Reducer zet op basis van gekozen bank.
const initial: State = {
  step: 'profile',
  doel: null,
  filterAnswers: {},
  weights: {},
  answers: {},
  questionIndex: 0,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STEP':    return { ...state, step: action.step }
    case 'SET_DOEL': {
      // Init weights per bank-dimensies (general of investor) op middenweging 3.
      const bank = getBankForProfile(action.doel)
      const freshWeights: Weights = {}
      for (const d of bank.dimensions) freshWeights[d.id] = 3
      return { ...state, doel: action.doel, weights: freshWeights, step: 'filters' }
    }
    case 'SET_FILTER':  return { ...state, filterAnswers: { ...state.filterAnswers, [action.key]: action.value } }
    case 'SET_WEIGHT':  return { ...state, weights: { ...state.weights, [action.dim]: action.value } }
    case 'ANSWER':      return { ...state, answers: { ...state.answers, [action.qid]: action.letter }, questionIndex: state.questionIndex + 1 }
    case 'PREV_Q':      return { ...state, questionIndex: Math.max(0, state.questionIndex - 1) }
    case 'RESET':       return initial
    default:            return state
  }
}

export default function KompasV2Page() {
  const [state, dispatch] = useReducer(reducer, initial)

  // Bank volgt het profiel: investering → investeerder-vragen+matrix,
  // anders → algemene bank.
  const bank = useMemo(() => getBankForProfile(state.doel), [state.doel])

  const effectiveWeights = useMemo(
    () => applyDoelAdjustment(state.weights, state.doel, DOEL_WEIGHT_ADJUSTMENTS),
    [state.weights, state.doel],
  )

  const questions = useMemo(() => getActiveQuestions(effectiveWeights, bank), [effectiveWeights, bank])

  const regionFilter = useMemo(
    () => filterRegions(REGIONS.map(r => r.id), state.filterAnswers, MEDIAN_PRICES, TYPE_AVAILABILITY, UI_TYPE_MAP),
    [state.filterAnswers],
  )

  const activePositions = useMemo(() => {
    const out: Record<string, Record<string, number>> = {}
    for (const [id, pos] of Object.entries(bank.regionPositions)) {
      if (regionFilter[id]?.active) out[id] = pos
    }
    return out
  }, [regionFilter, bank])

  const ranked = useMemo(() => {
    if (state.step !== 'results') return []
    const raw = calculateScores(state.answers, effectiveWeights, activePositions, CONSULTANT_COVERAGE, SERVICE_BONUS, bank)
    return rankRegions(raw, effectiveWeights).map(r => {
      const meta = REGIONS.find(x => x.id === r.regionId)!
      return { ...r, name: meta.name, subtitle: meta.subtitle, pct: Math.round(r.score * 100) }
    })
  }, [state.step, state.answers, effectiveWeights, activePositions, bank])

  const eliminated = REGIONS.filter(r => !regionFilter[r.id]?.active)

  // Auto-advance naar results als laatste vraag beantwoord
  if (state.step === 'questions' && state.questionIndex >= questions.length) {
    // defer to next render
    setTimeout(() => dispatch({ type: 'SET_STEP', step: 'results' }), 0)
  }

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-deepsea flex items-center gap-2">
            <Compass className="w-6 h-6 text-sun" />
            Costa Kompas v2
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-body">
            Stap {['profile', 'filters', 'weights', 'questions', 'results'].indexOf(state.step) + 1} van 5
          </p>
        </div>
        {state.step !== 'profile' && (
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-body"
          >
            <RotateCcw size={12} /> Opnieuw
          </button>
        )}
      </div>

      {state.step === 'profile' && <ProfileStep onSelect={d => dispatch({ type: 'SET_DOEL', doel: d })} />}

      {state.step === 'filters' && (
        <FiltersStep
          filterAnswers={state.filterAnswers}
          onChange={(k, v) => dispatch({ type: 'SET_FILTER', key: k, value: v })}
          eliminatedCount={eliminated.length}
          onNext={() => dispatch({ type: 'SET_STEP', step: 'weights' })}
          onBack={() => dispatch({ type: 'SET_STEP', step: 'profile' })}
        />
      )}

      {state.step === 'weights' && (
        <WeightsStep
          dimensions={bank.dimensions}
          weights={state.weights}
          totalQuestions={questions.length}
          onSetWeight={(dim, v) => dispatch({ type: 'SET_WEIGHT', dim, value: v })}
          onNext={() => dispatch({ type: 'SET_STEP', step: 'questions' })}
          onBack={() => dispatch({ type: 'SET_STEP', step: 'filters' })}
        />
      )}

      {state.step === 'questions' && questions[state.questionIndex] && (
        <QuestionStep
          question={questions[state.questionIndex]}
          dimensions={bank.dimensions}
          index={state.questionIndex}
          total={questions.length}
          selected={state.answers[questions[state.questionIndex].id]}
          onAnswer={letter => dispatch({ type: 'ANSWER', qid: questions[state.questionIndex].id, letter })}
          onBack={() => (state.questionIndex > 0 ? dispatch({ type: 'PREV_Q' }) : dispatch({ type: 'SET_STEP', step: 'weights' }))}
        />
      )}

      {state.step === 'results' && (
        <ResultsStep ranked={ranked} eliminated={eliminated.map(r => ({ ...r, reasons: regionFilter[r.id]?.reasons ?? [] }))} />
      )}
    </div>
  )
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function ProfileStep({ onSelect }: { onSelect: (d: Doel) => void }) {
  const opts: { id: Doel; title: string; desc: string }[] = [
    { id: 'tweede-huis', title: 'Tweede huis',    desc: 'Vakantiehuis, soms verhuren' },
    { id: 'permanent',   title: 'Permanent wonen', desc: 'Emigreren naar Spanje' },
    { id: 'investering', title: 'Investering',     desc: 'Vastgoed voor rendement' },
  ]
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">Wat is het doel?</h2>
      <p className="text-gray-500 font-body mb-8">Kies het profiel dat het beste past.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-sun hover:shadow-md transition-all"
          >
            <h3 className="font-heading text-lg font-bold text-deepsea mb-1">{o.title}</h3>
            <p className="text-sm text-gray-500 font-body">{o.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function FiltersStep({
  filterAnswers, onChange, eliminatedCount, onNext, onBack,
}: {
  filterAnswers: FilterAnswers
  onChange: (k: keyof FilterAnswers, v: FilterAnswers[keyof FilterAnswers]) => void
  eliminatedCount: number
  onNext: () => void
  onBack: () => void
}) {
  const types = [
    { v: 'appartement', l: 'Appartement' },
    { v: 'woning', l: 'Woning of villa' },
    { v: 'beide', l: 'Beide' },
  ] as const
  const budgets = [
    { v: 250_000,   l: 'Onder €250.000' },
    { v: 500_000,   l: '€250.000 — €500.000' },
    { v: 1_000_000, l: '€500.000 — €1.000.000' },
    { v: 2_000_000, l: '€1.000.000 — €2.000.000' },
    { v: 9_999_999, l: 'Meer dan €2.000.000' },
  ]
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">Filters</h2>
      <p className="text-gray-500 font-body mb-6">Type woning + maximaal budget.</p>

      <div className="space-y-6 mb-6">
        <div>
          <label className="block font-body font-medium text-deepsea mb-2">Type woning</label>
          <div className="grid grid-cols-3 gap-2">
            {types.map(t => (
              <button
                key={t.v}
                onClick={() => onChange('type', t.v)}
                className={`py-3 rounded-xl border font-body text-sm ${
                  filterAnswers.type === t.v
                    ? 'bg-deepsea text-marble border-deepsea'
                    : 'bg-white border-gray-200 text-deepsea hover:border-sun'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-body font-medium text-deepsea mb-2">Maximaal budget</label>
          <div className="space-y-2">
            {budgets.map(b => (
              <button
                key={b.v}
                onClick={() => onChange('budget', b.v)}
                className={`w-full text-left py-3 px-4 rounded-xl border font-body text-sm ${
                  filterAnswers.budget === b.v
                    ? 'bg-deepsea text-marble border-deepsea'
                    : 'bg-white border-gray-200 text-deepsea hover:border-sun'
                }`}
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {eliminatedCount > 0 && (
        <p className="text-xs text-gray-500 font-body mb-6">
          {eliminatedCount} regio{eliminatedCount === 1 ? '' : 's'} uitgefilterd door deze combinatie.
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-body">
          <ChevronLeft size={16} /> Terug
        </button>
        <button
          onClick={onNext}
          disabled={!filterAnswers.type || !filterAnswers.budget}
          className="flex-1 bg-deepsea text-marble font-heading font-bold px-6 py-3 rounded-xl disabled:opacity-40"
        >
          Verder <ChevronRight className="inline ml-1" size={16} />
        </button>
      </div>
    </div>
  )
}

function WeightsStep({
  dimensions, weights, totalQuestions, onSetWeight, onNext, onBack,
}: {
  dimensions: { id: string; name: string }[]
  weights: Weights
  totalQuestions: number
  onSetWeight: (dim: string, v: number) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">Weging</h2>
      <p className="text-gray-500 font-body mb-4">
        Schuif per thema van 1 (minst belangrijk) naar 5 (essentieel).
      </p>
      <div className="bg-sun/10 border border-sun/30 rounded-xl p-3 mb-6 text-xs font-body text-deepsea">
        Totaal vragen op basis van je keuzes: <strong>{totalQuestions}</strong> (inclusief doel-bonus).
      </div>

      <div className="space-y-3 mb-8">
        {dimensions.map(dim => {
          const w = (weights as Record<string, number | undefined>)[dim.id] ?? 3
          return (
            <div key={dim.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-body font-medium text-deepsea text-sm">{dim.name}</span>
                <span className="text-xs text-gray-400">{w}</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => onSetWeight(dim.id, n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-all ${
                      w === n ? 'bg-deepsea text-marble border-deepsea' : 'bg-white text-gray-600 border-gray-200 hover:border-sun'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-body">
          <ChevronLeft size={16} /> Terug
        </button>
        <button onClick={onNext} className="flex-1 bg-sun text-deepsea font-heading font-bold px-6 py-3 rounded-xl">
          Start de vragen <ChevronRight className="inline ml-1" size={16} />
        </button>
      </div>
    </div>
  )
}

function QuestionStep({
  question, dimensions, index, total, selected, onAnswer, onBack,
}: {
  question: { id: string; text: string; dimension: string; options: { id: 'A' | 'B' | 'C'; label: string }[] }
  dimensions: { id: string; name: string }[]
  index: number
  total: number
  selected: 'A' | 'B' | 'C' | undefined
  onAnswer: (l: 'A' | 'B' | 'C') => void
  onBack: () => void
}) {
  const dimLabel = dimensions.find(d => d.id === question.dimension)?.name ?? question.dimension
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-body font-semibold text-sun uppercase tracking-widest">{dimLabel}</span>
        <span className="text-xs text-gray-400 font-body">Vraag {index + 1} van {total}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="bg-sun h-1.5 rounded-full transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <h2 className="font-heading text-xl sm:text-2xl font-bold text-deepsea leading-snug mb-6">
        {question.text}
      </h2>

      <div className="space-y-3 mb-6">
        {question.options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onAnswer(opt.id)}
            className={`w-full text-left rounded-xl border p-4 font-body text-sm transition-all ${
              selected === opt.id
                ? 'bg-deepsea text-marble border-deepsea'
                : 'bg-white text-deepsea border-gray-200 hover:border-sun'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-deepsea font-body">
        <ChevronLeft size={14} /> Vorige
      </button>
    </div>
  )
}

function ResultsStep({
  ranked, eliminated,
}: {
  ranked: { regionId: string; name: string; subtitle: string; pct: number; hasCoverage: boolean }[]
  eliminated: { id: string; name: string; subtitle: string; reasons: string[] }[]
}) {
  const [showAll, setShowAll] = useState(false)
  if (ranked.length === 0) {
    return <p className="text-gray-500 font-body">Geen regio's overgebleven na filters. Pas filters aan.</p>
  }
  const winner = ranked[0]
  const rest = ranked.slice(1)
  return (
    <div>
      <div className="text-center mb-4">
        <Trophy className="w-10 h-10 text-sun mx-auto mb-2" />
        <p className="text-xs text-gray-400 uppercase tracking-widest font-body">Jouw #1 match</p>
      </div>

      <div className="bg-deepsea rounded-2xl px-6 py-10 text-marble mb-6 text-center">
        <h2 className="font-heading text-4xl font-bold mb-1">{winner.name}</h2>
        <p className="text-marble/60 text-sm font-body mb-4">{winner.subtitle}</p>
        <div className="font-heading text-5xl font-bold text-sun mb-3">{winner.pct}%</div>
        {winner.hasCoverage && (
          <p className="inline-block bg-sun/20 text-sun-light text-xs px-3 py-1 rounded-full font-body">
            Costa Select begeleidt hier actief (+{(SERVICE_BONUS * 100).toFixed(0)}% bonus)
          </p>
        )}
      </div>

      <h3 className="font-heading font-bold text-deepsea uppercase tracking-wide text-xs mb-2">Alle regio's</h3>
      <div className="space-y-2 mb-6">
        {(showAll ? rest : rest.slice(0, 4)).map((r, i) => (
          <div key={r.regionId} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between">
            <div>
              <span className="text-gray-400 text-xs font-heading mr-2">#{i + 2}</span>
              <span className="font-body font-medium text-deepsea">{r.name}</span>
              {r.hasCoverage && <span className="ml-2 text-[10px] text-sun-dark font-body">✓ consultant</span>}
            </div>
            <span className="font-heading font-bold text-deepsea">{r.pct}%</span>
          </div>
        ))}
        {rest.length > 4 && (
          <button onClick={() => setShowAll(s => !s)} className="text-xs text-gray-500 hover:text-deepsea font-body">
            {showAll ? 'Minder tonen' : `Toon ${rest.length - 4} meer`}
          </button>
        )}
      </div>

      {eliminated.length > 0 && (
        <>
          <h3 className="font-heading font-bold text-deepsea uppercase tracking-wide text-xs mb-2">Uitgefilterd</h3>
          <div className="space-y-1 mb-6">
            {eliminated.map(r => (
              <div key={r.id} className="text-xs text-gray-500 font-body">
                <strong>{r.name}</strong> — {r.reasons.join('; ')}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-500 font-body leading-relaxed">
        <p className="font-semibold text-deepsea text-sm mb-1">Hoe we scoren</p>
        <p>
          Match-percentages zijn genormaliseerd over de dimensies die je hebt gewogen. Regio's waarin
          Costa Select actief begeleidt krijgen een dienstverleningsbonus van {(SERVICE_BONUS * 100).toFixed(0)}%.
        </p>
      </div>
    </div>
  )
}
