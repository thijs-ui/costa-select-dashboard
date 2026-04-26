'use client'

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'

// ============================================================
// Icons
// ============================================================
const ICONS: Record<string, string[]> = {
  save: [
    'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
    'M17 21v-8H7v8',
    'M7 3v5h8',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: [
    'M3 6h18',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
    'M10 11v6',
    'M14 11v6',
  ],
  check: ['M20 6L9 17l-5-5'],
  warn: [
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
}

export function AaIcon({ name, size = 14, strokeWidth = 1.8, style }: {
  name: keyof typeof ICONS
  size?: number
  strokeWidth?: number
  style?: CSSProperties
}) {
  const paths = ICONS[name]
  if (!paths) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

// ============================================================
// useDirtyTracker — generic hook voor inline-edit secties
// ============================================================
function cuid() {
  return 'tmp-' + Math.random().toString(36).slice(2, 9)
}

export interface DirtyTracker<T extends { id: string }> {
  rows: T[]
  setRows: (rows: T[] | ((prev: T[]) => T[])) => void
  dirtyIds: Set<string>
  hasDirty: boolean
  updateRow: (id: string, patch: Partial<T>) => void
  addRow: (row: Partial<T>) => void
  removeRow: (id: string) => void
  markClean: () => void
  reset: (rows: T[]) => void
}

export function useDirtyTracker<T extends { id: string }>(initial: T[]): DirtyTracker<T> {
  const [rows, setRows] = useState<T[]>(initial)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set())

  const updateRow = useCallback((id: string, patch: Partial<T>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    setDirtyIds(prev => { const n = new Set(prev); n.add(id); return n })
  }, [])

  const addRow = useCallback((row: Partial<T>) => {
    const id = (row.id as string | undefined) || cuid()
    const newRow = { ...row, id } as T
    setRows(prev => [...prev, newRow])
    setDirtyIds(prev => { const n = new Set(prev); n.add(id); return n })
  }, [])

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    setDirtyIds(prev => { const n = new Set(prev); n.add('__deleted__:' + id); return n })
  }, [])

  const markClean = useCallback(() => setDirtyIds(new Set()), [])

  const reset = useCallback((next: T[]) => {
    setRows(next)
    setDirtyIds(new Set())
  }, [])

  return {
    rows, setRows, dirtyIds, hasDirty: dirtyIds.size > 0,
    updateRow, addRow, removeRow, markClean, reset,
  }
}

// ============================================================
// Hero
// ============================================================
export function AaHero({ dirtyCount, savingAll, onSaveAll }: {
  dirtyCount: number
  savingAll: boolean
  onSaveAll: () => void
}) {
  const isDirty = dirtyCount > 0
  return (
    <header className="aa-hero">
      <div>
        <div className="aa-hero-eyebrow">Costa Select · Financieel · Configuratie</div>
        <h1 className="aa-hero-title">Aannames</h1>
        <p className="aa-hero-lede">
          Configuratie van <strong>gebruikers</strong>, <strong>team</strong>, <strong>kostenposten</strong>,
          regio-instellingen en Pipedrive-mapping. Wijzigingen werken meteen door in het dashboard.
        </p>
      </div>
      <div className="aa-hero-actions">
        <span className="aa-hero-meta">
          <span className={'dot' + (isDirty ? ' dirty' : '')} />
          {isDirty
            ? `${dirtyCount} ${dirtyCount === 1 ? 'sectie met wijzigingen' : 'secties met wijzigingen'}`
            : 'Alle wijzigingen opgeslagen'}
        </span>
        <button
          className="aa-btn aa-btn--primary"
          onClick={onSaveAll}
          disabled={!isDirty || savingAll}
          type="button"
        >
          <AaIcon name="save" size={14} strokeWidth={2} />
          {savingAll ? 'Opslaan…' : 'Alles opslaan'}
        </button>
      </div>
    </header>
  )
}

// ============================================================
// Section card
// ============================================================
export function AaSectionCard({
  num, eyebrow, title, meta, accent = 'deepsea',
  dirty, saving, savedAt, onSave, saveLabel,
  children,
}: {
  num: number
  eyebrow: string
  title: string
  meta?: ReactNode
  accent?: 'deepsea' | 'sun' | 'sea' | 'sand'
  dirty: boolean
  saving: boolean
  savedAt: number | null
  onSave: () => void
  saveLabel?: string
  children: ReactNode
}) {
  let statusEl: ReactNode
  if (saving) {
    statusEl = <span className="aa-section-status"><span className="dot" />Opslaan…</span>
  } else if (savedAt) {
    statusEl = (
      <span className="aa-section-status saved">
        <AaIcon name="check" size={11} strokeWidth={2.4} />
        Opgeslagen
      </span>
    )
  } else if (dirty) {
    statusEl = <span className="aa-section-status dirty"><span className="dot" />Niet opgeslagen</span>
  } else {
    statusEl = <span className="aa-section-status"><span className="dot" />Synchroon</span>
  }

  return (
    <section className="aa-section" data-accent={accent}>
      <div className="aa-section-head">
        <div className="aa-section-num">{String(num).padStart(2, '0')}</div>
        <div className="aa-section-titles">
          <div className="aa-section-eyebrow">{eyebrow}</div>
          <h2 className="aa-section-h2">{title}</h2>
        </div>
        {meta ? <div className="aa-section-meta">{meta}</div> : null}
        <div className="aa-section-actions">
          {statusEl}
          <button
            className="aa-btn aa-btn--ghost aa-btn--sm"
            onClick={onSave}
            disabled={!dirty || saving}
            type="button"
          >
            <AaIcon name="save" size={12} strokeWidth={2} />
            {saving ? 'Opslaan…' : saveLabel || 'Opslaan'}
          </button>
        </div>
      </div>
      <div className="aa-section-body">{children}</div>
    </section>
  )
}

