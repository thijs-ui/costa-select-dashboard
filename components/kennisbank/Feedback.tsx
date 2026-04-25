'use client'

import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

// `slug` wordt later gebruikt om vote naar telemetry-endpoint te sturen.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function KbDetailFeedback({ slug }: { slug: string }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  // Telemetrie-endpoint zit nog niet — local-only voor nu.
  return (
    <div className="kb-feedback">
      <p className="kb-feedback-q">Heeft dit document je geholpen?</p>
      <div className="kb-feedback-actions">
        <button
          type="button"
          className={`kb-feedback-btn ${vote === 'up' ? 'active' : ''}`}
          onClick={() => setVote(vote === 'up' ? null : 'up')}
        >
          <ThumbsUp size={14} strokeWidth={2} /> Ja
        </button>
        <button
          type="button"
          className={`kb-feedback-btn ${vote === 'down' ? 'active' : ''}`}
          onClick={() => setVote(vote === 'down' ? null : 'down')}
        >
          <ThumbsDown size={14} strokeWidth={2} /> Nee
        </button>
      </div>
    </div>
  )
}
