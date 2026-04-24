export default function KompasDial({ index, total }: { index: number; total: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  const pct = total > 0 ? (index + 1) / total : 0
  const offset = c * (1 - pct)
  const needleAngle = pct * 360

  return (
    <div className="kompas-dial" title={`Vraag ${index + 1} van ${total}`}>
      <svg viewBox="0 0 54 54">
        <circle className="kompas-dial__track" cx="27" cy="27" r={r} />
        <circle
          className="kompas-dial__fill"
          cx="27"
          cy="27"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <g
          style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '27px 27px',
            transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <line className="kompas-dial__needle" x1="27" y1="27" x2="27" y2="10" />
        </g>
      </svg>
    </div>
  )
}
