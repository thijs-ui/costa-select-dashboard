import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import path from 'path'

// ─── Brand fonts ─────────────────────────────────────────────────────────
// Lokaal gebundeld in public/fonts/. Google Fonts CDN-URLs zijn niet stabiel
// (Raleway 500 v37 ging op 26-04 op 404). Bricolage 500-weight is niet
// beschikbaar; 600 is registered en valt in voor 500 (closest-match).
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

// ─── Design tokens (uit handoff v2) ──────────────────────────────────────
const DEEPSEA = '#004B46'
const DEEPSEA_DEEP = '#072A24'
const SUN = '#F5AF40'
const SUN_DARK = '#C58118'
const SUN_TINT = '#FAEDD0'
const SUN_FRAME_BD = '#EBD9B0'
const MARBLE = '#FFFAEF'
const SEA = '#0EAE96'
const RED = '#B81D13'
const INK = '#1B2A28'
const INK_SOFT = '#4A5A57'
const INK_MUTE = '#8A9794'
// Solid pre-blended hex — react-pdf parser fault op zowel rgba() als
// 8-char hex met alpha (renderde beide als rood). Deze waarden zijn
// hand-blends van de originele rgba's tegen de bg waarop ze landen:
//  - RULE / RULE_STRONG: ink (rgba 7,42,36,X) op marble (#FFFAEF)
//  - ON_DARK_*: marble (rgba 255,250,239,X) op deepsea (#004B46)
const RULE = '#D8D6CB' // ~ ink @ 0.10 over marble — neutraal lichtgrijs
const RULE_STRONG = '#B6B6AA' // ~ ink @ 0.20 over marble — sterker
const ON_DARK_55 = '#A8BFB9' // marble @ 0.55 over deepsea — labels op deepsea
const ON_DARK_45 = '#94AEA8' // marble @ 0.45 over deepsea
// Cover-borders zichtbaar als neutraal lichtgrijs ipv groen-tint —
// hogere effective alpha tegen deepsea bg.
const ON_DARK_20 = '#88A29D'

const PAD_X = 64

// ─── Types ────────────────────────────────────────────────────────────────
export interface DossierData {
  property: {
    adres: string
    regio: string
    type: string
    vraagprijs: number
    oppervlakte: number
    kavel?: number | null
    slaapkamers: number
    badkamers: number
    bouwjaar?: string | number | null
    terras?: string | number | null
    omschrijving?: string
    fotos: string[]
    url?: string
  }
  regioInfo?: string
  brochure_type?: 'pitch' | 'presentatie'
  pitch_content?: {
    voordelen?: string[]
    nadelen?: string[]
    buurtcontext?: string
    investering?: string
    advies?: string
  }
  analyse?: {
    juridische_risicos?: string[]
    [k: string]: unknown
  }
  generatedAt?: string
  units_data?: Array<{
    typology?: string
    rooms?: number | null
    size_m2?: number | null
    price?: number | null
    floor?: string | null
    is_exterior?: boolean | null
    has_terrace?: boolean | null
  }>
  // Backwards-compat:
  financial_data?: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtEuro(n: number): string {
  if (!n) return '€ 0'
  return `€ ${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)}`
}

function capitalize(s: string): string {
  if (!s) return ''
  const lower = s.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

// Map technische scraper-keys naar nette NL labels. Onbekende waardes
// vallen door capitalize().
const TYPE_LABELS: Record<string, string> = {
  newdevelopment: 'Nieuwbouw',
  nieuwbouw: 'Nieuwbouw',
  villa: 'Villa',
  apartment: 'Appartement',
  appartement: 'Appartement',
  house: 'Woning',
  woning: 'Woning',
  detachedhouse: 'Vrijstaande woning',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
  finca: 'Finca',
  studio: 'Studio',
}
function formatType(s: string | undefined): string {
  if (!s) return ''
  const key = s.toLowerCase().replace(/[^a-z]/g, '')
  return TYPE_LABELS[key] ?? capitalize(s)
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function firstSentences(text: string | undefined, count: number): string {
  if (!text) return ''
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.slice(0, count).join(' ').trim()
}

function truncateAtSentence(text: string, max: number): string {
  if (!text || text.length <= max) return text
  const slice = text.slice(0, max)
  const lastPunct = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
  )
  if (lastPunct > max * 0.5) return slice.slice(0, lastPunct + 1)
  const lastSpace = slice.lastIndexOf(' ')
  return lastSpace > 0 ? slice.slice(0, lastSpace) + '…' : slice
}

// Strip basic Markdown markers — handoff §strict rule: body-tekst is plain text.
// Idealista/AI-rewrite kan soms '#'-headings of '*'-emphasis terugsturen.
function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/^\s*#{1,6}\s+/gm, '') // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/__([^_]+)__/g, '$1') // bold underscore
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1') // italic
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1') // italic underscore
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^\s*[-*+]\s+/gm, '') // unordered list markers
    .replace(/^\s*>\s?/gm, '') // blockquote
    .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines
    .trim()
}

