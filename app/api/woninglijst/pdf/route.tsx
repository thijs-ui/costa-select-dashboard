import { renderToBuffer } from '@react-pdf/renderer'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'

// ─── Brand fonts (lokaal gebundeld, zelfde set als DossierPDF) ────────────
function fontUrl(name: string): string {
  return path.join(process.cwd(), 'public', 'fonts', name)
}

Font.register({
  family: 'Bricolage Grotesque',
  fonts: [
    { src: fontUrl('bricolage-grotesque-400.ttf'), fontWeight: 400 },
    { src: fontUrl('bricolage-grotesque-600.ttf'), fontWeight: 600 },
    { src: fontUrl('bricolage-grotesque-700.ttf'), fontWeight: 700 },
  ],
})
Font.register({
  family: 'Raleway',
  fonts: [
    { src: fontUrl('raleway-400.ttf'), fontWeight: 400 },
    { src: fontUrl('raleway-500.ttf'), fontWeight: 500 },
    { src: fontUrl('raleway-600.ttf'), fontWeight: 600 },
    { src: fontUrl('raleway-700.ttf'), fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback(word => [word])

// ─── Tokens ───────────────────────────────────────────────────────────────
const DEEPSEA = '#004B46'
const DEEPSEA_DEEP = '#072A24'
const SUN = '#F5AF40'
const SUN_DARK = '#C58118'
const SUN_TINT = '#FAEDD0'
const MARBLE = '#FFFAEF'
const MARBLE_DEEP = '#F4EDDD'
const INK = '#1B2A28'
const INK_MUTE = '#8A9794'
const RULE = 'rgba(7,42,36,0.10)'
const RULE_STRONG = 'rgba(7,42,36,0.20)'
const ON_DARK_45 = 'rgba(255,250,239,0.45)'
const ON_DARK_55 = 'rgba(255,250,239,0.55)'
const ON_DARK_92 = 'rgba(255,250,239,0.92)'
const ON_DARK_20 = 'rgba(255,250,239,0.20)'

const PAD_X = 48
const HEADER_H = 56

// ─── Types ────────────────────────────────────────────────────────────────
interface Item {
  title: string
  url: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  thumbnail: string | null
  source: string
  notities: string
  is_favorite: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtEuro(n: number | null | undefined): string {
  if (n == null) return 'Op aanvraag'
  return `€ ${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function uniqueRegions(items: Item[]): string[] {
  const set = new Set<string>()
  items.forEach(i => {
    if (i.location) set.add(i.location.split(/[·,]/)[0].trim())
  })
  return Array.from(set)
}

function pickHero(items: Item[]): Item | null {
  const fav = items.find(i => i.is_favorite && i.thumbnail)
  if (fav) return fav
  const first = items.find(i => i.thumbnail)
  return first ?? null
}

function sortFavoritesFirst(items: Item[]): Item[] {
  // Favorites first, preserve consultant order within groups (stable sort).
  const favs = items.filter(i => i.is_favorite)
  const rest = items.filter(i => !i.is_favorite)
  return [...favs, ...rest]
}

function sourceLabel(item: Item): string {
  const src = (item.source || '').toLowerCase()
  if (src.includes('idealista')) return 'Idealista'
  if (src.includes('costa') || src.includes('costaselect')) return 'Costa Select'
  if (item.url) {
    try {
      const host = new URL(item.url).host.replace(/^www\./, '')
      if (host.includes('idealista')) return 'Idealista'
      if (host.includes('costaselect')) return 'Costa Select'
    } catch { /* ignore */ }
  }
  return 'Handmatig'
}

function getAssetBase64(filename: string): string | undefined {
  try {
    const assetPath = path.join(process.cwd(), 'public', 'brand', filename)
    const buf = fs.readFileSync(assetPath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'svg'
        ? 'image/svg+xml'
        : ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Page shell
  page: {
    backgroundColor: MARBLE,
    fontFamily: 'Raleway',
    color: INK,
  },

  // ── Cover ──
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: DEEPSEA,
    color: MARBLE,
    flexDirection: 'column',
  },
  coverHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 48,
    paddingBottom: 0,
    paddingHorizontal: 56,
  },
  coverBeeldmerk: {
    width: 56,
    height: 56,
    marginTop: -28,
    marginLeft: -16,
  },
  coverBeeldmerkImg: { width: '100%', height: '100%', objectFit: 'contain' },
  coverTag: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  coverTagEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.34,
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 8,
  },
  coverTagRule: {
    width: 36,
    height: 2,
    backgroundColor: SUN,
    marginBottom: 8,
  },
  coverTagMeta: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 500,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: ON_DARK_45,
  },
  coverBody: {
    paddingHorizontal: 56,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    marginBottom: 28,
  },
  coverPre: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.52,
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 18,
  },
  coverTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 56,
    lineHeight: 0.96,
    letterSpacing: -1.57,
    color: MARBLE,
    marginBottom: 4,
    maxWidth: 580,
  },
  coverName: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 56,
    lineHeight: 0.96,
    letterSpacing: -1.57,
    color: SUN,
    marginBottom: 32,
    maxWidth: 580,
  },
  coverNameTerminal: { color: MARBLE },
  coverTick: {
    width: 48,
    height: 2,
    backgroundColor: SUN,
    marginBottom: 24,
  },
  coverMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: ON_DARK_20,
    paddingTop: 22,
  },
  coverMetaItem: {
    flexDirection: 'column',
    paddingRight: 28,
    marginRight: 28,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: ON_DARK_20,
  },
  coverMetaItemLast: {
    borderRightWidth: 0,
    paddingRight: 0,
    marginRight: 0,
  },
  coverMetaL: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 6,
  },
  coverMetaV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 20,
    color: MARBLE,
    letterSpacing: -0.36,
    lineHeight: 1,
  },
  coverMetaVSmall: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 13,
    color: MARBLE,
    letterSpacing: -0.23,
    lineHeight: 1.3,
    maxWidth: 320,
  },
  coverMetaUnit: {
    fontFamily: 'Raleway',
    fontSize: 10,
    fontWeight: 500,
    color: ON_DARK_55,
    marginLeft: 3,
  },
  coverHero: {
    height: 420,
    backgroundColor: DEEPSEA_DEEP,
    flexShrink: 0,
    position: 'relative',
  },
  coverHeroImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coverHeroEmpty: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverHeroEmptyText: {
    fontFamily: 'Raleway',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.42,
    textTransform: 'uppercase',
    color: ON_DARK_45,
  },
  coverHeroTag: {
    position: 'absolute',
    top: 18,
    left: 18,
    backgroundColor: SUN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverHeroTagText: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: DEEPSEA_DEEP,
  },

  // ── Header bar (listing pages) ──
  hbar: {
    height: HEADER_H,
    paddingHorizontal: PAD_X,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: MARBLE,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
    flexShrink: 0,
  },
  hbarLeft: { flexDirection: 'row', alignItems: 'center' },
  hbarWordmark: { height: 11, marginRight: 14 },
  hbarWordmarkImg: { height: 11, objectFit: 'contain' },
  hbarRule: {
    width: 1,
    height: 18,
    backgroundColor: RULE_STRONG,
    marginRight: 14,
  },
  hbarMeta: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  hbarMetaName: { color: DEEPSEA },
  hbarRight: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },

  // ── Listing body ──
  body: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: 28,
    paddingBottom: 44,
    flexDirection: 'column',
  },

  // Section title
  stitle: { marginBottom: 22, flexDirection: 'column' },
  stitleEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stitleEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.52,
    textTransform: 'uppercase',
    color: DEEPSEA,
  },
  stitleEyebrowRule: {
    flex: 1,
    height: 1,
    backgroundColor: RULE,
    marginHorizontal: 6,
  },
  stitleEyebrowCounter: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  sunTick: {
    width: 32,
    height: 2,
    backgroundColor: SUN,
    marginBottom: 10,
  },
  stitleH2: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 24,
    lineHeight: 1.05,
    letterSpacing: -0.53,
    color: DEEPSEA,
    maxWidth: 600,
  },
  stitleTerminal: { color: SUN },

  // Card stack
  cards: {
    flex: 1,
    flexDirection: 'column',
  },

  // Card — base
  card: {
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE,
    borderRadius: 2,
    overflow: 'hidden',
    flex: 1,
  },
  // Favorite outer wrapper (3px sun-tint ring around the card)
  favOuter: {
    backgroundColor: SUN_TINT,
    padding: 3,
    borderRadius: 2,
    flex: 1,
  },
  cardFav: {
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN,
    borderRadius: 2,
    overflow: 'hidden',
    flex: 1,
  },

  // Thumb
  cardThumb: {
    width: 320,
    flexShrink: 0,
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
  },
  cardThumbCompact: { width: 240 },
  cardThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardThumbEmpty: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MARBLE_DEEP,
  },
  cardThumbEmptyText: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },

  // Badges/pills on thumb
  favBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: SUN,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 11,
    paddingRight: 12,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favBadgeStar: {
    fontSize: 10,
    fontWeight: 700,
    color: DEEPSEA_DEEP,
    marginRight: 7,
  },
  favBadgeText: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: DEEPSEA_DEEP,
  },
  cardIdx: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(7,42,36,0.78)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  cardIdxText: {
    fontFamily: 'Bricolage Grotesque',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.44,
    color: MARBLE,
  },
  cardSource: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: ON_DARK_92,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  cardSourceText: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.44,
    textTransform: 'uppercase',
    color: DEEPSEA,
  },

  // Card info
  cardInfo: {
    flex: 1,
    paddingTop: 24,
    paddingRight: 28,
    paddingBottom: 22,
    paddingLeft: 28,
    flexDirection: 'column',
  },
  cardInfoFav: {
    paddingLeft: 32,
    paddingRight: 32,
  },
  cardInfoCompact: {
    paddingTop: 18,
    paddingRight: 22,
    paddingBottom: 18,
    paddingLeft: 22,
  },
  cardInfoSolo: {
    paddingTop: 32,
    paddingRight: 36,
    paddingBottom: 32,
    paddingLeft: 36,
  },

  cardLoc: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 2.04,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 22,
    lineHeight: 1.08,
    letterSpacing: -0.4,
    color: DEEPSEA,
    marginBottom: 4,
  },
  cardTitleFav: { fontSize: 24 },
  cardTitleSolo: { fontSize: 34, lineHeight: 1.02, letterSpacing: -0.82 },
  cardTitleCompact: { fontSize: 18 },
  cardTitleCompactFav: { fontSize: 20 },
  cardTitleTerminal: { color: SUN },

  // Specs row
  cardSpecs: {
    flexDirection: 'row',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE,
  },
  cardSpec: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: RULE,
  },
  cardSpecFirst: { paddingLeft: 0 },
  cardSpecLast: { borderRightWidth: 0, paddingRight: 0 },
  cardSpecPrice: {
    flex: 1.4,
    borderRightColor: RULE_STRONG,
  },
  cardSpecL: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.65,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 4,
  },
  cardSpecLPrice: { color: SUN_DARK },
  cardSpecV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 15,
    color: DEEPSEA,
    letterSpacing: -0.27,
    lineHeight: 1,
  },
  cardSpecVPrice: {
    fontSize: 19,
    color: SUN_DARK,
  },
  cardSpecVPriceFav: { fontSize: 21 },
  cardSpecVSolo: { fontSize: 17 },
  cardSpecVPriceSolo: { fontSize: 24 },
  cardSpecVCompact: { fontSize: 12 },
  cardSpecVPriceCompact: { fontSize: 16 },
  cardSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 500,
    color: INK_MUTE,
    marginLeft: 2,
  },

  // Note callout (favorites only)
  cardNote: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: SUN_TINT,
    borderLeftWidth: 2,
    borderLeftStyle: 'solid',
    borderLeftColor: SUN,
    flexDirection: 'column',
  },
  cardNoteCompact: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardNoteLbl: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.92,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 6,
  },
  cardNoteText: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 400,
    fontSize: 11,
    lineHeight: 1.5,
    letterSpacing: -0.05,
    color: INK,
    fontStyle: 'italic',
  },
  cardNoteTextCompact: { fontSize: 10.5 },

  // Solo card overrides
  cardSolo: {
    flexDirection: 'column',
    flex: 1,
  },
  cardSoloThumb: {
    width: '100%',
    height: 420,
    flexShrink: 0,
  },
})

// ─── Components ───────────────────────────────────────────────────────────
function HeaderBar({
  klantNaam,
  date,
  wordmarkSrc,
}: {
  klantNaam: string
  date: string
  wordmarkSrc?: string
}) {
  return (
    <View style={s.hbar}>
      <View style={s.hbarLeft}>
        {wordmarkSrc ? (
          <View style={s.hbarWordmark}>
            <Image src={wordmarkSrc} style={s.hbarWordmarkImg} />
          </View>
        ) : (
          <Text style={[s.hbarMeta, { color: DEEPSEA, marginRight: 14 }]}>
            COSTA SELECT
          </Text>
        )}
        <View style={s.hbarRule} />
        <Text style={s.hbarMeta}>
          Woningoverzicht ·{' '}
          <Text style={s.hbarMetaName}>{klantNaam}</Text>
        </Text>
      </View>
      <Text style={s.hbarRight}>{date}</Text>
    </View>
  )
}

function CardSpec({
  label,
  value,
  unit,
  variant,
  isPrice,
  isFirst,
  isLast,
}: {
  label: string
  value: string
  unit?: string
  variant: 'regular' | 'compact' | 'solo'
  isPrice?: boolean
  isFirst?: boolean
  isLast?: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valueStyles: any[] = [s.cardSpecV]
  if (variant === 'compact') valueStyles.push(s.cardSpecVCompact)
  if (variant === 'solo') valueStyles.push(s.cardSpecVSolo)
  if (isPrice) {
    valueStyles.push(s.cardSpecVPrice)
    if (variant === 'compact') valueStyles.push(s.cardSpecVPriceCompact)
    if (variant === 'solo') valueStyles.push(s.cardSpecVPriceSolo)
  }
  // Inline unit (geen nested <Text>) — voorkomt rare wrapping/spacing artifacts.
  const valueText = unit ? `${value} ${unit}` : value
  return (
    <View
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[s.cardSpec, isPrice ? s.cardSpecPrice : {}, isFirst ? s.cardSpecFirst : {}, isLast ? s.cardSpecLast : {}] as any}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Text style={[s.cardSpecL, isPrice ? s.cardSpecLPrice : {}] as any}>
        {label}
      </Text>
      <Text style={valueStyles}>{valueText}</Text>
    </View>
  )
}

function ListingCard({
  item,
  index,
  variant,
}: {
  item: Item
  index: number
  variant: 'regular' | 'compact' | 'solo'
}) {
  const isFav = item.is_favorite || variant === 'solo'
  const isSolo = variant === 'solo'
  const isCompact = variant === 'compact'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleStyles: any[] = [s.cardTitle]
  if (isFav && !isCompact) titleStyles.push(s.cardTitleFav)
  if (isSolo) titleStyles.push(s.cardTitleSolo)
  if (isCompact) titleStyles.push(isFav ? s.cardTitleCompactFav : s.cardTitleCompact)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoStyles: any[] = [s.cardInfo]
  if (isFav && !isSolo && !isCompact) infoStyles.push(s.cardInfoFav)
  if (isCompact) infoStyles.push(s.cardInfoCompact)
  if (isSolo) infoStyles.push(s.cardInfoSolo)

  const cardInner = (
    /* eslint-disable @typescript-eslint/no-explicit-any */
    <View style={[isFav ? s.cardFav : s.card, isSolo ? s.cardSolo : {}] as any}>
      <View
        style={[s.cardThumb, isCompact ? s.cardThumbCompact : {}, isSolo ? s.cardSoloThumb : {}] as any}
      >
        {item.thumbnail ? (
          <Image src={item.thumbnail} style={s.cardThumbImg} />
        ) : (
          <View style={s.cardThumbEmpty}>
            <Text style={s.cardThumbEmptyText}>Geen foto beschikbaar</Text>
          </View>
        )}
        {isFav ? (
          <View style={s.favBadge}>
            <Text style={s.favBadgeStar}>★</Text>
            <Text style={s.favBadgeText}>Favoriet</Text>
          </View>
        ) : (
          <View style={s.cardIdx}>
            <Text style={s.cardIdxText}>
              {String(index).padStart(2, '0')}
            </Text>
          </View>
        )}
        {item.thumbnail && (
          <View style={s.cardSource}>
            <Text style={s.cardSourceText}>{sourceLabel(item)}</Text>
          </View>
        )}
      </View>

      <View style={infoStyles}>
        {item.location ? (
          <Text style={s.cardLoc}>{item.location}</Text>
        ) : null}
        <Text style={titleStyles}>
          {(item.title || 'Woning zonder titel') + '.'}
        </Text>

        <View style={s.cardSpecs}>
          <CardSpec
            label="Vraagprijs"
            value={fmtEuro(item.price)}
            variant={variant}
            isPrice
            isFirst
          />
          <CardSpec
            label="Woonopp."
            value={item.size_m2 != null ? String(item.size_m2) : '—'}
            unit={item.size_m2 != null ? 'm²' : undefined}
            variant={variant}
          />
          <CardSpec
            label="Slaapk."
            value={item.bedrooms != null ? String(item.bedrooms) : '—'}
            variant={variant}
          />
          <CardSpec
            label="Badk."
            value={item.bathrooms != null ? String(item.bathrooms) : '—'}
            variant={variant}
            isLast
          />
        </View>

        {isFav && item.notities ? (
          <View style={[s.cardNote, isCompact ? s.cardNoteCompact : {}] as any}>
            <Text style={s.cardNoteLbl}>Notitie consultant</Text>
            <Text style={[s.cardNoteText, isCompact ? s.cardNoteTextCompact : {}] as any}>
              {item.notities}
            </Text>
          </View>
        ) : null}
        {/* eslint-enable @typescript-eslint/no-explicit-any */}
      </View>
    </View>
  )

  // Favorite + solo: 3px sun-tint ring around card via outer wrapper
  if (isFav) {
    return (
      <View
        style={[
          s.favOuter,
          { marginTop: 4, marginBottom: 4, marginLeft: 4, marginRight: 4 },
        ]}
      >
        {cardInner}
      </View>
    )
  }
  return cardInner
}

function CoverPage({
  klantNaam,
  date,
  items,
  beeldmerkSrc,
}: {
  klantNaam: string
  date: string
  items: Item[]
  beeldmerkSrc?: string
}) {
  const hero = pickHero(items)
  const favCount = items.filter(i => i.is_favorite).length
  const regions = uniqueRegions(items)
  const regionsText = regions.slice(0, 6).join(' · ')

  return (
    <Page size="A4" style={s.page}>
      <View style={s.cover}>
        <View style={s.coverHead}>
          <View style={s.coverBeeldmerk}>
            {beeldmerkSrc ? (
              <Image src={beeldmerkSrc} style={s.coverBeeldmerkImg} />
            ) : null}
          </View>
          <View style={s.coverTag}>
            <Text style={s.coverTagEyebrow}>Woningoverzicht</Text>
            <View style={s.coverTagRule} />
            <Text style={s.coverTagMeta}>{date}</Text>
          </View>
        </View>

        <View style={s.coverBody}>
          <Text style={s.coverPre}>Een persoonlijke selectie</Text>
          <Text style={s.coverTitle}>Voor</Text>
          <Text style={s.coverName}>{klantNaam + '.'}</Text>
          <View style={s.coverTick} />

          <View style={s.coverMeta}>
            <View style={s.coverMetaItem}>
              <Text style={s.coverMetaL}>Woningen</Text>
              <Text style={s.coverMetaV}>
                {String(items.length).padStart(2, '0')}
              </Text>
            </View>
            {favCount > 0 && (
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaL}>Favorieten</Text>
                <Text style={s.coverMetaV}>{`${favCount} ★`}</Text>
              </View>
            )}
            {regionsText ? (
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaL}>Regio&apos;s</Text>
                <Text style={s.coverMetaVSmall}>{regionsText}</Text>
              </View>
            ) : null}
            <View style={[s.coverMetaItem, s.coverMetaItemLast]}>
              <Text style={s.coverMetaL}>Datum</Text>
              <Text style={s.coverMetaVSmall}>{date}</Text>
            </View>
          </View>
        </View>

        <View style={s.coverHero}>
          {hero?.thumbnail ? (
            <>
              <Image src={hero.thumbnail} style={s.coverHeroImg} />
              {hero.is_favorite && (
                <View style={s.coverHeroTag}>
                  <Text style={s.coverHeroTagText}>
                    ★ Onze topkeuze · {hero.title || 'Woning'}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={s.coverHeroEmpty}>
              <Text style={s.coverHeroEmptyText}>Hero foto</Text>
            </View>
          )}
        </View>
      </View>
    </Page>
  )
}

function SectionTitle({
  eyebrow,
  counter,
  title,
}: {
  eyebrow: string
  counter: string
  title: string
}) {
  return (
    <View style={s.stitle}>
      <View style={s.stitleEyebrowRow}>
        <Text style={s.stitleEyebrow}>{eyebrow}</Text>
        <View style={s.stitleEyebrowRule} />
        <Text style={s.stitleEyebrowCounter}>{counter}</Text>
      </View>
      <View style={s.sunTick} />
      <Text style={s.stitleH2}>{title + '.'}</Text>
    </View>
  )
}

function ListingPage({
  klantNaam,
  date,
  items,
  startIndex,
  pageNum,
  totalPages,
  wordmarkSrc,
}: {
  klantNaam: string
  date: string
  items: Item[]
  startIndex: number
  pageNum: number
  totalPages: number
  wordmarkSrc?: string
}) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderBar klantNaam={klantNaam} date={date} wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle
          eyebrow="De selectie"
          counter={`Pagina ${String(pageNum).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
          title="Geselecteerde woningen"
        />
        <View style={s.cards}>
          {items.map((item, i) => (
            <ListingCard
              key={i}
              item={item}
              index={startIndex + i + 1}
              variant="regular"
            />
          ))}
        </View>
      </View>
    </Page>
  )
}

function SoloPage({
  klantNaam,
  date,
  item,
  wordmarkSrc,
}: {
  klantNaam: string
  date: string
  item: Item
  wordmarkSrc?: string
}) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderBar klantNaam={klantNaam} date={date} wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle
          eyebrow="De selectie"
          counter="01 / 01 · Solo"
          title="Eén woning, zorgvuldig gekozen"
        />
        <ListingCard item={item} index={1} variant="solo" />
      </View>
    </Page>
  )
}

function CompactPage({
  klantNaam,
  date,
  items,
  wordmarkSrc,
}: {
  klantNaam: string
  date: string
  items: Item[]
  wordmarkSrc?: string
}) {
  return (
    <Page size="A4" style={s.page}>
      <HeaderBar klantNaam={klantNaam} date={date} wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle
          eyebrow="De selectie"
          counter="01 / 01 · 3 woningen"
          title="Drie woningen op één pagina"
        />
        <View style={s.cards}>
          {items.map((item, i) => (
            <ListingCard key={i} item={item} index={i + 1} variant="compact" />
          ))}
        </View>
      </View>
    </Page>
  )
}

// ─── PDF document ─────────────────────────────────────────────────────────
function ShortlistPDF({
  klantNaam,
  items,
  beeldmerkSrc,
  wordmarkSrc,
}: {
  klantNaam: string
  items: Item[]
  beeldmerkSrc?: string
  wordmarkSrc?: string
}) {
  const date = fmtDate(new Date())
  const sorted = sortFavoritesFirst(items)

  // Decide page mode
  if (sorted.length === 1) {
    return (
      <Document>
        <CoverPage
          klantNaam={klantNaam}
          date={date}
          items={sorted.map(i => ({ ...i, is_favorite: true }))}
          beeldmerkSrc={beeldmerkSrc}
        />
        <SoloPage
          klantNaam={klantNaam}
          date={date}
          item={{ ...sorted[0], is_favorite: true }}
          wordmarkSrc={wordmarkSrc}
        />
      </Document>
    )
  }

  if (sorted.length === 3) {
    return (
      <Document>
        <CoverPage
          klantNaam={klantNaam}
          date={date}
          items={sorted}
          beeldmerkSrc={beeldmerkSrc}
        />
        <CompactPage
          klantNaam={klantNaam}
          date={date}
          items={sorted}
          wordmarkSrc={wordmarkSrc}
        />
      </Document>
    )
  }

  // Default: paginate 2 cards per page
  const itemsPerPage = 2
  const pages: Item[][] = []
  for (let i = 0; i < sorted.length; i += itemsPerPage) {
    pages.push(sorted.slice(i, i + itemsPerPage))
  }
  const totalPages = pages.length

  return (
    <Document>
      <CoverPage
        klantNaam={klantNaam}
        date={date}
        items={sorted}
        beeldmerkSrc={beeldmerkSrc}
      />
      {pages.map((pageItems, pageIdx) => (
        <ListingPage
          key={pageIdx}
          klantNaam={klantNaam}
          date={date}
          items={pageItems}
          startIndex={pageIdx * itemsPerPage}
          pageNum={pageIdx + 1}
          totalPages={totalPages}
          wordmarkSrc={wordmarkSrc}
        />
      ))}
    </Document>
  )
}

// ─── Route ────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { klant_naam, items } = await request.json()
  const beeldmerkSrc = getAssetBase64('beeldmerk-sun.png')
  const wordmarkSrc = getAssetBase64('wordmark-deepsea-v2.svg')

  const buffer = await renderToBuffer(
    <ShortlistPDF
      klantNaam={klant_naam || 'Klant'}
      items={(items || []) as Item[]}
      beeldmerkSrc={beeldmerkSrc}
      wordmarkSrc={wordmarkSrc}
    />
  )

  const filename = `costa-select-woningoverzicht-${(klant_naam || 'klant').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
