'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/calculations'
import { type DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { matchesEntiteit, matchesEntity, useEntity } from '@/lib/entity'
import {
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinPctBadge,
  FinPeriodPicker,
  FinSection,
} from '@/components/financieel/parts'

interface Makelaar { id: string; naam: string; rol?: string }
interface Partner { id: string; naam: string }
interface Afspraak {
  id: string
  datum: string
  lead_naam: string
  bron: string | null
  regio: string | null
  makelaar_id: string | null
  sdr_id: string | null
  type: string
  status: string
  resultaat: string | null
  notities: string | null
  pipedrive_activiteit_id: number | null
}
interface AdPost {
  bedrag: number
  entiteit: string | null
  kosten_posten: { naam: string } | null
}

const STATUSES = ['Gepland', 'Uitgevoerd', 'No-show', 'Geannuleerd'] as const
const RESULTATEN = ['Interesse', 'Bod gedaan', 'Deal gewonnen', 'Afgewezen'] as const

const emptyForm = {
  datum: new Date().toISOString().split('T')[0],
  lead_naam: '',
  bron: '',
  regio: '',
  makelaar_id: '',
  partner_id: '',
  sdr_id: '',
  type: 'Bezichtiging',
  status: 'Gepland',
  resultaat: '',
  notities: '',
}

const AD_POSTEN = ['Google Ads', 'Meta Ads (Facebook/Instagram)', 'LinkedIn Ads']

// Sorteer afspraken op datum aflopend (meest recente boven). Wordt gebruikt
// na elke setAfspraken-update zodat een datum-wijziging direct herordent.
function byDateDesc(a: { datum: string }, b: { datum: string }): number {
  return b.datum.localeCompare(a.datum)
}

export default function AfsprakenPage() {
  const { entity, setEntity } = useEntity()
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')

  const [afspraken, setAfspraken] = useState<Afspraak[]>([])
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [allAdPosten, setAllAdPosten] = useState<AdPost[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    regios: ['CBN', 'CBZ', 'CDS', 'CD', 'CB', 'Valencia'],
    bronnen: [
      'Website CS',
      'Website CSV',
      'Google Ads',
      'Meta Ads',
      'LinkedIn Ads',
      'Referentie van partner',
      'Referentie',
    ],
    afspraak_types: ['Bezichtiging', 'Kennismaking', 'Follow-up', 'Notaris'],
  })
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [aRes, mRes, sRes, kRes, pRes] = await Promise.allSettled([
          supabase.from('afspraken').select('*').order('datum', { ascending: false }),
          supabase.from('makelaars').select('id, naam, rol').eq('actief', true),
          supabase.from('settings').select('key, value'),
          supabase
            .from('maandkosten')
            .select('bedrag, entiteit, kosten_posten(naam)')
            .eq('jaar', new Date().getFullYear()),
          supabase.from('partners').select('id, naam').eq('actief', true).order('naam'),
        ])
        if (cancelled) return
        const aData = aRes.status === 'fulfilled' ? (aRes.value.data ?? []) : []
        const mData = mRes.status === 'fulfilled' ? (mRes.value.data ?? []) : []
        const sData = sRes.status === 'fulfilled' ? (sRes.value.data ?? null) : null
        const kData = kRes.status === 'fulfilled' ? (kRes.value.data ?? []) : []
        const pData = pRes.status === 'fulfilled' ? (pRes.value.data ?? []) : []
        setAfspraken((aData as Afspraak[]).sort(byDateDesc))
        setMakelaars(mData as Makelaar[])
        setPartners(pData as Partner[])
        setAllAdPosten(kData as unknown as AdPost[])
        if (sData) {
          const map: Record<string, unknown> = {}
          ;(sData as { key: string; value: unknown }[]).forEach(r => {
            map[r.key] = r.value
          })
          setSettings(prev => ({
            regios: (map.regios as string[]) ?? prev.regios,
            bronnen: (map.bronnen as string[]) ?? prev.bronnen,
            afspraak_types: (map.afspraak_types as string[]) ?? prev.afspraak_types,
          }))
        }
      } catch (e) {
        console.error('[run] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  function startEdit(a: Afspraak) {
    setEditingId(a.id)
    setForm({
      datum: a.datum,
      lead_naam: a.lead_naam,
      bron: a.bron ?? '',
      regio: a.regio ?? '',
      makelaar_id: a.makelaar_id ?? '',
      partner_id: (a as unknown as { partner_id?: string }).partner_id ?? '',
      sdr_id: a.sdr_id ?? '',
      type: a.type,
      status: a.status,
      resultaat: a.resultaat ?? '',
      notities: a.notities ?? '',
    })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function saveAfspraak() {
    if (!form.datum || !form.lead_naam) return
    setSaving(true)
    const payload = {
      datum: form.datum,
      lead_naam: form.lead_naam,
      bron: form.bron || null,
      regio: form.regio || null,
      makelaar_id: form.makelaar_id || null,
      partner_id: form.bron === 'Referentie van partner' ? form.partner_id || null : null,
      sdr_id: form.sdr_id || null,
      type: form.type,
      status: form.status,
      resultaat: form.resultaat || null,
      notities: form.notities || null,
    }
    if (editingId) {
      await supabase.from('afspraken').update(payload).eq('id', editingId)
      setAfspraken(prev =>
        prev.map(a => (a.id === editingId ? ({ ...a, ...payload } as Afspraak) : a)).sort(byDateDesc)
      )
      setEditingId(null)
    } else {
      const { data } = await supabase.from('afspraken').insert(payload).select().single()
      if (data) setAfspraken([data as Afspraak, ...afspraken].sort(byDateDesc))
    }
    setForm(emptyForm)
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('afspraken').update({ status }).eq('id', id)
    setAfspraken(prev => prev.map(a => (a.id === id ? { ...a, status } : a)).sort(byDateDesc))
  }

  async function updateResultaat(id: string, resultaat: string) {
    await supabase.from('afspraken').update({ resultaat: resultaat || null }).eq('id', id)
    setAfspraken(prev =>
      prev.map(a => (a.id === id ? { ...a, resultaat: resultaat || null } : a)).sort(byDateDesc)
    )
  }

  async function deleteAfspraak(id: string, naam: string) {
    if (!confirm(`Afspraak met ${naam} verwijderen?`)) return
    await supabase.from('afspraken').delete().eq('id', id)
    setAfspraken(prev => prev.filter(a => a.id !== id))
  }

  const range = useMemo(() => getDateRange(datePreset), [datePreset])

  const gefilterd = useMemo(
    () =>
      afspraken
        .filter(a => matchesEntity(a.regio, entity))
        .filter(a => isInRange(a.datum, range)),
    [afspraken, entity, range]
  )

  const totaalAdSpend = useMemo(
    () =>
      allAdPosten
        .filter(k => matchesEntiteit(k.entiteit, entity))
        .filter(k => k.kosten_posten?.naam && AD_POSTEN.includes(k.kosten_posten.naam))
        .reduce((s, k) => s + Number(k.bedrag), 0),
    [allAdPosten, entity]
  )

  const uitgevoerd = gefilterd.filter(a => a.status === 'Uitgevoerd')
  const deals = gefilterd.filter(a => a.resultaat === 'Deal gewonnen')
  const kostenPerAfspraak = uitgevoerd.length > 0 ? totaalAdSpend / uitgevoerd.length : 0
  const kostenPerDeal = deals.length > 0 ? totaalAdSpend / deals.length : 0

  const bronStats = useMemo(
    () =>
      settings.bronnen
        .map(bron => {
          const bronAfspraken = gefilterd.filter(a => a.bron === bron)
          const bronUitgevoerd = bronAfspraken.filter(a => a.status === 'Uitgevoerd')
          const bronDeals = bronAfspraken.filter(a => a.resultaat === 'Deal gewonnen')
          const conversie =
            bronUitgevoerd.length > 0
              ? Math.round((bronDeals.length / bronUitgevoerd.length) * 100)
              : null
          return {
            bron,
            afspraken: bronAfspraken.length,
            uitgevoerd: bronUitgevoerd.length,
            deals: bronDeals.length,
            conversie,
          }
        })
        .filter(b => b.afspraken > 0),
    [gefilterd, settings.bronnen]
  )

  const makelaarStats = useMemo(
    () =>
      makelaars
        .map(m => {
          const mAfspraken = gefilterd.filter(a => a.makelaar_id === m.id)
          const mUitgevoerd = mAfspraken.filter(a => a.status === 'Uitgevoerd')
          const mDeals = mAfspraken.filter(a => a.resultaat === 'Deal gewonnen')
          const closePct =
            mUitgevoerd.length > 0
              ? Math.round((mDeals.length / mUitgevoerd.length) * 100)
              : null
          return {
            naam: m.naam,
            afspraken: mAfspraken.length,
            deals: mDeals.length,
            closePct,
          }
        })
        .filter(m => m.afspraken > 0),
    [makelaars, gefilterd]
  )

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Afspraken"
          subtitle="Bezichtigingen, kennismakingen en follow-ups — incl. ROI per bron en consultant."
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid cols={3}>
              <FinKpi
                label="Totaal afspraken"
                value={gefilterd.length}
                sub={range.label}
              />
              <FinKpi
                label="Uitgevoerd"
                value={uitgevoerd.length}
                sub={
                  gefilterd.length > 0
                    ? `${Math.round((uitgevoerd.length / gefilterd.length) * 100)}% van totaal`
                    : '—'
                }
              />
              <FinKpi
                label="Deal gewonnen"
                value={deals.length}
                sub={
                  uitgevoerd.length > 0
                    ? `${Math.round((deals.length / uitgevoerd.length) * 100)}% conversie`
                    : '—'
                }
                tone="positive"
              />
            </FinKpiGrid>
            <FinKpiGrid cols={3}>
              <FinKpi
                label="Kosten per afspraak"
                value={kostenPerAfspraak > 0 ? formatEuro(kostenPerAfspraak) : '—'}
                sub="ad spend / afspraken"
              />
              <FinKpi
                label="Kosten per deal"
                value={kostenPerDeal > 0 ? formatEuro(kostenPerDeal) : '—'}
                sub="ad spend / deals"
              />
              <FinKpi
                label="Totale ad spend YTD"
                value={formatEuro(totaalAdSpend)}
                sub="Google + Meta + LinkedIn"
                tone="accent"
              />
            </FinKpiGrid>

            {bronStats.length > 0 && (
              <FinSection title="Per bron">
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Bron</th>
                        <th className="num">Afspraken</th>
                        <th className="num">Uitgevoerd</th>
                        <th className="num">Deals</th>
                        <th className="num">Conversie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bronStats.map(b => (
                        <tr key={b.bron}>
                          <td>{b.bron}</td>
                          <td className="num">{b.afspraken}</td>
                          <td className="num">{b.uitgevoerd}</td>
                          <td className="num">{b.deals}</td>
                          <td className="num">
                            <FinPctBadge value={b.conversie} good={20} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FinSection>
            )}

            {makelaarStats.length > 0 && (
              <FinSection title="Per consultant">
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Consultant</th>
                        <th className="num">Afspraken</th>
                        <th className="num">Deals</th>
                        <th className="num">Close %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {makelaarStats.map(m => (
                        <tr key={m.naam}>
                          <td>{m.naam}</td>
                          <td className="num">{m.afspraken}</td>
                          <td className="num">{m.deals}</td>
                          <td className="num">
                            <FinPctBadge value={m.closePct} good={30} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FinSection>
            )}

            {/* Form */}
            <div ref={formRef}>
              <FinSection
                title={editingId ? 'Afspraak bewerken' : 'Nieuwe afspraak'}
                meta={
                  editingId ? (
                    <button type="button" className="fin-link" onClick={cancelEdit}>
                      Annuleren
                    </button>
                  ) : undefined
                }
              >
                <div className="fin-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="fin-field">
                    <label>Datum *</label>
                    <input
                      type="date"
                      className="fin-input"
                      value={form.datum}
                      onChange={e => setForm({ ...form, datum: e.target.value })}
                    />
                  </div>
                  <div className="fin-field">
                    <label>Lead / klantnaam *</label>
                    <input
                      type="text"
                      className="fin-input"
                      placeholder="Naam"
                      value={form.lead_naam}
                      onChange={e => setForm({ ...form, lead_naam: e.target.value })}
                    />
                  </div>
                  <div className="fin-field">
                    <label>Bron</label>
                    <select
                      className="fin-select"
                      value={form.bron}
                      onChange={e =>
                        setForm({ ...form, bron: e.target.value, partner_id: '' })
                      }
                    >
                      <option value="">Kies bron</option>
                      {settings.bronnen.map(b => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  {form.bron === 'Referentie van partner' && (
                    <div className="fin-field">
                      <label>Partner</label>
                      <select
                        className="fin-select"
                        value={form.partner_id}
                        onChange={e => setForm({ ...form, partner_id: e.target.value })}
                      >
                        <option value="">Kies partner</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.naam}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="fin-field">
                    <label>Regio</label>
                    <select
                      className="fin-select"
                      value={form.regio}
                      onChange={e => setForm({ ...form, regio: e.target.value })}
                    >
                      <option value="">Kies regio</option>
                      {settings.regios.map(r => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field">
                    <label>Consultant</label>
                    <select
                      className="fin-select"
                      value={form.makelaar_id}
                      onChange={e => setForm({ ...form, makelaar_id: e.target.value })}
                    >
                      <option value="">Geen</option>
                      {makelaars.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.naam}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field">
                    <label>Type</label>
                    <select
                      className="fin-select"
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                      {settings.afspraak_types.map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field">
                    <label>SDR contact</label>
                    <select
                      className="fin-select"
                      value={form.sdr_id}
                      onChange={e => setForm({ ...form, sdr_id: e.target.value })}
                    >
                      <option value="">— geen —</option>
                      {makelaars.filter(m => m.rol === 'sdr').map(m => (
                        <option key={m.id} value={m.id}>{m.naam}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field">
                    <label>Status</label>
                    <select
                      className="fin-select"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      {STATUSES.map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field">
                    <label>Resultaat</label>
                    <select
                      className="fin-select"
                      value={form.resultaat}
                      onChange={e => setForm({ ...form, resultaat: e.target.value })}
                    >
                      <option value="">—</option>
                      {RESULTATEN.map(r => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fin-field full">
                    <label>Notities</label>
                    <input
                      type="text"
                      className="fin-input"
                      value={form.notities}
                      onChange={e => setForm({ ...form, notities: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="fin-btn primary"
                    onClick={() => void saveAfspraak()}
                    disabled={saving || !form.lead_naam}
                  >
                    {saving
                      ? 'Opslaan…'
                      : editingId
                        ? 'Wijzigingen opslaan'
                        : 'Afspraak opslaan'}
                  </button>
                </div>
              </FinSection>
            </div>

            {/* Tabel */}
            <FinSection title={`Afspraken (${gefilterd.length})`} meta={range.label}>
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Naam</th>
                        <th>Bron</th>
                        <th>Regio</th>
                        <th>Type</th>
                        <th>SDR</th>
                        <th>Status</th>
                        <th>Resultaat</th>
                        <th>Notities</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gefilterd.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="muted"
                            style={{ textAlign: 'center', padding: '24px' }}
                          >
                            Geen afspraken in deze periode
                          </td>
                        </tr>
                      )}
                      {gefilterd.map(a => (
                        <tr
                          key={a.id}
                          className={editingId === a.id ? 'fin-row-editing' : ''}
                        >
                          <td>{new Date(a.datum).toLocaleDateString('nl-NL')}</td>
                          <td style={{ fontWeight: 600 }}>
                            {a.lead_naam}
                            {a.pipedrive_activiteit_id && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: 'rgba(212,146,26,0.18)',
                                  color: 'var(--sun-dark)',
                                  padding: '1px 5px',
                                  borderRadius: 5,
                                }}
                              >
                                PD
                              </span>
                            )}
                          </td>
                          <td className="muted">{a.bron ?? '—'}</td>
                          <td>{a.regio && <span className="fin-pill-soft">{a.regio}</span>}</td>
                          <td className="muted">{a.type}</td>
                          <td>
                            {a.sdr_id
                              ? (
                                <span
                                  className="fin-pill-soft"
                                  style={{ background: 'rgba(245,175,64,0.18)', color: 'var(--sun-dark)' }}
                                >
                                  {makelaars.find(m => m.id === a.sdr_id)?.naam ?? '?'}
                                </span>
                              )
                              : <span className="muted">—</span>
                            }
                          </td>
                          <td>
                            <select
                              value={a.status}
                              onChange={e => void updateStatus(a.id, e.target.value)}
                              className={`fin-status-select status-${a.status.toLowerCase().replace('-', '')}`}
                            >
                              {STATUSES.map(s => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={a.resultaat ?? ''}
                              onChange={e => void updateResultaat(a.id, e.target.value)}
                              className={`fin-status-select ${
                                a.resultaat
                                  ? `result-${a.resultaat.toLowerCase().replace(/\s/g, '')}`
                                  : 'result-empty'
                              }`}
                            >
                              <option value="">—</option>
                              {RESULTATEN.map(r => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td
                            className="muted"
                            style={{
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {a.notities ?? '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button
                                type="button"
                                className={`fin-row-action ${editingId === a.id ? 'editing' : ''}`}
                                onClick={() => startEdit(a)}
                                aria-label="Bewerken"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="fin-row-action danger"
                                onClick={() => void deleteAfspraak(a.id, a.lead_naam)}
                                aria-label="Verwijderen"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </FinSection>

            <div style={{ height: 60 }} />
          </>
        )}
      </div>
    </div>
  )
}
