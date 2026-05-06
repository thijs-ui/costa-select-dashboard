// ============================================================================
// components/nieuwbouw-detail.tsx
//
// De "card" — sticky overlay-sidebar over de kaart met:
// hero gallery, titel, pills, quick stats, units-lijst, ontwikkelaar,
// omschrijving, omgeving (afstanden), footer acties.
// ============================================================================
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X, MapPin, Sparkles, Waves, Car, Home, Bed, BedDouble, Layers2, Building,
  Phone, FileText, Compass, Flag, Sun, ShoppingCart, GraduationCap, Plane,
  Clock4, ExternalLink, FileDown, RefreshCw, Image as ImageIcon, ChevronDown,
  Utensils, Wine, Stethoscope, Pill as PillIcon, Train,
} from 'lucide-react'
import type { Listing, Unit, Amenity } from '@/components/nieuwbouw-types'

interface Props {
  listing: Listing
  onClose: () => void
  onGenerateDossier: (listing: Listing) => void
}

export default function NieuwbouwDetail({ listing, onClose, onGenerateDossier }: Props) {
  const images = (listing.images ?? []).map(i => i.url).filter(Boolean)
  const hero = images[0] ?? listing.main_image_url ?? ''
  const [activeImg, setActiveImg] = useState(hero)
  const [expanded, setExpanded] = useState(false)

  // Reset hero foto + collapsed-state wanneer de gebruiker een andere pin
  // selecteert. useState's initial value pakt alleen bij eerste mount, dus
  // anders blijft de foto van de oude listing staan terwijl de rest update.
  useEffect(() => {
    setActiveImg(hero)
    setExpanded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id])

  const minPrice = useMemo(() => {
    const vals = (listing.units ?? []).map(u => u.price ?? Infinity).concat([listing.price ?? Infinity])
    const m = Math.min(...vals)
    return Number.isFinite(m) ? m : null
  }, [listing])

  return (
    <div style={{
      position: 'absolute', top: 14, right: 14, bottom: 14, width: 420,
      background: '#FFFAEF', border: '1px solid rgba(0,75,70,0.14)', borderRadius: 14,
      boxShadow: '0 18px 48px rgba(0,75,70,.18)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 3,
    }}>
      <button
        onClick={onClose}
        aria-label="Sluiten"
        style={{
          position: 'absolute', top: 10, right: 10, width: 28, height: 28,
          background: 'rgba(255,250,239,.92)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(0,75,70,.14)', borderRadius: 8, cursor: 'pointer',
          color: '#004B46', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4,
        }}
      >
        <X size={14} />
      </button>

      <Gallery images={images} active={activeImg} setActive={setActiveImg} minPrice={minPrice} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Head listing={listing} />
        <QuickStats listing={listing} />
        <UnitsSection units={listing.units ?? []} />
        <Developer listing={listing} />
        <Description text={listing.description} expanded={expanded} setExpanded={setExpanded} />
        <Amenities amenities={listing.amenities ?? []} />
        <MetaRow listing={listing} />
      </div>

      <Footer listing={listing} onGenerateDossier={onGenerateDossier} />
    </div>
  )
}