function toParagraphs(text: string): string[] {
  if (!text) return []
  const cleaned = stripMarkdown(text)
  if (!cleaned) return []
  const parts = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [cleaned]
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: MARBLE,
    fontFamily: 'Raleway',
    color: INK,
  },

  // ── Cover ──
  cover: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  coverLeft: {
    width: '56%',
    padding: 56,
    backgroundColor: DEEPSEA,
    flexDirection: 'column',
  },
  coverRight: {
    width: '44%',
    backgroundColor: DEEPSEA_DEEP,
  },
  coverHeroImg: { width: '100%', height: '100%', objectFit: 'cover' },
  coverBeeldmerk: {
    width: 60,
    height: 60,
    marginTop: -31,
    marginLeft: -19,
  },
  coverBeeldmerkImg: { width: '100%', height: '100%', objectFit: 'contain' },
  coverBody: { marginTop: 'auto', flexDirection: 'column' },
  coverAddr: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 54,
    lineHeight: 0.98,
    letterSpacing: -1.35,
    color: MARBLE,
    marginBottom: 28,
    maxWidth: 540,
  },
  coverAddrTerminal: { color: SUN },
  coverPriceRow: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: ON_DARK_20,
    paddingTop: 24,
    marginBottom: 24,
  },
  coverPriceLabel: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 2.28,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 6,
  },
  coverPrice: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 42,
    color: SUN,
    letterSpacing: -1.05,
    lineHeight: 1,
  },
  coverSpecs: { flexDirection: 'row' },
  coverSpec: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: ON_DARK_20,
  },
  coverSpecFirst: { borderLeftWidth: 0, paddingLeft: 0 },
  coverSpecLabel: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 8,
  },
  coverSpecValue: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 24,
    color: MARBLE,
    letterSpacing: -0.48,
    lineHeight: 1,
  },
  coverSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 11,
    fontWeight: 500,
    color: ON_DARK_55,
    marginLeft: 3,
  },

  // ── Header (content pages) ──
  hbar: {
    height: 56,
    paddingHorizontal: PAD_X,
    backgroundColor: MARBLE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  hWordmark: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hWordmarkImg: { height: 10.5, width: 142, objectFit: 'contain' },
  // height-constraint weggelaten — react-pdf klipt anders fontSize 12 binnen
  // height 11 container. fontSize iets opgehoogd voor leesbaarheid.
  hWordmarkFallback: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 2.34,
    textTransform: 'uppercase',
    color: DEEPSEA,
  },
  // Cover beeldmerk fallback — sun-circle (handoff asset checklist)
  coverBeeldmerkFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SUN,
  },

  // ── Body container ──
  pdfBody: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: 24,
    paddingBottom: 36,
    flexDirection: 'column',
  },

  // ── Section title ──
  stitle: { marginBottom: 24, flexDirection: 'column' },
  stitleEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stitleEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 2.66,
    textTransform: 'uppercase',
    color: DEEPSEA,
  },
  stitleEyebrowRule: {
    flex: 1,
    height: 1,
    backgroundColor: RULE,
    marginLeft: 12,
    marginRight: 12,
  },
  stitleEyebrowCounter: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 2.09,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  sunTick: {
    width: 32,
    height: 2,
    backgroundColor: SUN,
    marginBottom: 12,
  },
  stitleH2: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 34,
    lineHeight: 1.02,
    letterSpacing: -0.85,
    color: DEEPSEA,
    maxWidth: 880,
  },
  stitleTerminal: { color: SUN },

  // ── Detail page (presentatie) ──
  presSpecGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE_STRONG,
  },
  presSpec: {
    flexBasis: '33.333%',
    width: '33.333%',
    paddingTop: 16,
    paddingRight: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
    flexDirection: 'column',
  },
  presSpecSm: { flexBasis: '25%', width: '25%' },
  presSpecLabel: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 8,
  },
  presSpecValue: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 20,
    color: DEEPSEA,
    letterSpacing: -0.4,
    lineHeight: 1,
  },
  presSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 11,
    fontWeight: 500,
    color: INK_MUTE,
    marginLeft: 3,
  },
  presSpecAccent: { color: SUN_DARK, fontSize: 23 },
  presCols: { flexDirection: 'row', flex: 1 },
  presColsLeft: {
    flex: 1.25,
    flexDirection: 'column',
    paddingRight: 18,
  },
  presColsRight: { flex: 1, flexDirection: 'column', paddingLeft: 18 },
  blockH: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockHNum: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  blockTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 16,
    color: DEEPSEA,
    letterSpacing: -0.24,
    lineHeight: 1.1,
    marginBottom: 12,
  },
  blockBody: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 400,
    lineHeight: 1.65,
    color: INK,
  },
  blockBodyPara: { marginBottom: 8 },

  // ── Units-tabel (nieuwbouw) ──
  unitsTable: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE_STRONG,
  },
  unitsHeaderRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
  },
  unitsRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
  },
  unitsRowLast: { borderBottomWidth: 0 },
  unitsHeaderCell: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  unitsCell: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 500,
    color: INK,
  },
  unitsCellPrice: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 11,
    color: DEEPSEA,
    letterSpacing: -0.22,
  },
  unitsColTypology: { flex: 2 },
  unitsColRooms: { flex: 0.7, textAlign: 'right' },
  unitsColSize: { flex: 0.9, textAlign: 'right' },
  unitsColPrice: { flex: 1.4, textAlign: 'right' },

  // ── Pitch grid ──
  lede: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 400,
    fontSize: 12.5,
    lineHeight: 1.55,
    color: INK_SOFT,
    marginBottom: 22,
    maxWidth: 920,
  },
  pitchGrid: { flexDirection: 'row', marginBottom: 18 },
  pitchCol: { flex: 1, flexDirection: 'column' },
  pitchColSpacer: { width: 28 },
  pitchTick: { width: 28, height: 2, marginTop: 4, marginBottom: 12 },
  pitchTickPos: { backgroundColor: SEA },
  pitchTickNeg: { backgroundColor: SUN },
  pitchTickWarn: { backgroundColor: RED },
  pitchTickNeutral: { backgroundColor: DEEPSEA },
  pitchListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 9,
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
  },
  pitchListItemLast: { borderBottomWidth: 0 },
  pitchListBullet: {
    width: 12,
    height: 2,
    marginTop: 7,
    marginRight: 10,
    flexShrink: 0,
  },
  pitchListBulletPos: { backgroundColor: SEA },
  pitchListBulletNeg: { backgroundColor: SUN },
  pitchListBulletWarn: { backgroundColor: RED },
  pitchListBulletNeutral: { backgroundColor: INK_MUTE },
  pitchListText: {
    flex: 1,
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 400,
    lineHeight: 1.55,
    color: INK,
  },

  // ── Pitch callout ──
  // marginTop: auto verwijderd — react-pdf flex-overflow detection
  // genereerde phantom blank pagina's. Callout volgt nu de pitch grid
  // direct met een kleine gap.
  pitchCallout: {
    backgroundColor: SUN_TINT,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN_FRAME_BD,
    borderRadius: 2,
    padding: 18,
    marginTop: 12,
    flexDirection: 'row',
  },
  calloutGlyph: { width: 56, flexDirection: 'column' },
  calloutGlyphLabel: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 4,
  },
  calloutGlyphNum: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 26,
    color: DEEPSEA,
    letterSpacing: -0.65,
    lineHeight: 1,
  },
  calloutBody: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: SUN_FRAME_BD,
    paddingLeft: 22,
  },
  calloutLabel: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.16,
    textTransform: 'uppercase',
    color: SUN_DARK,
    marginBottom: 6,
  },
  calloutText: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 400,
    lineHeight: 1.6,
    color: INK,
  },

  // ── Advies hero (page 04) ──
  adviesHero: {
    backgroundColor: DEEPSEA,
    padding: 28,
    borderRadius: 2,
    marginBottom: 22,
    flexDirection: 'row',
  },
  adviesSunBar: {
    width: 3,
    backgroundColor: SUN,
    marginRight: 24,
  },
  adviesBody: { flex: 1, flexDirection: 'column' },
  adviesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviesLabel: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 2.66,
    textTransform: 'uppercase',
    color: SUN,
    marginRight: 10,
  },
  adviesMeta: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1.62,
    textTransform: 'uppercase',
    color: ON_DARK_45,
  },
  adviesText: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.5,
    color: MARBLE,
    letterSpacing: -0.08,
    maxWidth: 860,
  },
  adviesSignoff: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  adviesSignoffText: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: ON_DARK_55,
  },
  adviesSignoffName: { color: SUN, marginLeft: 6, marginRight: 6 },

  // ── Foto-mosaic page ──
  // A4 landscape = 595pt hoog. Header 56 + body padding 12+44 = 112pt.
  // Photos krijgen height: 480 (= 595 - 56 - 12 - 44 - 3 safety).
  photosBody: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: 12,
    paddingBottom: 44,
    flexDirection: 'column',
  },
  photosHero: { flexDirection: 'row', height: 480 },

  // ── Foto-gallery grid (2 cols × 3 rows = 6 per page) ──
  galleryGrid: { flexDirection: 'column', height: 480 },
  galleryRow: { flexDirection: 'row', flex: 1 },
  galleryRowSpacer: { height: 14 },
  galleryColSpacer: { width: 14 },
  galleryCell: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  galleryCellEmpty: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  phHeroLeft: {
    flex: 1.35,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 14,
  },
  phHeroRight: { flex: 1, flexDirection: 'column' },
  phHeroSmall: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  phHeroSmallSpacer: { height: 14 },
  // Duo-layout (2 foto's side-by-side, gelijke breedte)
  phHeroDuoLeft: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 14,
  },
  phHeroDuoRight: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  // Solo-layout (1 foto full-width)
  phHeroSolo: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
})

