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

// ─── Brand fonts ──────────────────────────────────────────────────────────
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
// Borders: solide hex (pre-blended op marble) i.p.v. rgba — anders rendert
// @react-pdf de border-line als coral fallback.
const RULE = '#E5E0D2'
const RULE_STRONG = '#CCC4B1'
// Text-on-deepsea transparenties — rgba werkt voor text colors in @react-pdf.
const ON_DARK_20 = 'rgba(255,250,239,0.20)'
const ON_DARK_45 = 'rgba(255,250,239,0.45)'
const ON_DARK_55 = 'rgba(255,250,239,0.55)'
const ON_DARK_70 = 'rgba(255,250,239,0.70)'

// Design handoff specifies px op 96dpi. @react-pdf rendert in pt op 72dpi.
// Conversie: pt = px × 0.75. Page A4 landscape = 842×595pt = 1123×794px @ 96.
const PAD_X = 42 // 56px × 0.75

// ─── Types ────────────────────────────────────────────────────────────────
interface Item {
  title: string
  url: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  plot_m2: number | null
  thumbnail: string | null
  source: string
  notities: string
  is_favorite: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtEuro(n: number | null | undefined): string {
  if (n == null) return 'Op aanvraag'
  // NBSP tussen € en bedrag — werkt op breed-rij waar wrap=false sowieso aan staat.
  return `€ ${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)}`
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
  return items.find(i => i.thumbnail) ?? null
}

function sortFavoritesFirst(items: Item[]): Item[] {
  const favs = items.filter(i => i.is_favorite)
  const rest = items.filter(i => !i.is_favorite)
  return [...favs, ...rest]
}

function getAssetBase64(filename: string): string | undefined {
  try {
    const assetPath = path.join(process.cwd(), 'public', 'brand', filename)
    const buf = fs.readFileSync(assetPath)
    const ext = filename.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'svg' ? 'image/svg+xml' :
      ext === 'png' ? 'image/png' :
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      'application/octet-stream'
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
    flexDirection: 'column',
  },

  // ── Cover (split layout: text left 56%, hero right 44%) ──
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: DEEPSEA,
    flexDirection: 'row',
  },
  coverLeft: {
    width: '56%',
    paddingTop: 33,    // 44px
    paddingBottom: 33,
    paddingHorizontal: 42, // 56px
    flexDirection: 'column',
  },
  coverHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverBeeldmerk: {
    width: 39,        // 52px × 0.75
    height: 39,
    marginTop: -16,   // -22px
    marginLeft: -10,  // -14px
  },
  coverBeeldmerkImg: { width: '100%', height: '100%', objectFit: 'contain' },
  coverTag: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  coverTagEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 8,         // 10px
    fontWeight: 700,
    letterSpacing: 2,    // 0.26em → ~2pt
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 6,
  },
  coverTagRule: {
    width: 27,           // 36px
    height: 1.5,
    backgroundColor: SUN,
    marginBottom: 6,
  },
  coverBody: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  coverPre: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 14,
  },
  coverTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 51,        // 68px
    lineHeight: 0.95,
    letterSpacing: -1.4,
    color: MARBLE,
    marginBottom: 4,
  },
  coverName: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 51,
    lineHeight: 0.95,
    letterSpacing: -1.4,
    color: SUN,
    marginBottom: 24,
  },
  coverNameTerminal: { color: MARBLE },
  coverTick: {
    width: 36,           // 48px
    height: 1.5,
    backgroundColor: SUN,
    marginBottom: 16,
  },
  coverMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: ON_DARK_20,
    paddingTop: 15,
  },
  coverMetaItem: {
    flexDirection: 'column',
    paddingRight: 14,    // halved from 24 to fit on landscape left col
    marginRight: 14,
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
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 4,
  },
  coverMetaV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 16,        // 22px
    color: MARBLE,
    letterSpacing: -0.3,
    lineHeight: 1,
  },
  coverMetaVSm: { fontSize: 11 },
  coverMetaUnit: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 500,
    color: ON_DARK_55,
    marginLeft: 2,
  },

  // ── Cover hero (right 44%) ──
  coverHero: {
    width: '44%',
    height: '100%',
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
    flexShrink: 0,
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
    color: 'rgba(255,250,239,0.4)',
    fontFamily: 'Raleway',
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  coverHeroTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: SUN,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 210,
  },
  coverHeroTagText: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: DEEPSEA_DEEP,
    marginLeft: 5,
  },
  coverHeroTagStar: {
    fontSize: 9,
    color: DEEPSEA_DEEP,
  },
  coverHeroCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'column',
  },
  coverHeroCaptionEb: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: ON_DARK_70,
    marginBottom: 3,
  },
  coverHeroCaptionTi: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1.2,
    letterSpacing: -0.3,
    color: MARBLE,
  },

  // ── Header bar (centered wordmark) ──
  hbar: {
    height: 39,           // 52px
    paddingHorizontal: PAD_X,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MARBLE,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
    flexShrink: 0,
  },
  hbarWordmark: {
    height: 10,           // 13px
    flexDirection: 'row',
    alignItems: 'center',
  },
  hbarWordmarkImg: { height: '100%', objectFit: 'contain' },

  // ── Body ──
  body: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: 18,
    paddingBottom: 24,
    flexDirection: 'column',
  },

  // Section title
  stitle: {
    marginBottom: 14,
    flexDirection: 'column',
  },
  stitleEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: DEEPSEA,
    marginBottom: 8,
  },
  stitleSunTick: {
    width: 24,
    height: 1.5,
    backgroundColor: SUN,
    marginBottom: 6,
  },
  stitleH2: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 21,         // 28px
    lineHeight: 1.05,
    letterSpacing: -0.5,
    color: DEEPSEA,
  },

  // Cards container
  cards: {
    flex: 1,
    flexDirection: 'column',
  },
  cardsRow3: { flexDirection: 'row' },
  cardsGrid2x2Row: { flexDirection: 'row' },

  // ── Card (regular, horizontal: thumb left, info right) ──
  // Vaste height + overflow hidden: forceert 2-per-pagina ongeacht content.
  // Body landscape A4 (595pt) − header (39) − bodyPad (42) = 514pt.
  // SectionTitle ~60pt → ~454 voor cards − 12 margin / 2 = 221 per card.
  // 215pt geeft veiligheidsmarge voor section-title varianten.
  card: {
    height: 215,
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardLast: { marginBottom: 0 },
  // Favorite outer wrapper — 3pt sun-tint ring (height = card+padding*2)
  favOuter: {
    backgroundColor: SUN_TINT,
    padding: 3,
    borderRadius: 2,
    height: 215,
    marginBottom: 12,
  },
  favOuterLast: { marginBottom: 0 },
  cardFav: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN,
    borderRadius: 2,
    overflow: 'hidden',
  },

  // Thumb (regular variants)
  cardThumb: {
    width: 285,           // 380px × 0.75
    flexShrink: 0,
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
  },
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
    color: INK_MUTE,
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Favorite badge top-left of thumb
  favBadge: {
    position: 'absolute',
    top: 11,
    left: 11,
    backgroundColor: SUN,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favBadgeStar: {
    fontSize: 9,
    color: DEEPSEA_DEEP,
  },
  favBadgeText: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: DEEPSEA_DEEP,
    marginLeft: 5,
  },

  // Index badge bottom-right of thumb (regular cards)
  cardIdx: {
    position: 'absolute',
    bottom: 11,
    right: 11,
    backgroundColor: 'rgba(7,42,36,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  cardIdxText: {
    fontFamily: 'Bricolage Grotesque',
    fontSize: 8.5,
    fontWeight: 600,
    color: MARBLE,
    letterSpacing: 0.3,
  },

  // Card info (right side)
  cardInfo: {
    flex: 1,
    paddingHorizontal: 24,    // 32px
    paddingTop: 18,
    paddingBottom: 16,
    flexDirection: 'column',
  },
  cardInfoFav: { paddingHorizontal: 27 },

  cardLoc: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 19,             // 26px
    lineHeight: 1.08,
    letterSpacing: -0.4,
    color: DEEPSEA,
    marginBottom: 4,
  },
  cardTitleFav: { fontSize: 21 },
  cardTitleSolo: { fontSize: 27, lineHeight: 1.02, letterSpacing: -0.65 },
  cardTitleCompact: { fontSize: 13.5 },
  cardTitleGrid: { fontSize: 13.5 },
  cardTitleTerminal: { color: SUN },

  // Note callout (between title and price for favs)
  cardNote: {
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: SUN_TINT,
    borderLeftWidth: 1.5,
    borderLeftStyle: 'solid',
    borderLeftColor: SUN,
    flexDirection: 'column',
  },
  cardNoteCompact: {
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  cardNoteLbl: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 4,
  },
  cardNoteText: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 400,
    fontSize: 9.5,
    lineHeight: 1.5,
    letterSpacing: -0.05,
    color: INK,
    // italic font niet geregistreerd → keep regular weight 400
  },
  cardNoteTextCompact: { fontSize: 8.5 },

  // ── ANTI-OVERLAP: price on its own row (full-width) ──
  cardPriceRow: {
    marginTop: 'auto',
    paddingTop: 11,
    paddingBottom: 9,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardPriceL: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: SUN_DARK,
    flexShrink: 0,
  },
  cardPriceV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 18,             // 24px
    color: SUN_DARK,
    letterSpacing: -0.35,
    lineHeight: 1,
    textAlign: 'right',
  },
  cardPriceVFav: { fontSize: 19.5 },
  cardPriceVSolo: { fontSize: 24 },
  cardPriceVCompact: { fontSize: 13 },
  cardPriceVGrid: { fontSize: 13 },

  // 4-cell specs row below price (own grid)
  cardSpecs: {
    flexDirection: 'row',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE_STRONG,
  },
  cardSpec: {
    // flexBasis: 0 expliciet zodat lange waardes de cel niet breder maken.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'column',
    paddingHorizontal: 7,     // 10px
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: RULE,
    overflow: 'hidden',
  },
  cardSpecFirst: { paddingLeft: 0 },
  cardSpecLast: { borderRightWidth: 0, paddingRight: 0 },
  cardSpecL: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 3,
  },
  cardSpecV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 13,             // 17px
    color: DEEPSEA,
    letterSpacing: -0.3,
    lineHeight: 1,
  },
  cardSpecVSolo: { fontSize: 14 },
  cardSpecVCompact: { fontSize: 10 },
  cardSpecVGrid: { fontSize: 10 },
  cardSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 500,
    color: INK_MUTE,
    marginLeft: 2,
  },

  // ── Solo card (60% thumb left, info center-right) ──
  cardSoloThumb: { width: '60%' },
  cardSoloInfo: {
    paddingHorizontal: 30,
    paddingVertical: 27,
    justifyContent: 'center',
  },

  // ── Compact (3 vertical cards in row) ──
  cardCompactCol: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 11,
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardCompactColLast: { marginRight: 0 },
  cardCompactColFavOuter: {
    backgroundColor: SUN_TINT,
    padding: 3,
    borderRadius: 2,
    flex: 1,
    marginRight: 11,
    flexDirection: 'column',
  },
  cardCompactColFavInner: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardCompactThumb: {
    width: '100%',
    height: 150,              // 200px
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
  },
  cardCompactInfo: {
    flex: 1,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: 'column',
  },

  // ── Grid 2×2 ──
  cardGridRow: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 10,
  },
  cardGridRowLast: { marginBottom: 0 },
  cardGridItem: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 10,
  },
  cardGridItemLast: { marginRight: 0 },
  cardGridItemFavOuter: {
    backgroundColor: SUN_TINT,
    padding: 3,
    borderRadius: 2,
    flex: 1,
    marginRight: 10,
  },
  cardGridItemFavInner: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardGridThumb: {
    width: 150,
    flexShrink: 0,
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
  },
  cardGridInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    flexDirection: 'column',
  },
})

