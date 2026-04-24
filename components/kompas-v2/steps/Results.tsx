'use client'

import { useRef, useState } from 'react'
import Icon from '../Icon'
import SpecialistButtons from '../SpecialistButtons'
import { DIMENSIONS, REGIONS } from '@/lib/kompas-v2/data'
import type { ScoreResult, Weights } from '@/lib/kompas-v2/logic'
import {
  REGION_DESC,
  REGION_PROMISE,
  REGION_SPECIALIST,
} from '@/lib/kompas-v2/meta'

interface EliminatedRegion {
  id: string
  name: string
  subtitle: string
  reasons: string[]
}

export default function Results({
  ranked,
  eliminated,
  weights,
  onBack,
  onReset,
}: {
  ranked: ScoreResult[]
  eliminated: EliminatedRegion[]
  weights: Weights
  onBack: () => void
  onReset: () => void
}) {
  const [openRegion, setOpenRegion] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  if (!ranked.length) {
    return (
      <div className="results-wrap">
        <div className="results-body">
          <div className="results-head">
            <span className="eyebrow">Geen match</span>
            <h1 className="display">Met deze filters blijft er geen regio over.</h1>
            <p className="lead">Verruim je budget of woningtype en probeer opnieuw.</p>
          </div>
          <div className="step-nav" style={{ marginTop: 24 }}>
            <button className="link-arrow" onClick={onBack}>
              <Icon name="arrow-left" size={12} stroke={2} /> Terug
            </button>
            <button className="btn" onClick={onReset}>
              Opnieuw beginnen
            </button>
          </div>
        </div>
      </div>
    )
  }

  const winner = ranked[0]
  const rest = ranked.slice(1)
  const winnerMeta = REGIONS.find(r => r.id === winner.regionId)
  if (!winnerMeta) return null
  const pct = Math.round(winner.score * 100)

  function scrollToList() {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="results-wrap">
      {/* Hero */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__rings" />
          <div className="hero__rings hero__rings--b" />
        </div>

        <div className="hero__top">
          <span className="hero__eye">#1 · Jouw Kompas wijst naar</span>
          <span className="hero__score">
            {pct}
            <sup>%</sup>
            <span className="hero__score-label">match</span>
          </span>
        </div>

        <div className="hero__title">
          <h1 className="hero__name">{winnerMeta.name}</h1>
          <div className="hero__sub">{winnerMeta.subtitle}</div>
        </div>

        <p className="hero__promise">
          {REGION_PROMISE[winner.regionId] || REGION_DESC[winner.regionId]}
        </p>

        <div className="hero__cta">
          <button className="btn btn--accent">
            Vraag je regio-rapport aan <Icon name="arrow-right" size={12} stroke={2} />
          </button>
        </div>

        <button className="hero__scrollhint" onClick={scrollToList}>
          <span>Bekijk de volledige lijst</span>
          <Icon name="chevron-down" size={14} stroke={2} />
        </button>
      </section>

      {/* Body */}
      <div className="results-body" ref={listRef}>
        <div className="results-head" style={{ paddingTop: 0 }}>
          <span className="eyebrow">Stap 5 · Resultaat</span>
          <h2 className="display">Jouw volledige kompas.</h2>
          <p className="lead">
            Gebaseerd op je profiel, weging en antwoorden. De match is genormaliseerd over de
            thema&apos;s die je hebt gewogen.
          </p>
        </div>

        {/* Breakdown card */}
        <div className="breakdown-card">
          <div className="breakdown-card__head">
            <div>
              <div className="breakdown-card__kicker">Waarom {winnerMeta.name} past</div>
              <div className="breakdown-card__title">Match per thema</div>
            </div>
            <div className="breakdown-card__score">
              {pct}
              <sup>%</sup>
            </div>
          </div>
          <div className="breakdown-card__dims">
            {DIMENSIONS.map(dim => {
              const w = weights[dim.id] ?? 0
              const isOff = w === 0
              const maxRank = w <= 1 ? 1 : w <= 3 ? 2 : 3
              const possible = Math.max(1, 4 * maxRank)
              const m = winner.dimMatches?.[dim.id] ?? 0
              const pctDim = isOff ? 0 : Math.round((m / possible) * 100)
              return (
                <div key={dim.id} className={`bcdim ${isOff ? 'is-off' : ''}`}>
                  <div className="bcdim__row">
                    <span className="bcdim__name">{dim.name}</span>
                    <span className="bcdim__val">{isOff ? 'uitgezet' : `${pctDim}%`}</span>
                  </div>
                  <div className="bcdim__bar">
                    <span style={{ width: isOff ? '0%' : `${pctDim}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Other matching regions */}
        <div className="otherregs">
          <div className="otherregs__head">
            <h3>Andere regio&apos;s in jouw match</h3>
            <span className="meta">Genormaliseerd · na filters</span>
          </div>

          <div className="regrows">
            {rest.map((r, i) => {
              const meta = REGIONS.find(x => x.id === r.regionId)
              if (!meta) return null
              const p = Math.round(r.score * 100)
              const isOpen = openRegion === r.regionId
              const spec = REGION_SPECIALIST[r.regionId]
              return (
                <div key={r.regionId} className={`regitem ${isOpen ? 'is-open' : ''}`}>
                  <button
                    className="regrow"
                    onClick={() => setOpenRegion(isOpen ? null : r.regionId)}
                  >
                    <span className="regrow__idx">0{i + 2}</span>
                    <div className="regrow__body">
                      <div className="regrow__name">{meta.name}</div>
                      <div className="regrow__sub">{meta.subtitle}</div>
                    </div>
                    <span className="regrow__score">
                      {p}
                      <sup>%</sup>
                    </span>
                    <span className={`regrow__chev ${isOpen ? 'is-open' : ''}`}>
                      <Icon name="chevron-down" size={14} stroke={2} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="regrow__expand">
                      <p className="regrow__desc">{REGION_DESC[r.regionId]}</p>
                      <div className="regrow__cta-primary">
                        <button className="btn btn--ghost">
                          Vraag je regio-rapport aan <Icon name="arrow-right" size={12} stroke={2} />
                        </button>
                      </div>
                      {spec && (
                        <div className="regrow__cta-specialist">
                          <SpecialistButtons specialist={spec} stacked />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Eliminated */}
        {eliminated.length > 0 && (
          <div className="otherregs otherregs--elim">
            <div className="otherregs__head">
              <div>
                <h3>Buiten jouw kader</h3>
                <p className="otherregs__note">
                  Deze regio&apos;s vielen af door je filters — maar ze blijven open voor
                  verkenning. Vraag gerust een rapport aan of spreek onze specialist.
                </p>
              </div>
            </div>

            <div className="regrows">
              {eliminated.map(r => {
                const isOpen = openRegion === r.id
                const spec = REGION_SPECIALIST[r.id]
                return (
                  <div key={r.id} className={`regitem regitem--elim ${isOpen ? 'is-open' : ''}`}>
                    <button
                      className="regrow regrow--elim"
                      onClick={() => setOpenRegion(isOpen ? null : r.id)}
                    >
                      <span className="regrow__idx">—</span>
                      <div className="regrow__body">
                        <div className="regrow__name">{r.name}</div>
                        <div className="regrow__sub">{r.reasons.join(' · ')}</div>
                      </div>
                      <span className="regrow__tag">Buiten kader</span>
                      <span className={`regrow__chev ${isOpen ? 'is-open' : ''}`}>
                        <Icon name="chevron-down" size={14} stroke={2} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="regrow__expand">
                        <p className="regrow__desc">{REGION_DESC[r.id]}</p>
                        <div className="regrow__cta-primary">
                          <button className="btn btn--ghost">
                            Vraag je regio-rapport aan{' '}
                            <Icon name="arrow-right" size={12} stroke={2} />
                          </button>
                        </div>
                        {spec && (
                          <div className="regrow__cta-specialist">
                            <SpecialistButtons specialist={spec} stacked />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="step-nav">
          <button className="link-arrow" onClick={onBack}>
            <Icon name="arrow-left" size={12} stroke={2} /> Pas antwoorden aan
          </button>
          <button className="btn btn--ghost" onClick={onReset}>
            Opnieuw beginnen
          </button>
        </div>
      </div>
    </div>
  )
}
