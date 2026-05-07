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
// Handoff is in px @ 96dpi; @react-pdf rendert in pt @ 72dpi. Conversie:
// pt = px × 0.75. A4 landscape = 842×595pt = 1123×794px.
const DEEPSEA = '#004B46'
const DEEPSEA_DEEP = '#072A24'
const DEEPSEA_LIGHTER = '#E6EFEE'
const SUN = '#F5AF40'
const SUN_DARK = '#C58118'
const SUN_TINT = '#FAEDD0'
const SUN_FRAME = '#EBD9B0'
const MARBLE = '#FFFAEF'
const INK = '#1B2A28'
const INK_SOFT = '#4A5A57'
const INK_MUTE = '#8A9794'
// rgba borders renderen slecht in @react-pdf; pre-blended op marble.
const RULE = '#E5E0D2'
const RULE_STRONG = '#CCC4B1'
// Text colors op deepsea (werken als rgba in @react-pdf).
const ON_DARK_18 = 'rgba(255,250,239,0.18)'
const ON_DARK_20 = 'rgba(255,250,239,0.20)'
const ON_DARK_55 = 'rgba(255,250,239,0.55)'
const ON_DARK_85 = 'rgba(255,250,239,0.85)'
const ON_DARK_BG_08 = 'rgba(255,250,239,0.08)'

const PAD_X = 36 // 48px × 0.75
const PAD_Y_TOP = 16 // 22px × 0.75
const PAD_Y_BOTTOM = 21 // 28px × 0.75

