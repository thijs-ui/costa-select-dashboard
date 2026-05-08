// Calculator-PDF document — A4 portrait, mirrors design handoff.
// Tokens uit globale styles vertaald naar pt (px × 0.75).

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import path from 'path'
import fs from 'fs'
import type {
  CalculatorViewModel,
  KkRow,
  ProjectionRow,
} from '@/lib/calculator-pdf-types'

// ─── Fonts ────────────────────────────────────────────────────────────────
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
const SUN_FRAME = '#EBD9B0'
const MARBLE = '#FFFAEF'
const MARBLE_DEEP = '#F4EDDD'
const SEA = '#0EAE96'
const SEA_DARK = '#0B8474'
const SEA_TINT = '#DCF1EC'
const RED_SOFT = '#C24040'
const INK = '#1B2A28'
const INK_SOFT = '#4A5A57'
const INK_MUTE = '#8A9794'
// pre-blended op marble (rgba alphas zijn fragile in @react-pdf)
const RULE = '#E5E0D2'
const RULE_STRONG = '#CCC4B1'
// op deepsea bg — deze wel rgba (werkt op text/border)
const ON_DARK_18 = 'rgba(255,250,239,0.18)'
const ON_DARK_20 = 'rgba(255,250,239,0.20)'
const ON_DARK_55 = 'rgba(255,250,239,0.55)'

// pt = px × 0.75
const PAD_X = 42
const FONT_HEAD = 'Bricolage Grotesque'
const FONT_BODY = 'Raleway'

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtEUR(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const sign = n < 0 ? '−' : ''
  return sign + '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(Math.abs(n))
}
function fmtPct(n: number | null | undefined, dp = 1): string {
  if (n == null || !isFinite(n)) return '—'
  return new Intl.NumberFormat('nl-NL', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n) + '%'
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })
}
function num2(n: number) { return String(n).padStart(2, '0') }