// ─── Section title component ─────────────────────────────────────────────
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
      <Text style={s.stitleH2}>
        {title}
        <Text style={s.stitleTerminal}>.</Text>
      </Text>
    </View>
  )
}

// ─── Header ──────────────────────────────────────────────────────────────
// SVG-wordmark wordt server-side naar PNG geconverteerd (zie /api/dossier/pdf
// route — resvg-js). Daardoor kan react-pdf <Image> 'm betrouwbaar renderen.
// Tekst-fallback alleen als de PNG-conversie zou falen.
function Header({ wordmarkSrc }: { wordmarkSrc?: string }) {
  return (
    <View style={s.hbar}>
      <View style={s.hWordmark}>
        {wordmarkSrc ? (
          <Image src={wordmarkSrc} style={s.hWordmarkImg} />
        ) : (
          <Text style={s.hWordmarkFallback}>Costa Select</Text>
        )}
      </View>
    </View>
  )
}

// ─── Pitch list (bullets via View) ───────────────────────────────────────
type PitchKind = 'pos' | 'neg' | 'warn' | 'neutral'

function PitchList({
  items,
  kind,
}: {
  items: string[]
  kind: PitchKind
}) {
  const bulletStyle =
    kind === 'pos'
      ? s.pitchListBulletPos
      : kind === 'neg'
        ? s.pitchListBulletNeg
        : kind === 'warn'
          ? s.pitchListBulletWarn
          : s.pitchListBulletNeutral
  return (
    <View>
      {items.map((item, i) => (
        <View
          key={i}
          style={
            i === items.length - 1
              ? [s.pitchListItem, s.pitchListItemLast]
              : s.pitchListItem
          }
        >
          <View style={[s.pitchListBullet, bulletStyle]} />
          <Text style={s.pitchListText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

function PitchTick({ kind }: { kind: PitchKind }) {
  const tickStyle =
    kind === 'pos'
      ? s.pitchTickPos
      : kind === 'neg'
        ? s.pitchTickNeg
        : kind === 'warn'
          ? s.pitchTickWarn
          : s.pitchTickNeutral
  return <View style={[s.pitchTick, tickStyle]} />
}

// ─── Main component ──────────────────────────────────────────────────────
export function DossierPDF({
  data,
  beeldmerkSrc,
  wordmarkSrc,
}: {
  data: DossierData
  beeldmerkSrc?: string
  wordmarkSrc?: string
}) {
  const { property, regioInfo } = data
  const fotos = property.fotos || []
  const heroFoto = fotos[0]
  // Foto-pagina's: 3 foto's per pagina, overal dezelfde mosaic-layout
  // (1 grote links + 2 kleine rechts). Cover gebruikt fotos[0].
  // Pagina 5+: groepen van 3 vanaf fotos[1].
  const photoTriplets: Array<[string?, string?, string?]> = []
  for (let i = 1; i < Math.min(fotos.length, 16); i += 3) {
    const triplet: [string?, string?, string?] = [
      fotos[i],
      fotos[i + 1],
      fotos[i + 2],
    ]
    if (triplet.some(Boolean)) photoTriplets.push(triplet)
  }

  const isPitch = data.brochure_type === 'pitch'
  const pitch = data.pitch_content
  const hasPitchA =
    isPitch && pitch && (pitch.voordelen?.length || pitch.nadelen?.length)
  const hasPitchB = isPitch && pitch?.advies
  const juridischeRisicos = data.analyse?.juridische_risicos ?? []

  // Body-tekst: Markdown strippen, splitsen op paragrafen, dan begrenzen.
  const omschrijvingParas = toParagraphs(
    truncateAtSentence(property.omschrijving ?? '', 720)
  )
  const regioParas = toParagraphs(truncateAtSentence(regioInfo ?? '', 600))
  // Units (nieuwbouw): bij aanwezigheid vervangt het regio-blok rechts.
  // Max 8 units zodat het binnen de kolom-hoogte past.
  const units = (data.units_data ?? [])
    .filter(u => u && (u.typology || u.price))
    .slice(0, 8)
  const hasUnits = units.length > 0
  const hasOmschrijving = omschrijvingParas.length > 0
  const hasRegio = regioParas.length > 0 && !hasUnits
  const lede = firstSentences(stripMarkdown(pitch?.buurtcontext ?? ''), 2)
  const adviesDate = fmtDate(data.generatedAt)
  const adviesText = stripMarkdown(pitch?.advies ?? '')
  const investeringText = stripMarkdown(pitch?.investering ?? '')

  return (
    <Document>
      {/* ─── 01 COVER ─────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverLeft}>
            <View style={s.coverBeeldmerk}>
              {beeldmerkSrc ? (
                <Image src={beeldmerkSrc} style={s.coverBeeldmerkImg} />
              ) : (
                <View style={s.coverBeeldmerkFallback} />
              )}
            </View>

            <View style={s.coverBody}>
              <Text style={s.coverAddr}>
                {property.adres}
                <Text style={s.coverAddrTerminal}>.</Text>
              </Text>

              <View style={s.coverPriceRow}>
                <Text style={s.coverPriceLabel}>Vraagprijs</Text>
                <Text style={s.coverPrice}>{fmtEuro(property.vraagprijs)}</Text>
              </View>

              <View style={s.coverSpecs}>
                {(() => {
                  // Build only the specs we have data for — geen lege '—' velden.
                  const specs: Array<{ label: string; value: string; unit?: string }> = []
                  if (property.slaapkamers) {
                    specs.push({ label: 'Slaapkamers', value: String(property.slaapkamers) })
                  }
                  if (property.badkamers) {
                    specs.push({ label: 'Badkamers', value: String(property.badkamers) })
                  }
                  if (property.oppervlakte) {
                    specs.push({
                      label: 'Woonopp.',
                      value: String(property.oppervlakte),
                      unit: 'm²',
                    })
                  }
                  if (property.kavel) {
                    specs.push({
                      label: 'Kavel',
                      value: String(property.kavel),
                      unit: 'm²',
                    })
                  }
                  if (property.bouwjaar) {
                    specs.push({ label: 'Bouwjaar', value: String(property.bouwjaar) })
                  }
                  return specs.map((sp, i) => (
                    <View
                      key={sp.label}
                      style={i === 0 ? [s.coverSpec, s.coverSpecFirst] : s.coverSpec}
                    >
                      <Text style={s.coverSpecLabel}>{sp.label}</Text>
                      <Text style={s.coverSpecValue}>
                        {sp.value}
                        {sp.unit ? <Text style={s.coverSpecUnit}>{sp.unit}</Text> : null}
                      </Text>
                    </View>
                  ))
                })()}
              </View>
            </View>
          </View>

          <View style={s.coverRight}>
            {heroFoto ? <Image src={heroFoto} style={s.coverHeroImg} /> : null}
          </View>
        </View>
      </Page>

      {/* ─── 02 DETAIL ───────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <Header wordmarkSrc={wordmarkSrc} />
        <View style={s.pdfBody}>
          <SectionTitle
            eyebrow="Kenmerken & locatie"
            counter={isPitch ? '02 / 04 · Detail' : '02 · Detail'}
            title={property.adres}
          />

          <View style={s.presSpecGrid}>
            <View style={s.presSpec}>
              <Text style={s.presSpecLabel}>Vraagprijs</Text>
              <Text style={[s.presSpecValue, s.presSpecAccent]}>
                {fmtEuro(property.vraagprijs)}
              </Text>
            </View>
            {property.oppervlakte ? (
              <View style={s.presSpec}>
                <Text style={s.presSpecLabel}>Oppervlakte</Text>
                <Text style={s.presSpecValue}>
                  {property.oppervlakte}
                  <Text style={s.presSpecUnit}>m²</Text>
                </Text>
              </View>
            ) : null}
            {property.kavel ? (
              <View style={s.presSpec}>
                <Text style={s.presSpecLabel}>Kavel</Text>
                <Text style={s.presSpecValue}>
                  {property.kavel}
                  <Text style={s.presSpecUnit}>m²</Text>
                </Text>
              </View>
            ) : null}
            {property.slaapkamers ? (
              <View style={s.presSpec}>
                <Text style={s.presSpecLabel}>Slaapkamers</Text>
                <Text style={s.presSpecValue}>{property.slaapkamers}</Text>
              </View>
            ) : null}
            {property.badkamers ? (
              <View style={[s.presSpec, s.presSpecSm]}>
                <Text style={s.presSpecLabel}>Badkamers</Text>
                <Text style={s.presSpecValue}>{property.badkamers}</Text>
              </View>
            ) : null}
            {property.type ? (
              <View style={[s.presSpec, s.presSpecSm]}>
                <Text style={s.presSpecLabel}>Type</Text>
                <Text style={s.presSpecValue}>{formatType(property.type)}</Text>
              </View>
            ) : null}
            {property.regio ? (
              <View style={[s.presSpec, s.presSpecSm]}>
                <Text style={s.presSpecLabel}>Regio</Text>
                <Text style={s.presSpecValue}>{property.regio}</Text>
              </View>
            ) : null}
            {property.terras ? (
              <View style={[s.presSpec, s.presSpecSm]}>
                <Text style={s.presSpecLabel}>Terras</Text>
                <Text style={s.presSpecValue}>
                  {String(property.terras)}
                  <Text style={s.presSpecUnit}>m²</Text>
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.presCols}>
            {hasOmschrijving && (
              <View style={s.presColsLeft}>
                <View style={s.blockH}>
                  <Text style={s.blockHNum}>01 / Beschrijving</Text>
                </View>
                <Text style={s.blockTitle}>
                  Over deze woning
                  <Text style={s.stitleTerminal}>.</Text>
                </Text>
                {omschrijvingParas.map((p, i) => (
                  <Text
                    key={i}
                    style={
                      i < omschrijvingParas.length - 1
                        ? [s.blockBody, s.blockBodyPara]
                        : s.blockBody
                    }
                  >
                    {p}
                  </Text>
                ))}
              </View>
            )}
            {hasRegio && (
              <View style={s.presColsRight}>
                <View style={s.blockH}>
                  <Text style={s.blockHNum}>02 / Locatie</Text>
                </View>
                <Text style={s.blockTitle}>
                  {property.regio}
                  <Text style={s.stitleTerminal}>.</Text>
                </Text>
                {regioParas.map((p, i) => (
                  <Text
                    key={i}
                    style={
                      i < regioParas.length - 1
                        ? [s.blockBody, s.blockBodyPara]
                        : s.blockBody
                    }
                  >
                    {p}
                  </Text>
                ))}
              </View>
            )}
            {hasUnits && (
              <View style={s.presColsRight}>
                <View style={s.blockH}>
                  <Text style={s.blockHNum}>02 / Units</Text>
                </View>
                <Text style={s.blockTitle}>
                  Beschikbare units
                  <Text style={s.stitleTerminal}>.</Text>
                </Text>
                <View style={s.unitsTable}>
                  <View style={s.unitsHeaderRow}>
                    <Text style={[s.unitsHeaderCell, s.unitsColTypology]}>
                      Type
                    </Text>
                    <Text style={[s.unitsHeaderCell, s.unitsColRooms]}>
                      Slpk
                    </Text>
                    <Text style={[s.unitsHeaderCell, s.unitsColSize]}>m²</Text>
                    <Text style={[s.unitsHeaderCell, s.unitsColPrice]}>
                      Vanaf
                    </Text>
                  </View>
                  {units.map((u, i) => (
                    <View
                      key={i}
                      style={
                        i === units.length - 1
                          ? [s.unitsRow, s.unitsRowLast]
                          : s.unitsRow
                      }
                    >
                      <Text style={[s.unitsCell, s.unitsColTypology]}>
                        {u.typology || '—'}
                      </Text>
                      <Text style={[s.unitsCell, s.unitsColRooms]}>
                        {u.rooms ?? '—'}
                      </Text>
                      <Text style={[s.unitsCell, s.unitsColSize]}>
                        {u.size_m2 ?? '—'}
                      </Text>
                      <Text style={[s.unitsCellPrice, s.unitsColPrice]}>
                        {u.price ? fmtEuro(u.price) : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Page>

      {/* ─── 03 PITCH A — Samenvatting & voordelen ─────────────── */}
      {hasPitchA && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <Header wordmarkSrc={wordmarkSrc} />
          <View style={s.pdfBody}>
            <SectionTitle
              eyebrow="Overzicht — Analyse"
              counter="03 / 04 · Pitch A"
              title="Samenvatting & voordelen"
            />

            {lede ? <Text style={s.lede}>{lede}</Text> : null}

            <View style={s.pitchGrid}>
              <View style={s.pitchCol}>
                <View style={s.blockH}>
                  <Text style={s.blockHNum}>A / Voordelen</Text>
                </View>
                <PitchTick kind="pos" />
                <Text style={s.blockTitle}>
                  Wat we sterk vinden
                  <Text style={s.stitleTerminal}>.</Text>
                </Text>
                <PitchList
                  items={(pitch?.voordelen ?? [])
                    .slice(0, 5)
                    .map(stripMarkdown)
                    .filter(Boolean)}
                  kind="pos"
                />
              </View>
              <View style={s.pitchColSpacer} />
              <View style={s.pitchCol}>
                <View style={s.blockH}>
                  <Text style={s.blockHNum}>B / Aandachtspunten</Text>
                </View>
                <PitchTick kind="neg" />
                <Text style={s.blockTitle}>
                  Onderhandelingsruimte
                  <Text style={s.stitleTerminal}>.</Text>
                </Text>
                <PitchList
                  items={(pitch?.nadelen ?? [])
                    .slice(0, 3)
                    .map(stripMarkdown)
                    .filter(Boolean)}
                  kind="neg"
                />
              </View>
            </View>

            {investeringText ? (
              <View style={s.pitchCallout}>
                <View style={s.calloutGlyph}>
                  <Text style={s.calloutGlyphLabel}>Callout</Text>
                  <Text style={s.calloutGlyphNum}>C</Text>
                </View>
                <View style={s.calloutBody}>
                  <Text style={s.calloutLabel}>
                    Prijsanalyse & verhuurpotentieel
                  </Text>
                  <Text style={s.calloutText}>{investeringText}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Page>
      )}

      {/* ─── 04 PITCH B — Costa Select advies ──────────────────── */}
      {hasPitchB && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <Header wordmarkSrc={wordmarkSrc} />
          <View style={s.pdfBody}>
            <SectionTitle
              eyebrow="Ons perspectief"
              counter="04 / 04 · Pitch B"
              title="Costa Select advies"
            />

            <View style={s.adviesHero}>
              <View style={s.adviesSunBar} />
              <View style={s.adviesBody}>
                <View style={s.adviesLabelRow}>
                  <Text style={s.adviesLabel}>Ons advies</Text>
                  {adviesDate ? (
                    <Text style={s.adviesMeta}>— Geüpdatet {adviesDate}</Text>
                  ) : null}
                </View>
                <Text style={s.adviesText}>{adviesText}</Text>
                <View style={s.adviesSignoff}>
                  <Text style={s.adviesSignoffText}>—</Text>
                  <Text style={[s.adviesSignoffText, s.adviesSignoffName]}>
                    Stefan P.
                  </Text>
                  <Text style={s.adviesSignoffText}>
                    · Senior consultant · Costa Select
                  </Text>
                </View>
              </View>
            </View>

            {juridischeRisicos.length > 0 ? (
              <View style={s.pitchGrid}>
                <View style={s.pitchCol}>
                  <View style={s.blockH}>
                    <Text style={s.blockHNum}>D / Juridisch</Text>
                  </View>
                  <PitchTick kind="warn" />
                  <Text style={s.blockTitle}>
                    Due-diligence checklist
                    <Text style={s.stitleTerminal}>.</Text>
                  </Text>
                  <PitchList
                    items={juridischeRisicos
                      .slice(0, 5)
                      .map(stripMarkdown)
                      .filter(Boolean)}
                    kind="warn"
                  />
                </View>
              </View>
            ) : null}
          </View>
        </Page>
      )}

      {/* ─── 05+ FOTO-PAGINA's — adaptieve layout obv aantal foto's ── */}
      {photoTriplets.map((triplet, idx) => {
        const filled = triplet.filter((p): p is string => Boolean(p))
        if (filled.length === 0) return null
        return (
          <Page
            key={`photos-${idx}`}
            size="A4"
            orientation="landscape"
            style={s.page}
          >
            <Header wordmarkSrc={wordmarkSrc} />
            <View style={s.photosBody}>
              {filled.length === 3 ? (
                <View style={s.photosHero}>
                  <View style={s.phHeroLeft}>
                    <Image src={filled[0]} style={s.photoImg} />
                  </View>
                  <View style={s.phHeroRight}>
                    <View style={s.phHeroSmall}>
                      <Image src={filled[1]} style={s.photoImg} />
                    </View>
                    <View style={s.phHeroSmallSpacer} />
                    <View style={s.phHeroSmall}>
                      <Image src={filled[2]} style={s.photoImg} />
                    </View>
                  </View>
                </View>
              ) : filled.length === 2 ? (
                <View style={s.photosHero}>
                  <View style={s.phHeroDuoLeft}>
                    <Image src={filled[0]} style={s.photoImg} />
                  </View>
                  <View style={s.phHeroDuoRight}>
                    <Image src={filled[1]} style={s.photoImg} />
                  </View>
                </View>
              ) : (
                <View style={s.photosHero}>
                  <View style={s.phHeroSolo}>
                    <Image src={filled[0]} style={s.photoImg} />
                  </View>
                </View>
              )}
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
