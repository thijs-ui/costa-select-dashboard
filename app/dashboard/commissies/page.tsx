'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import { type DatePreset, getDateRange, isInRange } from '@/lib/date-utils'
import { matchesEntity, useEntity } from '@/lib/entity'
import {
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinPeriodPicker,
  FinSection,
} from '@/components/financieel/parts'

interface Makelaar {
  id: string
  naam: string
  rol: string
  area_manager_id: string | null
}

interface Deal {
  id: string
  datum_passering: string
  aankoopprijs: number
  bruto_commissie: number | null
  makelaar_id: string | null
  makelaar_commissie: number | null
  makelaar2_id: string | null
  makelaar2_commissie: number | null
  area_manager_id: string | null
  area_manager_commissie: number | null
  netto_commissie_cs: number | null
  regio: string | null
}

interface Uitbetaling {
  id: string
  deal_id: string
  makelaar_id: string
  bedrag: number
  status: string
  uitbetaald_op: string | null
}

interface WervingBonus {
  id: string
  aanbrenger_id: string | null
  aangebrachte_id: string | null
  startdatum: string
  mijlpaal_1_uitbetaald: boolean
  mijlpaal_1_datum: string | null
  mijlpaal_2_uitbetaald: boolean
  mijlpaal_2_datum: string | null
  notities: string | null
}

const emptyBonus = { aanbrenger_id: '', aangebrachte_id: '', startdatum: '', notities: '' }

