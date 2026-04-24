'use client'

import { Fragment, useMemo } from 'react'
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Home,
  Lock,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Receipt,
  RotateCcw,
  Rows3,
  ScrollText,
  Search,
  SearchX,
  Star,
  TrendingUp,
  User,
  LayoutGrid,
  X,
} from 'lucide-react'
import {
  LANG_LABELS,
  PARTNER_TYPES,
  TYPE_LABELS,
  fmtLastContact,
  type Agency,
  type Lang,
  type Partner,
  type PartnerType,
  type SamType,
  type SamView,
  type SortKey,
  type SortState,
} from './types'

/* ── Reliability ─────────────────────────────────────── */
export function Reliability({ value, hideNum }: { value: number | null | undefined; hideNum?: boolean }) {
  const v = value ?? 0
  return (
    <span className="sam-rel">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`sam-rel-dot ${i <= v ? `on lvl-${v}` : ''}`}
        />
      ))}
      {!hideNum && <span className="sam-rel-num">{v > 0 ? `${v}/5` : '—'}</span>}
    </span>
  )
}

/* ── Languages ───────────────────────────────────────── */
export function Langs({ langs }: { langs: Lang[] | undefined }) {
  if (!langs || !langs.length) {
    return <span style={{ color: 'var(--fg-subtle)', fontSize: 11 }}>—</span>
  }
  return (
    <span className="sam-langs">
      {langs.map(l => (
        <span key={l} className={`sam-lang ${l}`}>{LANG_LABELS[l] ?? l.toUpperCase()}</span>
      ))}
    </span>
  )
}

/* ── Badges (preferred / exclusive / inactive) ──────── */
export function Badges({
  item,
  isAgency,
}: {
  item: Agency | Partner
  isAgency: boolean
}) {
  const agency = item as Agency
  const isExclusive =
    isAgency &&
    !!agency.is_preferred &&
    !!agency.commission_notes &&
    /exclusief/i.test(agency.notes ?? '')
  return (
    <>
      {item.is_preferred && (
        <span className="sam-preferred" title="Preferred partner">
          <Star size={10} strokeWidth={2.5} fill="currentColor" />
          Preferred
        </span>
      )}
      {isExclusive && (
        <span className="sam-exclusive" title="Exclusieve listings">
          <Lock size={10} strokeWidth={2.5} />
          Exclusief
        </span>
      )}
      {item.is_active === false && <span className="sam-inactive-pill">Inactief</span>}
    </>
  )
}

/* ── Header ──────────────────────────────────────────── */
export function SamHeader({
  count,
  type,
  isAdmin,
  onCreate,
  onExport,
}: {
  count: number
  type: SamType
  isAdmin: boolean
  onCreate: () => void
  onExport: () => void
}) {
  const typeLabel = type === 'agencies' ? 'Makelaars' : 'Partners'
  return (
    <header className="sam-header">
      <div className="titles">
        <div className="eyebrow">COSTA SELECT · NETWERK</div>
        <h1>
          Samenwerkingen
          <span className="sam-count">
            {count} {typeLabel.toLowerCase()}
          </span>
          {!isAdmin && (
            <span className="sam-role-badge">
              <Eye size={11} strokeWidth={2.4} /> Read-only
            </span>
          )}
        </h1>
        <p className="subtitle">
          {type === 'agencies'
            ? 'Lokale makelaars waarmee we co-broker afspraken hebben in heel Spanje.'
            : 'Adviseurs en notarissen die we doorverwijzen aan onze klanten.'}
        </p>
      </div>
      <div className="sam-header-right">
        {isAdmin && (
          <>
            <button className="sam-btn sam-btn-ghost" onClick={onExport}>
              <Download size={14} /> Export CSV
            </button>
            <button className="sam-btn sam-btn-primary" onClick={onCreate}>
              <Plus size={14} /> Nieuwe {type === 'agencies' ? 'makelaar' : 'partner'}
            </button>
          </>
        )}
      </div>
    </header>
  )
}

