'use client'

import { Pencil, Search, Trash2 } from 'lucide-react'
import { formatEuro, formatPct } from '@/lib/calculations'
import type { DateRange } from '@/lib/date-utils'
import type { Deal, Makelaar } from '@/components/deals-types'

interface Props {
  deals: Deal[]
  makelaars: Makelaar[]
  editingDealId: string | null
  onEdit: (d: Deal) => void
  onDelete: (id: string) => void
  range: DateRange
  filterConsultant: string
  setFilterConsultant: (v: string) => void
  filterRegio: string
  setFilterRegio: (v: string) => void
  search: string
  setSearch: (v: string) => void
  regios: string[]
}

export default function DealsTable({
  deals,
  makelaars,
  editingDealId,
  onEdit,
  onDelete,
  range,
  filterConsultant,
  setFilterConsultant,
  filterRegio,
  setFilterRegio,
  search,
  setSearch,
  regios,
}: Props) {
  return (
    <section className="fin-section" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div className="fin-deals-head">
        <h3 className="fin-deals-title">
          Sales <span className="fin-deals-count">{deals.length}</span>
        </h3>
        <span className="fin-deals-period">{range.label}</span>
      </div>

      {/* Filter-bar */}
      <div className="fin-deals-filters">
        <span className="fin-deals-filter-label">Filters</span>
        <select
          value={filterConsultant}
          onChange={e => setFilterConsultant(e.target.value)}
          className="fin-select"
          style={{ minWidth: 150 }}
        >
          <option value="">Alle consultants</option>
          {makelaars.map(m => (
            <option key={m.id} value={m.id}>
              {m.naam}
            </option>
          ))}
        </select>
        <select
          value={filterRegio}
          onChange={e => setFilterRegio(e.target.value)}
          className="fin-select"
          style={{ minWidth: 150 }}
        >
          <option value="">Alle regio&apos;s</option>
          {regios.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="fin-deals-search">
          <Search size={13} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek op notitie of partner"
          />
        </div>
      </div>

      {/* Table */}
      <div className="fin-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Datum</th>
                <th>Regio</th>
                <th>Type</th>
                <th>Bron</th>
                <th className="num">Aankoopprijs</th>
                <th className="num">Comm%</th>
                <th className="num">Bruto</th>
                <th>Consultant(s)</th>
                <th className="num">CS netto</th>
                <th>Notities</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="muted"
                    style={{ textAlign: 'center', padding: '32px' }}
                  >
                    Geen deals in deze periode
                  </td>
                </tr>
              )}
              {deals.map(deal => {
                const m1 = makelaars.find(m => m.id === deal.makelaar_id)
                const m2 = makelaars.find(m => m.id === deal.makelaar2_id)
                const isEditing = editingDealId === deal.id
                return (
                  <tr
                    key={deal.id}
                    className={isEditing ? 'fin-row-editing' : ''}
                  >
                    <td className="muted">{deal.deal_nummer}</td>
                    <td>{new Date(deal.datum_passering).toLocaleDateString('nl-NL')}</td>
                    <td>
                      <span className="fin-pill-soft">{deal.regio}</span>
                    </td>
                    <td className="muted">{deal.type_deal}</td>
                    <td className="muted" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {deal.bron}
                    </td>
                    <td className="num">{formatEuro(deal.aankoopprijs)}</td>
                    <td className="num muted">{formatPct(deal.commissie_pct)}</td>
                    <td className="num">{formatEuro(deal.bruto_commissie)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {deal.eigen_netwerk && <PillMini kind="en">EN</PillMini>}
                          {deal.is_overdracht && <PillMini kind="od">OD</PillMini>}
                          <span>{m1?.naam?.split(' ')[0] ?? '—'}</span>
                          {m1 && (
                            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                              ({formatPct(deal.makelaar_pct)})
                            </span>
                          )}
                        </div>
                        {m2 && (
                          <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                            {m2.naam.split(' ')[0]}{' '}
                            <span style={{ fontSize: 11 }}>
                              ({formatPct(deal.makelaar2_pct)})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--positive-text)' }}>
                      {formatEuro(deal.netto_commissie_cs)}
                    </td>
                    <td className="muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {deal.pipedrive_deal_id && <PillMini kind="pd">PD</PillMini>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {deal.notities ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button
                          type="button"
                          onClick={() => onEdit(deal)}
                          className={`fin-row-action ${isEditing ? 'editing' : ''}`}
                          aria-label="Bewerken"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(deal.id)}
                          className="fin-row-action danger"
                          aria-label="Verwijderen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function PillMini({ kind, children }: { kind: 'en' | 'od' | 'pd'; children: React.ReactNode }) {
  const cls = `fin-pill-mini ${kind}`
  return <span className={cls}>{children}</span>
}
