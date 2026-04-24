import Icon from '../Icon'
import type { Doel } from '@/lib/kompas-v2/data'

interface ProfielOption {
  id: Doel
  title: string
  desc: string
}

const OPTS: ProfielOption[] = [
  {
    id: 'tweede-huis',
    title: 'Tweede huis',
    desc: 'Een plek voor vakanties en langere verblijven. Soms verhuren tussendoor.',
  },
  {
    id: 'permanent',
    title: 'Permanent wonen',
    desc: 'Emigreren naar Spanje, of een groot deel van het jaar daar zijn.',
  },
  {
    id: 'investering',
    title: 'Investering',
    desc: 'Vastgoed met oog op rendement. Verhuur, waardegroei, of beide.',
  },
]

export default function Profile({ onSelect }: { onSelect: (d: Doel) => void }) {
  return (
    <div className="kompas-step">
      <div className="profile-head">
        <span className="eyebrow">Stap 1 · Profiel</span>
        <h1 className="display display--big">
          Waarom overweeg je
          <br />
          een huis in Spanje?
        </h1>
        <p className="lead" style={{ marginTop: 20 }}>
          Eén vraag om te beginnen. Jouw antwoord bepaalt op welke thema&apos;s we later doorvragen.
        </p>
      </div>
      <div className="profile-list">
        {OPTS.map((o, i) => (
          <button key={o.id} className="profile-item" onClick={() => onSelect(o.id)}>
            <span className="profile-item__num">0{i + 1}</span>
            <div className="profile-item__body">
              <h3>{o.title}</h3>
              <p>{o.desc}</p>
            </div>
            <span className="profile-item__arrow">
              <Icon name="arrow-right" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
