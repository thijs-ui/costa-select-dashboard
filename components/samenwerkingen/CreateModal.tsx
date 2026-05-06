'use client'

import { useEffect, useState } from 'react'
import { X, Plus } from 'lucide-react'
import {
  PARTNER_TYPES,
  REGIONS_AGENCY,
  REGIONS_PARTNER,
  type Agency,
  type Partner,
  type PartnerType,
  type SamType,
} from './types'

interface Props {
  type: SamType
  onClose: () => void
  onCreated: (item: Agency | Partner) => void
}

// Minimale create-form voor makelaars (agencies) en partners. Velden die niet
// hier ingevuld worden kunnen later via Supabase Studio of een toekomstige
// edit-modal worden aangevuld. Voor team is deze modal niet beschikbaar
// (read-only per design).
export function SamCreateModal({ type, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('') // alleen agencies
  const [partnerType, setPartnerType] = useState<PartnerType>('financieel_adviseur')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isAgency = type === 'agencies'
  const regions = isAgency ? REGIONS_AGENCY : REGIONS_PARTNER
  const path = isAgency ? '/api/agentschappen' : '/api/samenwerkingen'

  async function submit() {
    if (!name.trim()) {
      setError('Naam is verplicht')
      return
    }
    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      name: name.trim(),
      region: region || null,
      contact_name: contactName.trim() || null,
      contact_email: email.trim() || null,
      contact_phone: phone.trim() || null,
      website: website.trim() || null,
    }
    if (isAgency) {
      body.city = city.trim() || null
    } else {
      body.type = partnerType
    }

    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      onCreated(data as Agency | Partner)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setSaving(false)
    }
  }

  const label = isAgency ? 'makelaar' : 'partner'

  return (
    <div className="sam-modal-overlay" onClick={onClose}>
      <div
        className="sam-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        <div className="sam-modal-header">
          <div className="sam-modal-eyebrow">Nieuwe {label}</div>
          <h2 className="sam-modal-title" style={{ fontSize: 22 }}>
            {isAgency ? 'Nieuwe makelaar toevoegen' : 'Nieuwe partner toevoegen'}
          </h2>
          <button className="sam-modal-close" onClick={onClose} aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>

        <div className="sam-modal-body" style={{ padding: '20px 24px' }}>
          {error && (
            <div
              style={{
                background: '#FFEBE8',
                border: '1px solid #B81D13',
                color: '#7A1D13',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <Field label="Naam" required>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isAgency ? 'Bv. Spain Properties Costa del Sol' : 'Bv. NL Notariskantoor Marbella'}
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!isAgency && (
              <Field label="Type partner">
                <select
                  value={partnerType}
                  onChange={e => setPartnerType(e.target.value as PartnerType)}
                  style={inputStyle}
                >
                  {PARTNER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Regio">
              <select value={region} onChange={e => setRegion(e.target.value)} style={inputStyle}>
                <option value="">— kies regio —</option>
                {regions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>

            {isAgency && (
              <Field label="Plaats">
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Bv. Marbella"
                  style={inputStyle}
                />
              </Field>
            )}
          </div>

          <Field label="Contactpersoon">
            <input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="Voor- en achternaam"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contact@example.com"
                style={inputStyle}
              />
            </Field>
            <Field label="Telefoon">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 ..."
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Website">
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </Field>

          <p style={{ fontSize: 11, color: '#7A8C8B', marginTop: 8 }}>
            Andere velden (notities, betrouwbaarheid, etc.) kun je later via de detail-modal
            of Supabase aanvullen.
          </p>
        </div>

        <div className="sam-modal-footer">
          <div className="left" />
          <div className="right" style={{ display: 'flex', gap: 8 }}>
            <button className="sam-btn sam-btn-ghost" onClick={onClose} disabled={saving}>
              Annuleren
            </button>
            <button
              className="sam-btn sam-btn-primary"
              onClick={submit}
              disabled={saving || !name.trim()}
            >
              <Plus size={14} /> {saving ? 'Opslaan…' : `Aanmaken`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#5F7472',
          marginBottom: 5,
        }}
      >
        {label}{required && <span style={{ color: '#B81D13' }}> *</span>}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid rgba(0,75,70,0.18)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#004B46',
  background: '#fff',
  outline: 'none',
}
