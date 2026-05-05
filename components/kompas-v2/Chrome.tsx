// Stepper-rail voor Costa Kompas. De brand-header is verhuisd naar de
// gedeelde PageHeader in de pagina-component zodat 't aanknopt bij de andere
// pagina's (Calculator, Presentatie, etc.). Deze component toont alleen nog
// de stappenbalk + huidige stap-label onderaan.

const LABELS = ['Profiel', 'Filters', 'Weging', 'Vragen', 'Resultaat']

export default function KompasRail({ stepIdx }: { stepIdx: number }) {
  return (
    <div>
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
      <div
        style={{
          padding: '8px 36px 0',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#7A8C8B',
        }}
      >
        Stap {stepIdx + 1} van 5 · {LABELS[stepIdx]}
      </div>
    </div>
  )
}
