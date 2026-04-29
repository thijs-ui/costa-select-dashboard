'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface DossierModalItem {
  title: string
  url: string
}

interface DossierModalProps {
  item: DossierModalItem | null
  onClose: () => void
  /**
   * Optionele override van de generate-aanroep. Default-flow stuurt naar
   * /api/dossier/generate met url+brochure_type='presentatie'. Voor de
   * nieuwbouwkaart geef je een eigen functie mee die /generate-from-newbuild
   * aanroept en {id} teruggeeft.
   */
  onGenerate?: () => Promise<{ id: string | null }>
}

export function DossierModal({ item, onClose, onGenerate }: DossierModalProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  if (!item) return null

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      let id: string | null = null
      if (onGenerate) {
        const r = await onGenerate()
        id = r.id
      } else {
        const res = await fetch('/api/dossier/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'url', url: item!.url, brochure_type: 'presentatie' }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({ error: 'Mislukt' }))
          throw new Error(d.error || 'Mislukt')
        }
        const data = await res.json()
        id = data.id ?? null
      }
      // Direct doorlinken naar de presentatie-pagina; modal hoeft geen
      // success-state te tonen.
      onClose()
      const target = id
        ? `/dossier?tab=history&id=${encodeURIComponent(id)}`
        : '/dossier?tab=history'
      router.push(target)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Genereren mislukt')
      setGenerating(false)
    }
  }

  const subjText = item.title || item.url

  return (
    <div
      className="wl-anim-fade-in fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(7,42,36,0.38)', backdropFilter: 'blur(3px)', padding: 24 }}
      onClick={onClose}
    >
      <div
        className="wl-anim-modal-in bg-white w-full overflow-hidden"
        style={{
          maxWidth: 540,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(7,42,36,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex justify-between items-start"
          style={{
            padding: '22px 24px 14px',
            borderBottom: '1px solid rgba(0,75,70,0.08)',
          }}
        >
          <div className="min-w-0">
            <div
              className="font-body font-bold uppercase text-sun-dark"
              style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 6 }}
            >
              AI-presentatie
            </div>
            <h3
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px' }}
            >
              Woningpresentatie genereren
            </h3>
            <div
              className="font-body truncate"
              style={{ fontSize: 12.5, color: '#5F7472', maxWidth: 420 }}
            >
              {subjText}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-colors"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'transparent',
              color: '#7A8C8B',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#E6F0EF'
              e.currentTarget.style.color = '#004B46'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#7A8C8B'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '22px 24px' }}>
          <p
            className="font-body"
            style={{
              fontSize: 13.5,
              color: '#5F7472',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Costa Select genereert een woningpresentatie met kenmerken,
            prijs, ligging en foto&apos;s. Klaar om te delen met je klant.
          </p>
          {error && (
            <div
              className="font-body"
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: 'rgba(224,82,82,0.1)',
                border: '1px solid rgba(224,82,82,0.25)',
                borderRadius: 8,
                fontSize: 12.5,
                color: '#c24040',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          className="flex justify-end items-center"
          style={{
            gap: 8,
            padding: '14px 24px 20px',
            borderTop: '1px solid rgba(0,75,70,0.08)',
          }}
        >
          {generating && (
            <span
              className="inline-flex items-center font-body"
              style={{ gap: 8, fontSize: 12, color: '#5F7472', marginRight: 'auto' }}
            >
              <span
                className="wl-spinner inline-block"
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  border: '2px solid rgba(0,75,70,0.14)',
                  borderTopColor: '#004B46',
                }}
              />
              Genereren...
            </span>
          )}
          <WlButton variant="subtle" disabled={generating} onClick={onClose}>
            Annuleren
          </WlButton>
          <WlButton variant="primary" disabled={generating} onClick={generate}>
            Genereer
          </WlButton>
        </div>
      </div>
    </div>
  )
}

// Shared button for modal (small variant set, co-located)
function WlButton({
  variant,
  disabled,
  onClick,
  children,
}: {
  variant: 'primary' | 'subtle' | 'ghost'
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  const styles = {
    primary: {
      background: '#004B46',
      color: '#FFFAEF',
      border: '1.5px solid #004B46',
      fontWeight: 600,
    },
    ghost: {
      background: '#FFFFFF',
      color: '#004B46',
      border: '1.5px solid rgba(0,75,70,0.18)',
      fontWeight: 600,
    },
    subtle: {
      background: 'transparent',
      color: '#5F7472',
      border: '1.5px solid transparent',
      fontWeight: 500,
    },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center font-body cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45"
      style={{
        padding: '9px 14px',
        borderRadius: 10,
        fontSize: 12,
        letterSpacing: '0.02em',
        gap: 7,
        ...styles,
      }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary') {
          e.currentTarget.style.background = '#0A6B63'
          e.currentTarget.style.borderColor = '#0A6B63'
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.borderColor = '#004B46'
        } else if (variant === 'subtle') {
          e.currentTarget.style.background = '#E6F0EF'
          e.currentTarget.style.color = '#004B46'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        if (variant === 'primary') {
          e.currentTarget.style.background = '#004B46'
          e.currentTarget.style.borderColor = '#004B46'
        } else if (variant === 'ghost') {
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.18)'
        } else if (variant === 'subtle') {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#5F7472'
        }
      }}
    >
      {children}
    </button>
  )
}
