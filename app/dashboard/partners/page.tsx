'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Euro, Handshake, Pencil, Plus, TrendingUp, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/calculations'
import { getDateRange, isInRange, type DatePreset } from '@/lib/date-utils'
import {
  FinCountChip,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinModal,
  FinPeriodPicker,
  FinSection,
} from '@/components/financieel/parts'

interface Partner {
  id: string
  naam: string
  email: string | null
  land: string | null
  actief: boolean
}

interface DealRow {
  partner_naam: string | null
  partner_commissie: number | null
  partner_deal: boolean
  datum_passering: string
  aankoopprijs: number
}

interface AfspraakRow {
  partner_id: string | null
  datum: string
}

interface FormState {
  naam: string
  email: string
  land: string
}

const emptyForm: FormState = { naam: '', email: '', land: '' }

export default function PartnersPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [partners, setPartners] = useState<Partner[]>([])
  const [deals, setDeals] = useState<DealRow[]>([])
  const [afspraken, setAfspraken] = useState<AfspraakRow[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, dRes, aRes] = await Promise.allSettled([
        supabase.from('partners').select('*').eq('actief', true).order('naam'),
        supabase
          .from('deals')
          .select('partner_naam, partner_commissie, partner_deal, datum_passering, aankoopprijs'),
        supabase.from('afspraken').select('partner_id, datum'),
      ])
      const pData = pRes.status === 'fulfilled' ? (pRes.value.data ?? []) : []
      const dData = dRes.status === 'fulfilled' ? (dRes.value.data ?? []) : []
      const aData = aRes.status === 'fulfilled' ? (aRes.value.data ?? []) : []
      setPartners(pData as Partner[])
      setDeals(dData as DealRow[])
      setAfspraken(aData as AfspraakRow[])
    } catch (e) {
      console.error('[load] failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const stats = useMemo(() => {
    const filteredDeals = deals.filter(d => d.partner_deal && isInRange(d.datum_passering, range))
    const filteredAfspraken = afspraken.filter(a => isInRange(a.datum, range))

    return partners
      .map(p => {
        const partnerDeals = filteredDeals.filter(
          d => d.partner_naam?.toLowerCase().trim() === p.naam.toLowerCase().trim()
        )
        const partnerAfspraken = filteredAfspraken.filter(a => a.partner_id === p.id).length
        const commissie = partnerDeals.reduce((s, d) => s + (d.partner_commissie ?? 0), 0)
        const omzet = partnerDeals.reduce((s, d) => s + d.aankoopprijs, 0)
        return {
          partner: p,
          deals: partnerDeals.length,
          afspraken: partnerAfspraken,
          commissie,
          omzet,
        }
      })
      .sort((a, b) => b.commissie - a.commissie)
  }, [partners, deals, afspraken, range])

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          afspraken: acc.afspraken + s.afspraken,
          deals: acc.deals + s.deals,
          commissie: acc.commissie + s.commissie,
          omzet: acc.omzet + s.omzet,
        }),
        { afspraken: 0, deals: 0, commissie: 0, omzet: 0 }
      ),
    [stats]
  )

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(p: Partner) {
    setEditingId(p.id)
    setForm({ naam: p.naam, email: p.email ?? '', land: p.land ?? '' })
    setShowModal(true)
  }

  async function savePartner() {
    if (!form.naam.trim()) return
    setSaving(true)
    if (editingId) {
      await supabase
        .from('partners')
        .update({
          naam: form.naam.trim(),
          email: form.email || null,
          land: form.land || null,
        })
        .eq('id', editingId)
      setPartners(prev =>
        prev.map(p =>
          p.id === editingId
            ? {
                ...p,
                naam: form.naam.trim(),
                email: form.email || null,
                land: form.land || null,
              }
            : p
        )
      )
    } else {
      const { data } = await supabase
        .from('partners')
        .insert({
          naam: form.naam.trim(),
          email: form.email || null,
          land: form.land || null,
        })
        .select()
        .single()
      if (data) {
        setPartners(prev =>
          [...prev, data as Partner].sort((a, b) => a.naam.localeCompare(b.naam))
        )
      }
    }
    setShowModal(false)
    setForm(emptyForm)
    setEditingId(null)
    setSaving(false)
  }

  async function deactivate(id: string, naam: string) {
    if (!confirm(`${naam} verwijderen uit de partnerlijst?`)) return
    await supabase.from('partners').update({ actief: false }).eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Partners"
          subtitle="Referral partners & commissies."
        >
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
          <button type="button" className="fin-btn primary" onClick={openAdd}>
            <Plus /> Partner toevoegen
          </button>
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid cols={3}>
              <FinKpi
                label="Actieve partners"
                value={partners.length}
                sub="totaal in lijst"
                icon={Handshake}
              />
              <FinKpi
                label="Partner-sales"
                value={totals.deals}
                sub={range.label}
                icon={TrendingUp}
                tone="positive"
              />
              <FinKpi
                label="Commissie partners"
                value={totals.commissie > 0 ? formatEuro(totals.commissie) : '—'}
                sub={`omzet: ${formatEuro(totals.omzet)}`}
                icon={Euro}
                tone="accent"
              />
            </FinKpiGrid>

            <FinSection title="Per partner" meta={range.label}>
              {stats.length === 0 ? (
                <p
                  style={{
                    color: 'var(--fg-subtle)',
                    textAlign: 'center',
                    padding: '40px 0',
                    fontSize: 13,
                  }}
                >
                  Nog geen partners toegevoegd.
                </p>
              ) : (
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Partner</th>
                        <th>Land</th>
                        <th className="num">Afspraken</th>
                        <th className="num">Sales</th>
                        <th className="num">Omzet</th>
                        <th className="num">Commissie</th>
                        <th className="num">Gem. per deal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map(s => (
                        <tr key={s.partner.id} className="fin-row-hover">
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <span className="fin-avatar">{s.partner.naam.charAt(0)}</span>
                              <div>
                                <Link
                                  href={`/partners/${s.partner.id}`}
                                  style={{
                                    color: 'var(--deepsea)',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                  }}
                                >
                                  {s.partner.naam}
                                </Link>
                                {s.partner.email && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--fg-subtle)',
                                    }}
                                  >
                                    {s.partner.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="muted">{s.partner.land ?? '—'}</td>
                          <td className="num">
                            <FinCountChip
                              value={s.afspraken}
                              tone={s.afspraken > 0 ? 'deepsea' : 'mid'}
                            />
                          </td>
                          <td className="num">
                            <FinCountChip
                              value={s.deals}
                              tone={s.deals > 0 ? 'positive' : 'mid'}
                            />
                          </td>
                          <td className="num">{s.omzet > 0 ? formatEuro(s.omzet) : '—'}</td>
                          <td className="num">
                            {s.commissie > 0 ? formatEuro(s.commissie) : '—'}
                            {totals.commissie > 0 && s.commissie > 0 && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  color: 'var(--fg-subtle)',
                                  fontSize: 11,
                                }}
                              >
                                ({Math.round((s.commissie / totals.commissie) * 100)}%)
                              </span>
                            )}
                          </td>
                          <td className="num muted">
                            {s.deals > 0 ? formatEuro(s.commissie / s.deals) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button
                                type="button"
                                className="fin-row-action"
                                onClick={() => openEdit(s.partner)}
                                aria-label="Bewerken"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="fin-row-action danger"
                                onClick={() => void deactivate(s.partner.id, s.partner.naam)}
                                aria-label="Verwijderen"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2}>Totaal</td>
                        <td className="num">{totals.afspraken}</td>
                        <td className="num">{totals.deals}</td>
                        <td className="num">{formatEuro(totals.omzet)}</td>
                        <td className="num">{formatEuro(totals.commissie)}</td>
                        <td className="num">
                          {totals.deals > 0 ? formatEuro(totals.commissie / totals.deals) : '—'}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </FinSection>

            <div style={{ height: 60 }} />
          </>
        )}

        <FinModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editingId ? 'Partner bewerken' : 'Nieuwe partner'}
          footer={
            <>
              <button
                type="button"
                className="fin-btn"
                onClick={() => setShowModal(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="fin-btn primary"
                onClick={() => void savePartner()}
                disabled={saving || !form.naam.trim()}
              >
                {saving ? 'Opslaan…' : editingId ? 'Wijzigingen opslaan' : 'Toevoegen'}
              </button>
            </>
          }
        >
          <div className="fin-form-grid">
            <div className="fin-field full">
              <label htmlFor="naam">Naam *</label>
              <input
                id="naam"
                className="fin-input"
                autoFocus
                value={form.naam}
                onChange={e => setForm({ ...form, naam: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') void savePartner()
                }}
                placeholder="Naam partner"
              />
            </div>
            <div className="fin-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="fin-input"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="email@voorbeeld.com"
              />
            </div>
            <div className="fin-field">
              <label htmlFor="land">Land</label>
              <input
                id="land"
                className="fin-input"
                value={form.land}
                onChange={e => setForm({ ...form, land: e.target.value })}
                placeholder="Nederland"
              />
            </div>
          </div>
        </FinModal>
      </div>
    </div>
  )
}
