import Icon from './Icon'

const LABELS = ['Profiel', 'Filters', 'Weging', 'Vragen', 'Resultaat']

export default function Chrome({
  stepIdx,
  onRestart,
}: {
  stepIdx: number
  onRestart: () => void
}) {
  return (
    <>
      <div className="kompas-chrome">
        <div className="kompas-chrome__brand">
          <span className="dot" />
          Costa Kompas
          <em>v2 · adviesinstrument</em>
        </div>
        <div className="kompas-chrome__right">
          <span className="kompas-chrome__step">
            Stap {stepIdx + 1} van 5 · {LABELS[stepIdx]}
          </span>
          {stepIdx > 0 && (
            <button className="kompas-chrome__restart" onClick={onRestart}>
              <Icon name="rotate-ccw" size={12} />
              Opnieuw
            </button>
          )}
        </div>
      </div>
      <div className="kompas-rail">
        {LABELS.map((l, i) => (
          <div
            key={l}
            className={`kompas-rail__seg ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'active' : ''}`}
          >
            <span />
          </div>
        ))}
      </div>
    </>
  )
}