/* ── Type Toggle ─────────────────────────────────────── */
export function SamTypeToggle({
  value,
  onChange,
  agencyCount,
  partnerCount,
}: {
  value: SamType
  onChange: (v: SamType) => void
  agencyCount: number
  partnerCount: number
}) {
  return (
    <div className="sam-type-toggle" role="tablist">
      <button
        role="tab"
        className={value === 'agencies' ? 'on' : ''}
        onClick={() => onChange('agencies')}
      >
        <Building2 size={13} />
        Makelaars
        <span className="cnt">{agencyCount}</span>
      </button>
      <button
        role="tab"
        className={value === 'partners' ? 'on' : ''}
        onClick={() => onChange('partners')}
      >
        <Briefcase size={13} />
        Partners
        <span className="cnt">{partnerCount}</span>
      </button>
    </div>
  )
}

/* ── Stats ───────────────────────────────────────────── */
export function SamStats({ items, type }: { items: (Agency | Partner)[]; type: SamType }) {
  const { total, preferred, active, avgRel, fresh, spark } = useMemo(() => {
    const total = items.length
    const preferred = items.filter(i => i.is_preferred).length
    const active = items.filter(i => i.is_active !== false).length
    const withRel = items.filter(i => (i.reliability_score ?? 0) > 0)
    const avgRel = withRel.length
      ? (withRel.reduce((a, i) => a + (i.reliability_score ?? 0), 0) / withRel.length).toFixed(1)
      : '—'
    const fresh = items.filter(
      i => i.last_contact_days != null && (i.last_contact_days as number) <= 7
    ).length
    const buckets = [0, 0, 0, 0, 0]
    items.forEach(i => {
      const d = i.last_contact_days
      if (d == null) return
      if (d <= 7) buckets[0]++
      else if (d <= 14) buckets[1]++
      else if (d <= 30) buckets[2]++
      else if (d <= 60) buckets[3]++
      else buckets[4]++
    })
    return { total, preferred, active, avgRel, fresh, spark: buckets }
  }, [items])

  const sparkW = 100
  const sparkH = 22
  const max = Math.max(1, ...spark)
  const pts = spark.map((v, i) => [
    (i / (spark.length - 1)) * sparkW,
    sparkH - (v / max) * sparkH,
  ])
  const linePath = 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
  const areaPath = linePath + ` L${sparkW},${sparkH} L0,${sparkH} Z`

  return (
    <div className="sam-stats">
      <div className="sam-stat">
        <span className="sam-stat-label">
          Totaal {type === 'agencies' ? 'makelaars' : 'partners'}
        </span>
        <span className="sam-stat-value">{total}</span>
        <span className="sam-stat-foot">
          <CheckCircle2 size={11} />
          {active} actief
        </span>
      </div>
      <div className="sam-stat">
        <span className="sam-stat-label">Preferred</span>
        <span className="sam-stat-value">{preferred}</span>
        <span className="sam-stat-foot">
          <Star size={11} />
          Top-tier samenwerking
        </span>
      </div>
      <div className="sam-stat">
        <span className="sam-stat-label">Gem. betrouwbaarheid</span>
        <span className="sam-stat-value">
          {avgRel}
          <span style={{ fontSize: 14, opacity: 0.5, fontWeight: 600, marginLeft: 2 }}>/5</span>
        </span>
        <span className="sam-stat-foot">
          <TrendingUp size={11} />
          Op basis van laatste deals
        </span>
      </div>
      <div className="sam-stat">
        <span className="sam-stat-label">Contact recency</span>
        <span className="sam-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {fresh}
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)', letterSpacing: 0 }}>
            deze week
          </span>
        </span>
        <div className="spark" title="Contact-spreiding: 0-7d, 8-14d, 15-30d, 31-60d, 60+d">
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none">
            <path className="area" d={areaPath} />
            <path className="line" d={linePath} />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ── Region strip ────────────────────────────────────── */
export function SamRegionStrip({
  items,
  regions,
  activeRegion,
  onRegionClick,
  type,
}: {
  items: (Agency | Partner)[]
  regions: string[]
  activeRegion: string
  onRegionClick: (r: string) => void
  type: SamType
}) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    regions.forEach(r => {
      m[r] = 0
    })
    items.forEach(i => {
      if (i.is_active === false) return
      const r = i.region
      if (r && m[r] != null) m[r]++
    })
    return m
  }, [items, regions])
  const max = Math.max(1, ...Object.values(counts))

  return (
    <div className="sam-region-strip">
      <div className="sam-region-strip-head">
        <span className="sam-region-strip-title">
          Dekking per regio · {type === 'agencies' ? 'Makelaars' : 'Partners'}
        </span>
        <span className="sam-region-strip-hint">Klik om te filteren</span>
      </div>
      <div className="sam-region-bars">
        {regions.map(r => {
          const c = counts[r] || 0
          const h = Math.max(c === 0 ? 3 : 6, (c / max) * 56)
          const isActive = activeRegion === r
          const cls = `sam-region-bar ${isActive ? 'active' : ''} ${c === 0 ? 'empty' : ''}`
          return (
            <button
              key={r}
              type="button"
              className={cls}
              onClick={() => onRegionClick(isActive ? '' : r)}
              title={`${r} — ${c} ${c === 1 ? (type === 'agencies' ? 'makelaar' : 'partner') : type === 'agencies' ? 'makelaars' : 'partners'}`}
            >
              <span className="cnt">{c}</span>
              <div className="bar" style={{ height: h + 'px' }} />
              <span className="label">{r.replace('Costa ', 'C.')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Toolbar ─────────────────────────────────────────── */
export function SamToolbar({
  type,
  search,
  onSearch,
  region,
  onRegion,
  partnerType,
  onPartnerType,
  showInactive,
  onShowInactive,
  group,
  onGroup,
  view,
  onView,
  regions,
}: {
  type: SamType
  search: string
  onSearch: (v: string) => void
  region: string
  onRegion: (v: string) => void
  partnerType: string
  onPartnerType: (v: string) => void
  showInactive: boolean
  onShowInactive: (v: boolean) => void
  group: boolean
  onGroup: (v: boolean) => void
  view: SamView
  onView: (v: SamView) => void
  regions: string[]
}) {
  return (
    <div className="sam-toolbar">
      <div className="sam-search">
        <Search size={14} />
        <input
          type="text"
          placeholder={
            type === 'agencies'
              ? 'Zoek op naam, plaats of contact…'
              : 'Zoek op naam, specialisme of contact…'
          }
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button className="sam-search-clear" onClick={() => onSearch('')} aria-label="Wis zoekopdracht">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="sam-select-wrap">
        <select value={region} onChange={e => onRegion(e.target.value)}>
          <option value="">Alle regio&apos;s</option>
          {regions.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {type === 'partners' && (
        <div className="sam-select-wrap">
          <select value={partnerType} onChange={e => onPartnerType(e.target.value)}>
            <option value="">Alle types</option>
            {PARTNER_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="sam-toggle-line">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={e => onShowInactive(e.target.checked)}
        />
        Toon inactieve
      </label>
      <div className="sam-toolbar-spacer" />
      <label className="sam-toggle-line" title={type === 'agencies' ? 'Groepeer per regio' : 'Groepeer per type'}>
        <input type="checkbox" checked={group} onChange={e => onGroup(e.target.checked)} />
        Groepeer per {type === 'agencies' ? 'regio' : 'type'}
      </label>
      <div className="sam-view-toggle">
        <button
          className={view === 'table' ? 'on' : ''}
          onClick={() => onView('table')}
          title="Tabel-weergave"
          aria-label="Tabel"
        >
          <Rows3 size={14} />
        </button>
        <button
          className={view === 'cards' ? 'on' : ''}
          onClick={() => onView('cards')}
          title="Kaart-weergave"
          aria-label="Kaarten"
        >
          <LayoutGrid size={14} />
        </button>
      </div>
    </div>
  )
}

/* ── Partner type icon ───────────────────────────────── */
const TYPE_ICON: Record<PartnerType, React.ReactNode> = {
  financieel_adviseur: <TrendingUp size={11} />,
  hypotheekadviseur: <Home size={11} />,
  notaris: <ScrollText size={11} />,
  belastingadviseur: <Receipt size={11} />,
  anders: <MoreHorizontal size={11} />,
}

/* ── Sort arrow helper ───────────────────────────────── */
function SortArrow({ k, sort }: { k: SortKey; sort: SortState }) {
  if (sort.key !== k) return null
  return <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>
}

function thCls(k: SortKey, sort: SortState, extra = '') {
  return `sortable ${sort.key === k ? 'sorted' : ''} ${extra}`.trim()
}

/* ── Agency table ────────────────────────────────────── */
export function SamAgencyTable({
  items,
  group,
  sort,
  onSort,
  onOpen,
  onContact,
}: {
  items: Agency[]
  group: boolean
  sort: SortState
  onSort: (k: SortKey) => void
  onOpen: (a: Agency) => void
  onContact: (a: Agency, kind: 'email' | 'whatsapp') => void
}) {
  const renderRow = (a: Agency) => {
    const lc = fmtLastContact(a.last_contact_days)
    return (
      <tr key={a.id} className={a.is_active === false ? 'inactive' : ''} onClick={() => onOpen(a)}>
        <td>
          <div className="sam-name">
            <div className="sam-name-row">
              <span className="sam-name-text">{a.name}</span>
              <Badges item={a} isAgency />
            </div>
            <span className="sam-name-sub">{a.contact_name || '—'}</span>
          </div>
        </td>
        <td>
          <span className="sam-region">
            <MapPin size={12} />
            {a.region}
            {a.city && <span style={{ color: 'var(--fg-subtle)' }}>· {a.city}</span>}
          </span>
        </td>
        <td className="hide-sm">
          <span className="sam-prop-types">
            {(a.property_types ?? []).map(t => (
              <span key={t} className="sam-prop-type">
                {t}
              </span>
            ))}
          </span>
        </td>
        <td className="hide-sm">
          <Langs langs={a.languages} />
        </td>
        <td>
          <Reliability value={a.reliability_score} />
        </td>
        <td className="hide-sm">
          <span className={`sam-last-contact ${lc.cls}`}>
            <span className="sam-contact-dot" />
            {lc.label}
          </span>
        </td>
        <td className="actions" onClick={e => e.stopPropagation()}>
          <button className="sam-row-action" onClick={() => onContact(a, 'email')} title="E-mail">
            <Mail size={14} />
          </button>
        </td>
      </tr>
    )
  }

  const head = (
    <thead>
      <tr>
        <th
          className={thCls('name', sort)}
          onClick={() => onSort('name')}
          style={{ minWidth: 240 }}
        >
          Naam <SortArrow k="name" sort={sort} />
        </th>
        {group ? (
          <th>Regio · Plaats</th>
        ) : (
          <th className={thCls('region', sort)} onClick={() => onSort('region')}>
            Regio · Plaats <SortArrow k="region" sort={sort} />
          </th>
        )}
        <th className="hide-sm">Type vastgoed</th>
        <th className="hide-sm">Talen</th>
        <th className={thCls('reliability_score', sort)} onClick={() => onSort('reliability_score')}>
          Betrouwbaarheid <SortArrow k="reliability_score" sort={sort} />
        </th>
        <th
          className={thCls('last_contact_days', sort, 'hide-sm')}
          onClick={() => onSort('last_contact_days')}
        >
          Laatste contact <SortArrow k="last_contact_days" sort={sort} />
        </th>
        <th></th>
      </tr>
    </thead>
  )

  if (group) {
    const groups: Record<string, Agency[]> = {}
    items.forEach(a => {
      const k = a.region || 'Onbekend'
      if (!groups[k]) groups[k] = []
      groups[k].push(a)
    })
    const keys = Object.keys(groups).sort()
    return (
      <div className="sam-table-wrap">
        <table className="sam-table">
          {head}
          <tbody>
            {keys.map(k => (
              <Fragment key={`g-${k}`}>
                <tr className="group-header">
                  <td colSpan={7}>
                    {k}
                    <span className="group-cnt">{groups[k].length}</span>
                  </td>
                </tr>
                {groups[k].map(renderRow)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="sam-table-wrap">
      <table className="sam-table">
        {head}
        <tbody>{items.map(renderRow)}</tbody>
      </table>
    </div>
  )
}

/* ── Partner table ───────────────────────────────────── */
export function SamPartnerTable({
  items,
  group,
  sort,
  onSort,
  onOpen,
  onContact,
}: {
  items: Partner[]
  group: boolean
  sort: SortState
  onSort: (k: SortKey) => void
  onOpen: (p: Partner) => void
  onContact: (p: Partner, kind: 'email' | 'whatsapp') => void
}) {
  const renderRow = (p: Partner) => {
    const lc = fmtLastContact(p.last_contact_days)
    return (
      <tr key={p.id} className={p.is_active === false ? 'inactive' : ''} onClick={() => onOpen(p)}>
        <td>
          <div className="sam-name">
            <div className="sam-name-row">
              <span className="sam-name-text">{p.name}</span>
              <Badges item={p} isAgency={false} />
            </div>
            <span className="sam-name-sub">{p.contact_name || '—'}</span>
          </div>
        </td>
        <td>
          <span className="sam-type-pill" data-type={p.type}>
            {TYPE_ICON[p.type]}
            {TYPE_LABELS[p.type]}
          </span>
        </td>
        <td>
          {p.region ? (
            <span className="sam-region">
              <MapPin size={12} />
              {p.region}
            </span>
          ) : (
            <span style={{ color: 'var(--fg-subtle)', fontSize: 12, fontStyle: 'italic' }}>
              Heel Spanje
            </span>
          )}
        </td>
        <td className="hide-sm">
          <Langs langs={p.languages} />
        </td>
        <td>
          <Reliability value={p.reliability_score} />
        </td>
        <td className="hide-sm">
          <span className={`sam-last-contact ${lc.cls}`}>
            <span className="sam-contact-dot" />
            {lc.label}
          </span>
        </td>
        <td className="actions" onClick={e => e.stopPropagation()}>
          <button className="sam-row-action" onClick={() => onContact(p, 'email')} title="E-mail">
            <Mail size={14} />
          </button>
        </td>
      </tr>
    )
  }

  const head = (
    <thead>
      <tr>
        <th
          className={thCls('name', sort)}
          onClick={() => onSort('name')}
          style={{ minWidth: 240 }}
        >
          Naam <SortArrow k="name" sort={sort} />
        </th>
        {group ? (
          <th>Type</th>
        ) : (
          <th className={thCls('type', sort)} onClick={() => onSort('type')}>
            Type <SortArrow k="type" sort={sort} />
          </th>
        )}
        <th className={thCls('region', sort)} onClick={() => onSort('region')}>
          Regio <SortArrow k="region" sort={sort} />
        </th>
        <th className="hide-sm">Talen</th>
        <th className={thCls('reliability_score', sort)} onClick={() => onSort('reliability_score')}>
          Betrouwbaarheid <SortArrow k="reliability_score" sort={sort} />
        </th>
        <th
          className={thCls('last_contact_days', sort, 'hide-sm')}
          onClick={() => onSort('last_contact_days')}
        >
          Laatste contact <SortArrow k="last_contact_days" sort={sort} />
        </th>
        <th></th>
      </tr>
    </thead>
  )

  if (group) {
    const groups: Record<string, Partner[]> = {}
    items.forEach(p => {
      const k = TYPE_LABELS[p.type] || 'Anders'
      if (!groups[k]) groups[k] = []
      groups[k].push(p)
    })
    const order = ['Financieel adviseur', 'Hypotheekadviseur', 'Notaris', 'Belastingadviseur', 'Anders']
    const keys = order.filter(k => groups[k])
    return (
      <div className="sam-table-wrap">
        <table className="sam-table">
          {head}
          <tbody>
            {keys.map(k => (
              <Fragment key={`g-${k}`}>
                <tr className="group-header">
                  <td colSpan={7}>
                    {k}
                    <span className="group-cnt">{groups[k].length}</span>
                  </td>
                </tr>
                {groups[k].map(renderRow)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="sam-table-wrap">
      <table className="sam-table">
        {head}
        <tbody>{items.map(renderRow)}</tbody>
      </table>
    </div>
  )
}

/* ── Card view ───────────────────────────────────────── */
export function SamCardView({
  items,
  type,
  onOpen,
}: {
  items: (Agency | Partner)[]
  type: SamType
  onOpen: (item: Agency | Partner) => void
}) {
  return (
    <div className="sam-cards">
      {items.map(i => {
        const isAgency = type === 'agencies'
        const lc = fmtLastContact(i.last_contact_days)
        const sub = isAgency
          ? `${(i as Agency).region}${(i as Agency).city ? ` · ${(i as Agency).city}` : ''}`
          : TYPE_LABELS[(i as Partner).type] +
            ((i as Partner).region ? ` · ${(i as Partner).region}` : '')
        return (
          <button
            type="button"
            key={i.id}
            className={`sam-card ${i.is_active === false ? 'inactive' : ''}`}
            onClick={() => onOpen(i)}
          >
            <div className="sam-card-top">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="sam-card-name">{i.name}</div>
                <div className="sam-card-sub">{sub}</div>
              </div>
              <Reliability value={i.reliability_score} hideNum />
            </div>
            <div className="sam-card-badges">
              <Badges item={i} isAgency={isAgency} />
            </div>
            <div className="sam-card-meta">
              <span className="item">
                <User size={12} />
                {i.contact_name || '—'}
              </span>
              <span className="item">
                <Phone size={12} />
                {i.contact_phone || '—'}
              </span>
            </div>
            <div className="sam-card-foot">
              <Langs langs={i.languages} />
              <span className={`sam-last-contact ${lc.cls}`}>
                <span className="sam-contact-dot" />
                {lc.label}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Empty ───────────────────────────────────────────── */
export function SamEmpty({
  type,
  hasFilters,
  onReset,
}: {
  type: SamType
  hasFilters: boolean
  onReset: () => void
}) {
  const Icon = hasFilters ? SearchX : type === 'agencies' ? Building2 : Briefcase
  return (
    <div className="sam-empty">
      <div className="sam-empty-icon">
        <Icon size={26} strokeWidth={1.5} />
      </div>
      <div className="sam-empty-title">
        {hasFilters
          ? 'Geen resultaten'
          : type === 'agencies'
            ? 'Nog geen makelaars'
            : 'Nog geen partners'}
      </div>
      <p className="sam-empty-text">
        {hasFilters
          ? 'Geen items komen overeen met je filters. Probeer ze te wissen.'
          : 'Voeg je eerste samenwerking toe om te starten.'}
      </p>
      {hasFilters && (
        <button className="sam-btn sam-btn-ghost" onClick={onReset}>
          <RotateCcw size={14} /> Wis filters
        </button>
      )}
    </div>
  )
}
