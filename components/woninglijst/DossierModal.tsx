'use client'

import { useState } from 'react'
import { Check, Eye, Megaphone, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface DossierModalItem {
  title: string
  url: string
}

interface DossierModalProps {
  item: DossierModalItem | null
  onClose: () => void
}

export function DossierModal({ item, onClose }: DossierModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'' | 'presentatie' | 'pitch'>('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ id: string } | null>(null)
  const [error, setError] = useState('')

  if (!item) return null

  async function generate() {
    if (!mode) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/dossier/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'url', url: item!.url, brochure_type: mode }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: 'Mislukt' }))
        throw new Error(d.error || 'Mislukt')
      }
      const data = await res.json()
      setResult({ id: data.id || 'created' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dossier genereren mislukt')
    }
    setGenerating(false)
  }

  function goToDossier() {
    router.push('/dossier')
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
        {!result ? (
          <>
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
                  AI-dossier
                </div>
                <h3
                  className="font-heading font-bold text-deepsea"
                  style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px' }}
                >
                  Dossier genereren
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
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
                <ModeCard
                  icon={<Eye size={18} strokeWidth={1.8} />}
                  title="Presenteren"
                  desc="Feitelijke woningpresentatie — kenmerken, prijs, ligging. Voor de klantpitch."
                  selected={mode === 'presentatie'}
                  disabled={generating}
                  onClick={() => setMode('presentatie')}
                />
                <ModeCard
                  icon={<Megaphone size={18} strokeWidth={1.8} />}
                  title="Pitchen"
                  desc="Met voordelen, nadelen & Costa-advies. Voor intern gesprek of follow-up."
                  selected={mode === 'pitch'}
                  disabled={generating}
                  onClick={() => setMode('pitch')}
                />
              </div>
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
              <WlButton variant="primary" disabled={!mode || generating} onClick={generate}>
                Genereer
              </WlButton>
            </div>
          </>
        ) : (
          <>
            <div
              className="flex justify-between items-start"
              style={{ padding: '22px 24px 0' }}
            >
              <div style={{ flex: 1 }} />
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
            <div className="text-center" style={{ padding: '40px 32px 28px' }}>
              <div
                className="inline-flex items-center justify-center"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.12)',
                  color: '#10b981',
                  marginBottom: 16,
                }}
              >
                <Check size={34} strokeWidth={2.5} />
              </div>
              <h3
                className="font-heading font-bold text-deepsea"
                style={{ fontSize: 24, letterSpacing: '-0.01em', margin: '0 0 6px' }}
              >
                Dossier aangemaakt!
              </h3>
              <p
                className="font-body mx-auto"
                style={{
                  fontSize: 13.5,
                  color: '#5F7472',
                  margin: '0 auto 22px',
                  maxWidth: 360,
                }}
              >
                {subjText}
              </p>
              <div className="flex justify-center" style={{ gap: 10 }}>
                <WlButton variant="primary" onClick={goToDossier}>
                  Bekijk dossier
                </WlButton>
                <WlButton variant="ghost" onClick={onClose}>
                  Blijf hier
                </WlButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ───────── Mode card ─────────
function ModeCard({
  icon,
  title,
  desc,
  selected,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col text-left cursor-pointer disabled:cursor-not-allowed transition-all"
      style={{
        padding: '18px 16px',
        background: selected ? '#E6F0EF' : '#FFFFFF',
        border: selected ? '1.5px solid #004B46' : '1.5px solid rgba(0,75,70,0.14)',
        borderRadius: 12,
        gap: 10,
        boxShadow: selected ? '0 0 0 3px rgba(0,75,70,0.08)' : 'none',
        opacity: disabled && !selected ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!selected && !disabled) {
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.3)'
          e.currentTarget.style.background = '#FFFAEF'
        }
      }}
      onMouseLeave={e => {
        if (!selected && !disabled) {
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.14)'
          e.currentTarget.style.background = '#FFFFFF'
        }
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: selected ? '#F5AF40' : '#FEF6E4',
          color: selected ? '#004B46' : '#D4921A',
        }}
      >
        {icon}
      </span>
      <span>
        <div
          className="font-heading font-bold text-deepsea"
          style={{ fontSize: 15, letterSpacing: '-0.005em', marginBottom: 4 }}
        >
          {title}
        </div>
        <div className="font-body" style={{ fontSize: 12, color: '#5F7472', lineHeight: 1.4 }}>
          {desc}
        </div>
      </span>
    </button>
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