// Lees asset als base64 data-URI. SVG via direct file-path werkt soms niet
// in @react-pdf — de data-URI route is robuust voor png/jpeg/svg.
function loadAssetDataUri(absPath: string): string | null {
  try {
    const buf = fs.readFileSync(absPath)
    const ext = absPath.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'svg' ? 'image/svg+xml' :
      ext === 'png' ? 'image/png' :
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      'application/octet-stream'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
function brandAsset(name: string): string | null {
  return loadAssetDataUri(path.join(process.cwd(), 'public', 'brand', name))
}
function coverPhotoFor(regionId: string): string | null {
  // Per regio een hero-foto; valt terug op default villa als regio-specifiek
  // niet bestaat. Plaats foto's onder /public/calculators-pdf/<regionId>.jpg
  // om automatisch te worden gevonden.
  const candidates = [
    path.join(process.cwd(), 'public', 'calculators-pdf', `${regionId}.jpg`),
    path.join(process.cwd(), 'public', 'calculators-pdf', `${regionId}.png`),
    path.join(process.cwd(), 'public', 'brand', 'hero-villa-default.jpg'),
  ]
  for (const c of candidates) {
    const uri = loadAssetDataUri(c)
    if (uri) return uri
  }
  return null
}

// ─── Styles ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    backgroundColor: MARBLE,
    color: INK,
    fontFamily: FONT_BODY,
    flexDirection: 'column',
  },
  // ── COVER ──
  cover: { flex: 1, flexDirection: 'column', backgroundColor: DEEPSEA },
  coverTop: {
    flexBasis: '58%',
    paddingTop: 33, paddingHorizontal: 42, paddingBottom: 27,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  coverTitle: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 48,
    color: MARBLE, lineHeight: 1.0, letterSpacing: -1.4,
    marginBottom: 4,
  },
  coverTitleDot: { color: SUN },
  coverNameLbl: {
    fontFamily: FONT_BODY, fontSize: 7.5, fontWeight: 700,
    letterSpacing: 1.6, textTransform: 'uppercase',
    color: ON_DARK_55, marginBottom: 4, marginTop: 12,
  },
  coverName: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 22,
    color: SUN, lineHeight: 1.08, letterSpacing: -0.4,
  },
  coverTick: { width: 36, height: 1.5, backgroundColor: SUN, marginTop: 16, marginBottom: 16 },
  coverMeta: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderTopWidth: 0.75, borderTopColor: ON_DARK_20,
    paddingTop: 14,
  },
  coverMetaItem: { width: '50%', marginBottom: 13, paddingRight: 10 },
  coverMetaLbl: {
    fontFamily: FONT_BODY, fontSize: 7, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase',
    color: ON_DARK_55, marginBottom: 4,
  },
  coverMetaVal: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 13,
    color: MARBLE, letterSpacing: -0.2, lineHeight: 1.15,
  },
  coverMetaValPrice: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 16,
    color: MARBLE, letterSpacing: -0.3,
  },
  coverHero: { flexBasis: '42%', backgroundColor: DEEPSEA_DEEP, position: 'relative' },
  coverHeroImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },

  // ── INTERIOR PAGE ──
  hbar: {
    height: 42,
    paddingHorizontal: PAD_X,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: MARBLE,
    borderBottomWidth: 0.75, borderBottomColor: RULE,
    position: 'relative',
  },
  hbarLeft: {
    fontFamily: FONT_BODY, fontSize: 7.5, fontWeight: 700,
    letterSpacing: 1.35, textTransform: 'uppercase', color: DEEPSEA,
  },
  hbarRight: {
    fontFamily: FONT_BODY, fontSize: 7.5, fontWeight: 700,
    letterSpacing: 1.35, textTransform: 'uppercase', color: DEEPSEA,
    textAlign: 'right',
  },
  hbarMark: {
    position: 'absolute',
    top: 14, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  hbarMarkImg: { height: 11 },
  body: { flex: 1, paddingHorizontal: PAD_X, paddingTop: 18, paddingBottom: 18 },
  footer: {
    paddingHorizontal: PAD_X, paddingTop: 9, paddingBottom: 14,
    borderTopWidth: 0.75, borderTopColor: RULE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  disclaimer: {
    fontFamily: FONT_BODY, fontSize: 6.5, fontWeight: 500,
    color: INK_MUTE, lineHeight: 1.5, maxWidth: 420,
  },

  // ── SECTION ──
  section: { marginBottom: 16 },
  sectionTight: { marginBottom: 8 },
  stitle: { marginBottom: 10 },
  stitleEyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stitleNum: {
    fontFamily: FONT_HEAD, fontSize: 8, fontWeight: 700, color: SUN_DARK,
    letterSpacing: 0.3, marginRight: 9,
  },
  stitleEyebrow: {
    fontFamily: FONT_BODY, fontSize: 7.5, fontWeight: 700,
    letterSpacing: 2.1, textTransform: 'uppercase', color: DEEPSEA,
  },
  stitleSunTick: { width: 24, height: 1.5, backgroundColor: SUN, marginBottom: 6 },
  stitleH2: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 19,
    color: DEEPSEA, lineHeight: 1.05, letterSpacing: -0.4,
  },
  stitleH2Compact: { fontSize: 13.5 },
  stitleH2Dot: { color: SUN },
  stitleBlurb: {
    fontFamily: FONT_BODY, fontSize: 8, fontWeight: 500,
    color: INK_SOFT, lineHeight: 1.5, marginTop: 6, maxWidth: 360,
  },

  // ── HERO ──
  hero: {
    backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE_STRONG,
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 9,
    flexDirection: 'row', alignItems: 'center',
  },
  heroDeepsea: { backgroundColor: DEEPSEA, borderColor: DEEPSEA },
  heroSun: { backgroundColor: SUN_TINT, borderColor: SUN_FRAME },
  heroSea: { backgroundColor: SEA_TINT, borderColor: '#A6D9CB' },
  heroStat: { flexDirection: 'column', marginRight: 27 },
  heroStatLbl: {
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: SUN_DARK,
    marginBottom: 4,
  },
  heroStatLblOnDark: { color: SUN },
  heroStatVal: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 27,
    color: DEEPSEA, letterSpacing: -0.6, lineHeight: 1,
  },
  heroStatValOnDark: { color: MARBLE },
  heroStatValPos: { color: SEA_DARK },
  heroStatValNeg: { color: RED_SOFT },
  heroStatUnit: {
    fontFamily: FONT_BODY, fontSize: 9, fontWeight: 500,
    color: INK_MUTE, marginLeft: 3,
  },
  heroStatUnitOnDark: { color: ON_DARK_55 },
  heroStatSub: {
    fontFamily: FONT_BODY, fontSize: 7.5, fontWeight: 500,
    color: INK_MUTE, marginTop: 3,
  },
  heroStatSubOnDark: { color: ON_DARK_55 },
  heroDivider: { width: 0.5, alignSelf: 'stretch', backgroundColor: RULE, marginRight: 27 },
  heroDividerOnDark: { backgroundColor: ON_DARK_18 },

  // ── ROWS ──
  rows: {
    backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE,
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingVertical: 9, paddingHorizontal: 16,
    borderBottomWidth: 0.75, borderBottomColor: RULE,
  },
  rowLg: { paddingVertical: 11 },
  rowLast: { borderBottomWidth: 0 },
  rowLbl: { flexDirection: 'column', flex: 1, paddingRight: 10 },
  rowLblT: {
    fontFamily: FONT_BODY, fontSize: 8.3, fontWeight: 600,
    color: INK, lineHeight: 1.25,
  },
  rowLblTLg: { fontSize: 9 },
  rowLblS: {
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 500,
    color: INK_MUTE, lineHeight: 1.3, marginTop: 2,
  },
  rowVal: {
    fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 10.5,
    color: DEEPSEA, letterSpacing: -0.15,
  },
  rowValLg: { fontSize: 12 },
  rowValPct: {
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 500,
    color: INK_MUTE, marginLeft: 4,
  },
  rowSubtotal: { backgroundColor: MARBLE_DEEP },
  rowTotal: { backgroundColor: DEEPSEA, paddingVertical: 11, borderBottomWidth: 0 },
  rowTotalLblT: { color: MARBLE, fontFamily: FONT_HEAD, fontSize: 9.8, fontWeight: 600, letterSpacing: -0.15 },
  rowTotalLblS: { color: ON_DARK_55, fontSize: 6.8, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700 },
  rowTotalVal: { color: MARBLE, fontSize: 13.5 },
  rowWarnVal: { color: RED_SOFT },

  // ── META STRIP ──
  metaStrip: {
    flexDirection: 'row',
    backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE,
    marginBottom: 9,
  },
  metaCell: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 14,
    borderRightWidth: 0.75, borderRightColor: RULE,
  },
  metaCellLast: { borderRightWidth: 0 },
  metaLbl: {
    fontFamily: FONT_BODY, fontSize: 6.4, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: INK_MUTE,
    marginBottom: 4,
  },
  metaVal: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 12,
    color: DEEPSEA, letterSpacing: -0.18, lineHeight: 1.2,
  },

  // ── COMPARE ──
  compare: { backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE },
  compareHead: {
    flexDirection: 'row', backgroundColor: MARBLE_DEEP,
    borderBottomWidth: 0.75, borderBottomColor: RULE_STRONG,
  },
  compareHeadCell: {
    paddingVertical: 9, paddingHorizontal: 14,
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase', color: INK_MUTE,
    borderRightWidth: 0.75, borderRightColor: RULE,
  },
  compareRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.75, borderBottomColor: RULE,
  },
  compareCell: {
    paddingVertical: 9, paddingHorizontal: 14,
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 9.8,
    color: DEEPSEA, letterSpacing: -0.15,
    borderRightWidth: 0.75, borderRightColor: RULE,
    flexDirection: 'column', justifyContent: 'center',
  },
  compareLabel: {
    fontFamily: FONT_BODY, fontSize: 8.3, fontWeight: 600, color: INK,
  },
  compareLabelSub: {
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 500, color: INK_MUTE,
    marginTop: 2,
  },
  compareNum: { textAlign: 'right' },
  compareWinner: { backgroundColor: SEA_TINT, color: SEA_DARK, fontWeight: 700 },
  compareDelta: { color: INK_MUTE, fontSize: 9 },
  compareDeltaPos: { color: SEA_DARK },
  compareDeltaNeg: { color: RED_SOFT },
  compareTotal: { backgroundColor: DEEPSEA },
  compareTotalCell: { color: MARBLE, fontSize: 11.3 },
  compareTotalLabel: { color: MARBLE, fontFamily: FONT_HEAD, fontWeight: 600 },
  compareTotalDelta: { color: SEA },

  // ── PROJECTION TABLE ──
  table: { backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE, marginTop: 9 },
  tableHead: {
    flexDirection: 'row', backgroundColor: MARBLE_DEEP,
    borderBottomWidth: 0.75, borderBottomColor: RULE_STRONG,
  },
  tableTh: {
    paddingVertical: 7.5, paddingHorizontal: 9,
    fontFamily: FONT_BODY, fontSize: 6.4, fontWeight: 700,
    letterSpacing: 1.3, textTransform: 'uppercase', color: INK_MUTE,
    flex: 1, textAlign: 'right',
  },
  tableThYear: { flex: 0, width: 36, textAlign: 'left', paddingLeft: 14 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.75, borderBottomColor: RULE,
  },
  tableTd: {
    paddingVertical: 6.5, paddingHorizontal: 9,
    fontFamily: FONT_HEAD, fontSize: 9, fontWeight: 500,
    color: DEEPSEA, letterSpacing: -0.1, flex: 1, textAlign: 'right',
  },
  tableTdYear: { flex: 0, width: 36, textAlign: 'left', paddingLeft: 14, color: SUN_DARK, fontWeight: 600, fontSize: 8.3 },
  tableTdNeg: { color: RED_SOFT },
  tableTdPos: { color: SEA_DARK },

  // ── ROI grid (flip) ──
  roiGrid: { flexDirection: 'row', marginBottom: 9 },
  roiCard: {
    flex: 1, marginRight: 10, padding: 14,
    backgroundColor: MARBLE, borderWidth: 0.75, borderColor: RULE_STRONG,
    flexDirection: 'column',
  },
  roiCardLast: { marginRight: 0 },
  roiCardHi: { flex: 1.6, backgroundColor: DEEPSEA, borderColor: DEEPSEA },
  roiL: {
    fontFamily: FONT_BODY, fontSize: 6.8, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: SUN_DARK,
    marginBottom: 6,
  },
  roiLOnDark: { color: SUN },
  roiV: {
    fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 21,
    color: DEEPSEA, letterSpacing: -0.5, lineHeight: 1, marginBottom: 6,
  },
  roiVOnDark: { color: MARBLE },
  roiVXl: { fontSize: 33, letterSpacing: -0.7 },
  roiVUnit: { fontFamily: FONT_BODY, fontSize: 8.3, fontWeight: 500, color: INK_MUTE, marginLeft: 3 },
  roiVUnitOnDark: { color: ON_DARK_55 },
  roiSub: {
    fontFamily: FONT_BODY, fontSize: 7.1, fontWeight: 500,
    color: INK_MUTE, lineHeight: 1.4,
  },
  roiSubOnDark: { color: ON_DARK_55 },
})