// ─── Types ────────────────────────────────────────────────────────────────
interface Trip {
  id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  trip_date: string
  start_time: string
  start_address: string | null
  lunch_time: string
  lunch_duration_minutes: number
  notes: string | null
  status: string
}
interface Stop {
  id: string
  trip_id: string
  sort_order: number
  address: string
  property_title: string | null
  listing_url: string | null
  price: number | null
  viewing_duration_minutes: number
  contact_name: string | null
  contact_phone: string | null
  notes: string | null
}
interface RouteData {
  stops: Array<{
    stop_id: string
    sort_order: number
    estimated_arrival: string
    estimated_departure: string
    travel_time_to_next_minutes: number
  }>
  lunch: { after_stop_order: number; start_time: string; end_time: string }
  total_driving_minutes: number
  estimated_end_time: string
  route_summary: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtPrice(n: number | null | undefined): string {
  if (n == null) return 'Op aanvraag'
  // NBSP tussen € en bedrag voorkomt dat @react-pdf op de spatie hyphenateert
  // wanneer de cell smal is (volle pagina, 7-koloms timeline-track).
  return `€ ${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)}`
}

function fmtDateNL(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateShort(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
}

function diffMinHM(a: string, b: string): number {
  if (!a || !b) return 0
  const toMin = (s: string): number => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }
  return Math.max(0, toMin(b) - toMin(a))
}

function formatDuration(mins: number | null | undefined): string {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}u ${m}m`
  if (h > 0) return `${h}u`
  return `${m}m`
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
  // Page shell (A4 landscape, marble)
  page: {
    backgroundColor: MARBLE,
    fontFamily: 'Raleway',
    color: INK,
    flexDirection: 'column',
  },

  // ── Header bar (interior pages) — 3-col: eyebrow / wordmark / klantnaam
  hbar: {
    height: 36,
    paddingHorizontal: PAD_X,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MARBLE,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
    flexShrink: 0,
  },
  hbarLeft: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: DEEPSEA,
  },
  hbarWordmark: {
    height: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hbarWordmarkImg: { height: '100%', objectFit: 'contain' },
  hbarRight: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: INK_MUTE,
    textAlign: 'right',
  },

  // ── Body ──
  body: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: PAD_Y_TOP,
    paddingBottom: PAD_Y_BOTTOM,
    flexDirection: 'column',
  },

  // ── Section title row ──
  stitle: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  stitleLeft: { flexDirection: 'column' },
  stitleEyebrow: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    color: DEEPSEA,
    marginBottom: 6,
  },
  stitleSunTick: { width: 24, height: 1.5, backgroundColor: SUN, marginBottom: 6 },
  stitleH2: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 19,
    lineHeight: 1.05,
    letterSpacing: -0.45,
    color: DEEPSEA,
    maxWidth: 540,
  },
  stitleRight: { flexDirection: 'row' },
  stitleStat: {
    flexDirection: 'column',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: RULE,
    textAlign: 'right',
  },
  stitleStatFirst: { paddingLeft: 0 },
  stitleStatLast: { paddingRight: 0, borderRightWidth: 0 },
  stitleStatL: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 3,
  },
  stitleStatV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 15,
    color: DEEPSEA,
    letterSpacing: -0.3,
    lineHeight: 1,
  },
  stitleStatVUnit: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 500,
    color: INK_MUTE,
    marginLeft: 2,
  },

  // ── Cover (split: text 58% / hero 42%) ──
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: DEEPSEA,
    flexDirection: 'row',
  },
  coverLeft: {
    width: '58%',
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 36,
    flexDirection: 'column',
  },
  coverHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverBeeldmerk: {
    width: 36,
    height: 36,
    marginTop: -12,
    marginLeft: -8,
  },
  coverBeeldmerkImg: { width: '100%', height: '100%', objectFit: 'contain' },
  coverBody: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  coverPre: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 700,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 12,
  },
  coverTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 45,
    lineHeight: 0.95,
    letterSpacing: -1.25,
    color: MARBLE,
    marginBottom: 3,
  },
  coverName: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 45,
    lineHeight: 0.95,
    letterSpacing: -1.25,
    color: SUN,
    marginBottom: 21,
  },
  coverNameTerminal: { color: MARBLE },
  coverTick: { width: 36, height: 1.5, backgroundColor: SUN, marginBottom: 15 },
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
    paddingRight: 14,
    marginRight: 14,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: ON_DARK_20,
  },
  coverMetaItemLast: { borderRightWidth: 0, paddingRight: 0, marginRight: 0 },
  coverMetaL: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 4,
  },
  coverMetaV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 16,
    color: MARBLE,
    letterSpacing: -0.3,
    lineHeight: 1,
  },
  coverMetaVDate: { fontSize: 13, lineHeight: 1.15, maxWidth: 165 },
  coverMetaUnit: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 500,
    color: ON_DARK_55,
    marginLeft: 2,
  },
  coverSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  coverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: ON_DARK_BG_08,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: ON_DARK_18,
    borderRadius: 2,
    marginRight: 7,
    marginBottom: 7,
  },
  coverChipNum: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 10,
    color: SUN,
    letterSpacing: -0.1,
    marginRight: 6,
  },
  coverChipText: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 600,
    color: ON_DARK_85,
  },

  coverHero: {
    width: '42%',
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
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  coverHeroTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: SUN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverHeroTagStar: { fontSize: 9, color: DEEPSEA_DEEP, marginRight: 5 },
  coverHeroTagText: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: DEEPSEA_DEEP,
  },
  coverHeroCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'column',
  },
  coverHeroCaptionTi: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1.2,
    letterSpacing: -0.3,
    color: MARBLE,
  },

  // ── Itinerary timeline ──
  htrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 0,
  },
  // Segment (connector tussen nodes). Wide genoeg voor 2-cijferige
  // minuten-pill ("28m") zonder dat @react-pdf hyphenateert.
  hseg: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 3,
    width: 48,
    flexShrink: 0,
  },
  hsegWide: { width: 54 },
  hsegDense: { width: 40 },
  hsegLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: RULE_STRONG,
    marginTop: 42, // verticaal gecentreerd op de dot-rij (height 48 - 1.5/2 ≈ 42)
  },
  hsegLineLunch: { backgroundColor: SUN },
  hsegPill: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE_STRONG,
    borderRadius: 999,
  },
  hsegPillText: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    color: INK_SOFT,
  },
  hsegPillLunch: { backgroundColor: SUN, borderColor: SUN_DARK },
  hsegPillLunchText: { color: DEEPSEA_DEEP },

  // Node column
  hnode: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'column',
    minWidth: 0,
  },
  hnodeFixed: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  hnodeStartEnd: { width: 82 },
  hnodeLunch: { width: 72 },
  hnodeStartEndDense: { width: 72 },
  hnodeLunchDense: { width: 63 },

  hnodeDotrow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hnodeDot: {
    width: 33,
    height: 33,
    borderRadius: 999,
    backgroundColor: MARBLE,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: DEEPSEA,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hnodeDotText: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 13.5,
    color: DEEPSEA,
  },
  hnodeDotStartEnd: { backgroundColor: DEEPSEA },
  hnodeDotStartEndText: { color: MARBLE, fontSize: 12 },
  hnodeDotLunch: { backgroundColor: SUN, borderColor: SUN_DARK },
  hnodeDotLunchText: { color: DEEPSEA_DEEP, fontSize: 12 },

  hnodeTime: {
    textAlign: 'center',
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 13.5,
    color: DEEPSEA,
    marginTop: 6,
    lineHeight: 1,
  },
  hnodeTimeEnd: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 600,
    color: INK_MUTE,
    letterSpacing: 0.3,
    marginTop: 3,
    textAlign: 'center',
  },

  hnodeCard: {
    flex: 1,
    marginTop: 9,
    padding: 9,
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: RULE,
    borderRadius: 2,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  hnodeCardStartEnd: {
    backgroundColor: DEEPSEA_LIGHTER,
    borderColor: '#B8CECB',
  },
  hnodeCardLunch: {
    backgroundColor: SUN_TINT,
    borderColor: SUN_FRAME,
  },
  hnodeCardDense: { padding: 7.5 },

  hnodeEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    overflow: 'hidden',
  },
  hnodeEyebrowMuted: {},
  hnodeEyebrowNum: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: SUN,
    color: DEEPSEA_DEEP,
    borderRadius: 2,
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    marginRight: 5,
  },
  hnodeEyebrowText: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: SUN_DARK,
  },
  hnodeEyebrowTextMuted: { color: INK_MUTE },

  hnodeTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 10.5,
    lineHeight: 1.15,
    letterSpacing: -0.15,
    color: DEEPSEA,
    marginBottom: 5,
  },
  hnodeTitleStartEnd: { color: DEEPSEA_DEEP },
  hnodeTitleDense: { fontSize: 9.5 },

  hnodeAddr: {
    fontFamily: 'Raleway',
    fontSize: 7.5,
    fontWeight: 500,
    lineHeight: 1.35,
    color: INK_SOFT,
    marginBottom: 5,
  },
  hnodeAddrDense: { fontSize: 7 },

  hnodePrice: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: SUN_TINT,
    borderLeftWidth: 1.5,
    borderLeftStyle: 'solid',
    borderLeftColor: SUN,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 10,
    color: SUN_DARK,
    letterSpacing: -0.1,
    marginBottom: 5,
  },
  hnodePriceDense: { fontSize: 9 },

  hnodeMeta: {
    marginTop: 'auto',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE,
    flexDirection: 'column',
  },
  hnodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hnodeMetaText: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 600,
    color: INK_SOFT,
  },
  hnodeBigtime: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 16,
    color: SUN_DARK,
    letterSpacing: -0.3,
    marginVertical: 3,
  },

  // ── Route logic strip ──
  routelogic: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: DEEPSEA,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  routelogicIcon: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: SUN,
    color: DEEPSEA_DEEP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    marginTop: 1,
  },
  routelogicIconText: {
    fontSize: 9,
    fontWeight: 700,
    color: DEEPSEA_DEEP,
  },
  routelogicBody: { flex: 1 },
  routelogicLbl: {
    fontFamily: 'Raleway',
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: SUN,
    marginBottom: 3,
  },
  routelogicTxt: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 500,
    lineHeight: 1.45,
    color: ON_DARK_85,
  },

  // ── Stop detail page (grid) ──
  stopGrid: {
    flex: 1,
    flexDirection: 'column',
  },
  stopGridRow: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 10,
  },
  stopGridRowLast: { marginBottom: 0 },

  stopcard: {
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
  stopcardLast: { marginRight: 0 },
  stopcardFavWrap: {
    flex: 1,
    backgroundColor: SUN_TINT,
    padding: 3,
    borderRadius: 2,
    marginRight: 10,
  },
  stopcardFavWrapLast: { marginRight: 0 },
  stopcardFavInner: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: MARBLE,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: SUN,
    borderRadius: 2,
    overflow: 'hidden',
  },

  stopcardStripe: {
    width: 42,
    flexShrink: 0,
    backgroundColor: DEEPSEA,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  stopcardStripeFav: { backgroundColor: SUN },
  stopcardStripeNum: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 21,
    letterSpacing: -0.42,
    color: MARBLE,
    lineHeight: 1,
  },
  stopcardStripeNumFav: { color: DEEPSEA_DEEP },
  stopcardStripeClock: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: -0.1,
    color: MARBLE,
    lineHeight: 1,
  },
  stopcardStripeClockFav: { color: DEEPSEA_DEEP },

  stopcardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'column',
  },
  stopcardEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stopcardEyebrowText: {
    fontFamily: 'Raleway',
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: SUN_DARK,
  },
  stopcardEyebrowArr: { color: INK_MUTE, marginHorizontal: 4 },
  stopcardTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 13,
    lineHeight: 1.1,
    letterSpacing: -0.15,
    color: DEEPSEA,
    marginBottom: 4,
  },
  stopcardAddr: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 500,
    color: INK_SOFT,
    lineHeight: 1.35,
    marginBottom: 4,
  },
  stopcardNote: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: SUN_TINT,
    borderLeftWidth: 1.5,
    borderLeftStyle: 'solid',
    borderLeftColor: SUN,
    fontFamily: 'Bricolage Grotesque',
    fontSize: 8,
    color: INK,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  stopcardFoot: {
    marginTop: 'auto',
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE,
    flexDirection: 'column',
  },
  stopcardFootL: {
    fontFamily: 'Raleway',
    fontSize: 6,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 2,
  },
  stopcardFootV: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 11,
    color: SUN_DARK,
    letterSpacing: -0.1,
    lineHeight: 1.1,
  },
})

// ─── Components ───────────────────────────────────────────────────────────

function HeaderBar({ klantNaam, wordmarkSrc }: { klantNaam: string; wordmarkSrc?: string }) {
  return (
    <View style={s.hbar}>
      <Text style={s.hbarLeft}>Bezichtigingsdag</Text>
      <View style={s.hbarWordmark}>
        {wordmarkSrc && <Image src={wordmarkSrc} style={s.hbarWordmarkImg} />}
      </View>
      <Text style={s.hbarRight}>{klantNaam}</Text>
    </View>
  )
}

function CoverPage({
  trip,
  stops,
  route,
  beeldmerkSrc,
  heroSrc,
}: {
  trip: Trip
  stops: Stop[]
  route: RouteData | null
  beeldmerkSrc?: string
  heroSrc?: string
}) {
  const totalDriving = route?.total_driving_minutes ?? 0
  const numStops = stops.length
  const totalViewing = stops.reduce((a, st) => a + (st.viewing_duration_minutes || 0), 0)
  // Splits naam in voornaam (groot, marble) en achternaam (sun)
  const parts = (trip.client_name || 'Klant').split(' ')
  const first = parts[0]
  const rest = parts.slice(1).join(' ')

  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap={false}>
      <View style={s.cover}>
        <View style={s.coverLeft}>
          <View style={s.coverHead}>
            <View style={s.coverBeeldmerk}>
              {beeldmerkSrc && <Image src={beeldmerkSrc} style={s.coverBeeldmerkImg} />}
            </View>
          </View>

          <View style={s.coverBody}>
            <Text style={s.coverPre}>Een dag bezichtigen voor</Text>
            <Text style={s.coverTitle}>{first}</Text>
            <Text style={s.coverName}>
              {rest || first}
              <Text style={s.coverNameTerminal}>.</Text>
            </Text>

            <View style={s.coverTick} />

            <View style={s.coverMeta}>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaL}>Datum</Text>
                <Text style={[s.coverMetaV, s.coverMetaVDate]}>{fmtDateNL(trip.trip_date)}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaL}>Vertrek</Text>
                <Text style={s.coverMetaV} wrap={false}>{trip.start_time}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaL}>Einde</Text>
                <Text style={s.coverMetaV} wrap={false}>{route?.estimated_end_time || '—'}</Text>
              </View>
              <View style={[s.coverMetaItem, s.coverMetaItemLast]}>
                <Text style={s.coverMetaL}>Stops</Text>
                <Text style={s.coverMetaV} wrap={false}>
                  {numStops}
                  <Text style={s.coverMetaUnit}>×</Text>
                </Text>
              </View>
            </View>

            <View style={s.coverSummary}>
              <View style={s.coverChip}>
                <Text style={s.coverChipNum} wrap={false}>{formatDuration(totalDriving)}</Text>
                <Text style={s.coverChipText}>totale rijtijd</Text>
              </View>
              {route?.lunch && (
                <View style={s.coverChip}>
                  <Text style={s.coverChipNum} wrap={false}>{route.lunch.start_time}</Text>
                  <Text style={s.coverChipText} wrap={false}>
                    lunchpauze · {route.lunch.end_time}
                  </Text>
                </View>
              )}
              <View style={s.coverChip}>
                <Text style={s.coverChipNum} wrap={false}>{totalViewing}m</Text>
                <Text style={s.coverChipText}>aan bezichtigingen</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.coverHero}>
          {heroSrc ? (
            <Image src={heroSrc} style={s.coverHeroImg} />
          ) : (
            <View style={s.coverHeroEmpty}>
              <Text style={s.coverHeroEmptyText}>Hero foto regio</Text>
            </View>
          )}
          <View style={s.coverHeroTag}>
            <Text style={s.coverHeroTagText} wrap={false}>Bezichtigingsdag</Text>
          </View>
          <View style={s.coverHeroCaption}>
            <Text style={s.coverHeroCaptionTi}>
              {numStops} bezichtigingen, één dag
            </Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// Itinerary node-types voor de horizontale timeline-builder
type Node =
  | { kind: 'start'; time: string; title: string; subtitle: string }
  | { kind: 'segment'; minutes: number; lunch: boolean }
  | {
      kind: 'stop'
      sortOrder: number
      time: string
      endTime: string
      stop: Stop
    }
  | { kind: 'lunch'; time: string; endTime: string; duration: number; title: string }
  | { kind: 'end'; time: string; title: string; subtitle: string }

function buildNodes(
  trip: Trip,
  stops: Stop[],
  route: RouteData,
  options?: { endAddressOverride?: string; omitEndNode?: boolean },
): Node[] {
  const list: Node[] = []
  list.push({
    kind: 'start',
    time: trip.start_time,
    title: 'Vertrek',
    subtitle: trip.start_address || '—',
  })
  const rs = route.stops || []
  rs.forEach((r, idx) => {
    const prevTravel =
      idx === 0
        ? diffMinHM(trip.start_time, r.estimated_arrival)
        : rs[idx - 1].travel_time_to_next_minutes
    list.push({ kind: 'segment', minutes: prevTravel, lunch: false })
    const stop = stops.find(st => st.id === r.stop_id)
    if (stop) {
      list.push({
        kind: 'stop',
        sortOrder: r.sort_order,
        time: r.estimated_arrival,
        endTime: r.estimated_departure,
        stop,
      })
    }
    if (route.lunch?.after_stop_order === r.sort_order) {
      const segMin = diffMinHM(r.estimated_departure, route.lunch.start_time)
      list.push({ kind: 'segment', minutes: segMin, lunch: true })
      list.push({
        kind: 'lunch',
        time: route.lunch.start_time,
        endTime: route.lunch.end_time,
        duration: diffMinHM(route.lunch.start_time, route.lunch.end_time),
        title: 'Lunchpauze',
      })
    }
  })
  // End-node alleen op de laatste itinerary-pagina; bij split blijft pagina 1
  // hangen op de lunch (geen 'Einde 14:00' die suggereert dat de dag voorbij
  // is terwijl er nog een tweede pagina volgt).
  if (!options?.omitEndNode) {
    const endAddress = options?.endAddressOverride ?? trip.start_address
    list.push({
      kind: 'end',
      time: route.estimated_end_time,
      title: 'Einde',
      subtitle: endAddress ? `Terug bij ${endAddress.split(',')[0]}` : 'Afronding',
    })
  }
  return list
}

function ItineraryPage({
  trip,
  stops,
  route,
  wordmarkSrc,
  partLabel,
  endAddressOverride,
  omitEndNode,
}: {
  trip: Trip
  stops: Stop[]
  route: RouteData
  wordmarkSrc?: string
  partLabel?: string
  endAddressOverride?: string
  omitEndNode?: boolean
}) {
  // Dense modus pas vanaf 5 stops op één pagina. Bij gesplitste itinerary
  // hebben we typisch 4 of minder per pagina, dus geen dense.
  const isDense = stops.length >= 5
  const nodes = buildNodes(trip, stops, route, { endAddressOverride, omitEndNode })

  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap={false}>
      <HeaderBar klantNaam={trip.client_name} wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <View style={s.stitle}>
          <View style={s.stitleLeft}>
            <Text style={s.stitleEyebrow}>
              De dag in één lijn{partLabel ? ` · ${partLabel}` : ''}
            </Text>
            <View style={s.stitleSunTick} />
            <Text style={s.stitleH2}>Bezichtigingsroute · {fmtDateShort(trip.trip_date)}</Text>
          </View>
          <View style={s.stitleRight}>
            <View style={[s.stitleStat, s.stitleStatFirst]}>
              <Text style={s.stitleStatL}>Start</Text>
              <Text style={s.stitleStatV} wrap={false}>{trip.start_time}</Text>
            </View>
            <View style={s.stitleStat}>
              <Text style={s.stitleStatL}>Rijtijd</Text>
              <Text style={s.stitleStatV} wrap={false}>
                {formatDuration(route.total_driving_minutes)}
              </Text>
            </View>
            <View style={[s.stitleStat, s.stitleStatLast]}>
              <Text style={s.stitleStatL}>Einde</Text>
              <Text style={s.stitleStatV} wrap={false}>{route.estimated_end_time}</Text>
            </View>
          </View>
        </View>

        <View style={s.htrack}>
          {nodes.map((n, idx) => {
            if (n.kind === 'segment') {
              return (
                <Segment key={`seg-${idx}`} minutes={n.minutes} isLunch={n.lunch} isDense={isDense} />
              )
            }
            return <NodeColumn key={`n-${idx}`} node={n} isDense={isDense} />
          })}
        </View>

        {route.route_summary && (
          <View style={s.routelogic}>
            <View style={s.routelogicIcon}>
              <Text style={s.routelogicIconText}>✦</Text>
            </View>
            <View style={s.routelogicBody}>
              <Text style={s.routelogicLbl}>Route-logica</Text>
              <Text style={s.routelogicTxt}>{route.route_summary}</Text>
            </View>
          </View>
        )}
      </View>
    </Page>
  )
}

function Segment({
  minutes,
  isLunch,
  isDense,
}: {
  minutes: number
  isLunch: boolean
  isDense: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segStyle: any[] = [s.hseg]
  if (isDense) segStyle.push(s.hsegDense)
  else if (minutes >= 25) segStyle.push(s.hsegWide)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineStyle: any[] = [s.hsegLine]
  if (isLunch) lineStyle.push(s.hsegLineLunch)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pillStyle: any[] = [s.hsegPill]
  if (isLunch) pillStyle.push(s.hsegPillLunch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pillTextStyle: any[] = [s.hsegPillText]
  if (isLunch) pillTextStyle.push(s.hsegPillLunchText)

  return (
    <View style={segStyle}>
      <View style={lineStyle} />
      <View style={pillStyle} wrap={false}>
        <Text style={pillTextStyle}>{minutes}m</Text>
      </View>
    </View>
  )
}

function NodeColumn({ node, isDense }: { node: Node; isDense: boolean }) {
  if (node.kind === 'segment') return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colStyle: any[] = [s.hnode]
  if (node.kind === 'start' || node.kind === 'end') {
    colStyle.push(s.hnodeFixed)
    colStyle.push(isDense ? s.hnodeStartEndDense : s.hnodeStartEnd)
  } else if (node.kind === 'lunch') {
    colStyle.push(s.hnodeFixed)
    colStyle.push(isDense ? s.hnodeLunchDense : s.hnodeLunch)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotStyle: any[] = [s.hnodeDot]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotTextStyle: any[] = [s.hnodeDotText]
  if (node.kind === 'start' || node.kind === 'end') {
    dotStyle.push(s.hnodeDotStartEnd)
    dotTextStyle.push(s.hnodeDotStartEndText)
  } else if (node.kind === 'lunch') {
    dotStyle.push(s.hnodeDotLunch)
    dotTextStyle.push(s.hnodeDotLunchText)
  }

  // Dots: stops dragen het volgnummer; start/end/lunch alleen kleur (Bricolage
  // heeft geen emoji-glyphs, en de card-eyebrow eronder benoemt het al
  // expliciet — VERTREKPUNT, EINDPUNT, PAUZE).
  const dotContent = node.kind === 'stop' ? String(node.sortOrder) : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardStyle: any[] = [s.hnodeCard]
  if (node.kind === 'start' || node.kind === 'end') cardStyle.push(s.hnodeCardStartEnd)
  else if (node.kind === 'lunch') cardStyle.push(s.hnodeCardLunch)
  if (isDense) cardStyle.push(s.hnodeCardDense)

  return (
    <View style={colStyle}>
      <View style={s.hnodeDotrow}>
        <View style={dotStyle}>
          {dotContent ? (
            <Text style={dotTextStyle} wrap={false}>{dotContent}</Text>
          ) : null}
        </View>
      </View>
      <Text style={s.hnodeTime} wrap={false}>
        {('time' in node ? node.time : '') || ''}
      </Text>
      {'endTime' in node && node.endTime ? (
        <Text style={s.hnodeTimeEnd} wrap={false}>→ {node.endTime}</Text>
      ) : null}

      <View style={cardStyle}>
        {node.kind === 'stop' && (
          <StopNodeBody node={node} isDense={isDense} />
        )}
        {node.kind === 'lunch' && (
          <LunchNodeBody node={node} />
        )}
        {(node.kind === 'start' || node.kind === 'end') && (
          <StartEndNodeBody node={node} />
        )}
      </View>
    </View>
  )
}

function StopNodeBody({
  node,
  isDense,
}: {
  node: Extract<Node, { kind: 'stop' }>
  isDense: boolean
}) {
  const lastSeg = (node.stop.address || '').split(',').slice(-1)[0].trim() || 'Stop'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleStyles: any[] = [s.hnodeTitle]
  if (isDense) titleStyles.push(s.hnodeTitleDense)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addrStyles: any[] = [s.hnodeAddr]
  if (isDense) addrStyles.push(s.hnodeAddrDense)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceStyles: any[] = [s.hnodePrice]
  if (isDense) priceStyles.push(s.hnodePriceDense)

  return (
    <>
      <View style={s.hnodeEyebrow}>
        <Text style={s.hnodeEyebrowNum}>{String(node.sortOrder).padStart(2, '0')}</Text>
        <Text style={s.hnodeEyebrowText}>{lastSeg}</Text>
      </View>
      {/* Title + address: als property_title leeg is OF gelijk aan address,
          tonen we alleen het adres als titel — anders zou het identieke
          adres dubbel verschijnen (eenmaal als heading, eenmaal als
          subtitle) zoals consultants in de PDF zagen. */}
      {(() => {
        const t = node.stop.property_title?.trim()
        const showSeparate = !!t && t !== node.stop.address
        return (
          <>
            <Text
              style={[
                ...titleStyles,
                { maxLines: 3, textOverflow: 'ellipsis' },
              ]}
            >
              {t || node.stop.address}
            </Text>
            {showSeparate && (
              <Text
                style={[
                  ...addrStyles,
                  { maxLines: 2, textOverflow: 'ellipsis' },
                ]}
              >
                {node.stop.address}
              </Text>
            )}
          </>
        )
      })()}
      {node.stop.price != null && (
        <Text style={priceStyles} wrap={false}>{fmtPrice(node.stop.price)}</Text>
      )}
      <View style={s.hnodeMeta}>
        <View style={s.hnodeMetaRow}>
          <Text style={s.hnodeMetaText}>
            {node.stop.viewing_duration_minutes}m{!isDense ? ' bezichtiging' : ''}
          </Text>
        </View>
        {!isDense && node.stop.contact_name && (
          <View style={s.hnodeMetaRow}>
            <Text style={s.hnodeMetaText}>{node.stop.contact_name}</Text>
          </View>
        )}
        {!isDense && node.stop.contact_phone && (
          <View style={s.hnodeMetaRow}>
            <Text style={s.hnodeMetaText}>{node.stop.contact_phone}</Text>
          </View>
        )}
      </View>
    </>
  )
}

function LunchNodeBody({ node }: { node: Extract<Node, { kind: 'lunch' }> }) {
  return (
    <>
      <View style={s.hnodeEyebrow}>
        <Text style={[s.hnodeEyebrowText, { color: SUN_DARK }]}>Pauze</Text>
      </View>
      <Text style={s.hnodeTitle}>{node.title}</Text>
      <Text style={s.hnodeBigtime} wrap={false}>{node.duration} min</Text>
      <Text style={[s.hnodeAddr, { maxLines: 2 }]}>
        Tijd om te ontspannen, te eten en de ochtend te bespreken.
      </Text>
    </>
  )
}

function StartEndNodeBody({
  node,
}: {
  node: Extract<Node, { kind: 'start' | 'end' }>
}) {
  return (
    <>
      <View style={s.hnodeEyebrow}>
        <Text style={[s.hnodeEyebrowText, s.hnodeEyebrowTextMuted]}>
          {node.kind === 'start' ? 'Vertrekpunt' : 'Eindpunt'}
        </Text>
      </View>
      <Text style={[s.hnodeTitle, s.hnodeTitleStartEnd]}>{node.title}</Text>
      <Text style={[s.hnodeAddr, { maxLines: 3 }]}>{node.subtitle}</Text>
    </>
  )
}

function StopDetailPage({
  trip,
  stops,
  route,
  cols,
  wordmarkSrc,
}: {
  trip: Trip
  stops: Stop[]
  route: RouteData
  cols: 2 | 3
  wordmarkSrc?: string
}) {
  const ordered = (route.stops || [])
    .map(r => ({ row: r, stop: stops.find(st => st.id === r.stop_id) }))
    .filter((x): x is { row: RouteData['stops'][number]; stop: Stop } => !!x.stop)

  // Verdeel in rijen van `cols` kolommen
  const rows: typeof ordered[] = []
  for (let i = 0; i < ordered.length; i += cols) {
    rows.push(ordered.slice(i, i + cols))
  }

  return (
    <Page size="A4" orientation="landscape" style={s.page} wrap={false}>
      <HeaderBar klantNaam={trip.client_name} wordmarkSrc={wordmarkSrc} />
      <View style={s.body}>
        <View style={s.stitle}>
          <View style={s.stitleLeft}>
            <Text style={s.stitleEyebrow}>Per woning</Text>
            <View style={s.stitleSunTick} />
            <Text style={s.stitleH2}>Adressen, makelaars & details.</Text>
          </View>
          <View style={s.stitleRight}>
            <View style={[s.stitleStat, s.stitleStatFirst]}>
              <Text style={s.stitleStatL}>Stops</Text>
              <Text style={s.stitleStatV} wrap={false}>{ordered.length}</Text>
            </View>
            <View style={[s.stitleStat, s.stitleStatLast]}>
              <Text style={s.stitleStatL}>Bezichtigingen</Text>
              <Text style={s.stitleStatV} wrap={false}>
                {stops.reduce((a, st) => a + (st.viewing_duration_minutes || 0), 0)}
                <Text style={s.stitleStatVUnit}>m</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={s.stopGrid}>
          {rows.map((row, ri) => (
            <View
              key={`row-${ri}`}
              style={[s.stopGridRow, ri === rows.length - 1 ? s.stopGridRowLast : {}]}
            >
              {row.map((entry, ci) => (
                <StopCard
                  key={entry.stop.id}
                  routeRow={entry.row}
                  stop={entry.stop}
                  isLast={ci === row.length - 1}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Page>
  )
}

function StopCard({
  routeRow,
  stop,
  isLast,
}: {
  routeRow: RouteData['stops'][number]
  stop: Stop
  isLast: boolean
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardStyle: any[] = [s.stopcard]
  if (isLast) cardStyle.push(s.stopcardLast)
  return (
    <View style={cardStyle}>
      <View style={s.stopcardStripe}>
        <Text style={s.stopcardStripeNum} wrap={false}>
          {String(routeRow.sort_order).padStart(2, '0')}
        </Text>
        <Text style={s.stopcardStripeClock} wrap={false}>{routeRow.estimated_arrival}</Text>
      </View>
      <View style={s.stopcardBody}>
        <View style={s.stopcardEyebrow}>
          <Text style={s.stopcardEyebrowText} wrap={false}>{routeRow.estimated_arrival}</Text>
          <Text style={[s.stopcardEyebrowText, s.stopcardEyebrowArr]}>→</Text>
          <Text style={s.stopcardEyebrowText} wrap={false}>{routeRow.estimated_departure}</Text>
          <Text style={[s.stopcardEyebrowText, s.stopcardEyebrowArr]}>·</Text>
          <Text style={s.stopcardEyebrowText} wrap={false}>{stop.viewing_duration_minutes}m</Text>
        </View>
        <Text style={[s.stopcardTitle, { maxLines: 2 }]}>
          {stop.property_title || 'Woning'}
        </Text>
        <Text style={[s.stopcardAddr, { maxLines: 2 }]}>{stop.address}</Text>
        {stop.notes && (
          <Text style={[s.stopcardNote, { maxLines: 2 }]}>{stop.notes}</Text>
        )}
        <View style={s.stopcardFoot}>
          <Text style={s.stopcardFootL}>Vraagprijs</Text>
          <Text style={s.stopcardFootV} wrap={false}>{fmtPrice(stop.price)}</Text>
        </View>
      </View>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────

export function BezichtigingPDF({
  trip,
  stops,
  route,
  beeldmerkSrc,
  wordmarkSrc,
  heroSrc,
}: {
  trip: Trip
  stops: Stop[]
  route: RouteData | null
  beeldmerkSrc?: string
  wordmarkSrc?: string
  heroSrc?: string
}) {
  // Itinerary opdelen: bij ≤6 stops past alles in één horizontale track
  // (dense-modus dekt 5-6). Vanaf 7 stops worden de cellen onleesbaar smal,
  // dus splitsen we naar 2 pagina's. Lunch is de natuurlijke breakpoint;
  // zonder lunch valt de split in de helft.
  const itineraryPages = route
    ? splitItineraryPages(trip, stops, route)
    : []
  const lastIdx = itineraryPages.length - 1
  // Hero-fallback hier i.p.v. in POST handler zodat zowel productie als
  // het lokale render-script dezelfde default krijgen.
  const effectiveHeroSrc = heroSrc ?? getAssetBase64('hero-villa-default.jpg')

  return (
    <Document>
      <CoverPage
        trip={trip}
        stops={stops}
        route={route}
        beeldmerkSrc={beeldmerkSrc}
        heroSrc={effectiveHeroSrc}
      />
      {itineraryPages.map((page, i) => (
        <ItineraryPage
          key={`it-${i}`}
          trip={page.trip}
          stops={page.stops}
          route={page.route}
          wordmarkSrc={wordmarkSrc}
          partLabel={itineraryPages.length > 1 ? `Deel ${i + 1} van ${itineraryPages.length}` : undefined}
          endAddressOverride={page.endAddressOverride}
          // Einde-node alleen op de laatste itinerary-pagina; tussen-pagina's
          // bij split eindigen impliciet (lunch, of "wordt vervolgd" na de
          // laatste stop op die pagina).
          omitEndNode={i < lastIdx}
        />
      ))}
    </Document>
  )
}

// ─── Itinerary splitting ─────────────────────────────────────────────────
// Bij 7+ stops is de horizontale track op één A4-landscape onleesbaar smal.
// Splits dan naar 2 pagina's, met lunch (indien aanwezig) als natuurlijke
// breakpoint. Pagina 2 krijgt een "vervolg"-trip met start_time op
// lunch.end en de eerste post-lunch stop als startpunt.
function splitItineraryPages(
  trip: Trip,
  stops: Stop[],
  route: RouteData
): Array<{ trip: Trip; stops: Stop[]; route: RouteData; endAddressOverride?: string }> {
  if (stops.length <= 6) {
    return [{ trip, stops, route }]
  }

  const sortedRouteStops = [...route.stops].sort((a, b) => a.sort_order - b.sort_order)
  const splitOrder =
    route.lunch?.after_stop_order ?? Math.ceil(sortedRouteStops.length / 2)

  const beforeRouteStops = sortedRouteStops.filter(rs => rs.sort_order <= splitOrder)
  const afterRouteStops = sortedRouteStops.filter(rs => rs.sort_order > splitOrder)
  const beforeIds = new Set(beforeRouteStops.map(rs => rs.stop_id))
  const stopsBefore = stops.filter(s => beforeIds.has(s.id))
  const stopsAfter = stops.filter(s => !beforeIds.has(s.id))

  const lastBeforeDeparture =
    beforeRouteStops[beforeRouteStops.length - 1]?.estimated_departure ?? trip.start_time

  // Pagina 1: oorspronkelijke trip + lunch (indien op deze helft valt) +
  // einde wordt lunch.end of laatste departure.
  const page1Route: RouteData = {
    ...route,
    stops: beforeRouteStops,
    estimated_end_time: route.lunch?.end_time ?? lastBeforeDeparture,
  }

  // Pagina 2: trip krijgt nieuwe start_time/start_address zodat de
  // "Vertrekpunt"-card de continuatie aanduidt. Lunch op pagina 2
  // weglaten — die staat al op pagina 1.
  const page2Trip: Trip = {
    ...trip,
    start_time: route.lunch?.end_time ?? lastBeforeDeparture,
    start_address: route.lunch
      ? 'Vervolg na lunchpauze'
      : `Vervolg vanaf ${trip.start_address ?? 'startpunt'}`,
  }
  const page2Route: RouteData = {
    ...route,
    stops: afterRouteStops,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lunch: undefined as any,
  }

  return [
    { trip, stops: stopsBefore, route: page1Route },
    {
      trip: page2Trip,
      stops: stopsAfter,
      route: page2Route,
      // Eind-node toont het echte hotel-adres ipv de page-2 vertrek-tekst.
      endAddressOverride: trip.start_address ?? undefined,
    },
  ]
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { trip, stops, route, hero_url } = await request.json()

  if (!trip || !trip.id) {
    return NextResponse.json({ error: 'trip ontbreekt' }, { status: 400 })
  }

  const beeldmerkSrc = getAssetBase64('beeldmerk-sun.png')
  const wordmarkSrc = getAssetBase64('wordmark-deepsea-v2.svg')

  const buffer = await renderToBuffer(
    <BezichtigingPDF
      trip={trip as Trip}
      stops={(stops || []) as Stop[]}
      route={(route ?? null) as RouteData | null}
      beeldmerkSrc={beeldmerkSrc}
      wordmarkSrc={wordmarkSrc}
      heroSrc={typeof hero_url === 'string' ? hero_url : undefined}
    />
  )

  const safeName = (trip.client_name || 'klant').replace(/\s+/g, '-').toLowerCase()
  const filename = `bezichtigingsdag-${safeName}-${trip.trip_date}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