// ─── Components ───────────────────────────────────────────────────────────

function HeaderBar({ wordmarkSrc }: { wordmarkSrc?: string }) {
  return (
    <View style={s.hbar}>
      <View style={s.hbarWordmark}>
        {wordmarkSrc && <Image src={wordmarkSrc} style={s.hbarWordmarkImg} />}
      </View>
    </View>
  )
}

function SectionTitle({ eyebrow, h2 }: { eyebrow: string; h2: string }) {
  return (
    <View style={s.stitle}>
      <Text style={s.stitleEyebrow}>{eyebrow}</Text>
      <View style={s.stitleSunTick} />
      <Text style={s.stitleH2}>{h2}</Text>
    </View>
  )
}

type Variant = 'regular' | 'favorite' | 'solo' | 'compact' | 'grid'

interface CardProps {
  item: Item
  index?: number
  variant: Variant
}

function CardThumb({ item, index, variant, isFav }: CardProps & { isFav: boolean }) {
  const thumbStyle =
    variant === 'solo' ? [s.cardThumb, s.cardSoloThumb]
    : variant === 'compact' ? s.cardCompactThumb
    : variant === 'grid' ? s.cardGridThumb
    : s.cardThumb
  return (
    <View style={thumbStyle}>
      {item.thumbnail ? (
        <Image src={item.thumbnail} style={s.cardThumbImg} />
      ) : (
        <View style={s.cardThumbEmpty}>
          <Text style={s.cardThumbEmptyText}>Geen foto</Text>
        </View>
      )}
      {isFav ? (
        <View style={s.favBadge}>
          <Text style={s.favBadgeStar}>★</Text>
          <Text style={s.favBadgeText}>Favoriet</Text>
        </View>
      ) : index != null ? (
        <View style={s.cardIdx}>
          <Text style={s.cardIdxText}>{String(index).padStart(2, '0')}</Text>
        </View>
      ) : null}
    </View>
  )
}

