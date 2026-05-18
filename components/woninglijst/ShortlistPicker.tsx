'use client'

import { useEffect, useState } from 'react'
import { X, Plus, Loader2, ClipboardList } from 'lucide-react'

interface Shortlist {
  id: string
  klant_naam: string
  item_count: number
}

export interface ShortlistPickerItem {
  title: string
  url: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  thumbnail: string | null
  source: string
}

interface Props {
  // Eén of meerdere items: null = modal dicht, array = open.
  // Single-item callers (nieuwbouwkaart) wrappen in [item].
  items: ShortlistPickerItem[] | null
  onClose: () => void
  onSuccess?: (klantNaam: string, count: number) => void
}

export function ShortlistPicker({ items, onClose, onSuccess }: Props) {
  const item = items?.[0] ?? null
  const count = items?.length ?? 0
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!items || items.length === 0) return
    setError('')
    setNewName('')
    setSaving(null)
    setLoading(true)
    fetch('/api/woninglijst', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(data => setShortlists(Array.isArray(data) ? data : []))
      .catch(() => setShortlists([]))
      .finally(() => setLoading(false))
  }, [items])

  if (!items || items.length === 0) return null

  async function addTo(shortlistId: string, klantNaam: string) {
    if (!items || items.length === 0) return
    setError('')
    setSaving(shortlistId)
    try {
      const res = await fetch(`/api/woninglijst/${shortlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Toevoegen mislukt')
      }
      onSuccess?.(klantNaam, items.length)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toevoegen mislukt')
      setSaving(null)
    }
  }

  async function createAndAdd() {
    const name = newName.trim()
    if (!name) return
    setError('')
    setSaving('__new')
    try {
      const res = await fetch('/api/woninglijst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ klant_naam: name }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Aanmaken mislukt')
      }
      const created = await res.json()
      if (created?.id) {
        await addTo(created.id, created.klant_naam ?? name)
      } else {
        setSaving(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmaken mislukt')
      setSaving(null)
    }
  }

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
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex justify-between items-start"
          style={{ padding: '22px 24px 14px', borderBottom: '1px solid rgba(0,75,70,0.08)' }}
        >
          <div className="min-w-0">
            <div
              className="font-body font-bold uppercase text-sun-dark"
              style={{ fontSize: 10, letterSpacing: '0.18em', marginBottom: 6 }}
            >
              Shortlist
            </div>
            <h3
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px' }}
            >
              Toevoegen aan klant
            </h3>
            <div
              className="font-body truncate"
              style={{ fontSize: 12.5, color: '#5F7472', maxWidth: 420 }}
            >
              {count === 1
                ? (item?.title || item?.url || '')
                : `${count} woningen meegestuurd`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer transition-colors"
            style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', color: '#7A8C8B' }}
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 6px', minHeight: 120 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5F7472', fontSize: 13, padding: '8px 0' }}>
              <Loader2 size={14} className="animate-spin" /> Shortlists laden…
            </div>
          )}

          {!loading && shortlists.length === 0 && (
            <div style={{ padding: '14px 0 6px', fontSize: 13, color: '#5F7472', lineHeight: 1.5 }}>
              Nog geen shortlists. Maak hieronder een nieuwe aan voor deze klant.
            </div>
          )}

          {!loading && shortlists.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shortlists.map(s => {
                const isSaving = saving === s.id
                const disabled = saving !== null
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => addTo(s.id, s.klant_naam)}
                      disabled={disabled}
                      className="w-full flex items-center cursor-pointer transition-colors disabled:cursor-not-allowed"
                      style={{
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(0,75,70,0.12)',
                        background: '#fff',
                        textAlign: 'left',
                        opacity: disabled && !isSaving ? 0.45 : 1,
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => {
                        if (disabled) return
                        e.currentTarget.style.background = '#E6F0EF'
                        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.28)'
                      }}
                      onMouseLeave={e => {
                        if (disabled) return
                        e.currentTarget.style.background = '#fff'
                        e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)'
                      }}
                    >
                      <div
                        style={{
                          width: 30, height: 30, borderRadius: 8, background: '#E6F0EF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004B46', flexShrink: 0,
                        }}
                      >
                        <ClipboardList size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, color: '#004B46', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.klant_naam}
                        </div>
                        <div style={{ fontSize: 11, color: '#7A8C8B', marginTop: 1 }}>
                          {s.item_count} woning{s.item_count === 1 ? '' : 'en'}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, color: '#0A6B5E' }}>
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {error && (
            <div
              className="font-body"
              style={{
                marginTop: 12,
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
          style={{
            padding: '14px 24px 18px',
            borderTop: '1px solid rgba(0,75,70,0.08)',
            background: '#FAFBFB',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              color: '#7A8C8B',
              textTransform: 'uppercase',
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Nieuwe shortlist
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Klant naam"
              onKeyDown={e => {
                if (e.key === 'Enter') createAndAdd()
              }}
              disabled={saving !== null}
              style={{
                flex: 1,
                border: '1px solid rgba(0,75,70,0.18)',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 13,
                color: '#004B46',
                background: '#fff',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={createAndAdd}
              disabled={!newName.trim() || saving !== null}
              className="inline-flex items-center cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45"
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.02em',
                gap: 6,
                background: '#004B46',
                color: '#FFFAEF',
                border: '1.5px solid #004B46',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                if (e.currentTarget.disabled) return
                e.currentTarget.style.background = '#0A6B63'
                e.currentTarget.style.borderColor = '#0A6B63'
              }}
              onMouseLeave={e => {
                if (e.currentTarget.disabled) return
                e.currentTarget.style.background = '#004B46'
                e.currentTarget.style.borderColor = '#004B46'
              }}
            >
              {saving === '__new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Aanmaken & toevoegen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
