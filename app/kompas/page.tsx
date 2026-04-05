'use client'

import { useReducer, useMemo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, Home, Building2, TrendingUp, ChevronRight, ChevronLeft, ChevronDown,
  RotateCcw, Trophy, Medal, MapPin, Phone, MessageCircle, BookOpen, FileText,
  ArrowRight, Check, X, Minus, BarChart3, Sparkles, Send, User, Mail,
} from 'lucide-react'
import {
  type Profile, type Position, type FilterType,
  REGIONS, CATEGORIES, REGION_CONTACTS,
  getCategoriesForProfile, getQuestionsForProfile,
  getFiltersForProfile, applyHardFilters,
} from '@/lib/kompas/data'
import { calculateScores, type RegionScore } from '@/lib/kompas/scoring'

// ─── State ──────────────────────────────────────────────────────────────────

type Step = 'onboarding' | 'profile' | 'filters' | 'weights' | 'questions' | 'contact' | 'results'

interface LeadData {
  naam: string
  email: string
}

interface KompasState {
  step: Step
  profile: Profile | null
  filterAnswers: Record<string, string>
  filterIndex: number
  overriddenRegions: string[]
  weights: Record<string, number>
  answers: Record<string, Position>
  questionIndex: number
  leadData: LeadData | null
}

type KompasAction =
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_PROFILE'; profile: Profile }
  | { type: 'SET_FILTER_ANSWER'; filterId: string; value: string }
  | { type: 'NEXT_FILTER' }
  | { type: 'PREV_FILTER' }
  | { type: 'OVERRIDE_REGION'; regionId: string }
  | { type: 'SET_WEIGHT'; cat: string; weight: number }
  | { type: 'SET_ANSWER'; questionId: string; answer: Position }
  | { type: 'PREV_QUESTION' }
  | { type: 'SET_LEAD'; data: LeadData }
  | { type: 'RESET' }

const initialState: KompasState = {
  step: 'onboarding',
  profile: null,
  filterAnswers: {},
  filterIndex: 0,
  overriddenRegions: [],
  weights: {},
  answers: {},
  questionIndex: 0,
  leadData: null,
}

function reducer(state: KompasState, action: KompasAction): KompasState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_PROFILE':
      return { ...state, profile: action.profile, step: 'filters', filterIndex: 0 }
    case 'SET_FILTER_ANSWER':
      return {
        ...state,
        filterAnswers: { ...state.filterAnswers, [action.filterId]: action.value },
      }
    case 'NEXT_FILTER':
      return { ...state, filterIndex: state.filterIndex + 1 }
    case 'PREV_FILTER':
      return { ...state, filterIndex: Math.max(0, state.filterIndex - 1) }
    case 'OVERRIDE_REGION': {
      const overriddenRegions = state.overriddenRegions.includes(action.regionId)
        ? state.overriddenRegions.filter((id) => id !== action.regionId)
        : [...state.overriddenRegions, action.regionId]
      return { ...state, overriddenRegions }
    }
    case 'SET_WEIGHT':
      return { ...state, weights: { ...state.weights, [action.cat]: action.weight } }
    case 'SET_ANSWER': {
      const newAnswers = { ...state.answers, [action.questionId]: action.answer }
      return { ...state, answers: newAnswers, questionIndex: state.questionIndex + 1 }
    }
    case 'PREV_QUESTION':
      return { ...state, questionIndex: Math.max(0, state.questionIndex - 1) }
    case 'SET_LEAD':
      return { ...state, leadData: action.data, step: 'results' }
    case 'RESET':
      return { ...initialState }
    default:
      return state
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const fadeVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const STEP_ORDER: Step[] = ['onboarding', 'profile', 'filters', 'weights', 'questions', 'contact', 'results']

