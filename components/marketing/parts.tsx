'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  MC_LANGUAGES, MC_LENGTHS, MC_REWRITE_TARGETS,
  type McCategory, type McIconName, type McLanguage, type McLength,
  type McPlatform, type McRewriteTarget,
} from '@/lib/marketing-config'

// ============================================================
// Icon
// ============================================================
export function McIcon({ name, size = 16, fill = 'none', strokeWidth = 2, className }: {
  name: McIconName | string; size?: number; fill?: string; strokeWidth?: number; className?: string
}) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill, stroke: 'currentColor' as const, strokeWidth,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className,
  }
  switch (name) {
    case 'megaphone': return <svg {...props}><path d="M3 11l18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
    case 'mail': return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
    case 'share': return <svg {...props}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></svg>
    case 'book': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
    case 'video': return <svg {...props}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
    case 'sparkles': return <svg {...props}><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" /><path d="M19 15l.8 2 2 .8-2 .8L19 21l-.8-2-2-.8 2-.8.8-2z" /></svg>
    case 'wand': return <svg {...props}><path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" /></svg>
    case 'copy': return <svg {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    case 'rotate': return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /></svg>
    case 'save': return <svg {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
    case 'star': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
    case 'wand-rewrite': return <svg {...props}><path d="m21 5-3-3-9 9-3 3 3 3 9-9z" /><path d="m14 6 4 4" /><path d="M3 21h6" /></svg>
    case 'check': return <svg {...props}><path d="M20 6 9 17l-5-5" /></svg>
    case 'check-circle': return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    case 'chevron-down': return <svg {...props}><path d="m6 9 6 6 6-6" /></svg>
    case 'arrow-right': return <svg {...props}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
    case 'edit-3': return <svg {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
    default: return null
  }
}

// ============================================================
// Toast
// ============================================================
export function McToast({ message, visible, icon = 'check-circle' }: {
  message: string; visible: boolean; icon?: McIconName
}) {
  return (
    <div className={'mc-toast' + (visible ? ' is-visible' : '')} role="status" aria-live="polite">
      <McIcon name={icon} size={16} />
      <span>{message}</span>
    </div>
  )
}

// ============================================================
// Hero
// ============================================================
export function McHero({ category }: { category: McCategory }) {
  return (
    <header className="mc-hero">
      <div className="mc-hero-eyebrow">
        <span>Costa Select</span>
        <span>·</span>
        <span>{category.eyebrow}</span>
        <span>·</span>
        <span>{category.nav}</span>
      </div>
      <h1 className="mc-hero-title">{category.title}</h1>
      <p className="mc-hero-lede">{category.subtitle}</p>
    </header>
  )
}

// ============================================================
// Cat-nav (links naar de 6 marketing-pagina's)
// ============================================================
export function McCatNav({ categories, activeId }: {
  categories: McCategory[]; activeId: string
}) {
  return (
    <nav className="mc-catnav" aria-label="Marketing categorieën">
      {categories.map(c => (
        <a
          key={c.id}
          href={`/marketing/${c.slug}`}
          className={c.id === activeId ? 'is-active' : ''}
        >
          <McIcon name={c.icon} size={15} />
          <span>{c.nav}</span>
        </a>
      ))}
    </nav>
  )
}

// ============================================================
// Platform cards
// ============================================================
export function McPlatformCards({ platforms, value, onChange }: {
  platforms: McPlatform[]; value: string; onChange: (id: string) => void
}) {
  const cls = 'mc-platforms' + (platforms.length >= 3 ? ' mc-platforms--wide' : '')
  return (
    <div className={cls}>
      {platforms.map(p => (
        <button
          key={p.id}
          type="button"
          className={'mc-platform' + (value === p.id ? ' is-active' : '')}
          onClick={() => onChange(p.id)}
        >
          <div className="mc-platform-label">
            <span>{p.label}</span>
            {p.maxChars ? <span className="mc-platform-max">{p.maxChars} tk</span> : null}
          </div>
          {p.hint ? <div className="mc-platform-hint">{p.hint}</div> : null}
        </button>
      ))}
    </div>
  )
}

// ============================================================
// Toggles (taal + lengte)
// ============================================================
export function McToggles({ language, onLanguage, length, onLength, showLength }: {
  language: McLanguage['id']; onLanguage: (id: McLanguage['id']) => void
  length: McLength['id']; onLength: (id: McLength['id']) => void
  showLength: boolean
}) {
  return (
    <div className="mc-toggles">
      <div className="mc-toggle-group">
        <div className="mc-toggle-label">Taal</div>
        <div className="mc-segmented" role="radiogroup" aria-label="Taal">
          {MC_LANGUAGES.map(l => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={language === l.id}
              className={language === l.id ? 'is-active' : ''}
              onClick={() => onLanguage(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {showLength && (
        <div className="mc-toggle-group">
          <div className="mc-toggle-label">Lengte</div>
          <div className="mc-segmented" role="radiogroup" aria-label="Lengte">
            {MC_LENGTHS.map(l => (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={length === l.id}
                className={length === l.id ? 'is-active' : ''}
                onClick={() => onLength(l.id)}
              >
                <span>{l.label}</span>
                <small>{l.sub}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Prompt + extra
// ============================================================
export function McPromptArea({ prompt, onPrompt, extra, onExtra, placeholder }: {
  prompt: string; onPrompt: (s: string) => void
  extra: string; onExtra: (s: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="mc-field">
        <div className="mc-field-row">
          <label className="mc-field-label" htmlFor="mc-prompt">
            Waar moet de content over gaan?<span className="mc-field-required">*</span>
          </label>
          <span className="mc-field-helper">verplicht · {prompt.length} tekens</span>
        </div>
        <textarea
          id="mc-prompt"
          className="mc-textarea mc-textarea--prompt"
          placeholder={placeholder}
          value={prompt}
          onChange={e => onPrompt(e.target.value)}
        />
      </div>
      <div className="mc-field">
        <div className="mc-field-row">
          <label className="mc-field-label" htmlFor="mc-extra">Extra instructies</label>
          <span className="mc-field-helper">optioneel · toon, doelgroep, must-haves</span>
        </div>
        <textarea
          id="mc-extra"
          className="mc-textarea mc-textarea--extra"
          placeholder='Bijv. zakelijke toon, vermijd het woord "droomwoning", noem de zeezicht-USP expliciet…'
          value={extra}
          onChange={e => onExtra(e.target.value)}
        />
      </div>
    </div>
  )
}

// ============================================================
// Generate band
// ============================================================
export function McGenerateBand({ platform, language, length, showLength, onGenerate, isLoading, canGenerate }: {
  platform: McPlatform | null
  language: McLanguage['id']
  length: McLength['id']
  showLength: boolean
  onGenerate: () => void
  isLoading: boolean
  canGenerate: boolean
}) {
  const langName = MC_LANGUAGES.find(l => l.id === language)?.name ?? 'Nederlands'
  const lenLabel = MC_LENGTHS.find(l => l.id === length)?.label.toLowerCase() ?? ''
  return (
    <div className="mc-generate">
      <div className="mc-generate-meta">
        Klaar om te genereren —{' '}
        <strong>{platform?.label || 'kies een platform'}</strong>{' '}
        in <em>{langName}</em>
        {showLength && <>, lengte <em>{lenLabel}</em></>}.
      </div>
      <button
        type="button"
        className="mc-btn mc-btn--primary"
        onClick={onGenerate}
        disabled={!canGenerate || isLoading}
      >
        {isLoading ? (
          <><span className="mc-spin" /><span>Genereren…</span></>
        ) : (
          <><McIcon name="sparkles" size={16} /><span>Genereer</span></>
        )}
      </button>
    </div>
  )
}

// ============================================================
// Rewrite dropdown
// ============================================================
export function McRewriteSelect({ onRewrite, isLoading }: {
  onRewrite: (target: McRewriteTarget) => void
  isLoading: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="mc-rewrite" ref={ref}>
      <button
        type="button"
        className={'mc-rewrite-btn' + (isLoading ? ' is-loading' : '')}
        onClick={() => setOpen(o => !o)}
        disabled={isLoading}
      >
        {isLoading ? <span className="mc-spin" /> : <McIcon name="wand-rewrite" size={14} />}
        <span>{isLoading ? 'Herschrijven…' : 'Herschrijf voor…'}</span>
        {!isLoading && <McIcon name="chevron-down" size={14} />}
      </button>
      {open && (
        <div className="mc-rewrite-menu" role="menu">
          <div className="mc-rewrite-menu-head">Herschrijf voor</div>
          {MC_REWRITE_TARGETS.map(t => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onRewrite(t) }}
            >
              <span>{t.label}</span>
              <McIcon name="arrow-right" size={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Output panel
// ============================================================
export interface McVersion {
  id: string
  text: string
  platformLabel: string
  language: McLanguage['id']
  lengthLabel: McLength['id'] | null
  maxChars: number | null
  favorite: boolean
  timeLabel: string
}

export function McOutput({
  versions, activeIdx, onPickVersion, onEditText,
  isGenerating, generatingPlatformLabel,
  onCopy, onRegenerate, onSave, onToggleFav,
  onRewrite, isRewriting,
  copyState, saveState,
}: {
  versions: McVersion[]
  activeIdx: number
  onPickVersion: (i: number) => void
  onEditText: (i: number, text: string) => void
  isGenerating: boolean
  generatingPlatformLabel: string
  onCopy: (text: string) => void
  onRegenerate: () => void
  onSave: (i: number) => void
  onToggleFav: (i: number) => void
  onRewrite: (i: number, target: McRewriteTarget) => void
  isRewriting: boolean
  copyState: 'idle' | 'success'
  saveState: 'idle' | 'success'
}) {
  if (!isGenerating && versions.length === 0) {
    return (
      <div className="mc-output-empty">
        <McIcon name="sparkles" size={36} />
        <h3>Output verschijnt hier</h3>
        <p>Kies een platform, taal en (optioneel) lengte, schrijf een prompt en klik op <strong>Genereer</strong>. Tot 3 versies blijven bewaard.</p>
      </div>
    )
  }

  if (isGenerating && versions.length === 0) {
    return (
      <section className="mc-output">
        <div className="mc-output-loading-meta">
          <span className="mc-spin" style={{ color: 'var(--mc-deepsea)' }} />
          <span>Genereren voor <strong>{generatingPlatformLabel}</strong>…</span>
        </div>
        <div className="mc-output-loading">
          <div className="mc-skeleton" />
          <div className="mc-skeleton" />
          <div className="mc-skeleton" />
          <div className="mc-skeleton" />
          <div className="mc-skeleton" />
          <div className="mc-skeleton" />
        </div>
      </section>
    )
  }

  const v = versions[activeIdx] || versions[0]
  const langInfo = MC_LANGUAGES.find(l => l.id === v.language) || MC_LANGUAGES[0]
  const charCount = v.text.length
  const overMax = v.maxChars != null && charCount > v.maxChars

  return (
    <section className="mc-output">
      <div className="mc-tabs" role="tablist" aria-label="Versies">
        {versions.map((ver, i) => (
          <button
            key={ver.id}
            type="button"
            role="tab"
            aria-selected={i === activeIdx}
            className={'mc-tab' + (i === activeIdx ? ' is-active' : '')}
            onClick={() => onPickVersion(i)}
          >
            <span>Versie {i + 1}</span>
            <span className="mc-tab-time">{ver.timeLabel}</span>
          </button>
        ))}
        {isGenerating && (
          <span className="mc-tab" style={{ cursor: 'default', color: 'var(--mc-sun-dark)' }}>
            <span className="mc-spin" style={{ width: 11, height: 11, borderWidth: 1.5, color: 'currentColor' }} />
            <span>Nieuwe versie…</span>
          </span>
        )}
      </div>

      <div className="mc-output-head">
        <div className="mc-output-head-l">
          <span className="mc-pill mc-pill--platform">{v.platformLabel}</span>
          <span className="mc-pill">{langInfo.label}</span>
          {v.lengthLabel ? <span className="mc-pill">{v.lengthLabel}</span> : null}
        </div>
        <div className={'mc-charcount' + (overMax ? ' mc-charcount--over' : '')}>
          <strong>{charCount}</strong>
          {v.maxChars ? <> / {v.maxChars} tekens</> : <> tekens</>}
          {overMax ? ' · over limiet' : ''}
        </div>
      </div>

      <textarea
        className="mc-textarea mc-textarea--output"
        value={v.text}
        onChange={e => onEditText(activeIdx, e.target.value)}
        spellCheck
      />

      <div className="mc-actions">
        <div className="mc-actions-l">
          <button
            type="button"
            className={'mc-action-btn' + (copyState === 'success' ? ' is-success' : '')}
            onClick={() => onCopy(v.text)}
          >
            <McIcon name={copyState === 'success' ? 'check' : 'copy'} size={13} />
            <span>{copyState === 'success' ? 'Gekopieerd' : 'Kopiëren'}</span>
          </button>
          <button type="button" className="mc-action-btn" onClick={onRegenerate} disabled={isGenerating}>
            <McIcon name="rotate" size={13} />
            <span>Opnieuw genereren</span>
          </button>
          <button
            type="button"
            className={'mc-action-btn' + (saveState === 'success' ? ' is-success' : '')}
            onClick={() => onSave(activeIdx)}
          >
            <McIcon name={saveState === 'success' ? 'check' : 'save'} size={13} />
            <span>{saveState === 'success' ? 'Opgeslagen' : 'Opslaan'}</span>
          </button>
          <button
            type="button"
            className={'mc-action-btn' + (v.favorite ? ' is-fav' : '')}
            onClick={() => onToggleFav(activeIdx)}
            aria-pressed={v.favorite}
          >
            <McIcon name="star" size={13} />
            <span>Favoriet</span>
          </button>
        </div>
        <div className="mc-actions-r">
          <McRewriteSelect onRewrite={t => onRewrite(activeIdx, t)} isLoading={isRewriting} />
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Step panel (gebruikt in input-kolom)
// ============================================================
export function McPanel({ step, title, meta, children }: {
  step: number; title: string; meta?: ReactNode; children: ReactNode
}) {
  return (
    <section className="mc-panel">
      <div className="mc-panel-head">
        <h2 className="mc-panel-title">
          <span className="mc-panel-step">{step}</span>
          <span>{title}</span>
        </h2>
        {meta ? <span className="mc-panel-meta">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}