function CardInfo({ item, variant, isFav }: CardProps & { isFav: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleStyles: any[] = [s.cardTitle]
  if (isFav) titleStyles.push(s.cardTitleFav)
  if (variant === 'solo') titleStyles.push(s.cardTitleSolo)
  if (variant === 'compact') titleStyles.push(s.cardTitleCompact)
  if (variant === 'grid') titleStyles.push(s.cardTitleGrid)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceStyles: any[] = [s.cardPriceV]
  if (isFav && variant !== 'solo') priceStyles.push(s.cardPriceVFav)
  if (variant === 'solo') priceStyles.push(s.cardPriceVSolo)
  if (variant === 'compact') priceStyles.push(s.cardPriceVCompact)
  if (variant === 'grid') priceStyles.push(s.cardPriceVGrid)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specVStyles: any[] = [s.cardSpecV]
  if (variant === 'solo') specVStyles.push(s.cardSpecVSolo)
  if (variant === 'compact') specVStyles.push(s.cardSpecVCompact)
  if (variant === 'grid') specVStyles.push(s.cardSpecVGrid)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteStyles: any[] = [s.cardNote]
  if (variant === 'compact') noteStyles.push(s.cardNoteCompact)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteTextStyles: any[] = [s.cardNoteText]
  if (variant === 'compact') noteTextStyles.push(s.cardNoteTextCompact)

  const showNote = isFav && !!item.notities && variant !== 'grid'

  const infoStyle =
    variant === 'solo' ? [s.cardInfo, s.cardSoloInfo]
    : variant === 'compact' ? s.cardCompactInfo
    : variant === 'grid' ? s.cardGridInfo
    : isFav ? [s.cardInfo, s.cardInfoFav]
    : s.cardInfo

  return (
    <View style={infoStyle}>
      {item.location ? (
        <Text style={s.cardLoc} wrap={false}>{item.location}</Text>
      ) : null}
      {/* maxLines={2} cap'pt lange titles ('Casa independiente en calle
          Francisco Zurbarán, 11.') op 2 regels met ellipsis. Voorkomt dat
          card-hoogte uitloopt en @react-pdf de cards splitst over pagina's. */}
      <Text
        style={[
          ...titleStyles,
          {
            maxLines: variant === 'solo' ? 3 : 2,
            textOverflow: 'ellipsis',
          },
        ]}
      >
        {(item.title || 'Woning zonder titel') + '.'}
      </Text>

      {showNote && (
        <View style={noteStyles}>
          <Text style={s.cardNoteLbl}>Notitie consultant</Text>
          <Text
            style={[
              ...noteTextStyles,
              {
                maxLines: variant === 'compact' ? 2 : 3,
                textOverflow: 'ellipsis',
              },
            ]}
          >
            {item.notities}
          </Text>
        </View>
      )}

      {/* Price-row — eigen rij, full width van info-blok. */}
      <View style={s.cardPriceRow}>
        <Text style={s.cardPriceL}>Vraagprijs</Text>
        <Text style={priceStyles} wrap={false}>{fmtEuro(item.price)}</Text>
      </View>

      {/* 4-cel spec-row */}
      <View style={s.cardSpecs}>
        <CardSpecCell
          label="Woonopp."
          value={item.size_m2 != null ? String(item.size_m2) : '—'}
          unit={item.size_m2 != null ? 'm²' : undefined}
          valStyle={specVStyles}
          isFirst
        />
        <CardSpecCell
          label="Perceel"
          value={item.plot_m2 != null && item.plot_m2 > 0 ? String(item.plot_m2) : '—'}
          unit={item.plot_m2 != null && item.plot_m2 > 0 ? 'm²' : undefined}
          valStyle={specVStyles}
        />
        <CardSpecCell
          label="Slpk"
          value={item.bedrooms != null ? String(item.bedrooms) : '—'}
          valStyle={specVStyles}
        />
        <CardSpecCell
          label="Badk"
          value={item.bathrooms != null ? String(item.bathrooms) : '—'}
          valStyle={specVStyles}
          isLast
        />
      </View>
    </View>
  )
}

function CardSpecCell({
  label,
  value,
  unit,
  valStyle,
  isFirst,
  isLast,
}: {
  label: string
  value: string
  unit?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  valStyle: any[]
  isFirst?: boolean
  isLast?: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellStyles: any[] = [s.cardSpec]
  if (isFirst) cellStyles.push(s.cardSpecFirst)
  if (isLast) cellStyles.push(s.cardSpecLast)
  return (
    <View style={cellStyles}>
      <Text style={s.cardSpecL} wrap={false}>{label}</Text>
      <Text style={valStyle} wrap={false}>
        {unit ? `${value} ${unit}` : value}
      </Text>
    </View>
  )
}

function ListingCard({ item, index, variant }: CardProps) {
  const isFav =
    variant === 'favorite' ||
    ((variant === 'solo' || variant === 'compact' || variant === 'grid') && item.is_favorite)
  // wrap={false}: voorkomt dat @react-pdf de card halverwege splitst over
  // twee pagina's (image op page N, info op page N+1) wanneer een lange
  // title de card-hoogte boven de allocated 50% van page-body uitduwt.
  // Card wordt dan in z'n geheel doorgeschoven naar de volgende pagina.
  const cardInner = (
    <View style={isFav ? s.cardFav : s.card} wrap={false}>
      <CardThumb item={item} index={index} variant={variant} isFav={isFav} />
      <CardInfo item={item} variant={variant} isFav={isFav} />
    </View>
  )
  // Sun-tint outer ring (3pt) om favorites — design's "frame ring" effect.
  if (isFav && variant !== 'solo') {
    return (
      <View style={s.favOuter} wrap={false}>
        {cardInner}
      </View>
    )
  }
  return cardInner
}

// ─── Pages ────────────────────────────────────────────────────────────────

function CoverPage({
  klantNaam,
  items,
  beeldmerkSrc,
}: {
  klantNaam: string
  items: Item[]
  beeldmerkSrc?: string
}) {
  const hero = pickHero(items)

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.cover}>
        <View style={s.coverLeft}>
          <View style={s.coverHead}>
            <View style={s.coverBeeldmerk}>
              {beeldmerkSrc && <Image src={beeldmerkSrc} style={s.coverBeeldmerkImg} />}
            </View>
            <View style={s.coverTag}>
              <Text style={s.coverTagEyebrow}>Shortlist</Text>
              <View style={s.coverTagRule} />
            </View>
          </View>

          <View style={s.coverBody}>
            <Text style={s.coverPre}>Een persoonlijke selectie</Text>
            <Text style={s.coverTitle}>Voor</Text>
            <Text style={s.coverName}>{klantNaam + '.'}</Text>
          </View>
        </View>

        <View style={s.coverHero}>
          {hero?.thumbnail ? (
            <Image src={hero.thumbnail} style={s.coverHeroImg} />
          ) : (
            <View style={s.coverHeroEmpty}>
              <Text style={s.coverHeroEmptyText}>Hero foto</Text>
            </View>
          )}
          {hero?.is_favorite && (
            <>
              <View style={s.coverHeroTag}>
                <Text style={s.coverHeroTagStar}>★</Text>
                <Text style={s.coverHeroTagText}>Onze topkeuze</Text>
              </View>
              <View style={s.coverHeroCaption}>
                <Text style={s.coverHeroCaptionEb}>{hero.location}</Text>
                <Text style={s.coverHeroCaptionTi}>{hero.title}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Page>
  )
}

function ListingPage({
  items,
  startIndex,
  wordmarkSrc,
  h2,
}: {
  items: Item[]
  startIndex: number
  wordmarkSrc?: string
  h2?: string
}) {
  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap={false}>
      <HeaderBar wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle eyebrow="De selectie" h2={h2 || 'Geselecteerde woningen.'} />
        <View style={s.cards}>
          {items.map((item, i) => {
            const variant: Variant = item.is_favorite ? 'favorite' : 'regular'
            return (
              <ListingCard
                key={i}
                item={item}
                index={startIndex + i + 1}
                variant={variant}
              />
            )
          })}
        </View>
      </View>
    </Page>
  )
}

function SoloPage({
  item,
  wordmarkSrc,
}: {
  item: Item
  wordmarkSrc?: string
}) {
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <HeaderBar wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle eyebrow="De selectie" h2="Eén woning, zorgvuldig gekozen." />
        <View style={s.cards}>
          <ListingCard item={{ ...item, is_favorite: true }} index={1} variant="solo" />
        </View>
      </View>
    </Page>
  )
}