// ─── Atoms ────────────────────────────────────────────────────────────────
function HeaderBar({ klantnaam, modeLabel, wordmark }: { klantnaam: string; modeLabel: string; wordmark: string | null }) {
  return (
    <View style={s.hbar}>
      <Text style={s.hbarLeft}>{modeLabel}</Text>
      {wordmark && (
        <View style={s.hbarMark}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image, niet HTML img */}
          <Image src={wordmark} style={s.hbarMarkImg} />
        </View>
      )}
      <Text style={s.hbarRight}>{klantnaam}</Text>
    </View>
  )
}

function Footer() {
  return (
    <View style={s.footer}>
      <Text style={s.disclaimer}>
        <Text style={{ fontWeight: 700, color: INK_SOFT }}>Disclaimer:</Text>{' '}
        Costa Select is geen financieel adviseur. Deze berekening is een{' '}
        <Text style={{ fontWeight: 700, color: INK_SOFT }}>indicatie</Text>{' '}
        op basis van publiek bekende tarieven en consultant-aannames; werkelijke
        uitkomsten kunnen afwijken. Raadpleeg altijd een fiscaal adviseur, gestor of notaris voordat je een aankoopbeslissing neemt.
      </Text>
    </View>
  )
}

function SectionTitle({ num, eyebrow, title, blurb, compact }: {
  num: number; eyebrow: string; title: string; blurb?: string; compact?: boolean
}) {
  return (
    <View style={s.stitle}>
      <View style={s.stitleEyebrowRow}>
        <Text style={s.stitleNum}>{num2(num)}</Text>
        <Text style={s.stitleEyebrow}>{eyebrow}</Text>
      </View>
      <View style={s.stitleSunTick} />
      <Text style={[s.stitleH2, compact ? s.stitleH2Compact : {}]}>
        {title}<Text style={s.stitleH2Dot}>.</Text>
      </Text>
      {blurb && !compact && <Text style={s.stitleBlurb}>{blurb}</Text>}
    </View>
  )
}