function StepProgress({ current }: { current: Step }) {
  if (current === 'onboarding') return null
  const idx = STEP_ORDER.indexOf(current)
  const total = STEP_ORDER.length - 1 // exclude onboarding
  const pct = ((idx) / total) * 100

  const labels = ['Profiel', 'Filters', 'Weging', 'Vragen', 'Contact', 'Resultaat']

  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {labels.map((label, i) => (
          <span
            key={label}
            className={`text-xs font-body font-medium transition-colors ${
              i + 1 <= idx ? 'text-deepsea' : i + 1 === idx ? 'text-deepsea' : 'text-gray-400'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-sun rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  )
}

// ─── Step Components ────────────────────────────────────────────────────────

function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      {...fadeVariants}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto"
    >
      <div className="w-20 h-20 rounded-full bg-sun/20 flex items-center justify-center mb-6">
        <Compass className="w-10 h-10 text-sun-dark" />
      </div>
      <h1 className="font-heading text-4xl font-bold text-deepsea mb-4">
        Costa Kompas
      </h1>
      <p className="text-lg text-deepsea/70 mb-2 font-body">
        Vind de ideale Spaanse regio voor je klant
      </p>
      <p className="text-sm text-gray-500 mb-8 font-body max-w-md">
        Beantwoord een reeks vragen over voorkeuren, budget en levensstijl.
        Het Costa Kompas analyseert 14 regio&apos;s en geeft een persoonlijk advies.
      </p>
      <div className="flex gap-3 text-xs text-gray-400 mb-8">
        <span className="flex items-center gap-1"><MapPin size={14} /> 14 regio&apos;s</span>
        <span className="flex items-center gap-1"><BarChart3 size={14} /> 13 categorieen</span>
        <span className="flex items-center gap-1"><Sparkles size={14} /> Stemwijzer-stijl</span>
      </div>
      <button
        onClick={onStart}
        className="bg-sun text-deepsea font-heading font-bold text-lg px-8 py-4 rounded-2xl hover:bg-sun-dark hover:text-marble transition-colors shadow-md"
      >
        Start Costa Kompas <ArrowRight className="inline ml-2" size={20} />
      </button>
    </motion.div>
  )
}

function ProfileStep({ onSelect }: { onSelect: (p: Profile) => void }) {
  const profiles: { id: Profile; icon: React.ReactNode; title: string; desc: string }[] = [
    {
      id: 'tweede-huis',
      icon: <Home className="w-8 h-8" />,
      title: 'Tweede huis',
      desc: 'Een vakantiehuis met mogelijkheid tot verhuur',
    },
    {
      id: 'permanent',
      icon: <Building2 className="w-8 h-8" />,
      title: 'Permanent wonen',
      desc: 'Emigreren en permanent in Spanje gaan wonen',
    },
    {
      id: 'investering',
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Investeren',
      desc: 'Vastgoed als investering met focus op rendement',
    },
  ]

  return (
    <motion.div {...fadeVariants}>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">
        Wat is het doel?
      </h2>
      <p className="text-gray-500 font-body mb-8">
        Kies het profiel dat het beste past bij uw klant.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:border-sun hover:shadow-md transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-deepsea-lighter flex items-center justify-center text-deepsea mb-4 group-hover:bg-sun/20 group-hover:text-sun-dark transition-colors">
              {p.icon}
            </div>
            <h3 className="font-heading text-lg font-bold text-deepsea mb-1">{p.title}</h3>
            <p className="text-sm text-gray-500 font-body">{p.desc}</p>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function FiltersStep({
  profile,
  filterAnswers,
  filterIndex,
  overriddenRegions,
  dispatch,
}: {
  profile: Profile
  filterAnswers: Record<string, string>
  filterIndex: number
  overriddenRegions: string[]
  dispatch: React.Dispatch<KompasAction>
}) {
  const filters = useMemo(() => getFiltersForProfile(profile), [profile])
  const isComplete = filterIndex >= filters.length

  // Calculate eliminated regions in real-time
  const survivingRegions = useMemo(
    () => applyHardFilters(REGIONS, profile, filterAnswers),
    [profile, filterAnswers]
  )
  const eliminatedRegions = REGIONS.filter(
    (r) => !survivingRegions.some((s) => s.id === r.id)
  )

  if (isComplete) {
    // Show summary of eliminated regions
    return (
      <motion.div {...fadeVariants}>
        <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">
          Filterresultaat
        </h2>
        <p className="text-gray-500 font-body mb-6">
          Op basis van de filters zijn {survivingRegions.length} van de 14 regio&apos;s geschikt.
        </p>

        {eliminatedRegions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-heading text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
              Uitgefilterd ({eliminatedRegions.length})
            </h3>
            <div className="space-y-2">
              {eliminatedRegions.map((r) => {
                const isBarcelona = r.id === 'barcelona' && !r.verhuurMogelijk &&
                  (profile === 'investering' || filterAnswers.verhuur === 'ja')
                const isOverridden = overriddenRegions.includes(r.id)

                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isOverridden ? 'bg-sun/10 border-sun/30' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{r.emoji}</span>
                      <div>
                        <span className="font-body text-sm font-medium text-deepsea">
                          {r.name}
                        </span>
                        {isBarcelona && (
                          <p className="text-xs text-red-500">Verhuur niet mogelijk (moratorium)</p>
                        )}
                      </div>
                    </div>
                    {!isBarcelona && (
                      <button
                        onClick={() => dispatch({ type: 'OVERRIDE_REGION', regionId: r.id })}
                        className={`text-xs px-3 py-1 rounded-lg font-body font-medium transition-colors ${
                          isOverridden
                            ? 'bg-sun text-deepsea'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {isOverridden ? 'Toegevoegd' : 'Toch meenemen'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-heading text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            Resterende regio&apos;s ({survivingRegions.length + overriddenRegions.filter(id => eliminatedRegions.some(r => r.id === id)).length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...survivingRegions, ...REGIONS.filter(r => overriddenRegions.includes(r.id) && !survivingRegions.some(s => s.id === r.id))].map((r) => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-deepsea-lighter text-deepsea rounded-full text-sm font-body"
              >
                {r.emoji} {r.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: 'PREV_FILTER' })}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-body"
          >
            <ChevronLeft size={16} /> Terug
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_STEP', step: 'weights' })}
            className="flex-1 bg-sun text-deepsea font-heading font-bold px-6 py-3 rounded-xl hover:bg-sun-dark hover:text-marble transition-colors"
          >
            Verder naar weging <ChevronRight className="inline ml-1" size={16} />
          </button>
        </div>
      </motion.div>
    )
  }

  const currentFilter = filters[filterIndex]

  return (
    <motion.div key={currentFilter.id} {...fadeVariants}>
      <div className="flex items-center gap-2 text-xs text-gray-400 font-body mb-4">
        <span>Filter {filterIndex + 1} van {filters.length}</span>
      </div>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">
        {currentFilter.question}
      </h2>
      <p className="text-gray-500 font-body mb-6">{currentFilter.label}</p>

      <div className="space-y-3 mb-8">
        {currentFilter.options.map((opt) => {
          const isSelected = filterAnswers[currentFilter.id] === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => {
                dispatch({ type: 'SET_FILTER_ANSWER', filterId: currentFilter.id, value: opt.value })
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all font-body ${
                isSelected
                  ? 'bg-deepsea text-marble border-deepsea shadow-md'
                  : 'bg-white border-gray-100 hover:border-sun shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{opt.label}</span>
                {isSelected && <Check size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Eliminated regions preview */}
      {eliminatedRegions.length > 0 && (
        <div className="mb-6 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400 font-body mb-2">
            Uitgefilterd: {eliminatedRegions.map((r) => r.short).join(', ')}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {filterIndex > 0 && (
          <button
            onClick={() => dispatch({ type: 'PREV_FILTER' })}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-body"
          >
            <ChevronLeft size={16} /> Terug
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'NEXT_FILTER' })}
          disabled={!filterAnswers[currentFilter.id]}
          className="flex-1 bg-deepsea text-marble font-heading font-bold px-6 py-3 rounded-xl hover:bg-deepsea-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Volgende <ChevronRight className="inline ml-1" size={16} />
        </button>
      </div>
    </motion.div>
  )
}

function WeightsStep({
  profile,
  weights,
  dispatch,
}: {
  profile: Profile
  weights: Record<string, number>
  dispatch: React.Dispatch<KompasAction>
}) {
  const cats = useMemo(() => getCategoriesForProfile(profile), [profile])

  const weightOptions = [
    { value: 0.5, label: '0.5x', desc: 'Minder belangrijk' },
    { value: 1, label: '1x', desc: 'Normaal' },
    { value: 2, label: '2x', desc: 'Extra belangrijk' },
  ]

  return (
    <motion.div {...fadeVariants}>
      <h2 className="font-heading text-2xl font-bold text-deepsea mb-2">
        Hoe belangrijk is elke categorie?
      </h2>
      <p className="text-gray-500 font-body mb-8">
        Geef per categorie aan hoe zwaar deze mee moet wegen in het resultaat.
      </p>

      <div className="space-y-4 mb-8">
        {cats.map((cat) => {
          const currentWeight = weights[cat.id] ?? 1
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-body font-medium text-deepsea">{cat.label}</span>
              </div>
              <div className="flex gap-2">
                {weightOptions.map((wo) => (
                  <button
                    key={wo.value}
                    onClick={() => dispatch({ type: 'SET_WEIGHT', cat: cat.id, weight: wo.value })}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-body font-medium transition-all ${
                      currentWeight === wo.value
                        ? 'bg-deepsea text-marble shadow-sm'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-bold">{wo.label}</div>
                      <div className="text-xs opacity-70">{wo.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => dispatch({ type: 'SET_STEP', step: 'filters' })}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors font-body"
        >
          <ChevronLeft size={16} /> Terug
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_STEP', step: 'questions' })}
          className="flex-1 bg-sun text-deepsea font-heading font-bold px-6 py-3 rounded-xl hover:bg-sun-dark hover:text-marble transition-colors"
        >
          Start vragen <ChevronRight className="inline ml-1" size={16} />
        </button>
      </div>
    </motion.div>
  )
}

function QuestionsStep({
  profile,
  filterType,
  questionIndex,
  answers,
  dispatch,
}: {
  profile: Profile
  filterType: FilterType | undefined
  questionIndex: number
  answers: Record<string, Position>
  dispatch: React.Dispatch<KompasAction>
}) {
  const questions = useMemo(
    () => getQuestionsForProfile(profile, filterType),
    [profile, filterType]
  )

  const isComplete = questionIndex >= questions.length

  useEffect(() => {
    if (isComplete) {
      dispatch({ type: 'SET_STEP', step: 'contact' })
    }
  }, [isComplete, dispatch])

  if (isComplete) return null

  const q = questions[questionIndex]
  const prevCat = questionIndex > 0 ? questions[questionIndex - 1].cat : null
  const isNewCategory = q.cat !== prevCat
  const catLabel = CATEGORIES.find((c) => c.id === q.cat)?.label ?? q.cat

  const answerButtons: { value: Position; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'E', label: 'Eens', icon: <Check size={20} />, color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
    { value: 'N', label: 'Neutraal', icon: <Minus size={20} />, color: 'bg-gray-300 hover:bg-gray-400 text-gray-700' },
    { value: 'O', label: 'Oneens', icon: <X size={20} />, color: 'bg-red-400 hover:bg-red-500 text-white' },
  ]

  return (
    <motion.div {...fadeVariants}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-body">
          <span>Vraag {questionIndex + 1} van {questions.length}</span>
        </div>
        <span className="text-xs font-body font-medium px-3 py-1 bg-deepsea-lighter text-deepsea rounded-full">
          {catLabel}
        </span>
      </div>

      {/* Mini progress */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-deepsea rounded-full"
          animate={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {isNewCategory && (
            <div className="mb-4 p-3 bg-sun/10 rounded-xl">
              <p className="text-sm font-body font-medium text-sun-dark">
                Categorie: {catLabel}
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <p className="font-body text-lg text-deepsea leading-relaxed">
              {q.stelling}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {answerButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => dispatch({ type: 'SET_ANSWER', questionId: q.id, answer: btn.value })}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl font-body font-medium transition-all shadow-sm ${btn.color}`}
              >
                {btn.icon}
                <span className="text-sm">{btn.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {questionIndex > 0 && (
        <button
          onClick={() => dispatch({ type: 'PREV_QUESTION' })}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors font-body"
        >
          <ChevronLeft size={14} /> Vorige vraag
        </button>
      )}
    </motion.div>
  )
}

// ─── Contact Step ────────────────────────────────────────────────────────

function ContactStep({ dispatch }: { dispatch: React.Dispatch<KompasAction> }) {
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim() || !email.trim()) {
      setError('Vul je naam en e-mailadres in.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Vul een geldig e-mailadres in.')
      return
    }
    dispatch({ type: 'SET_LEAD', data: { naam: naam.trim(), email: email.trim() } })
  }

  return (
    <motion.div {...fadeVariants} className="text-center">
      <div className="mb-8">
        <div className="w-16 h-16 rounded-2xl bg-sun/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-sun" />
        </div>
        <h2 className="font-heading text-3xl font-bold text-deepsea mb-2">
          Jouw resultaat staat klaar
        </h2>
        <p className="font-body text-gray-500">
          Vul je gegevens in om je persoonlijke regio-analyse te ontvangen.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-sm mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">Naam</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={naam}
                onChange={e => { setNaam(e.target.value); setError('') }}
                placeholder="Jan de Vries"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20"
              />
            </div>
          </div>
          <div className="text-left">
            <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">E-mailadres</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="jan@voorbeeld.nl"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 font-body">{error}</p>}
          <button
            type="submit"
            className="w-full bg-sun text-deepsea font-heading font-bold py-3 rounded-xl hover:bg-sun-dark transition-colors flex items-center justify-center gap-2"
          >
            Bekijk mijn resultaat <ArrowRight size={16} />
          </button>
        </form>
        <p className="text-[11px] text-gray-400 mt-3 font-body">
          Wij delen je gegevens nooit met derden.
        </p>
      </div>
    </motion.div>
  )
}

// ─── Report Modal ─────────────────────────────────────────────────────────

function ReportModal({ regionName, onClose }: { regionName: string; onClose: () => void }) {
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [bericht, setBericht] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim() || !email.trim()) {
      setError('Vul minimaal je naam en e-mailadres in.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Vul een geldig e-mailadres in.')
      return
    }
    setSubmitted(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-deepsea px-8 py-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-marble/50 hover:text-marble transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
          <FileText className="w-8 h-8 text-sun mx-auto mb-2" />
          <h3 className="font-heading text-2xl font-bold text-marble">
            Regio-rapporten aanvragen
          </h3>
          <p className="font-body text-marble/60 text-sm mt-1">
            Ontvang uitgebreide rapporten over {regionName} en je andere topmatches
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-heading text-xl font-bold text-deepsea mb-2">
                Aanvraag ontvangen
              </h4>
              <p className="font-body text-gray-500 text-sm mb-6">
                We sturen de rapporten zo snel mogelijk naar {email}. Je specialist neemt binnenkort contact met je op.
              </p>
              <button
                onClick={onClose}
                className="bg-deepsea text-marble font-heading font-bold px-6 py-3 rounded-xl hover:bg-deepsea-light transition-colors cursor-pointer"
              >
                Sluiten
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">
                  Naam *
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={naam}
                    onChange={e => { setNaam(e.target.value); setError('') }}
                    placeholder="Jan de Vries"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">
                  E-mailadres *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="jan@voorbeeld.nl"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">
                  Telefoonnummer
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={telefoon}
                    onChange={e => setTelefoon(e.target.value)}
                    placeholder="+31 6 12345678"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-deepsea mb-1.5 font-body">
                  Bericht of vraag
                </label>
                <textarea
                  value={bericht}
                  onChange={e => setBericht(e.target.value)}
                  placeholder="Optioneel: stel een vraag of geef context..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body focus:outline-none focus:border-deepsea focus:ring-1 focus:ring-deepsea/20 resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-500 font-body">{error}</p>}

              <button
                type="submit"
                className="w-full bg-sun text-deepsea font-heading font-bold py-3.5 rounded-xl hover:bg-sun-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={16} />
                Verstuur aanvraag
              </button>

              <p className="text-[11px] text-gray-400 text-center font-body">
                Wij delen je gegevens nooit met derden. Geen spam, alleen jouw rapporten.
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Results Step ─────────────────────────────────────────────────────────

function ResultsStep({
  results,
  profile,
  weights,
  dispatch,
}: {
  results: RegionScore[]
  profile: Profile
  weights: Record<string, number>
  dispatch: React.Dispatch<KompasAction>
}) {
  const [openRegion, setOpenRegion] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const cats = useMemo(() => getCategoriesForProfile(profile), [profile])

  if (results.length === 0) {
    return (
      <motion.div {...fadeVariants} className="text-center py-12">
        <p className="text-gray-500 font-body text-lg mb-4">
          Geen regio&apos;s gevonden die aan alle criteria voldoen.
        </p>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="bg-deepsea text-marble font-heading font-bold px-6 py-3 rounded-xl hover:bg-deepsea-light transition-colors"
        >
          <RotateCcw className="inline mr-2" size={16} /> Opnieuw beginnen
        </button>
      </motion.div>
    )
  }

  const winner = results[0]
  const others = results.slice(1)
  const winnerContact = REGION_CONTACTS[winner.region.id]

  return (
    <motion.div {...fadeVariants}>
      {/* Winner — spectaculair */}
      <div className="text-center mb-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2, duration: 0.6 }}
          className="inline-block"
        >
          <Trophy className="w-12 h-12 text-sun mx-auto mb-3" />
        </motion.div>
        <p className="text-sm font-body text-gray-400 uppercase tracking-widest mb-1">Jouw #1 match</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-deepsea rounded-3xl px-6 py-12 sm:px-10 sm:py-16 mb-4 text-marble shadow-xl relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 opacity-[0.07]">
          <span className="text-[180px] leading-none">{winner.region.emoji}</span>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.span
            className="text-6xl sm:text-7xl mb-6 block"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
          >
            {winner.region.emoji}
          </motion.span>

          <motion.h2
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold mb-3 leading-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {winner.region.name}
          </motion.h2>

          <p className="text-marble/50 font-body text-base mb-8">{winner.region.province}</p>

          {/* Score */}
          <div className="flex items-center justify-center gap-5 mb-8 w-full max-w-md">
            <div className="flex-1 h-4 bg-marble/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-sun rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${winner.percentage}%` }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </div>
            <motion.span
              className="font-heading text-5xl font-bold text-sun"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              {winner.percentage}%
            </motion.span>
          </div>

          <p className="text-marble/70 font-body text-base sm:text-lg leading-relaxed max-w-xl mb-8">
            {winner.region.description}
          </p>

          {/* Category breakdown */}
          <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            {cats.map((cat) => {
              const cs = winner.categoryScores[cat.id]
              if (!cs) return null
              return (
                <div key={cat.id} className="text-xs font-body">
                  <div className="flex justify-between mb-1">
                    <span className="text-marble/50">{cat.label}</span>
                    <span className="text-marble font-bold">{cs.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-marble/20 rounded-full overflow-hidden">
                    <div className="h-full bg-sun/80 rounded-full" style={{ width: `${cs.percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* CTA 1 + 2 — under winner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center justify-center gap-2 bg-sun text-deepsea font-heading font-bold py-3.5 px-6 rounded-xl hover:bg-sun-dark transition-colors cursor-pointer"
        >
          <FileText size={18} />
          Vraag regio-rapporten aan
        </button>
        <button className="flex items-center justify-center gap-2 bg-white text-deepsea font-heading font-bold py-3.5 px-6 rounded-xl border-2 border-deepsea hover:bg-deepsea hover:text-marble transition-colors cursor-pointer">
          <BookOpen size={18} />
          Lees meer over {winner.region.name}
        </button>
      </div>

      {/* Report request modal */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal
            regionName={winner.region.name}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Other regions — accordion */}
      {others.length > 0 && (
        <div className="mb-8">
          <h3 className="font-heading text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            Alle regio&apos;s
          </h3>
          <div className="space-y-2">
            {others.map((rs, i) => {
              const isOpen = openRegion === rs.region.id
              const contact = REGION_CONTACTS[rs.region.id]
              return (
                <div key={rs.region.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setOpenRegion(isOpen ? null : rs.region.id)}
                    className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-heading text-sm font-bold w-6">#{i + 2}</span>
                      <span className="text-2xl">{rs.region.emoji}</span>
                      <div className="text-left">
                        <h4 className="font-heading font-bold text-deepsea">{rs.region.name}</h4>
                        <p className="text-xs text-gray-400 font-body">{rs.region.province}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-xl font-bold text-deepsea">{rs.percentage}%</span>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-50">
                          <p className="text-sm text-gray-600 font-body mt-3 mb-4">{rs.region.description}</p>

                          {/* Category bars */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                            {cats.map((cat) => {
                              const cs = rs.categoryScores[cat.id]
                              if (!cs) return null
                              return (
                                <div key={cat.id} className="text-xs font-body">
                                  <div className="flex justify-between mb-0.5">
                                    <span className="text-gray-400 truncate mr-1">{cat.label}</span>
                                    <span className="text-deepsea font-bold">{cs.percentage}%</span>
                                  </div>
                                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-sun rounded-full" style={{ width: `${cs.percentage}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* CTAs for this region */}
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={`https://wa.me/${contact?.whatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-body font-medium px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <MessageCircle size={13} /> WhatsApp
                            </a>
                            <a
                              href={`tel:${contact?.telefoon}`}
                              className="flex items-center gap-1.5 text-xs font-body font-medium px-3 py-2 rounded-lg bg-deepsea/5 text-deepsea hover:bg-deepsea/10 transition-colors"
                            >
                              <Phone size={13} /> Bel specialist
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA 3 + 4 — bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <a
          href={`https://wa.me/${winnerContact?.whatsapp}?text=Hoi%2C%20ik%20heb%20het%20Costa%20Kompas%20ingevuld%20en%20${encodeURIComponent(winner.region.name)}%20kwam%20als%20%231%20uit.%20Kunnen%20we%20even%20sparren%3F`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-600 text-white font-heading font-bold py-3.5 px-6 rounded-xl hover:bg-green-700 transition-colors"
        >
          <MessageCircle size={18} />
          Stuur een WhatsApp
        </a>
        <a
          href={`tel:${winnerContact?.telefoon}`}
          className="flex items-center justify-center gap-2 bg-deepsea text-marble font-heading font-bold py-3.5 px-6 rounded-xl hover:bg-deepsea-light transition-colors"
        >
          <Phone size={18} />
          Bel specialist {winner.region.name}
        </a>
      </div>

      <button
        onClick={() => dispatch({ type: 'RESET' })}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-body py-3 transition-colors"
      >
        <RotateCcw size={14} /> Opnieuw beginnen
      </button>
    </motion.div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function KompasPage() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const filterType = state.filterAnswers.type as FilterType | undefined

  // Calculate available regions (surviving + overridden)
  const availableRegionIds = useMemo(() => {
    const surviving = applyHardFilters(REGIONS, state.profile ?? 'tweede-huis', state.filterAnswers)
    const survivingIds = new Set(surviving.map((r) => r.id))
    // Add overridden regions (but not Barcelona if verhuur is needed)
    for (const id of state.overriddenRegions) {
      const region = REGIONS.find((r) => r.id === id)
      if (region && (region.verhuurMogelijk || (state.profile !== 'investering' && state.filterAnswers.verhuur !== 'ja'))) {
        survivingIds.add(id)
      }
    }
    return Array.from(survivingIds)
  }, [state.profile, state.filterAnswers, state.overriddenRegions])

  // Calculate results for results step
  const results = useMemo(() => {
    if (state.step !== 'results' || !state.profile) return []
    const questions = getQuestionsForProfile(state.profile, filterType)
    // Ensure all categories have a weight (default 1)
    const allWeights: Record<string, number> = {}
    const cats = getCategoriesForProfile(state.profile)
    for (const cat of cats) {
      allWeights[cat.id] = state.weights[cat.id] ?? 1
    }
    return calculateScores(questions, state.answers, allWeights, availableRegionIds)
  }, [state.step, state.profile, state.answers, state.weights, availableRegionIds, filterType])

  const handleStart = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: 'profile' })
  }, [])

  const handleSelectProfile = useCallback((p: Profile) => {
    dispatch({ type: 'SET_PROFILE', profile: p })
  }, [])

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-deepsea flex items-center gap-2">
            <Compass className="w-6 h-6 text-sun" />
            Costa Kompas
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-body">
            Vind de juiste Spaanse regio voor je klant
          </p>
        </div>
        {state.step !== 'onboarding' && (
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-body"
          >
            <RotateCcw size={12} />
            Opnieuw
          </button>
        )}
      </div>

      <StepProgress current={state.step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={state.step + (state.step === 'filters' ? `-${state.filterIndex}` : '') + (state.step === 'questions' ? `-${state.questionIndex}` : '')}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={fadeVariants}
          transition={{ duration: 0.25 }}
        >
          {state.step === 'onboarding' && <Onboarding onStart={handleStart} />}

          {state.step === 'profile' && <ProfileStep onSelect={handleSelectProfile} />}

          {state.step === 'filters' && state.profile && (
            <FiltersStep
              profile={state.profile}
              filterAnswers={state.filterAnswers}
              filterIndex={state.filterIndex}
              overriddenRegions={state.overriddenRegions}
              dispatch={dispatch}
            />
          )}

          {state.step === 'weights' && state.profile && (
            <WeightsStep
              profile={state.profile}
              weights={state.weights}
              dispatch={dispatch}
            />
          )}

          {state.step === 'questions' && state.profile && (
            <QuestionsStep
              profile={state.profile}
              filterType={filterType}
              questionIndex={state.questionIndex}
              answers={state.answers}
              dispatch={dispatch}
            />
          )}

          {state.step === 'contact' && (
            <ContactStep dispatch={dispatch} />
          )}

          {state.step === 'results' && state.profile && (
            <ResultsStep
              results={results}
              profile={state.profile}
              weights={state.weights}
              dispatch={dispatch}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