function CompactPage({
  items,
  wordmarkSrc,
}: {
  items: Item[]
  wordmarkSrc?: string
}) {
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <HeaderBar wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle eyebrow="De selectie" h2="Drie woningen op één pagina." />
        <View style={[s.cards, s.cardsRow3]}>
          {items.map((item, i) => (
            <CompactCard key={i} item={item} index={i + 1} isLast={i === items.length - 1} />
          ))}
        </View>
      </View>
    </Page>
  )
}

function CompactCard({ item, index, isLast }: { item: Item; index: number; isLast: boolean }) {
  const isFav = !!item.is_favorite
  const inner = (
    <View style={isFav ? s.cardCompactColFavInner : s.cardCompactCol}>
      <View style={s.cardCompactThumb}>
        {item.thumbnail ? (
          <Image src={item.thumbnail} style={s.cardThumbImg} />
        ) : (
          <View style={s.cardThumbEmpty}>
            <Text style={s.cardThumbEmptyText}>Geen foto</Text>
          </View>
        )}
        {isFav ? (
          <View style={s.favBadge}>
            <Text style={s.favBadgeStar}>★</Text>
            <Text style={s.favBadgeText}>Favoriet</Text>
          </View>
        ) : (
          <View style={s.cardIdx}>
            <Text style={s.cardIdxText}>{String(index).padStart(2, '0')}</Text>
          </View>
        )}
      </View>
      <CardInfo item={item} variant="compact" isFav={isFav} />
    </View>
  )
  if (isFav) {
    return (
      <View style={[s.cardCompactColFavOuter, isLast ? { marginRight: 0 } : {}]}>
        {inner}
      </View>
    )
  }
  return (
    <View style={[s.cardCompactCol, isLast ? s.cardCompactColLast : {}]}>
      {/* prevent double-wrapping; CompactCard returns the outer card for non-fav */}
      <View style={s.cardCompactThumb}>
        {item.thumbnail ? (
          <Image src={item.thumbnail} style={s.cardThumbImg} />
        ) : (
          <View style={s.cardThumbEmpty}>
            <Text style={s.cardThumbEmptyText}>Geen foto</Text>
          </View>
        )}
        <View style={s.cardIdx}>
          <Text style={s.cardIdxText}>{String(index).padStart(2, '0')}</Text>
        </View>
      </View>
      <CardInfo item={item} variant="compact" isFav={false} />
    </View>
  )
}