export default function CommissiesPage() {
  const { entity, setEntity } = useEntity()
  const [makelaars, setMakelaars] = useState<Makelaar[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [uitbetalingen, setUitbetalingen] = useState<Uitbetaling[]>([])
  const [wervingBonussen, setWervingBonussen] = useState<WervingBonus[]>([])
  const [loading, setLoading] = useState(true)
  const [datePreset, setDatePreset] = useState<DatePreset>('dit_jaar')
  const [newBonus, setNewBonus] = useState(emptyBonus)
  const [savingBonus, setSavingBonus] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [mRes, dRes, uRes, wRes] = await Promise.allSettled([
          supabase.from('makelaars').select('id, naam, rol, area_manager_id').eq('actief', true),
          supabase
            .from('deals')
            .select(
              'id, datum_passering, aankoopprijs, bruto_commissie, makelaar_id, makelaar_commissie, makelaar2_id, makelaar2_commissie, area_manager_id, area_manager_commissie, netto_commissie_cs, regio'
            )
            .order('datum_passering', { ascending: false }),
          supabase.from('commissie_uitbetalingen').select('*'),
          supabase.from('werving_bonussen').select('*').order('startdatum', { ascending: false }),
        ])
        const mData = mRes.status === 'fulfilled' ? (mRes.value.data ?? []) : []
        const dData = dRes.status === 'fulfilled' ? (dRes.value.data ?? []) : []
        const uData = uRes.status === 'fulfilled' ? (uRes.value.data ?? []) : []
        const wData = wRes.status === 'fulfilled' ? (wRes.value.data ?? []) : []
        setMakelaars(mData as Makelaar[])
        setDeals(dData as Deal[])
        setUitbetalingen(uData as Uitbetaling[])
        setWervingBonussen(wData as WervingBonus[])
      } catch (e) {
        console.error('[load] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function toggleStatus(uitbetaling: Uitbetaling) {
    const newStatus = uitbetaling.status === 'Open' ? 'Uitbetaald' : 'Open'
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'Uitbetaald')
      updates.uitbetaald_op = new Date().toISOString().split('T')[0]
    else updates.uitbetaald_op = null
    await supabase.from('commissie_uitbetalingen').update(updates).eq('id', uitbetaling.id)
    setUitbetalingen(prev =>
      prev.map(u => (u.id === uitbetaling.id ? ({ ...u, ...updates } as Uitbetaling) : u))
    )
  }

  async function createUitbetaling(deal: Deal) {
    if (!deal.makelaar_id || !deal.makelaar_commissie) return
    if (uitbetalingen.find(u => u.deal_id === deal.id)) return
    const { data } = await supabase
      .from('commissie_uitbetalingen')
      .insert({
        deal_id: deal.id,
        makelaar_id: deal.makelaar_id,
        bedrag: deal.makelaar_commissie,
        status: 'Open',
      })
      .select()
      .single()
    if (data) setUitbetalingen(prev => [...prev, data as Uitbetaling])
  }

  async function toggleMijlpaal(id: string, mijlpaal: 1 | 2, huidig: boolean) {
    const field = mijlpaal === 1 ? 'mijlpaal_1_uitbetaald' : 'mijlpaal_2_uitbetaald'
    const datumField = mijlpaal === 1 ? 'mijlpaal_1_datum' : 'mijlpaal_2_datum'
    const updates: Record<string, unknown> = { [field]: !huidig }
    updates[datumField] = !huidig ? new Date().toISOString().split('T')[0] : null
    await supabase.from('werving_bonussen').update(updates).eq('id', id)
    setWervingBonussen(prev =>
      prev.map(w => (w.id === id ? ({ ...w, ...updates } as WervingBonus) : w))
    )
  }

  async function addBonus() {
    if (!newBonus.startdatum) return
    setSavingBonus(true)
    const { data } = await supabase
      .from('werving_bonussen')
      .insert({
        aanbrenger_id: newBonus.aanbrenger_id || null,
        aangebrachte_id: newBonus.aangebrachte_id || null,
        startdatum: newBonus.startdatum,
        notities: newBonus.notities || null,
      })
      .select()
      .single()
    if (data) setWervingBonussen(prev => [data as WervingBonus, ...prev])
    setNewBonus(emptyBonus)
    setSavingBonus(false)
  }

  async function deleteBonus(id: string) {
    if (!confirm('Bonus verwijderen?')) return
    await supabase.from('werving_bonussen').delete().eq('id', id)
    setWervingBonussen(prev => prev.filter(w => w.id !== id))
  }

  const range = useMemo(() => getDateRange(datePreset), [datePreset])
  const chartJaar = range.from ? range.from.getFullYear() : new Date().getFullYear()

  const filteredDeals = useMemo(
    () =>
      deals.filter(d => matchesEntity(d.regio, entity) && isInRange(d.datum_passering, range)),
    [deals, entity, range]
  )

  // Per-consultant overzicht
  const stats = useMemo(
    () =>
      makelaars
        .map(m => {
          const mDeals = filteredDeals.filter(
            d => d.makelaar_id === m.id || d.makelaar2_id === m.id
          )
          const totaalMak =
            filteredDeals
              .filter(d => d.makelaar_id === m.id)
              .reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0) +
            filteredDeals
              .filter(d => d.makelaar2_id === m.id)
              .reduce((s, d) => s + Number(d.makelaar2_commissie ?? 0), 0)
          const totaalAankoop = mDeals.reduce((s, d) => s + Number(d.aankoopprijs), 0)
          const totaalBruto = mDeals.reduce((s, d) => s + Number(d.bruto_commissie ?? 0), 0)
          return {
            makelaar: m,
            deals: mDeals.length,
            aankoopwaarde: totaalAankoop,
            bruto_commissie: totaalBruto,
            makelaar_commissie: totaalMak,
            gem_per_deal: mDeals.length > 0 ? totaalMak / mDeals.length : 0,
            pct_van_totaal:
              filteredDeals.length > 0 ? (mDeals.length / filteredDeals.length) * 100 : 0,
          }
        })
        .filter(s => s.deals > 0),
    [makelaars, filteredDeals]
  )

  // Area manager stats
  const areaManagerStats = useMemo(() => {
    const ams = makelaars.filter(m => m.rol === 'area_manager')
    return ams
      .map(am => {
        const amDeals = filteredDeals.filter(d => d.area_manager_id === am.id)
        const totaalCommissie = amDeals.reduce(
          (s, d) => s + Number(d.area_manager_commissie ?? 0),
          0
        )
        const totaalCSAandeel = amDeals.reduce((s, d) => {
          const bruto = Number(d.bruto_commissie ?? 0)
          const mak = Number(d.makelaar_commissie ?? 0) + Number(d.makelaar2_commissie ?? 0)
          return s + (bruto - mak)
        }, 0)
        return { am, deals: amDeals.length, totaalCommissie, totaalCSAandeel }
      })
      .filter(s => s.deals > 0)
  }, [makelaars, filteredDeals])

  // Commissie per maand per consultant
  const commissiePerMaand = useMemo(
    () =>
      makelaars
        .filter(m => m.rol !== 'area_manager')
        .map(m => {
          const perMaand = MAANDEN.map((_, i) => {
            const mnd1 = filteredDeals.filter(
              d =>
                d.makelaar_id === m.id &&
                new Date(d.datum_passering).getMonth() === i &&
                new Date(d.datum_passering).getFullYear() === chartJaar
            )
            const mnd2 = filteredDeals.filter(
              d =>
                d.makelaar2_id === m.id &&
                new Date(d.datum_passering).getMonth() === i &&
                new Date(d.datum_passering).getFullYear() === chartJaar
            )
            return (
              mnd1.reduce((s, d) => s + Number(d.makelaar_commissie ?? 0), 0) +
              mnd2.reduce((s, d) => s + Number(d.makelaar2_commissie ?? 0), 0)
            )
          })
          const totaal = perMaand.reduce((s, v) => s + v, 0)
          return { makelaar: m, perMaand, totaal }
        })
        .filter(r => r.totaal > 0),
    [makelaars, filteredDeals, chartJaar]
  )

  // Uitbetaalstatus
  const dealsMetCommissie = useMemo(
    () => filteredDeals.filter(d => d.makelaar_id && Number(d.makelaar_commissie) > 0),
    [filteredDeals]
  )

  // Werving-bonussen verrijkt
  const wervingVerrijkt = useMemo(() => {
    const salesPerMakelaar: Record<string, number> = {}
    deals.forEach(d => {
      if (d.makelaar_id)
        salesPerMakelaar[d.makelaar_id] = (salesPerMakelaar[d.makelaar_id] ?? 0) + 1
      if (d.makelaar2_id)
        salesPerMakelaar[d.makelaar2_id] = (salesPerMakelaar[d.makelaar2_id] ?? 0) + 1
    })
    return wervingBonussen.map(w => {
      const aanbrenger = makelaars.find(m => m.id === w.aanbrenger_id)
      const aangebrachte = makelaars.find(m => m.id === w.aangebrachte_id)
      const sales = w.aangebrachte_id ? (salesPerMakelaar[w.aangebrachte_id] ?? 0) : 0
      // eslint-disable-next-line react-hooks/purity
      const nowMs = Date.now()
      const maandenActief = Math.floor(
        (nowMs - new Date(w.startdatum).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      )
      return {
        ...w,
        aanbrenger,
        aangebrachte,
        sales,
        maandenActief,
        mijlpaal1Bereikt: maandenActief >= 6 && sales >= 1,
        mijlpaal2Bereikt: maandenActief >= 12 && sales >= 5,
      }
    })
  }, [deals, makelaars, wervingBonussen])

  // Hero KPI's
  const totalCommissie = stats.reduce((s, r) => s + r.makelaar_commissie, 0)
  const totalAreaCommissie = areaManagerStats.reduce((s, r) => s + r.totaalCommissie, 0)
  const openUitbetalingen = uitbetalingen.filter(u => u.status === 'Open')
  const openTotaal = openUitbetalingen.reduce((s, u) => s + Number(u.bedrag), 0)
  const wervingBereikt = wervingVerrijkt.filter(
    w => (w.mijlpaal1Bereikt && !w.mijlpaal_1_uitbetaald) || (w.mijlpaal2Bereikt && !w.mijlpaal_2_uitbetaald)
  ).length

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Commissies"
          subtitle="Consultant- en area-manager-commissies, uitbetaalstatus en recruitment-bonussen."
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
          <FinPeriodPicker value={datePreset} onChange={setDatePreset} />
        </FinHeader>

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid>
              <FinKpi
                label="Commissie consultants"
                value={formatEuro(totalCommissie)}
                sub={`${stats.length} consultants`}
                tone="accent"
              />
              <FinKpi
                label="Commissie area managers"
                value={formatEuro(totalAreaCommissie)}
                sub={`${areaManagerStats.length} area managers`}
              />
              <FinKpi
                label="Open uitbetalingen"
                value={formatEuro(openTotaal)}
                sub={`${openUitbetalingen.length} stuks`}
                tone={openUitbetalingen.length > 0 ? 'negative' : 'default'}
              />
              <FinKpi
                label="Wervingsbonus te betalen"
                value={wervingBereikt}
                sub="bereikte mijlpalen"
                tone={wervingBereikt > 0 ? 'accent' : 'default'}
              />
            </FinKpiGrid>

            {/* Per consultant */}
            <FinSection title="Per consultant" meta={range.label}>
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Consultant</th>
                      <th className="num">Sales</th>
                      <th className="num">Aankoopwaarde</th>
                      <th className="num">Bruto commissie</th>
                      <th className="num">Commissie consultant</th>
                      <th className="num">Gem./sale</th>
                      <th className="num">% van sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          Nog geen sales met consultant-commissie in deze selectie
                        </td>
                      </tr>
                    )}
                    {stats.map(s => (
                      <tr key={s.makelaar.id}>
                        <td>{s.makelaar.naam}</td>
                        <td className="num">{s.deals}</td>
                        <td className="num">{formatEuro(s.aankoopwaarde)}</td>
                        <td className="num">{formatEuro(s.bruto_commissie)}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--deepsea)' }}>
                          {formatEuro(s.makelaar_commissie)}
                        </td>
                        <td className="num">{formatEuro(s.gem_per_deal)}</td>
                        <td className="num muted">{s.pct_van_totaal.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FinSection>

            {/* Area manager commissies */}
            {areaManagerStats.length > 0 && (
              <FinSection title="Area manager commissies">
                <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Area manager</th>
                        <th className="num">Team deals</th>
                        <th className="num">Totaal CS aandeel</th>
                        <th className="num">Area mgr commissie</th>
                        <th className="num">Gem. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areaManagerStats.map(s => (
                        <tr key={s.am.id}>
                          <td>{s.am.naam}</td>
                          <td className="num">{s.deals}</td>
                          <td className="num">{formatEuro(s.totaalCSAandeel)}</td>
                          <td className="num" style={{ color: 'var(--sun-dark)', fontWeight: 700 }}>
                            {formatEuro(s.totaalCommissie)}
                          </td>
                          <td className="num muted">
                            {s.totaalCSAandeel > 0
                              ? `${((s.totaalCommissie / s.totaalCSAandeel) * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FinSection>
            )}

            {/* Commissie per maand grid */}
            {commissiePerMaand.length > 0 && (
              <FinSection title="Commissie per maand" meta={`${chartJaar}`}>
                <div className="fin-pl-table-wrap">
                  <table className="fin-pl-table">
                    <thead>
                      <tr>
                        <th className="sticky">Consultant</th>
                        {MAANDEN.map(m => (
                          <th key={m} className="num">
                            {m}
                          </th>
                        ))}
                        <th className="num total">Totaal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissiePerMaand.map(r => (
                        <tr key={r.makelaar.id}>
                          <td className="sticky">{r.makelaar.naam}</td>
                          {r.perMaand.map((v, i) => (
                            <td key={i} className="num">
                              {v > 0 ? formatEuro(v) : '—'}
                            </td>
                          ))}
                          <td className="num total">{formatEuro(r.totaal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </FinSection>
            )}

            {/* Uitbetaalstatus */}
            <FinSection
              title="Uitbetaalstatus"
              meta="klik op status om te wijzigen"
            >
              <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Deal #</th>
                      <th>Datum</th>
                      <th>Consultant</th>
                      <th className="num">Bedrag</th>
                      <th>Status</th>
                      <th>Uitbetaald op</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dealsMetCommissie.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          Geen deals met consultant-commissie in deze selectie
                        </td>
                      </tr>
                    )}
                    {dealsMetCommissie.map(deal => {
                      const makelaar = makelaars.find(m => m.id === deal.makelaar_id)
                      const u = uitbetalingen.find(x => x.deal_id === deal.id)
                      return (
                        <tr key={deal.id}>
                          <td className="muted">#{deal.id.slice(-4)}</td>
                          <td className="muted">
                            {new Date(deal.datum_passering).toLocaleDateString('nl-NL')}
                          </td>
                          <td>{makelaar?.naam ?? '—'}</td>
                          <td className="num" style={{ fontWeight: 600 }}>
                            {formatEuro(deal.makelaar_commissie)}
                          </td>
                          <td>
                            {u ? (
                              <button
                                type="button"
                                onClick={() => void toggleStatus(u)}
                                className={`fin-status ${u.status === 'Uitbetaald' ? 'paid' : 'open'}`}
                              >
                                {u.status}
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td className="muted">
                            {u?.uitbetaald_op
                              ? new Date(u.uitbetaald_op).toLocaleDateString('nl-NL')
                              : '—'}
                          </td>
                          <td>
                            {!u && (
                              <button
                                type="button"
                                onClick={() => void createUitbetaling(deal)}
                                className="fin-link"
                              >
                                Aanmaken
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </FinSection>

            {/* Recruitment bonussen */}
            <FinSection title="Recruitment-bonussen">
              <div className="fin-bonus-form">
                <div>
                  <label>Aanbrenger</label>
                  <select
                    value={newBonus.aanbrenger_id}
                    onChange={e => setNewBonus({ ...newBonus, aanbrenger_id: e.target.value })}
                  >
                    <option value="">Kies consultant</option>
                    {makelaars.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.naam}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Aangebrachte consultant</label>
                  <select
                    value={newBonus.aangebrachte_id}
                    onChange={e => setNewBonus({ ...newBonus, aangebrachte_id: e.target.value })}
                  >
                    <option value="">Kies consultant</option>
                    {makelaars.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.naam}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Startdatum *</label>
                  <input
                    type="date"
                    value={newBonus.startdatum}
                    onChange={e => setNewBonus({ ...newBonus, startdatum: e.target.value })}
                  />
                </div>
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => void addBonus()}
                    disabled={savingBonus || !newBonus.startdatum}
                    className="fin-btn primary"
                  >
                    <Plus /> Toevoegen
                  </button>
                </div>
              </div>

              <div className="fin-table-wrap" style={{ borderRadius: 10, marginTop: 14 }}>
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th>Aanbrenger</th>
                      <th>Aangebrachte</th>
                      <th>Start</th>
                      <th className="num">Maanden</th>
                      <th className="num">Sales</th>
                      <th>Mijlpaal 1 (6m + 1)</th>
                      <th>Mijlpaal 2 (12m + 5)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {wervingVerrijkt.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="muted"
                          style={{ textAlign: 'center', padding: '24px' }}
                        >
                          Nog geen recruitment-bonussen geregistreerd
                        </td>
                      </tr>
                    )}
                    {wervingVerrijkt.map(w => (
                      <tr key={w.id}>
                        <td>{w.aanbrenger?.naam ?? '—'}</td>
                        <td style={{ fontWeight: 600 }}>{w.aangebrachte?.naam ?? '—'}</td>
                        <td className="muted">
                          {new Date(w.startdatum).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="num">{w.maandenActief}</td>
                        <td className="num">{w.sales}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void toggleMijlpaal(w.id, 1, w.mijlpaal_1_uitbetaald)}
                            className={`fin-status ${
                              w.mijlpaal_1_uitbetaald
                                ? 'paid'
                                : w.mijlpaal1Bereikt
                                  ? 'ready'
                                  : 'inactive'
                            }`}
                          >
                            {w.mijlpaal_1_uitbetaald
                              ? `Uitbetaald${w.mijlpaal_1_datum ? ' ' + new Date(w.mijlpaal_1_datum).toLocaleDateString('nl-NL') : ''}`
                              : w.mijlpaal1Bereikt
                                ? 'Bereikt — €5.000'
                                : 'Niet bereikt'}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void toggleMijlpaal(w.id, 2, w.mijlpaal_2_uitbetaald)}
                            className={`fin-status ${
                              w.mijlpaal_2_uitbetaald
                                ? 'paid'
                                : w.mijlpaal2Bereikt
                                  ? 'ready'
                                  : 'inactive'
                            }`}
                          >
                            {w.mijlpaal_2_uitbetaald
                              ? `Uitbetaald${w.mijlpaal_2_datum ? ' ' + new Date(w.mijlpaal_2_datum).toLocaleDateString('nl-NL') : ''}`
                              : w.mijlpaal2Bereikt
                                ? 'Bereikt — €5.000'
                                : 'Niet bereikt'}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void deleteBonus(w.id)}
                            className="fin-icon-btn"
                            aria-label="Verwijderen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FinSection>

            <div style={{ height: 60 }} />
          </>
        )}
      </div>
    </div>
  )
}
