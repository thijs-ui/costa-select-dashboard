// ============================================================================
// components/deals-table.tsx
//
// Tabel + filter-rij (consultant, regio, search op notities/partner).
// Alleen UI — data-filtering gebeurt in parent (app/dashboard/deals/page.tsx).
// ============================================================================
'use client'

import { Pencil, Trash2, Search } from 'lucide-react'
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
  deals, makelaars, editingDealId, onEdit, onDelete, range,
  filterConsultant, setFilterConsultant, filterRegio, setFilterRegio,
  search, setSearch, regios,
}: Props) {
  return (
    <div
      className="rounded-[12px] overflow-hidden bg-white"
      style={{ border: '1px solid rgba(0,75,70,0.12)' }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center"
        style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(0,75,70,0.08)' }}
      >
        <h2
          className="font-heading"
          style={{ fontSize: 15, fontWeight: 700, color: '#004B46', letterSpacing: '-0.005em' }}
        >
          Sales ({deals.length})
        </h2>
        <span className="text-[11px]" style={{ color: '#7A8C8B', fontWeight: 500 }}>
          {range.label}
        </span>
      </div>

      {/* Filter row */}
      <div
        className="flex gap-[10px] items-center flex-wrap"
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(0,75,70,0.08)',
          background: 'rgba(0,75,70,0.02)',
        }}
      >
        <span
          style={{
            fontSize: 11, color: '#7A8C8B', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          Filters
        </span>

        <select
          value={filterConsultant}
          onChange={(e) => setFilterConsultant(e.target.value)}
          className="rounded-[8px] px-[10px] py-[6px] text-[12px] font-[inherit]"
          style={{
            border: '1px solid rgba(0,75,70,0.15)', background: '#fff',
            color: '#004B46', minWidth: 140,
          }}
        >
          <option value="">Alle consultants</option>
          {makelaars.map((m) => <option key={m.id} value={m.id}>{m.naam}</option>)}
        </select>

        <select
          value={filterRegio}
          onChange={(e) => setFilterRegio(e.target.value)}
          className="rounded-[8px] px-[10px] py-[6px] text-[12px] font-[inherit]"
          style={{
            border: '1px solid rgba(0,75,70,0.15)', background: '#fff',
            color: '#004B46', minWidth: 140,
          }}
        >
          <option value="">Alle regio&apos;s</option>
          {regios.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <div
          className="flex items-center gap-[6px] rounded-[8px]"
          style={{
            background: '#fff', border: '1px solid rgba(0,75,70,0.15)',
            padding: '6px 10px', minWidth: 180, marginLeft: 'auto',
          }}
        >
          <Search size={13} color="#7A8C8B" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op notitie of partner"
            className="flex-1 text-[12px] font-[inherit]"
            style={{ border: 'none', outline: 'none', background: 'transparent', color: '#004B46' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(0,75,70,0.03)' }}>
              {['#', 'Datum', 'Regio', 'Type', 'Bron', 'Aankoopprijs', 'Comm%', 'Bruto', 'Consultant(s)', 'CS netto', 'Notities', ''].map((h, i) => (
                <th
                  key={h + i}
                  className={[5, 6, 7, 9].includes(i) ? 'text-right' : 'text-left'}
                  style={{
                    padding: '11px 12px', whiteSpace: 'nowrap',
                    fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: '#7A8C8B', fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 && (
              <tr>
                <td colSpan={12} style={{ padding: 38, textAlign: 'center', color: '#7A8C8B', fontSize: 13 }}>
                  Geen deals in deze periode
                </td>
              </tr>
            )}

            {deals.map((deal) => {
              const m1 = makelaars.find((m) => m.id === deal.makelaar_id)
              const m2 = makelaars.find((m) => m.id === deal.makelaar2_id)
              const isEditing = editingDealId === deal.id
              return (
                <tr
                  key={deal.id}
                  style={{
                    background: isEditing ? '#FEF6E4' : undefined,
                    borderBottom: '1px solid rgba(0,75,70,0.06)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isEditing) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(0,75,70,0.02)' }}
                  onMouseLeave={(e) => { if (!isEditing) (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                >
                  <td style={tdBase} className="text-[#7A8C8B]">{deal.deal_nummer}</td>
                  <td style={tdBase}>{new Date(deal.datum_passering).toLocaleDateString('nl-NL')}</td>
                  <td style={tdBase}>
                    <span
                      className="inline-flex items-center rounded-[6px] text-[11px] font-semibold"
                      style={{ padding: '2px 8px', background: 'rgba(0,75,70,0.08)', color: '#004B46' }}
                    >
                      {deal.regio}
                    </span>
                  </td>
                  <td style={{ ...tdBase, color: '#7A8C8B', fontSize: 12 }}>{deal.type_deal}</td>
                  <td style={{ ...tdBase, color: '#7A8C8B', fontSize: 12, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {deal.bron}
                  </td>
                  <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatEuro(deal.aankoopprijs)}
                  </td>
                  <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#7A8C8B' }}>
                    {formatPct(deal.commissie_pct)}
                  </td>
                  <td style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {formatEuro(deal.bruto_commissie)}
                  </td>

                  {/* Consultant(s) */}
                  <td style={tdBase}>
                    <div className="flex flex-col gap-[2px]">
                      <div className="flex items-center gap-[5px]">
                        {deal.eigen_netwerk && <PillMini kind="en">EN</PillMini>}
                        {deal.is_overdracht && <PillMini kind="od">OD</PillMini>}
                        <span>{m1?.naam?.split(' ')[0] ?? '—'}</span>
                        {m1 && <span className="text-[11px]" style={{ color: '#7A8C8B' }}>({formatPct(deal.makelaar_pct)})</span>}
                      </div>
                      {m2 && (
                        <div className="text-[12px]" style={{ color: '#7A8C8B' }}>
                          {m2.naam.split(' ')[0]}{' '}
                          <span className="text-[11px]" style={{ color: '#7A8C8B' }}>({formatPct(deal.makelaar2_pct)})</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td
                    style={{ ...tdBase, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#0A6B5E', fontWeight: 700 }}
                  >
                    {formatEuro(deal.netto_commissie_cs)}
                  </td>

                  <td style={{ ...tdBase, color: '#7A8C8B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div className="flex items-center gap-[6px]">
                      {deal.pipedrive_deal_id && <PillMini kind="pd">PD</PillMini>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.notities ?? '—'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={tdBase}>
                    <div className="flex gap-[2px]">
                      <IconBtn onClick={() => onEdit(deal)} active={isEditing} variant="edit">
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => onDelete(deal.id)} variant="delete">
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
const tdBase: React.CSSProperties = {
  padding: '11px 12px', whiteSpace: 'nowrap', color: '#004B46',
}

function PillMini({ kind, children }: { kind: 'en' | 'od' | 'pd'; children: React.ReactNode }) {
  const style: Record<typeof kind, React.CSSProperties> = {
    en: { background: 'rgba(148,87,235,0.12)', color: '#6B21A8' },
    od: { background: 'rgba(59,130,246,0.12)', color: '#1E40AF' },
    pd: { background: '#E6F0EF', color: '#004B46' },
  }
  return (
    <span
      className="inline-flex items-center rounded-[5px] text-[10px] font-semibold"
      style={{ padding: '1px 5px', ...style[kind] }}
    >
      {children}
    </span>
  )
}

function IconBtn({
  onClick, children, active, variant,
}: {
  onClick: () => void
  children: React.ReactNode
  active?: boolean
  variant: 'edit' | 'delete'
}) {
  const hoverBg = variant === 'edit' ? 'rgba(245,175,64,0.1)' : 'rgba(224,82,82,0.1)'
  const hoverColor = variant === 'edit' ? '#F5AF40' : '#E05252'
  const baseColor = active ? hoverColor : 'rgba(0,75,70,0.3)'
  return (
    <button
      onClick={onClick}
      className="rounded-[6px] inline-flex items-center"
      style={{
        background: 'transparent', border: 'none', padding: 5,
        cursor: 'pointer', color: baseColor,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = hoverColor
        ;(e.currentTarget as HTMLButtonElement).style.background = hoverBg
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = baseColor
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
