'use client'

import { useEffect } from 'react'
import {
  Check,
  Mail,
  MapPin,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  Star,
  User,
  X,
} from 'lucide-react'
import { Badges, Langs, Reliability } from './parts'
import {
  REL_LABEL,
  TYPE_LABELS,
  fmtLastContact,
  type Agency,
  type Partner,
  type SamType,
} from './types'

export function SamModal({
  item,
  type,
  isAdmin,
  onClose,
  onContact,
  onEdit,
  onTogglePreferred,
  onToggleActive,
}: {
  item: Agency | Partner
  type: SamType
  isAdmin: boolean
  onClose: () => void
  onContact: (item: Agency | Partner, kind: 'email' | 'whatsapp') => void
  onEdit: (item: Agency | Partner) => void
  onTogglePreferred: (item: Agency | Partner) => void
  onToggleActive: (item: Agency | Partner) => void
}) {
  const isAgency = type === 'agencies'
  const agency = item as Agency
  const partner = item as Partner
  const headerTypeClass = isAgency ? '' : `partner-${partner.type}`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const eyebrow = isAgency
    ? `MAKELAAR · ${agency.region}`
    : `${(TYPE_LABELS[partner.type] || 'Partner').toUpperCase()}${partner.region ? ' · ' + partner.region : ''}`

  const lc = fmtLastContact(item.last_contact_days)

  return (
    <div className="sam-modal-overlay" onClick={onClose}>
      <div
        className="sam-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className={`sam-modal-header ${headerTypeClass}`}>
          <div className="sam-modal-eyebrow">{eyebrow}</div>
          <h2 className="sam-modal-title">{item.name}</h2>
          <div className="sam-modal-sub">
            {item.contact_name && (
              <span className="item">
                <User size={12} />
                {item.contact_name}
              </span>
            )}
            {isAgency && agency.city && (
              <span className="item">
                <MapPin size={12} />
                {agency.city}
              </span>
            )}
          </div>
          <div className="sam-modal-badges">
            <Badges item={item} isAgency={isAgency} />
          </div>
          <button className="sam-modal-close" onClick={onClose} aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>

        <div className="sam-modal-body">
          {/* Reliability */}
          <div className="sam-modal-section">
            <div className="sam-modal-rel">
              <span className="sam-modal-rel-label">Betrouwbaarheid</span>
              <Reliability value={item.reliability_score} />
              <span style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 6 }}>
                {item.reliability_score ? REL_LABEL[item.reliability_score] : ''}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="sam-modal-section">
            <h4 className="sam-modal-section-title">Contact</h4>
            <div className="sam-modal-grid">
              <div className="sam-field-readonly">
                <span className="lbl">Naam</span>
                <span className="val">
                  {item.contact_name || <span className="muted">—</span>}
                </span>
              </div>
              <div className="sam-field-readonly">
                <span className="lbl">Telefoon</span>
                <span className="val">
                  {item.contact_phone ? (
                    <a href={`tel:${item.contact_phone.replace(/\s/g, '')}`}>
                      {item.contact_phone}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </span>
              </div>
              <div className="sam-field-readonly">
                <span className="lbl">E-mail</span>
                <span className="val">
                  {item.contact_email ? (
                    <a href={`mailto:${item.contact_email}`}>{item.contact_email}</a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </span>
              </div>
              <div className="sam-field-readonly">
                <span className="lbl">Website</span>
                <span className="val">
                  {item.website ? (
                    <a href={item.website} target="_blank" rel="noopener noreferrer">
                      {item.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </span>
              </div>
              <div className="sam-field-readonly">
                <span className="lbl">Talen</span>
                <span className="val">
                  <Langs langs={item.languages} />
                </span>
              </div>
              <div className="sam-field-readonly">
                <span className="lbl">Laatste contact</span>
                <span className="val">
                  <span className={`sam-last-contact ${lc.cls}`}>
                    <span className="sam-contact-dot" />
                    {lc.label}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className="sam-modal-section">
            <h4 className="sam-modal-section-title">Profiel</h4>
            <div className="sam-modal-grid">
              {isAgency ? (
                <>
                  <div className="sam-field-readonly">
                    <span className="lbl">Regio</span>
                    <span className="val">{agency.region}</span>
                  </div>
                  <div className="sam-field-readonly">
                    <span className="lbl">Plaats</span>
                    <span className="val">{agency.city || <span className="muted">—</span>}</span>
                  </div>
                  <div className="sam-field-readonly" style={{ gridColumn: '1 / -1' }}>
                    <span className="lbl">Type vastgoed</span>
                    <span className="val">
                      <span className="sam-prop-types">
                        {(agency.property_types ?? []).map(t => (
                          <span key={t} className="sam-prop-type">
                            {t}
                          </span>
                        ))}
                        {(!agency.property_types || agency.property_types.length === 0) && (
                          <span className="muted">—</span>
                        )}
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="sam-field-readonly">
                    <span className="lbl">Type partner</span>
                    <span className="val">
                      <span className="sam-type-pill" data-type={partner.type}>
                        {TYPE_LABELS[partner.type]}
                      </span>
                    </span>
                  </div>
                  <div className="sam-field-readonly">
                    <span className="lbl">Regio</span>
                    <span className="val">
                      {partner.region || <span className="muted">Heel Spanje</span>}
                    </span>
                  </div>
                  {partner.specialism && (
                    <div className="sam-field-readonly" style={{ gridColumn: '1 / -1' }}>
                      <span className="lbl">Specialisme</span>
                      <span className="val">{partner.specialism}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Commission / arrangement */}
          {((isAgency && agency.commission_notes) ||
            (!isAgency && partner.commission_arrangement)) && (
            <div className="sam-modal-section">
              <h4 className="sam-modal-section-title">
                {isAgency ? 'Commissie-afspraak' : 'Vergoeding-afspraak'}
              </h4>
              <div className="sam-notes-block commission">
                {isAgency ? agency.commission_notes : partner.commission_arrangement}
              </div>
            </div>
          )}

          {/* Internal notes */}
          {(isAgency ? agency.notes : partner.internal_notes) && (
            <div className="sam-modal-section">
              <h4 className="sam-modal-section-title">Interne notities</h4>
              <div className="sam-notes-block">
                {isAgency ? agency.notes : partner.internal_notes}
              </div>
            </div>
          )}
        </div>

        <div className="sam-modal-footer">
          <div className="left">
            {isAdmin && (
              <>
                <button
                  className="sam-btn sam-btn-subtle"
                  onClick={() => onTogglePreferred(item)}
                  title={
                    item.is_preferred
                      ? 'Verwijder preferred-status'
                      : 'Markeer als preferred'
                  }
                >
                  <Star size={14} />
                  {item.is_preferred ? 'Preferred uit' : 'Markeer preferred'}
                </button>
                <button
                  className="sam-btn sam-btn-subtle"
                  onClick={() => onToggleActive(item)}
                >
                  {item.is_active === false ? <Play size={14} /> : <Pause size={14} />}
                  {item.is_active === false ? 'Heractiveren' : 'Op pauze'}
                </button>
              </>
            )}
          </div>
          <div className="right">
            {item.contact_phone && (
              <a
                className="sam-btn sam-btn-whatsapp"
                href={`https://wa.me/${item.contact_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
            {item.contact_email && (
              <button
                className="sam-btn sam-btn-ghost"
                onClick={() => onContact(item, 'email')}
              >
                <Mail size={14} />
                E-mail
              </button>
            )}
            {isAdmin ? (
              <button className="sam-btn sam-btn-primary" onClick={() => onEdit(item)}>
                <Pencil size={14} />
                Bewerken
              </button>
            ) : (
              <button className="sam-btn sam-btn-primary" onClick={onClose}>
                <Check size={14} />
                Sluiten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