function MetaStrip({ cells }: { cells: { l: string; v: string }[] }) {
  return (
    <View style={s.metaStrip}>
      {cells.map((c, i) => (
        <View key={i} style={[s.metaCell, i === cells.length - 1 ? s.metaCellLast : {}]}>
          <Text style={s.metaLbl}>{c.l}</Text>
          <Text style={s.metaVal}>{c.v}</Text>
        </View>
      ))}
    </View>
  )
}

interface RowDef {
  t: string
  sub?: string
  val: string
  pct?: number | null
  kind?: 'total' | 'subtotal' | 'warn'
  lg?: boolean
}

function Rows({ rows }: { rows: RowDef[] }) {
  return (
    <View style={s.rows}>
      {rows.map((r, i) => {
        const isLast = i === rows.length - 1
        const isTotal = r.kind === 'total'
        const isSubtotal = r.kind === 'subtotal'
        const rowStyle = [
          s.row,
          r.lg ? s.rowLg : {},
          isLast ? s.rowLast : {},
          isSubtotal ? s.rowSubtotal : {},
          isTotal ? s.rowTotal : {},
        ]
        return (
          <View key={i} style={rowStyle} wrap={false}>
            <View style={s.rowLbl}>
              <Text style={[
                isTotal ? s.rowTotalLblT : s.rowLblT,
                r.lg && !isTotal ? s.rowLblTLg : {},
              ]}>{r.t}</Text>
              {r.sub && (
                <Text style={isTotal ? s.rowTotalLblS : s.rowLblS}>{r.sub}</Text>
              )}
            </View>
            <Text style={[
              s.rowVal,
              isTotal ? s.rowTotalVal : {},
              r.lg && !isTotal ? s.rowValLg : {},
              r.kind === 'warn' ? s.rowWarnVal : {},
            ]}>
              {r.val}
              {r.pct != null && <Text style={s.rowValPct}> {fmtPct(r.pct, 1)}</Text>}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

interface HeroStat { l: string; v: string; unit?: string; sub?: string; tone?: 'pos' | 'neg' }

function Hero({ stats, tone = 'marble' }: { stats: HeroStat[]; tone?: 'marble' | 'deepsea' | 'sun' | 'sea' }) {
  const onDark = tone === 'deepsea'
  const heroBg =
    tone === 'deepsea' ? s.heroDeepsea :
    tone === 'sun' ? s.heroSun :
    tone === 'sea' ? s.heroSea : {}
  return (
    <View style={[s.hero, heroBg]}>
      {stats.map((st, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {i > 0 && <View style={[s.heroDivider, onDark ? s.heroDividerOnDark : {}]} />}
          <View style={s.heroStat}>
            <Text style={[s.heroStatLbl, onDark ? s.heroStatLblOnDark : {}]}>{st.l}</Text>
            <Text style={[
              s.heroStatVal,
              onDark ? s.heroStatValOnDark : {},
              st.tone === 'pos' ? s.heroStatValPos : {},
              st.tone === 'neg' ? s.heroStatValNeg : {},
            ]}>
              {st.v}
              {st.unit && <Text style={[s.heroStatUnit, onDark ? s.heroStatUnitOnDark : {}]}> {st.unit}</Text>}
            </Text>
            {st.sub && <Text style={[s.heroStatSub, onDark ? s.heroStatSubOnDark : {}]}>{st.sub}</Text>}
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Section blocks ───────────────────────────────────────────────────────
function S01Basis({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  return (
    <View style={s.sectionTight}>
      <SectionTitle
        num={1} eyebrow="Basisgegevens" title="Woning & regio"
        blurb="Vertrekpunt voor alle berekeningen — regio bepaalt ITP, AJD en notaris-tarieven."
        compact={compact}
      />
      <MetaStrip cells={[
        { l: 'Regio', v: vm.regionShort.split(' · ')[0] || vm.regionShort },
        { l: 'Type', v: vm.propType.split(' ')[0] },
        { l: 'Aankoopprijs', v: fmtEUR(vm.price) },
        { l: 'Status', v: vm.isResident ? 'Resident' : 'Niet-resident' },
      ]} />
    </View>
  )
}

function S02KostenKoper({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  const rows: RowDef[] = vm.kkRows.map((r: KkRow) => ({
    t: r.t, sub: r.s, val: fmtEUR(r.val), pct: r.pct,
  }))
  rows.push({ kind: 'total', t: 'Totaal kosten koper', sub: `${fmtPct(vm.kkPct, 1)} van aankoopprijs`, val: fmtEUR(vm.kkTotal) })
  return (
    <View style={s.section}>
      <SectionTitle
        num={2} eyebrow="Kosten koper" title="Belastingen, notaris & advocaat"
        blurb="Eenmalige bijkomende kosten bij aankoop, bovenop de vraagprijs."
        compact={compact}
      />
      {!compact && (
        <Hero tone="sun" stats={[
          { l: 'Totaal kosten koper', v: fmtEUR(vm.kkTotal), sub: `${fmtPct(vm.kkPct, 1)} van ${fmtEUR(vm.price)}` },
          { l: 'Hoofdpost', v: fmtEUR(vm.kkRows[0]?.val ?? 0), sub: `${fmtPct(vm.kkRows[0]?.pct ?? 0, 1)} ${vm.kkRows[0]?.t.split(' — ')[0] ?? ''}` },
        ]} />
      )}
      <Rows rows={rows} />
    </View>
  )
}

function S03Financiering({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  const rows: RowDef[] = [
    { t: 'Eigen geld (downpayment)', sub: `${(100 - vm.ltv).toFixed(1)}% van aankoopprijs`, val: fmtEUR(vm.downPayment) },
    { t: 'Hypotheek', sub: `LTV ${fmtPct(vm.ltv, 1)} · max ${fmtPct(vm.ltvMax, 0)} ${vm.isResident ? 'resident' : 'niet-resident'}`, val: fmtEUR(vm.mortgage) },
    { t: 'Hypotheekrente', sub: `${vm.years} jaar annuïtair`, val: fmtPct(vm.rate, 1) },
  ]
  return (
    <View style={s.sectionTight}>
      <SectionTitle num={3} eyebrow="Financiering" title="Hypotheek & eigen geld" compact={compact} />
      <Rows rows={rows} />
    </View>
  )
}

function S04TotaleInvestering({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  return (
    <View style={s.sectionTight}>
      <SectionTitle num={4} eyebrow="Totale investering" title="Out of pocket" compact={compact} />
      <Rows rows={[
        { t: 'Aankoopprijs woning', val: fmtEUR(vm.totalAankoop) },
        { t: 'Kosten koper', sub: `${fmtPct(vm.kkPct, 1)} bovenop`, val: fmtEUR(vm.totalKK) },
        { kind: 'subtotal', t: 'Bruto investering', val: fmtEUR(vm.totalSom) },
        { kind: 'total', t: 'Eigen inleg', sub: 'Aankoopprijs − hypotheek + KK', val: fmtEUR(vm.totalInleg) },
      ]} />
    </View>
  )
}

function S05Maandlasten({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  const m = vm.monthly
  const rows: RowDef[] = [
    { t: 'Hypotheek (annuïtair)', sub: `${vm.years} jaar · ${fmtPct(vm.rate, 1)}`, val: fmtEUR(m.mortgage), lg: !compact },
    { t: 'IBI — onroerende-zaakbelasting', sub: 'Gemeente, jaarlijks /12', val: fmtEUR(m.ibi), lg: !compact },
    { t: 'VvE / comunidad', sub: 'Vereniging van eigenaars', val: fmtEUR(m.vve), lg: !compact },
    { t: 'Verzekering', sub: 'Opstal + inboedel', val: fmtEUR(m.insurance), lg: !compact },
    { kind: 'total', t: 'Totale maandlast', sub: 'Vaste lasten per maand', val: fmtEUR(m.total) },
  ]
  return (
    <View style={s.section}>
      <SectionTitle
        num={5} eyebrow="Maandlasten" title="Vaste lasten per maand"
        blurb="Hypotheek + lokale lasten + verzekering."
        compact={compact}
      />
      {!compact && (
        <Hero tone="deepsea" stats={[
          { l: 'Totale maandlast', v: fmtEUR(m.total), sub: 'Per maand · vaste lasten' },
          { l: 'Hypotheek-aandeel', v: fmtPct((m.mortgage / Math.max(1, m.total)) * 100, 0), sub: `${fmtEUR(m.mortgage)} per maand` },
          { l: 'Lokale lasten', v: fmtEUR(m.ibi + m.vve), sub: 'IBI + VvE' },
        ]} />
      )}
      <Rows rows={rows} />
    </View>
  )
}

function S06Verhuur({ vm, compact }: { vm: CalculatorViewModel; compact?: boolean }) {
  const r = vm.rental
  if (!r) return null
  const rows: RowDef[] = [
    { t: 'Bruto huur', sub: `${fmtEUR(r.monthlyRent)} × 12 mnd`, val: fmtEUR(r.annualGross) },
    { t: 'Bezettingsgraad', sub: `${r.occupancy}% effectief`, val: fmtEUR(r.effectiveRent) },
    { t: 'Beheer (property mgmt)', sub: `${r.managementPct}% van huur`, val: '− ' + fmtEUR(r.managementCost) },
    { t: 'Onderhoud + reservering', sub: `${r.maintenancePct}% van huur`, val: '− ' + fmtEUR(r.maintenanceCost) },
    { t: 'Vaste lasten (IBI/VvE/verz.)', sub: '× 12 maanden', val: '− ' + fmtEUR(r.fixedCosts) },
    { kind: 'subtotal', t: 'Netto operationele winst', sub: 'Vóór belasting', val: fmtEUR(r.netOperating) },
  ]
  if (r.irnrTax != null && r.netAfterTax != null) {
    rows.push({ t: 'IRNR — belasting niet-resident', sub: `${r.irnrPct}% over netto winst`, val: '− ' + fmtEUR(r.irnrTax) })
    rows.push({ kind: 'total', t: 'Netto na belasting', sub: `Rendement op eigen geld ${fmtPct(r.yieldOnEquity, 1)}`, val: fmtEUR(r.netAfterTax) })
  } else {
    rows.push({ kind: 'total', t: 'Netto in SL (vóór VPB)', sub: `Rendement op eigen geld ${fmtPct(r.yieldOnEquity, 1)}`, val: fmtEUR(r.netOperating) })
  }
  return (
    <View style={s.section}>
      <SectionTitle
        num={6} eyebrow="Verhuur" title="Inkomsten & rendement"
        blurb="Bruto huur, beheer + onderhoud, IRNR-belasting (19% niet-resident), netto rendement."
        compact={compact}
      />
      <Hero tone="sea" stats={[
        { l: 'Rendement op eigen geld', v: fmtPct(r.yieldOnEquity, 1), tone: 'pos', sub: 'Netto na belasting / inleg' },
        { l: 'Netto winst per jaar', v: fmtEUR(r.netAfterTax ?? r.netOperating), tone: 'pos', sub: 'Na IRNR & vaste lasten' },
        { l: 'Bruto huur / mnd', v: fmtEUR(r.monthlyRent), sub: `${r.occupancy}% bezetting` },
      ]} />
      <Rows rows={rows} />
    </View>
  )
}

function S07SL({ vm }: { vm: CalculatorViewModel }) {
  const sl = vm.sl
  if (!sl) return null
  return (
    <View style={s.section}>
      <SectionTitle
        num={7} eyebrow="Sociedad Limitada" title="Fiscaal voordeel via SL"
        blurb="Afschrijving op gebouwwaarde + 100% aftrekbare hypotheekrente verlagen de belastbare winst."
      />
      <Hero tone="sea" stats={[
        { l: 'Belastbare winst SL', v: fmtEUR(sl.taxableProfit), tone: sl.taxableProfit < 0 ? 'pos' : 'neg', sub: sl.taxableProfit < 0 ? 'Fiscaal verlies — geen VPB' : 'Na alle aftrekposten' },
        { l: `VPB (${sl.vpbAge === 'young' ? 'young < 2j' : 'mature 2+j'})`, v: fmtEUR(sl.vpb), sub: `${sl.vpbAge === 'young' ? sl.vpbPctYoung : sl.vpbPctMature}% over winst` },
        { l: 'Voordeel vs privé', v: '+' + fmtEUR(sl.voordeelVsPrive), tone: 'pos', sub: 'Bespaard t.o.v. IRNR-route' },
      ]} />
      <Rows rows={[
        { t: 'Bruto winst (na operationele kosten)', sub: 'Identiek aan privé-route', val: fmtEUR(sl.grossProfit) },
        { t: `Afschrijving gebouw (${sl.depreciationPct}%)`, sub: `Op gebouwwaarde ${fmtEUR(sl.buildingValue)} (70% van prijs)`, val: '− ' + fmtEUR(sl.depreciation) },
        { t: 'Aftrekbare hypotheekrente', sub: '100% aftrekbaar in SL', val: '− ' + fmtEUR(sl.interestDeductible) },
        { t: 'SL administratie / accountant', sub: 'Forfait per jaar', val: '− ' + fmtEUR(sl.adminCost) },
        { kind: 'subtotal', t: 'Belastbare winst', sub: 'Bruto winst − aftrekposten', val: fmtEUR(sl.taxableProfit) },
        { kind: 'total', t: 'Netto in SL na VPB', sub: 'Beschikbaar voor herinvestering of dividend', val: fmtEUR(sl.netInSL) },
      ]} />
    </View>
  )
}

function S08Compare({ vm }: { vm: CalculatorViewModel }) {
  const c = vm.compare
  if (!c) return null
  const colWidths = [{ flex: 2 }, { flex: 1.2 }, { flex: 1.2 }, { flex: 1 }]
  return (
    <View style={s.sectionTight}>
      <SectionTitle num={8} eyebrow="Privé vs SL" title="Vergelijking netto rendement" />
      <View style={s.compare}>
        <View style={s.compareHead}>
          <View style={[s.compareHeadCell, colWidths[0]]}><Text>Post</Text></View>
          <View style={[s.compareHeadCell, s.compareNum, colWidths[1]]}><Text>Privé (IRNR)</Text></View>
          <View style={[s.compareHeadCell, s.compareNum, colWidths[2], { color: SEA_DARK }]}><Text>SL young</Text></View>
          <View style={[s.compareHeadCell, s.compareNum, colWidths[3], { borderRightWidth: 0 }]}><Text>Δ</Text></View>
        </View>
        {c.rows.map((r, i) => (
          <View key={i} style={s.compareRow} wrap={false}>
            <View style={[s.compareCell, colWidths[0]]}>
              <Text style={s.compareLabel}>{r.l}</Text>
              {r.s && <Text style={s.compareLabelSub}>{r.s}</Text>}
            </View>
            <View style={[s.compareCell, s.compareNum, colWidths[1], r.winner === 'prive' ? s.compareWinner : {}]}>
              <Text style={r.winner === 'prive' ? { color: SEA_DARK, fontWeight: 700 } : {}}>{fmtEUR(r.prive)}</Text>
            </View>
            <View style={[s.compareCell, s.compareNum, colWidths[2], r.winner === 'sl' ? s.compareWinner : {}]}>
              <Text style={r.winner === 'sl' ? { color: SEA_DARK, fontWeight: 700 } : {}}>{fmtEUR(r.sl)}</Text>
            </View>
            <View style={[s.compareCell, s.compareNum, colWidths[3], { borderRightWidth: 0 }]}>
              <Text style={[
                s.compareDelta,
                r.delta > 0 && r.winner === 'sl' ? s.compareDeltaPos : {},
                r.delta < 0 && r.winner === 'sl' ? s.compareDeltaPos : {},
                r.delta !== 0 && r.winner !== 'sl' ? s.compareDeltaNeg : {},
              ]}>
                {r.delta === 0 ? '—' : (r.delta > 0 ? '+' : '') + fmtEUR(r.delta)}
              </Text>
            </View>
          </View>
        ))}
        <View style={[s.compareRow, s.compareTotal, { borderBottomWidth: 0 }]}>
          <View style={[s.compareCell, colWidths[0], { borderRightColor: ON_DARK_18 }]}>
            <Text style={s.compareTotalLabel}>Netto resultaat / jaar</Text>
          </View>
          <View style={[s.compareCell, s.compareNum, colWidths[1], s.compareTotalCell, { borderRightColor: ON_DARK_18 }]}>
            <Text>{fmtEUR(c.totalPrive)}</Text>
          </View>
          <View style={[s.compareCell, s.compareNum, colWidths[2], { backgroundColor: SEA_DARK, borderRightColor: ON_DARK_18 }]}>
            <Text style={{ color: MARBLE, fontWeight: 700 }}>{fmtEUR(c.totalSL)}</Text>
          </View>
          <View style={[s.compareCell, s.compareNum, colWidths[3], { borderRightWidth: 0 }]}>
            <Text style={s.compareTotalDelta}>+{fmtEUR(c.totalDelta)}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function ProjectionTableC({ rows }: { rows: ProjectionRow[] }) {
  return (
    <View style={s.table}>
      <View style={s.tableHead}>
        <Text style={[s.tableTh, s.tableThYear]}>Jaar</Text>
        <Text style={s.tableTh}>Hypotheek</Text>
        <Text style={s.tableTh}>Huur</Text>
        <Text style={s.tableTh}>Kosten</Text>
        <Text style={s.tableTh}>Cashflow</Text>
        <Text style={s.tableTh}>Cumulatief</Text>
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tableRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
          <Text style={[s.tableTd, s.tableTdYear]}>J{r.y}</Text>
          <Text style={s.tableTd}>{fmtEUR(-r.hyp)}</Text>
          <Text style={s.tableTd}>{fmtEUR(r.huur)}</Text>
          <Text style={s.tableTd}>{fmtEUR(-r.kosten)}</Text>
          <Text style={[s.tableTd, r.cashflow < 0 ? s.tableTdNeg : s.tableTdPos]}>{fmtEUR(r.cashflow)}</Text>
          <Text style={[s.tableTd, r.cum < 0 ? s.tableTdNeg : s.tableTdPos]}>{fmtEUR(r.cum)}</Text>
        </View>
      ))}
    </View>
  )
}

function S09Projection({ vm }: { vm: CalculatorViewModel }) {
  const proj = vm.projection
  if (!proj || proj.length === 0) return null
  const cum10 = proj[proj.length - 1].cum
  const restschuld = proj[proj.length - 1].restschuld
  return (
    <View style={s.section}>
      <SectionTitle
        num={9} eyebrow="Meerjarenprojectie" title="10-jaar cashflow & restschuld"
        blurb="Aanname: huurindexering en kostenstijging volgens consultant-instellingen."
      />
      <Hero tone={cum10 >= 0 ? 'sea' : 'marble'} stats={[
        { l: 'Cumulatieve cashflow na 10 jaar', v: fmtEUR(cum10), tone: cum10 >= 0 ? 'pos' : 'neg', sub: cum10 >= 0 ? 'Positief — eigen geld terugverdiend via cashflow' : 'Negatief — cashflow tekort, waardestijging niet meegerekend' },
        { l: 'Restschuld j10', v: fmtEUR(restschuld), sub: `Begin: ${fmtEUR(vm.mortgage)}` },
      ]} />
      <ProjectionTableC rows={proj} />
    </View>
  )
}

function S03Reno({ vm }: { vm: CalculatorViewModel }) {
  const r = vm.reno
  if (!r) return null
  return (
    <View style={s.section}>
      <SectionTitle
        num={3} eyebrow="Renovatie & flip" title="Investering, doorlooptijd & ROI"
        blurb={`Looptijd ${r.durationMonths} maanden (${r.renoMonths} reno + ${r.saleMonths} verkoop). Kosten incl. supervisie ${r.supervisionPct}% en ${r.contingencyPct}% onvoorzien.`}
      />
      <View style={s.roiGrid}>
        <View style={[s.roiCard, s.roiCardHi]}>
          <Text style={[s.roiL, s.roiLOnDark]}>ROI op inleg</Text>
          <Text style={[s.roiV, s.roiVOnDark, s.roiVXl]}>{fmtPct(r.roi, 1)}</Text>
          <Text style={[s.roiSub, s.roiSubOnDark]}>{fmtEUR(r.netProfit)} netto winst op {fmtEUR(r.totalInvestment)} inleg · {fmtPct(r.roiPerYear, 1)} per jaar</Text>
        </View>
        <View style={s.roiCard}>
          <Text style={s.roiL}>Netto winst</Text>
          <Text style={s.roiV}>{fmtEUR(r.netProfit)}</Text>
          <Text style={s.roiSub}>Na CGT {r.cgtPct}% en verkoopkosten</Text>
        </View>
        <View style={[s.roiCard, s.roiCardLast]}>
          <Text style={s.roiL}>ROI per jaar</Text>
          <Text style={s.roiV}>{fmtPct(r.roiPerYear, 1)}<Text style={s.roiVUnit}> /jr</Text></Text>
          <Text style={s.roiSub}>Geannualiseerd over {r.durationMonths} mnd</Text>
        </View>
      </View>
      <Rows rows={[
        { t: 'Aankoopprijs', val: fmtEUR(vm.price) },
        { t: 'Kosten koper', sub: fmtPct(vm.kkPct, 1), val: fmtEUR(vm.kkTotal) },
        { t: 'Renovatiebudget', sub: 'Ruwbouw + afwerking', val: fmtEUR(r.budget) },
        { t: `Bouwbegeleiding (${r.supervisionPct}%)`, sub: 'Architect/aannemer toezicht', val: fmtEUR(r.supervisionCost) },
        { t: `Onvoorzien (${r.contingencyPct}%)`, sub: 'Reservering meerwerk', val: fmtEUR(r.contingencyCost) },
        { kind: 'subtotal', t: 'Totale investering', sub: 'Aankoop + KK + reno + supervisie + onvoorzien', val: fmtEUR(r.totalInvestment) },
        { t: 'Verkoopprijs (ARV)', sub: 'After-repair value', val: fmtEUR(r.sellPrice) },
        { t: `Makelaarscourtage (${r.agentPct}%)`, val: '− ' + fmtEUR(r.agentFee) },
        { t: `Plusvalía (${r.plusvaliaPct}%)`, sub: 'Gemeentelijke meerwaarde', val: '− ' + fmtEUR(r.plusvalia) },
        { t: `CGT — capital gains tax (${r.cgtPct}%)`, sub: 'Over fiscale meerwaarde', val: '− ' + fmtEUR(r.cgt) },
        { kind: 'total', t: 'Netto winst', sub: `ROI ${fmtPct(r.roi, 1)} · ${fmtPct(r.roiPerYear, 1)} per jaar`, val: fmtEUR(r.netProfit) },
      ]} />
    </View>
  )
}

// ─── Pages ────────────────────────────────────────────────────────────────
function CoverPage({ vm, photo }: { vm: CalculatorViewModel; photo: string | null }) {
  const titleByMode: Record<string, string[]> = {
    eigen: ['Aankoop-', 'analyse'],
    verhuur: ['Investerings-', 'analyse'],
    sl: ['Investerings-', 'analyse'],
    flip: ['Flip-', 'analyse'],
  }
  const lines = titleByMode[vm.mode] ?? ['Investerings-', 'analyse']
  return (
    <Page size="A4" style={s.page}>
      <View style={s.cover}>
        <View style={s.coverTop}>
          <View>
            <Text style={s.coverTitle}>
              {lines[0]}{'\n'}
              {lines[1]}<Text style={s.coverTitleDot}>.</Text>
            </Text>
            <Text style={s.coverNameLbl}>Voor</Text>
            <Text style={s.coverName}>{vm.klantnaam}</Text>
            <View style={s.coverTick} />
            <View style={s.coverMeta}>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Aankoopprijs</Text>
                <Text style={s.coverMetaValPrice}>{fmtEUR(vm.price)}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Regio</Text>
                <Text style={s.coverMetaVal}>{vm.region}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Type</Text>
                <Text style={s.coverMetaVal}>{vm.propType}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Status</Text>
                <Text style={s.coverMetaVal}>{vm.residentLabel}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Datum</Text>
                <Text style={s.coverMetaVal}>{fmtDate(vm.dateIso)}</Text>
              </View>
              <View style={s.coverMetaItem}>
                <Text style={s.coverMetaLbl}>Consultant</Text>
                <Text style={s.coverMetaVal}>{vm.consultant}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={s.coverHero}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image, niet HTML img */}
          {photo && <Image src={photo} style={s.coverHeroImg} />}
        </View>
      </View>
    </Page>
  )
}

function InteriorPage({
  vm, label, wordmark, children,
}: {
  vm: CalculatorViewModel; label: string; wordmark: string | null
  children: React.ReactNode
}) {
  void label
  return (
    <Page size="A4" style={s.page}>
      <HeaderBar klantnaam={vm.klantnaam} modeLabel={vm.modeLabel} wordmark={wordmark} />
      <View style={s.body}>{children}</View>
      <Footer />
    </Page>
  )
}

// ─── Main document ────────────────────────────────────────────────────────
export function CalculatorPDF({ vm }: { vm: CalculatorViewModel }) {
  const wordmark = brandAsset('wordmark-deepsea-v2.svg') ?? brandAsset('costa-select-wordmark-deepsea.svg')
  const photo = coverPhotoFor(vm.regionId)

  if (vm.mode === 'eigen') {
    return (
      <Document>
        <CoverPage vm={vm} photo={photo} />
        <InteriorPage vm={vm} label="Aankoop" wordmark={wordmark}>
          <S01Basis vm={vm} compact />
          <S02KostenKoper vm={vm} />
        </InteriorPage>
        <InteriorPage vm={vm} label="Financiering" wordmark={wordmark}>
          <S03Financiering vm={vm} compact />
          <S04TotaleInvestering vm={vm} compact />
          <S05Maandlasten vm={vm} compact />
        </InteriorPage>
        <InteriorPage vm={vm} label="Maandlasten" wordmark={wordmark}>
          <S05Maandlasten vm={vm} />
        </InteriorPage>
      </Document>
    )
  }
  if (vm.mode === 'verhuur') {
    return (
      <Document>
        <CoverPage vm={vm} photo={photo} />
        <InteriorPage vm={vm} label="Aankoop" wordmark={wordmark}>
          <S01Basis vm={vm} compact />
          <S02KostenKoper vm={vm} />
        </InteriorPage>
        <InteriorPage vm={vm} label="Financiering" wordmark={wordmark}>
          <S03Financiering vm={vm} compact />
          <S04TotaleInvestering vm={vm} compact />
          <S05Maandlasten vm={vm} compact />
        </InteriorPage>
        <InteriorPage vm={vm} label="Verhuur" wordmark={wordmark}>
          <S06Verhuur vm={vm} />
        </InteriorPage>
        {vm.projection && vm.projection.length > 0 && (
          <InteriorPage vm={vm} label="Projectie" wordmark={wordmark}>
            <S09Projection vm={vm} />
          </InteriorPage>
        )}
      </Document>
    )
  }
  if (vm.mode === 'sl') {
    return (
      <Document>
        <CoverPage vm={vm} photo={photo} />
        <InteriorPage vm={vm} label="Aankoop" wordmark={wordmark}>
          <S01Basis vm={vm} compact />
          <S02KostenKoper vm={vm} />
        </InteriorPage>
        <InteriorPage vm={vm} label="Financiering" wordmark={wordmark}>
          <S03Financiering vm={vm} compact />
          <S04TotaleInvestering vm={vm} compact />
          <S05Maandlasten vm={vm} compact />
        </InteriorPage>
        <InteriorPage vm={vm} label="Verhuur" wordmark={wordmark}>
          <S06Verhuur vm={vm} />
        </InteriorPage>
        {vm.sl && (
          <InteriorPage vm={vm} label="Fiscaal voordeel SL" wordmark={wordmark}>
            <S07SL vm={vm} />
          </InteriorPage>
        )}
        {vm.compare && (
          <InteriorPage vm={vm} label="Privé vs SL" wordmark={wordmark}>
            <S08Compare vm={vm} />
          </InteriorPage>
        )}
        {vm.projection && vm.projection.length > 0 && (
          <InteriorPage vm={vm} label="Projectie" wordmark={wordmark}>
            <S09Projection vm={vm} />
          </InteriorPage>
        )}
      </Document>
    )
  }
  // flip
  return (
    <Document>
      <CoverPage vm={vm} photo={photo} />
      <InteriorPage vm={vm} label="Aankoop" wordmark={wordmark}>
        <S01Basis vm={vm} compact />
        <S02KostenKoper vm={vm} />
      </InteriorPage>
      {vm.reno && (
        <InteriorPage vm={vm} label="Renovatie & flip" wordmark={wordmark}>
          <S03Reno vm={vm} />
        </InteriorPage>
      )}
    </Document>
  )
}
