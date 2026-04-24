import Icon from '../Icon'
import { DIMENSIONS, type DimensionId } from '@/lib/kompas-v2/data'
import { DIMENSION_BLURBS } from '@/lib/kompas-v2/meta'
import type { Weights } from '@/lib/kompas-v2/logic'

export default function WeightsStep({
  weights,
  setWeight,
  totalQuestions,
  onNext,
  onBack,
}: {
  weights: Weights
  setWeight: (dim: DimensionId, v: number) => void
  totalQuestions: number
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div className="kompas-step">
      <div className="weights-head">
        <span className="section-number">03 / Weging</span>
        <h1 className="display">Hoe belangrijk is elk thema?</h1>
        <p className="lead">Van 0 (niet meenemen) naar 5 (doorslaggevend).</p>
      </div>

      <div className="weights-scroll">
        <div className="weights-counter">
          <div className="weights-counter__num">
            <span className="sun">{totalQuestions}</span>
          </div>
          <div className="weights-counter__label">
            {totalQuestions === 1 ? 'vraag' : 'vragen'}
          </div>
        </div>

        {DIMENSIONS.map((dim, i) => {
          const w = weights[dim.id] ?? 3
          const isOff = w === 0
          const maxRank = w <= 1 ? 1 : w <= 3 ? 2 : 3
          const qCount = isOff ? 0 : maxRank
          return (
            <div key={dim.id} className={`weight-row ${isOff ? 'is-off' : ''}`}>
              <div className="weight-row__head">
                <div className="weight-row__title">
                  <span className="idx">0{i + 1}</span>
                  <div>
                    <h4>{dim.name}</h4>
                    <span className="blurb">{DIMENSION_BLURBS[dim.id] ?? ''}</span>
                  </div>
                </div>
                <div className="weight-row__meta">
                  <span className="count">{qCount}</span> vraag{qCount === 1 ? '' : 'en'}
                </div>
              </div>
              <div className="weight-row__track">
                {[0, 1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    className={`${w === n ? 'on' : ''} ${n === 0 ? 'zero' : ''}`}
                    onClick={() => setWeight(dim.id, n)}
                    aria-label={`Weging ${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="step-nav">
        <button className="link-arrow" onClick={onBack}>
          <Icon name="arrow-left" size={12} stroke={2} /> Terug
        </button>
        <button className="btn btn--accent" onClick={onNext} disabled={totalQuestions === 0}>
          Start de {totalQuestions} vragen <Icon name="arrow-right" size={12} stroke={2} />
        </button>
      </div>
    </div>
  )
}