// ============================================================
// Inline table
// ============================================================
export interface AaColumn {
  label: string
  width?: string
  align?: 'num' | 'act'
}

export function AaInlineTable<T extends { id: string }>({
  columns, rows, dirtyIds, renderRow,
  onAdd, addLabel, emptyText, emptyCta,
}: {
  columns: AaColumn[]
  rows: T[]
  dirtyIds?: Set<string>
  renderRow: (row: T, isDirty: boolean) => ReactNode
  onAdd?: () => void
  addLabel?: string
  emptyText?: string
  emptyCta?: string
}) {
  if (rows.length === 0) {
    return (
      <div className="aa-empty">
        <div className="aa-empty-icon"><AaIcon name="inbox" size={20} strokeWidth={1.6} /></div>
        <p>{emptyText || 'Nog geen items.'}</p>
        {onAdd && (
          <button className="aa-btn aa-btn--ghost aa-btn--sm" onClick={onAdd} type="button">
            <AaIcon name="plus" size={12} strokeWidth={2.2} />
            {emptyCta || addLabel || '+ Toevoegen'}
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="aa-table-wrap">
        <table className="aa-table">
          <colgroup>
            {columns.map((c, i) => (
              <col key={i} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={c.align === 'num' ? 'num' : c.align === 'act' ? 'act' : ''}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isDirty = dirtyIds?.has(row.id) ?? false
              return (
                <tr key={row.id} className={isDirty ? 'is-dirty' : ''}>
                  {renderRow(row, isDirty)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onAdd && (
        <div className="aa-add-row">
          <button className="aa-add-btn" onClick={onAdd} type="button">
            <AaIcon name="plus" size={14} strokeWidth={2.2} />
            {addLabel || '+ Toevoegen'}
          </button>
        </div>
      )}
    </>
  )
}

// ============================================================
// Cell input
// ============================================================
export function AaCellInput({
  value, onChange, type = 'text',
  placeholder, prefix, suffix, mono, readOnly,
}: {
  value: string | number | null | undefined
  onChange: (v: string | number) => void
  type?: 'text' | 'number'
  placeholder?: string
  prefix?: string
  suffix?: string
  mono?: boolean
  readOnly?: boolean
}) {
  const cls = [
    'aa-cell',
    type === 'number' ? 'aa-cell--num' : '',
    mono ? 'aa-cell--mono' : '',
    readOnly ? 'aa-cell--readonly' : '',
    suffix ? 'suffix' : '',
  ].filter(Boolean).join(' ')

  const inputEl = (
    <input
      className={cls}
      type={type === 'number' ? 'number' : 'text'}
      step={type === 'number' ? 'any' : undefined}
      value={value == null ? '' : String(value)}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={e => {
        const v = type === 'number'
          ? (e.target.value === '' ? '' : Number(e.target.value))
          : e.target.value
        onChange(v as string | number)
      }}
    />
  )

  if (prefix || suffix) {
    return (
      <div className="aa-cell-wrap">
        {prefix ? <span className="aa-cell-affix prefix">{prefix}</span> : null}
        {inputEl}
        {suffix ? <span className="aa-cell-affix suffix">{suffix}</span> : null}
      </div>
    )
  }
  return inputEl
}

// ============================================================
// Cell select
// ============================================================
export interface AaSelectOption {
  value: string
  label: string
}

export function AaCellSelect({ value, options, onChange }: {
  value: string | null | undefined
  options: (string | AaSelectOption)[]
  onChange: (v: string) => void
}) {
  return (
    <select
      className="aa-cell aa-cell--select"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(opt => {
        if (typeof opt === 'string') {
          return <option key={opt} value={opt}>{opt}</option>
        }
        return <option key={opt.value} value={opt.value}>{opt.label}</option>
      })}
    </select>
  )
}

// ============================================================
// Confirm modal
// ============================================================
export function AaConfirm({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="aa-confirm-overlay" onClick={onCancel}>
      <div className="aa-confirm" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="aa-confirm-actions">
          <button
            className="aa-btn aa-btn--ghost aa-btn--sm"
            onClick={onCancel}
            type="button"
          >
            Annuleren
          </button>
          <button
            className="aa-btn aa-btn--danger aa-btn--sm"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel || 'Verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Floating toast
// ============================================================
export function AaToast({ kind, children }: {
  kind: 'ok' | 'error'
  children: ReactNode
}) {
  return (
    <div className={'aa-floating-toast' + (kind === 'error' ? ' error' : '')}>
      <span className="icon">
        {kind === 'error'
          ? <AaIcon name="warn" size={12} strokeWidth={2.4} />
          : <AaIcon name="check" size={12} strokeWidth={2.6} />}
      </span>
      {children}
    </div>
  )
}

// ============================================================
// Avatar (initials bubble)
// ============================================================
export function AaAvatar({ name }: { name: string | null | undefined }) {
  const initials = (name || '?')
    .trim().split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 999,
      background: 'var(--aa-sand)', color: 'var(--aa-deepsea)',
      fontFamily: "var(--font-heading, 'Bricolage Grotesque', serif)",
      fontWeight: 700, fontSize: 11, letterSpacing: '0.02em', flexShrink: 0,
    }}>
      {initials}
    </span>
  )
}
