import Icon from '../Icon'

interface FilterAnswers {
  type?: 'appartement' | 'woning' | 'beide'
  budget?: number
}

const TYPES: Array<{ v: 'appartement' | 'woning' | 'beide'; l: string }> = [
  { v: 'appartement', l: 'Appartement' },
  { v: 'woning', l: 'Villa / Woning' },
  { v: 'beide', l: 'Geen voorkeur' },
]

const BUDGETS = [
  { v: 250000, l: 'Onder € 250.000', s: 'Instapniveau' },
  { v: 500000, l: '€ 250.000 — € 500.000', s: 'Middensegment' },
  { v: 1000000, l: '€ 500.000 — € 1.000.000', s: 'Hoger segment' },
  { v: 2000000, l: '€ 1.000.000 — € 2.000.000', s: 'Premium' },
  { v: 9999999, l: 'Meer dan € 2.000.000', s: 'Zonder bovengrens' },
]

export default function Filters({
  filters,
  setFilter,
  eliminatedCount,
  onNext,
  onBack,
}: {
  filters: FilterAnswers
  setFilter: <K extends keyof FilterAnswers>(k: K, v: FilterAnswers[K]) => void
  eliminatedCount: number
  onNext: () => void
  onBack: () => void
}) {
  const ready = !!filters.type && !!filters.budget
  return (
    <div className="kompas-step">
      <div className="filter-head">
        <span className="section-number">02 / Filters</span>
        <h1 className="display">Twee harde randvoorwaarden.</h1>
        <p className="lead">Regio&apos;s die hier niet aan voldoen worden uitgesloten van de uitkomst.</p>
      </div>

      <div className="filter-scroll">
        <div className="filter-block">
          <h4>Welk type woning?</h4>
          <div className="pillgrid">
            {TYPES.map(t => (
              <button
                key={t.v}
                className={filters.type === t.v ? 'is-active' : ''}
                onClick={() => setFilter('type', t.v)}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-block">
          <h4>Wat is je maximale budget?</h4>
          <p className="hint">We rekenen met mediaanprijzen per regio.</p>
          <div className="budget-list">
            {BUDGETS.map(b => (
              <button
                key={b.v}
                className={filters.budget === b.v ? 'is-active' : ''}
                onClick={() => setFilter('budget', b.v)}
              >
                <span>
                  {b.l}{' '}
                  <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 500 }}>· {b.s}</span>
                </span>
                <span className="check">
                  <Icon name="check" size={14} stroke={2} />
                </span>
              </button>
            ))}
          </div>
          {eliminatedCount > 0 && (
            <div className="eliminated-note">
              {eliminatedCount} regio{eliminatedCount === 1 ? '' : "'s"} vallen af door deze
              combinatie.
            </div>
          )}
        </div>
      </div>

      <div className="step-nav">
        <button className="link-arrow" onClick={onBack}>
          <Icon name="arrow-left" size={12} stroke={2} /> Terug
        </button>
        <button className="btn" disabled={!ready} onClick={onNext}>
          Verder naar weging <Icon name="arrow-right" size={12} stroke={2} />
        </button>
      </div>
    </div>
  )
}
