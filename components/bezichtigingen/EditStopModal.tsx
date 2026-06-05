'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Pencil } from 'lucide-react'

export interface EditableStop {
  id: string
  address: string
  property_title: string | null
  listing_url: string | null
  price: number | null
  viewing_duration_minutes: number
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
}

interface Props {
  stop: EditableStop | null
  onClose: () => void
  onSave: (id: string, updates: Partial<EditableStop>) => Promise<void>
}

export function EditStopModal({ stop, onClose, onSave }: Props) {
  const [address, setAddress] = useState('')
  const [propertyTitle, setPropertyTitle] = useState('')
  const [listingUrl, setListingUrl] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState(30)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!stop) return
    setAddress(stop.address ?? '')
    setPropertyTitle(stop.property_title ?? '')
    setListingUrl(stop.listing_url ?? '')
    setPrice(stop.price != null ? String(stop.price) : '')
    setDuration(stop.viewing_duration_minutes ?? 30)
    setContactName(stop.contact_name ?? '')
    setContactPhone(stop.contact_phone ?? '')
    setNotes(stop.notes ?? '')
    setSaving(false)
    setError('')
  }, [stop])

  if (!stop) return null

  async function submit() {
    if (!stop || !address.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave(stop.id, {
        address: address.trim(),
        property_title: propertyTitle.trim() || null,
        listing_url: listingUrl.trim() || null,
        price: price ? Number(price) : null,
        viewing_duration_minutes: Math.max(5, Math.round(duration) || 0),
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        notes: notes.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt')
      setSaving(false)
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
          maxWidth: 580,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(7,42,36,0.3)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '88vh',
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
              Stop bewerken
            </div>
            <h3
              className="font-heading font-bold text-deepsea"
              style={{ fontSize: 22, letterSpacing: '-0.01em', margin: '0 0 4px' }}
            >
              <Pencil size={16} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />
              {stop.property_title || stop.address || 'Stop'}
            </h3>
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px 14px' }}>
            <FormField label="Adres" required colSpan={2}>
              <Input value={address} onChange={setAddress} placeholder="Straat, nummer, plaats" />
            </FormField>
            <FormField label="Titel woning">
              <Input value={propertyTitle} onChange={setPropertyTitle} placeholder="Villa Mirador" />
            </FormField>
            <FormField label="Prijs (€)">
              <Input value={price} onChange={setPrice} placeholder="795000" type="number" />
            </FormField>
            <FormField label="Listing URL" colSpan={2}>
              <Input value={listingUrl} onChange={setListingUrl} placeholder="https://..." />
            </FormField>
            <FormField label="Duur bezichtiging (min)">
              <Input value={String(duration)} onChange={v => setDuration(Number(v) || 0)} type="number" min={5} step={5} />
            </FormField>
            <FormField label="Contactpersoon">
              <Input value={contactName} onChange={setContactName} placeholder="Verkoper / makelaar" />
            </FormField>
            <FormField label="Telefoon contact" colSpan={2}>
              <Input value={contactPhone} onChange={setContactPhone} placeholder="+34 ..." />
            </FormField>
            <FormField label="Opmerkingen" colSpan={2}>
              <Textarea value={notes} onChange={setNotes} />
            </FormField>
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
          style={{ gap: 8, padding: '14px 24px 18px', borderTop: '1px solid rgba(0,75,70,0.08)' }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 500,
              background: 'transparent', color: '#5F7472', border: '1.5px solid transparent',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#E6F0EF'; e.currentTarget.style.color = '#004B46' } }}
            onMouseLeave={e => { if (!saving) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5F7472' } }}
          >
            Annuleren
          </button>
          <button
            onClick={submit}
            disabled={!address.trim() || saving}
            className="inline-flex items-center cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              gap: 7, background: '#004B46', color: '#FFFAEF', border: '1.5px solid #004B46',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#0A6B63'; e.currentTarget.style.borderColor = '#0A6B63' } }}
            onMouseLeave={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = '#004B46'; e.currentTarget.style.borderColor = '#004B46' } }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}

function FormField({
  label, required, colSpan, children,
}: { label: string; required?: boolean; colSpan?: number; children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: colSpan === 2 ? '1 / -1' : undefined }}>
      <div
        className="font-body font-bold uppercase"
        style={{ fontSize: 10, letterSpacing: '0.12em', color: '#7A8C8B', marginBottom: 5 }}
      >
        {label}{required && <span style={{ color: '#c24040', marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </div>
  )
}

function Input({
  value, onChange, placeholder, type, min, step,
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; min?: number; step?: number }) {
  return (
    <input
      type={type ?? 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      style={{
        width: '100%', border: '1px solid rgba(0,75,70,0.18)', borderRadius: 9,
        padding: '8px 11px', fontSize: 13, color: '#004B46', background: '#fff',
        fontFamily: 'inherit', outline: 'none',
      }}
    />
  )
}

function Textarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      style={{
        width: '100%', border: '1px solid rgba(0,75,70,0.18)', borderRadius: 9,
        padding: '8px 11px', fontSize: 13, color: '#004B46', background: '#fff',
        fontFamily: 'inherit', outline: 'none', resize: 'vertical',
      }}
    />
  )
}