function GridPage({
  items,
  wordmarkSrc,
}: {
  items: Item[]
  wordmarkSrc?: string
}) {
  const rows: Item[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <HeaderBar wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <SectionTitle eyebrow="De selectie" h2="Vier woningen, in één blik." />
        <View style={s.cards}>
          {rows.map((row, ri) => (
            <View
              key={ri}
              style={[s.cardGridRow, ri === rows.length - 1 ? s.cardGridRowLast : {}]}
            >
              {row.map((item, i) => (
                <GridCard
                  key={i}
                  item={item}
                  index={ri * 2 + i + 1}
                  isLast={i === row.length - 1}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Page>
  )
}

function GridCard({ item, index, isLast }: { item: Item; index: number; isLast: boolean }) {
  const isFav = !!item.is_favorite
  const innerThumb = (
    <View style={s.cardGridThumb}>
      {item.thumbnail ? (
        <Image src={item.thumbnail} style={s.cardThumbImg} />
      ) : (
        <View style={s.cardThumbEmpty}>
          <Text style={s.cardThumbEmptyText}>Geen foto</Text>
        </View>
      )}
      {isFav ? (
        <View style={s.favBadge}>
          <Text style={s.favBadgeStar}>★</Text>
          <Text style={s.favBadgeText}>Favoriet</Text>
        </View>
      ) : (
        <View style={s.cardIdx}>
          <Text style={s.cardIdxText}>{String(index).padStart(2, '0')}</Text>
        </View>
      )}
    </View>
  )
  const body = (
    <>
      {innerThumb}
      <CardInfo item={item} variant="grid" isFav={isFav} />
    </>
  )
  if (isFav) {
    return (
      <View style={[s.cardGridItemFavOuter, isLast ? { marginRight: 0 } : {}]}>
        <View style={s.cardGridItemFavInner}>{body}</View>
      </View>
    )
  }
  return (
    <View style={[s.cardGridItem, isLast ? s.cardGridItemLast : {}]}>{body}</View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────

export function ShortlistPDF({
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
  const sorted = sortFavoritesFirst(items)

  // Page-mode dispatch op basis van item count
  if (sorted.length === 1) {
    return (
      <Document>
        <CoverPage
          klantNaam={klantNaam}
          items={sorted.map(i => ({ ...i, is_favorite: true }))}
          beeldmerkSrc={beeldmerkSrc}
        />
        <SoloPage item={sorted[0]} wordmarkSrc={wordmarkSrc} />
      </Document>
    )
  }

  if (sorted.length === 3) {
    return (
      <Document>
        <CoverPage
          klantNaam={klantNaam}
          items={sorted}
          beeldmerkSrc={beeldmerkSrc}
        />
        <CompactPage items={sorted} wordmarkSrc={wordmarkSrc} />
      </Document>
    )
  }

  if (sorted.length === 4) {
    return (
      <Document>
        <CoverPage
          klantNaam={klantNaam}
          items={sorted}
          beeldmerkSrc={beeldmerkSrc}
        />
        <GridPage items={sorted} wordmarkSrc={wordmarkSrc} />
      </Document>
    )
  }

  // Default: 2 cards per pagina
  const itemsPerPage = 2
  const pages: Item[][] = []
  for (let i = 0; i < sorted.length; i += itemsPerPage) {
    pages.push(sorted.slice(i, i + itemsPerPage))
  }

  return (
    <Document>
      <CoverPage
        klantNaam={klantNaam}
        items={sorted}
        beeldmerkSrc={beeldmerkSrc}
      />
      {pages.map((pageItems, pageIdx) => (
        <ListingPage
          key={pageIdx}
          items={pageItems}
          startIndex={pageIdx * itemsPerPage}
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

  const filename = `costa-select-shortlist-${(klant_naam || 'klant').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