// --- Gallery ----------------------------------------------------------------
function Gallery({
  images, active, setActive, minPrice,
}: { images: string[]; active: string; setActive: (s: string) => void; minPrice: number | null }) {
  const idx = Math.max(0, images.indexOf(active))
  return (
    <div style={{ position: 'relative', height: 208, background: '#004B46', flexShrink: 0 }}>
      {active && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url('${active}')`, backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      )}
      {minPrice != null && (
        <div style={{
          position: 'absolute', left: 12, top: 12,
          background: 'rgba(255,250,239,.97)', backdropFilter: 'blur(6px)',
          padding: '6px 11px', borderRadius: 999,
          fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700, fontSize: 15, color: '#004B46',
          border: '1px solid rgba(0,75,70,.12)',
        }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: '#7A8C8B', fontWeight: 500, marginRight: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            vanaf
          </span>
          {formatEuro(minPrice)}
        </div>
      )}
      <div style={{
        position: 'absolute', right: 10, top: 10,
        background: 'rgba(0,0,0,.55)', color: '#fff', padding: '3px 8px', borderRadius: 999,
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <ImageIcon size={11} />
        {idx + 1} / {images.length}
      </div>
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, display: 'flex', gap: 5, overflowX: 'auto' }}>
        {images.slice(0, 8).map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(img)}
            style={{
              width: 42, height: 32, borderRadius: 5,
              backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center',
              border: `1.5px solid ${active === img ? '#fff' : 'rgba(255,250,239,.7)'}`,
              opacity: active === img ? 1 : .65, cursor: 'pointer', flexShrink: 0, padding: 0,
              boxShadow: active === img ? '0 2px 8px rgba(0,0,0,.3)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// --- Head -------------------------------------------------------------------
function Head({ listing }: { listing: Listing }) {
  const addr = [listing.address, listing.municipality, listing.province].filter(Boolean).join(' · ')
  const typeLabel = humanizeType(listing.property_type)
  return (
    <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(0,75,70,.08)' }}>
      <h2 style={{
        fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700, fontSize: 22,
        margin: '0 0 3px', lineHeight: 1.15, letterSpacing: '-.005em', color: '#004B46',
      }}>
        {listing.title ?? listing.address ?? 'Naamloos project'}
      </h2>
      <div style={{ fontSize: 12, color: '#7A8C8B', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <MapPin size={12} />{addr}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {typeLabel && <Pill kind="type"><Building size={11} />{typeLabel}</Pill>}
        {listing.is_new_development && (
          <Pill kind="new"><Sparkles size={11} />Nieuwbouw</Pill>
        )}
        {listing.status && <Pill kind="dev">{statusLabel(listing.status)}</Pill>}
        {listing.has_swimming_pool && <Pill kind="feat"><Waves size={11} />Zwembad</Pill>}
        {listing.has_parking && <Pill kind="feat"><Car size={11} />Parking</Pill>}
      </div>
    </div>
  )
}

// DB-types (Idealista mapping in scraper) → leesbare NL-labels.
// Mapping spiegelt mapPropertyType in woningbot/idealista-direct.js.
function humanizeType(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw.toLowerCase()
  if (t === 'flat' || t === 'apartment')                          return 'Appartement'
  if (t === 'penthouse')                                          return 'Penthouse'
  if (t === 'duplex')                                             return 'Duplex'
  if (t === 'chalet' || t === 'villa' || t === 'detachedhouse')   return 'Villa'
  if (t === 'townhouse' || t === 'semidetachedhouse'
      || t === 'terracedhouse')                                   return 'Townhouse'
  if (t === 'countryhouse' || t === 'finca')                      return 'Finca'
  if (t === 'studio')                                             return 'Studio'
  if (t === 'loft')                                               return 'Loft'
  if (t === 'bungalow')                                           return 'Bungalow'
  // Onbekende type — geef ruwe waarde terug met capitalisatie.
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

function Pill({ kind, children }: { kind: 'new' | 'dev' | 'feat' | 'type'; children: React.ReactNode }) {
  const styles: Record<typeof kind, React.CSSProperties> = {
    new:  { background: '#FEF6E4', color: '#8a5a10', border: '1px solid #FBD78A' },
    dev:  { background: 'rgba(0,75,70,.08)', color: '#004B46' },
    feat: { background: '#E6F0EF', color: '#004B46' },
    type: { background: '#004B46', color: '#FFFAEF' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, ...styles[kind],
    }}>
      {children}
    </span>
  )
}

// --- Quick stats ------------------------------------------------------------
function QuickStats({ listing }: { listing: Listing }) {
  const units = listing.units ?? []
  const typologies = [...new Set(units.map(u => u.typology).filter(Boolean))] as string[]
  const avgPm2 = listing.price_per_m2
    ?? (units.length
        ? units.reduce((a, u) => a + (u.price && u.size_m2 ? u.price / u.size_m2 : 0), 0) / (units.filter(u => u.price && u.size_m2).length || 1)
        : null)
  const typeLabel = humanizeType(listing.property_type)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10,
      padding: '14px 18px', borderBottom: '1px solid rgba(0,75,70,.08)',
    }}>
      <Stat l="Type" v={typeLabel ?? '—'} s={typologies.length ? typologies.slice(0, 2).join(' · ').toLowerCase() : ''} />
      <Stat l="Units" v={String(units.length || '—')} s={units.length ? 'beschikbaar' : ''} />
      <Stat l="Typologieën" v={String(typologies.length || '—')} s={typologies.slice(0, 3).join(' · ').toLowerCase()} />
      <Stat l="€/m²" v={avgPm2 ? Math.round(avgPm2).toLocaleString('nl-NL') : '—'} s="gemiddeld" />
    </div>
  )
}

function Stat({ l, v, s }: { l: string; v: string; s?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#7A8C8B', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>
        {l}
      </div>
      <div style={{
        fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700, fontSize: 14,
        color: '#004B46', lineHeight: 1.1, marginTop: 2,
      }}>{v}</div>
      {s && <div style={{ fontSize: 10, color: '#7A8C8B' }}>{s}</div>}
    </div>
  )
}

// --- Units ------------------------------------------------------------------
function UnitsSection({ units }: { units: Unit[] }) {
  if (units.length === 0) return null
  // Aggregate by typology + rooms so user sees "flat · 3 slk" with count
  const grouped = new Map<string, Unit[]>()
  units.forEach(u => {
    const key = `${u.typology ?? 'overig'}|${u.rooms ?? '?'}`
    const arr = grouped.get(key) ?? []
    arr.push(u)
    grouped.set(key, arr)
  })
  return (
    <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(0,75,70,.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <SecLabel icon={<Home size={12} />}>Beschikbare units</SecLabel>
        <div style={{ fontSize: 11, color: '#7A8C8B' }}>
          {units.length} units · {grouped.size} typologieën
        </div>
      </div>
      <div>
        {[...grouped.entries()].map(([key, us], i) => <UnitRow key={key} group={us} first={i === 0} />)}
      </div>
    </div>
  )
}

function UnitRow({ group, first }: { group: Unit[]; first: boolean }) {
  const u = group[0]
  const Icon = typologyIcon(u.typology)
  const sizes = group.map(x => x.size_m2).filter((n): n is number => n != null)
  const sizeLbl = sizes.length
    ? (sizes.length === 1 ? `${sizes[0]} m²` : `${Math.min(...sizes)}–${Math.max(...sizes)} m²`)
    : null
  const minPrice = Math.min(...group.map(x => x.price ?? Infinity))
  const priceLbl = Number.isFinite(minPrice)
    ? (group.length > 1 ? `vanaf ${formatEuro(minPrice)}` : formatEuro(minPrice))
    : '—'
  const bdk = u.has_terrace ? '+ terras' : ''
  const meta = [
    u.rooms != null ? `${(u.rooms ?? 0) + 1} pers` : null,
    sizeLbl,
    bdk || null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10,
      padding: '10px 18px', margin: '0 -18px',
      borderTop: first ? 'none' : '1px solid rgba(0,75,70,.06)',
      alignItems: 'center', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'rgba(0,75,70,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#004B46', flexShrink: 0,
        }}>
          <Icon size={13} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#004B46' }}>
            {typologyLabel(u.typology)} · {u.rooms ?? '?'} slk
            {group.length > 1 && (
              <span style={{
                display: 'inline-block', background: '#E6F0EF', color: '#004B46',
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, marginLeft: 8,
              }}>{group.length}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#7A8C8B', marginTop: 2 }}>{meta}</div>
        </div>
      </div>
      <div />
      <div style={{
        fontFamily: "'Bricolage Grotesque', serif", fontWeight: 700, fontSize: 13,
        color: '#004B46', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
      }}>
        {priceLbl}
      </div>
    </div>
  )
}

// --- Developer --------------------------------------------------------------
function Developer({ listing }: { listing: Listing }) {
  if (!listing.agency_name) return null
  const initials = listing.agency_name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 18px', borderBottom: '1px solid rgba(0,75,70,.08)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 8, background: '#fff',
        border: '1px solid rgba(0,75,70,.12)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: "'Bricolage Grotesque', serif",
        fontWeight: 700, color: '#004B46', fontSize: 15, flexShrink: 0,
      }}>
        {listing.agent_logo_url
          ? <img src={listing.agent_logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
          : initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#7A8C8B', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600, marginBottom: 2 }}>
          Ontwikkelaar
        </div>
        <div style={{ fontSize: 13, color: '#004B46', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.agency_name}
        </div>
      </div>
      {listing.contact_phone && (
        <a href={`tel:${listing.contact_phone}`}
           style={{ fontSize: 12, color: '#0EAE96', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Phone size={12} />{listing.contact_phone}
        </a>
      )}
    </div>
  )
}

// --- Description ------------------------------------------------------------
function Description({ text, expanded, setExpanded }: {
  text: string | null; expanded: boolean; setExpanded: (b: boolean) => void
}) {
  if (!text) return null
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,75,70,.08)' }}>
      <SecLabel icon={<FileText size={12} />}>Omschrijving</SecLabel>
      <p style={{
        margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.55, color: '#4a5e5c',
        maxHeight: expanded ? 'none' : 66, overflow: 'hidden', position: 'relative',
      }}>
        {text}
        {!expanded && (
          <span style={{
            position: 'absolute', inset: 'auto 0 0 0', height: 24,
            background: 'linear-gradient(180deg, rgba(255,250,239,0), #FFFAEF)',
          }} />
        )}
      </p>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: 6, fontSize: 11, color: '#0EAE96', fontWeight: 600,
          cursor: 'pointer', background: 'none', border: 'none', padding: 0,
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
      >
        {expanded ? 'Minder tonen' : 'Meer lezen'}
        <ChevronDown size={11} style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
    </div>
  )
}

// --- Amenities --------------------------------------------------------------
function Amenities({ amenities }: { amenities: Amenity[] }) {
  if (amenities.length === 0) return null
  return (
    <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(0,75,70,.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <SecLabel icon={<Compass size={12} />}>Omgeving</SecLabel>
        <div style={{ fontSize: 11, color: '#7A8C8B' }}>binnen 10 min</div>
      </div>
      <div>
        {amenities.map((a, i) => <AmenityRow key={i} a={a} first={i === 0} />)}
      </div>
    </div>
  )
}

function AmenityRow({ a, first }: { a: Amenity; first: boolean }) {
  const { Icon, tone } = amenityMeta(a.kind)
  const bg = tone === 'sun' ? 'rgba(245,175,64,.15)' : 'rgba(14,174,150,.12)'
  const fg = tone === 'sun' ? '#8a5a10' : '#0A6B5E'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10,
      padding: '9px 0', borderTop: first ? 'none' : '1px solid rgba(0,75,70,.06)', alignItems: 'center',
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={12} />
      </div>
      <div style={{ fontSize: 12.5, color: '#004B46', fontWeight: 500 }}>{a.name}</div>
      <div style={{ fontSize: 12, color: '#7A8C8B', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
        {a.distance_km.toFixed(1).replace('.', ',')} km
      </div>
      <div style={{
        fontSize: 11, color: '#0A6B5E', fontWeight: 600,
        fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
      }}>
        <Clock4 size={10} />{a.travel_min} min
      </div>
    </div>
  )
}

// --- Meta row ---------------------------------------------------------------
function MetaRow({ listing }: { listing: Listing }) {
  return (
    <div style={{
      padding: '10px 18px 16px', fontSize: 10, color: '#7A8C8B',
      display: 'flex', justifyContent: 'space-between', gap: 8, letterSpacing: '.04em',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <RefreshCw size={10} /> Gescraped {new Date(listing.last_seen_at).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span>property_code <b style={{ color: '#004B46' }}>{listing.property_code}</b></span>
    </div>
  )
}

// --- Footer -----------------------------------------------------------------
function Footer({
  listing, onGenerateDossier,
}: { listing: Listing; onGenerateDossier: (l: Listing) => void }) {
  return (
    <div style={{
      padding: '12px 16px', borderTop: '1px solid rgba(0,75,70,.12)',
      background: '#fff', display: 'flex', gap: 8, flexShrink: 0,
    }}>
      <a
        href={listing.url ?? '#'}
        target="_blank" rel="noreferrer"
        style={{
          flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: 'inherit', textDecoration: 'none',
          background: '#fff', border: '1px solid rgba(0,75,70,.18)', color: '#004B46',
        }}
      >
        <ExternalLink size={14} />Bekijk listing
      </a>
      <button
        onClick={() => onGenerateDossier(listing)}
        style={{
          flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontFamily: 'inherit', border: 'none', background: '#004B46', color: '#fff',
        }}
      >
        <FileDown size={14} />Genereer presentatie
      </button>
    </div>
  )
}

// --- Helpers ----------------------------------------------------------------
function SecLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
      color: '#7A8C8B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color: '#0EAE96' }}>{icon}</span>
      {children}
    </div>
  )
}

function formatEuro(n: number) {
  return '€\u00A0' + Math.round(n).toLocaleString('nl-NL')
}

function typologyLabel(t: string | null) {
  if (!t) return 'Woning'
  const m: Record<string, string> = {
    flat: 'Flat', penthouse: 'Penthouse', duplex: 'Duplex',
    detachedHouse: 'Villa', semidetachedHouse: 'Halfvrijstaand',
    townhouse: 'Townhouse',
  }
  return m[t] ?? t[0].toUpperCase() + t.slice(1)
}

function typologyIcon(t: string | null) {
  switch (t) {
    case 'penthouse': return Building
    case 'duplex':    return Layers2
    case 'flat':      return BedDouble
    default:          return Bed
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    newDevelopment: 'In aanbouw', good: 'Opgeleverd', renew: 'Gerenoveerd',
  }
  return m[s] ?? s
}

function amenityMeta(kind: string): { Icon: React.ComponentType<{ size?: number }>; tone: 'sea' | 'sun' } {
  switch (kind) {
    case 'beach':      return { Icon: Waves, tone: 'sea' }
    case 'golf':       return { Icon: Flag, tone: 'sun' }
    case 'airport':    return { Icon: Plane, tone: 'sea' }
    case 'supermarket':return { Icon: ShoppingCart, tone: 'sea' }
    case 'school':     return { Icon: GraduationCap, tone: 'sun' }
    case 'hospital':   return { Icon: Stethoscope, tone: 'sun' }
    case 'pharmacy':   return { Icon: PillIcon, tone: 'sun' }
    case 'restaurant': return { Icon: Utensils, tone: 'sea' }
    case 'bar':        return { Icon: Wine, tone: 'sun' }
    case 'train':      return { Icon: Train, tone: 'sea' }
    case 'sun':        return { Icon: Sun, tone: 'sea' }
    default:           return { Icon: MapPin, tone: 'sea' }
  }
}
