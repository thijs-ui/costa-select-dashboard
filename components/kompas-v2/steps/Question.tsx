'use client'

import { useCallback, useEffect, useState } from 'react'
import Icon from '../Icon'
import KompasDial from '../KompasDial'
import { DIMENSIONS, type Question } from '@/lib/kompas-v2/data'

type Answer = 'A' | 'B' | 'C'

export default function QuestionStep({
  question,
  index,
  total,
  onAnswer,
  onBack,
}: {
  question: Question
  index: number
  total: number
  onAnswer: (letter: Answer) => void
  onBack: () => void
}) {
  const [pressed, setPressed] = useState<Answer | null>(null)
  const dim = DIMENSIONS.find(d => d.id === question.dimension)
  const dimIdx = DIMENSIONS.findIndex(d => d.id === question.dimension)

  const choose = useCallback(
    (letter: Answer) => {
      if (pressed) return
      setPressed(letter)
      setTimeout(() => {
        onAnswer(letter)
        setPressed(null)
      }, 220)
    },
    [pressed, onAnswer]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === '1') choose('A')
      else if (e.key === 'b' || e.key === 'B' || e.key === '2') choose('B')
      else if (e.key === 'c' || e.key === 'C' || e.key === '3') choose('C')
      else if (e.key === 'ArrowLeft') onBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [choose, onBack])

  if (!dim) return null

  const rankLabel =
    question.rank === 1 ? 'Kernvraag' : question.rank === 2 ? 'Verdieping' : 'Fijnafstelling'

  return (
    <div className="question-wrap" key={question.id}>
      <div className="question-progress">
        <KompasDial index={index} total={total} />
        <div className="question-progress__meta">
          <span className="question-progress__count">
            <span className="question-progress__cur" key={index}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="question-progress__tot">/ {String(total).padStart(2, '0')}</span>
          </span>
          <span className="question-progress__label">
            Vraag {index + 1} van {total}
          </span>
        </div>
      </div>

      <div className="question-topmeta">
        <div className="question-dim">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="eyebrow">
              Thema {dimIdx + 1} · {dim.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-subtle)', fontWeight: 500 }}>
              {rankLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="question-body">
        <h1 className="question-text">{question.text}</h1>

        <div className="question-options">
          {question.options.map(opt => (
            <button
              key={opt.id}
              className={`qopt ${pressed === opt.id ? 'is-pressed' : ''}`}
              onClick={() => choose(opt.id as Answer)}
            >
              <span className="qopt__letter">{opt.id}</span>
              <span className="qopt__label">{opt.label}</span>
              <span className="qopt__arrow">
                <Icon name="arrow-right" size={16} />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="question-foot">
        <button className="link-arrow" onClick={onBack}>
          <Icon name="arrow-left" size={12} stroke={2} /> Vorige
        </button>
      </div>
    </div>
  )
}
