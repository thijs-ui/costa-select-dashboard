import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

// ─── Brand fonts ─────────────────────────────────────────────────────────
// Lokaal gebundeld in public/fonts/ — Google Fonts CDN URLs zijn niet stabiel
// (Raleway 500 v37 ging op 26 april 2026 op 404 → PDF-generatie kapot voor
// alle dossiers). file:// URLs naar de absolute path werken op Vercel én lokaal.
import path from 'path'

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

// ─── Types ───────────────────────────────────────────────────────────────
export interface DossierData {
  property: {
    adres: string
    regio: string
    type: string
    vraagprijs: number
    oppervlakte: number
    slaapkamers: number
    badkamers: number
    omschrijving: string
    fotos: string[]
    url?: string
  }
  regioInfo: string
  brochure_type?: 'presentatie' | 'pitch'
  analyse?: {
    samenvatting: string
    prijsanalyse: string
    sterke_punten: string[]
    aandachtspunten: string[]
    juridische_risicos: string[]
    verhuurpotentieel: string
    advies_consultant: string
  }
  pitch_content?: {
    voordelen: string[]
    nadelen: string[]
    buurtcontext: string
    investering: string
    advies: string
  }
  units_data?: Array<{
    typology: string
    rooms: number | null
    size_m2: number | null
    price: number | null
  }>
  financial_data?: {
    kosten_koper?: { type: string; totaal: number }
    renovatie?: { totaal: number }
    hypotheek?: {
      hypotheekbedrag: number
      maandlast: number
      rente: number
      looptijd: number
      eigen_inbreng_pct: number
    }
    totale_investering?: number
  }
  generatedAt: string
}

// ─── Brand tokens ────────────────────────────────────────────────────────
const DEEPSEA = '#004B46'
const DEEPSEA_LIGHT = '#0A6B63'
const DEEPSEA_DEEP = '#072A24'
const SUN = '#F5AF40'
const SUN_DARK = '#D4921A'
const MARBLE = '#FFFAEF'
const SEA = '#0EAE96'
const WHITE = '#FFFFFF'
const GRAY_500 = '#7A8C8B'
const GRAY_700 = '#374151'
const BORDER = 'rgba(0,75,70,0.12)'
const RED = '#B81D13'

// ─── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Base page
  page: { backgroundColor: MARBLE, fontFamily: 'Raleway', padding: 0 },
  darkPage: { backgroundColor: DEEPSEA, fontFamily: 'Raleway', padding: 0, color: MARBLE },

  // Header bar (content pages) — beeldmerk centered
  headerBar: {
    backgroundColor: DEEPSEA,
    paddingHorizontal: 36,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: { height: 24, width: 24 },

  // Body container
  contentBody: { flex: 1, paddingHorizontal: 36, paddingTop: 22, paddingBottom: 40 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 36,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    fontSize: 8.5,
    fontWeight: 600,
    color: GRAY_500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footerOnDark: {
    borderTopColor: 'rgba(255,250,239,0.14)',
    color: 'rgba(255,250,239,0.55)',
  },
  footerBrand: {},
  footerPagenum: { fontFamily: 'Raleway', fontWeight: 700 },

  // Section title row
  sectTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectEyebrow: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN_DARK,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    width: 110,
  },
  sectTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 22,
    color: DEEPSEA,
    letterSpacing: -0.3,
    flex: 1,
  },
  sunRule: { width: 40, height: 3, backgroundColor: SUN, marginBottom: 10 },

  // ─── COVER PAGE ───
  coverContainer: { flexDirection: 'row', width: '100%', height: '100%' },
  coverLeft: {
    flexBasis: '55%',
    padding: 36,
    paddingRight: 28,
    position: 'relative',
  },
  coverLogo: { height: 24 },
  coverTag: {
    position: 'absolute',
    top: 42,
    right: 28,
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  coverSpacerTop: { height: 120 },
  coverDivider: { width: 48, height: 3, backgroundColor: SUN, marginBottom: 14 },
  coverRegion: {
    fontSize: 11,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SEA,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  coverAddr: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 34,
    color: MARBLE,
    lineHeight: 1.05,
    marginBottom: 10,
    maxWidth: 400,
  },
  coverType: {
    fontSize: 12,
    fontFamily: 'Raleway',
    fontWeight: 500,
    color: 'rgba(255,250,239,0.75)',
    textTransform: 'capitalize',
    marginBottom: 22,
  },
  coverPrice: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 30,
    color: SUN,
    letterSpacing: -0.4,
    marginBottom: 18,
  },
  coverSpecs: {
    flexDirection: 'row',
    gap: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,250,239,0.18)',
    position: 'absolute',
    bottom: 72,
    left: 36,
    right: 28,
  },
  coverSpec: { flexDirection: 'column', gap: 4 },
  coverSpecLabel: {
    fontSize: 8.5,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: 'rgba(255,250,239,0.55)',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  coverSpecVal: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 20,
    color: MARBLE,
    letterSpacing: -0.2,
  },
  coverSpecUnit: {
    fontSize: 11,
    fontFamily: 'Raleway',
    fontWeight: 500,
    color: 'rgba(255,250,239,0.6)',
  },
  coverFooter: {
    position: 'absolute',
    bottom: 26,
    left: 36,
    right: 28,
    fontSize: 8.5,
    fontWeight: 600,
    color: 'rgba(255,250,239,0.45)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  coverRight: {
    flexBasis: '45%',
    backgroundColor: DEEPSEA_DEEP,
    position: 'relative',
  },
  coverHero: { width: '100%', height: '100%', objectFit: 'cover' },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(7,42,36,0.55)',
  },
  coverCaption: {
    position: 'absolute',
    bottom: 28,
    left: 28,
    right: 28,
  },
  coverCaptionEye: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  coverCaptionText: {
    fontFamily: 'Bricolage Grotesque',
    fontSize: 13,
    fontWeight: 500,
    color: MARBLE,
    lineHeight: 1.4,
  },

  // ─── PITCH BLOCKS ───
  pitchGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  pitchBlock: {
    flex: 1,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: '16px 18px',
  },
  pitchBlockPos: { borderLeftColor: SEA },
  pitchBlockNeg: { borderLeftColor: SUN },
  pitchBlockWarn: { borderLeftColor: RED },
  pitchBlockTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 11,
    color: DEEPSEA,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pitchBullet: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  pitchBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  pitchBulletText: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY_700,
    lineHeight: 1.55,
    flex: 1,
  },

  // Pitch narrative (price analysis)
  pitchNarrative: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#CEE1FA',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 18,
  },
  pitchNarrativeLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: '#1E3A8A',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pitchNarrativeText: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY_700,
    lineHeight: 1.55,
  },

  // Advies hero
  pitchAdvies: {
    backgroundColor: DEEPSEA,
    borderRadius: 12,
    padding: '22px 26px',
    marginBottom: 14,
  },
  pitchAdviesLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pitchAdviesBar: { width: 24, height: 2, backgroundColor: SUN },
  pitchAdviesText: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 500,
    fontSize: 15,
    color: MARBLE,
    lineHeight: 1.45,
  },

  // ─── PRESENTATIE ───
  presGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  presSpec: {
    width: '31%',
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: '12px 16px',
  },
  presSpecAccent: { backgroundColor: DEEPSEA, borderColor: DEEPSEA },
  presSpecLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: GRAY_500,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  presSpecLblAccent: { color: 'rgba(255,250,239,0.6)' },
  presSpecVal: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 18,
    color: DEEPSEA,
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  presSpecValAccent: { color: SUN },
  presCols: { flexDirection: 'row', gap: 24 },
  presColMain: { flex: 1.2 },
  presColSide: { flex: 1 },
  presH3: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 13,
    color: DEEPSEA,
    marginBottom: 8,
  },
  presEyebrow: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN_DARK,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  presBody: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY_700,
    lineHeight: 1.55,
  },

  // ─── FINANCIAL ───
  finLayout: { flexDirection: 'row', gap: 24, height: '100%' },
  finLeft: { flex: 1.4 },
  finRight: { flex: 1 },
  finHead: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 11,
    color: DEEPSEA,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  finBarRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  finBarName: {
    width: 120,
    fontSize: 10.5,
    color: GRAY_500,
    fontWeight: 600,
  },
  finBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: WHITE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  finBarFill: { height: '100%', backgroundColor: DEEPSEA },
  finBarAmt: {
    width: 100,
    textAlign: 'right',
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 12,
    color: DEEPSEA,
  },
  finTotal: {
    marginTop: 16,
    padding: '14px 18px',
    backgroundColor: DEEPSEA,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  finTotalLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: 'rgba(255,250,239,0.65)',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  finTotalAmt: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 20,
    color: SUN,
    letterSpacing: -0.3,
  },
  mortCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: '18px 20px',
  },
  mortBigLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN_DARK,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  mortBig: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 28,
    color: DEEPSEA,
    letterSpacing: -0.4,
    lineHeight: 1,
    marginBottom: 4,
  },
  mortBigUnit: {
    fontSize: 11,
    fontFamily: 'Raleway',
    fontWeight: 500,
    color: GRAY_500,
  },
  mortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  mortItem: { width: '45%' },
  mortItemLbl: {
    fontSize: 8.5,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: GRAY_500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  mortItemVal: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 13,
    color: DEEPSEA,
  },
  eigenBar: { marginTop: 14 },
  eigenBarHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  eigenBarLbl: {
    fontSize: 8.5,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: GRAY_500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eigenBarPct: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 13,
    color: DEEPSEA,
    letterSpacing: -0.2,
  },
  eigenTrack: {
    height: 8,
    backgroundColor: MARBLE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  eigenFillOwn: { backgroundColor: SUN, height: '100%' },
  eigenFillMort: { backgroundColor: DEEPSEA, height: '100%', flex: 1 },

  // ─── UNITS TABLE ───
  unitsTable: { width: '100%' },
  unitsHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: BORDER,
    paddingBottom: 8,
  },
  unitsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  unitsTh: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: GRAY_500,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  unitsTd: {
    fontSize: 11,
    fontFamily: 'Raleway',
    color: DEEPSEA,
    fontWeight: 500,
  },
  unitsPrice: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 13,
    color: SEA,
  },
  unitsSummary: {
    marginTop: 18,
    padding: '14px 20px',
    backgroundColor: DEEPSEA,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  unitsSumLbl: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: 'rgba(255,250,239,0.6)',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  unitsSumVal: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 16,
    color: SUN,
  },

  // ─── PHOTOS ───
  photoGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    height: '100%',
  },
  photoCell: {
    // 48% × 2 + 12pt gap blijft net onder 100% zodat react-pdf de cellen
    // niet naar een nieuwe overflow-pagina forceert (bron van lege pagina).
    width: '48.5%',
    height: '47%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: DEEPSEA_DEEP,
  },
  photoHeroLayout: { flexDirection: 'row', gap: 12, height: '100%' },
  photoHeroLeft: { flex: 1.3, borderRadius: 10, overflow: 'hidden', backgroundColor: DEEPSEA_DEEP },
  photoHeroRight: { flex: 1, flexDirection: 'column', gap: 12 },
  photoHeroSmall: { flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: DEEPSEA_DEEP },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
})

// ─── Helpers ─────────────────────────────────────────────────────────────
function fmtEuro(n: number | null | undefined): string {
  if (n == null || n === 0) return '—'
  return `€ ${Math.round(n).toLocaleString('nl-NL')}`
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Sub-components ──────────────────────────────────────────────────────
function HeaderBar({ iconSrc }: { iconSrc?: string }) {
  return (
    <View style={s.headerBar}>
      {iconSrc ? (
        <Image src={iconSrc} style={s.headerLogo} />
      ) : (
        <Text style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 700, fontSize: 12, color: WHITE, letterSpacing: 2 }}>
          CS
        </Text>
      )}
    </View>
  )
}

function PageFooter({ pageLabel, onDark }: { pageLabel: string; onDark?: boolean }) {
  // Geen `fixed` — bij overflow zou react-pdf 'm anders met dezelfde label
  // op elke fysieke overflow-pagina renderen ('03/05', '03/05', etc.).
  return (
    <View style={[s.footer, onDark ? s.footerOnDark : {}]}>
      <Text> </Text>
      <Text style={s.footerPagenum}>{pageLabel}</Text>
    </View>
  )
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <View>
      <View style={s.sunRule} />
      <View style={s.sectTitleRow}>
        <Text style={s.sectEyebrow}>{eyebrow}</Text>
        <Text style={s.sectTitle}>{title}</Text>
      </View>
    </View>
  )
}

function BulletItem({ text, color }: { text: string; color: string }) {
  return (
    <View style={s.pitchBullet}>
      <View style={[s.pitchBulletDot, { backgroundColor: color }]} />
      <Text style={s.pitchBulletText}>{text}</Text>
    </View>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────
export function DossierPDF({
  data,
  wordmarkSrc,
  iconSrc,
}: {
  data: DossierData
  wordmarkSrc?: string
  iconSrc?: string
}) {
  const { property, regioInfo, analyse, pitch_content, financial_data, units_data } = data
  const isPitch = data.brochure_type === 'pitch'
  const fotos = property.fotos || []

  const voordelen = pitch_content?.voordelen ?? analyse?.sterke_punten ?? []
  const nadelen = pitch_content?.nadelen ?? analyse?.aandachtspunten ?? []
  const buurtcontext = pitch_content?.buurtcontext ?? ''
  const investering = pitch_content?.investering ?? ''
  const advies = pitch_content?.advies ?? analyse?.advies_consultant ?? ''
  const samenvatting = analyse?.samenvatting ?? ''
  const prijsanalyse = analyse?.prijsanalyse ?? ''
  const juridisch = analyse?.juridische_risicos ?? []
  const verhuur = analyse?.verhuurpotentieel ?? ''

  const prijsFormatted = property.vraagprijs ? fmtEuro(property.vraagprijs) : 'Prijs op aanvraag'

  // Page numbering: count pages to build '01/07' labels
  const pageLabels: string[] = []
  pageLabels.push('Cover')
  if (isPitch) {
    pageLabels.push('Analyse A', 'Analyse B')
  } else {
    pageLabels.push('Details')
  }
  if (financial_data?.totale_investering || financial_data?.hypotheek?.hypotheekbedrag) {
    pageLabels.push('Financieel')
  }
  if (units_data && units_data.length > 0) {
    pageLabels.push('Units')
  }
  // Photo pages: hero-mosaic (3) + up to 3× 2x2 grid (12) = 15 gallery + 1 cover hero = 16 max
  const photoSlices: string[][] = []
  if (fotos.length > 1) {
    const gallery = fotos.slice(1)
    if (gallery.length > 0) photoSlices.push(gallery.slice(0, 3))
    if (gallery.length > 3) photoSlices.push(gallery.slice(3, 7))
    if (gallery.length > 7) photoSlices.push(gallery.slice(7, 11))
    if (gallery.length > 11) photoSlices.push(gallery.slice(11, 15))
  }
  photoSlices.forEach((_, i) => pageLabels.push(`Foto's ${String.fromCharCode(65 + i)}`))
  const totalPages = pageLabels.length
  const pageLabel = (idx: number) =>
    `${String(idx + 1).padStart(2, '0')}/${String(totalPages).padStart(2, '0')}`

  let pageIdx = 0

  return (
    <Document>
      {/* ─── 01 COVER ──────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.darkPage}>
        <View style={s.coverContainer}>
          <View style={s.coverLeft}>
            {wordmarkSrc ? (
              <Image src={wordmarkSrc} style={s.coverLogo} />
            ) : (
              <Text
                style={{
                  fontFamily: 'Bricolage Grotesque',
                  fontWeight: 700,
                  fontSize: 18,
                  color: MARBLE,
                  letterSpacing: 2,
                }}
              >
                COSTA SELECT
              </Text>
            )}
            <Text style={s.coverTag}>{isPitch ? 'Woningpitch' : 'Woningpresentatie'}</Text>
            <View style={s.coverSpacerTop} />
            <View style={s.coverDivider} />
            <Text style={s.coverRegion}>{property.regio}</Text>
            <Text style={s.coverAddr}>{property.adres}</Text>
            <Text style={s.coverType}>
              {capitalize(property.type)}
              {property.oppervlakte > 0 ? ` · ${property.oppervlakte} m²` : ''}
              {property.slaapkamers > 0 ? ` · ${property.slaapkamers} slk` : ''}
            </Text>
            <Text style={s.coverPrice}>{prijsFormatted}</Text>

            <View style={s.coverSpecs}>
              {property.slaapkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecLabel}>Slaapkamers</Text>
                  <Text style={s.coverSpecVal}>{property.slaapkamers}</Text>
                </View>
              )}
              {property.badkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecLabel}>Badkamers</Text>
                  <Text style={s.coverSpecVal}>{property.badkamers}</Text>
                </View>
              )}
              {property.oppervlakte > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecLabel}>Woonopp.</Text>
                  <Text style={s.coverSpecVal}>
                    {property.oppervlakte}
                    <Text style={s.coverSpecUnit}> m²</Text>
                  </Text>
                </View>
              )}
            </View>

          </View>
          <View style={s.coverRight}>
            {fotos[0] ? (
              <Image src={fotos[0]} style={s.coverHero} />
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: DEEPSEA_LIGHT }} />
            )}
          </View>
        </View>
      </Page>

      {/* ─── 02 ANALYSE A (pitch) / DETAILS (presentatie) ──────── */}
      {isPitch ? (
        <Page size="A4" orientation="landscape" style={s.page} wrap>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <SectionTitle eyebrow="Overzicht" title="Samenvatting & voordelen" />

            {samenvatting ? (
              <Text style={[s.presBody, { marginBottom: 16 }]}>{samenvatting}</Text>
            ) : null}

            <View style={s.pitchGrid}>
              <View style={[s.pitchBlock, s.pitchBlockPos]}>
                <View style={s.pitchBlockTitle}>
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEA }}
                  />
                  <Text style={{ color: DEEPSEA, fontSize: 11, fontFamily: 'Bricolage Grotesque', fontWeight: 700 }}>
                    Voordelen
                  </Text>
                </View>
                {voordelen.slice(0, 6).map((p, i) => (
                  <BulletItem key={i} text={p} color={SEA} />
                ))}
              </View>
              <View style={[s.pitchBlock, s.pitchBlockNeg]}>
                <View style={s.pitchBlockTitle}>
                  <View
                    style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SUN }}
                  />
                  <Text style={{ color: DEEPSEA, fontSize: 11, fontFamily: 'Bricolage Grotesque', fontWeight: 700 }}>
                    Aandachtspunten
                  </Text>
                </View>
                {nadelen.slice(0, 6).map((p, i) => (
                  <BulletItem key={i} text={p} color={SUN} />
                ))}
              </View>
            </View>

            {prijsanalyse && (
              <View style={s.pitchNarrative}>
                <Text style={s.pitchNarrativeLbl}>Prijsanalyse</Text>
                <Text style={s.pitchNarrativeText}>{prijsanalyse}</Text>
              </View>
            )}
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      ) : (
        <Page size="A4" orientation="landscape" style={s.page}>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <SectionTitle eyebrow="Kenmerken" title={property.adres} />

            <View style={s.presGrid}>
              <View style={[s.presSpec, s.presSpecAccent]}>
                <Text style={[s.presSpecLbl, s.presSpecLblAccent]}>Vraagprijs</Text>
                <Text style={[s.presSpecVal, s.presSpecValAccent]}>{prijsFormatted}</Text>
              </View>
              <View style={s.presSpec}>
                <Text style={s.presSpecLbl}>Oppervlakte</Text>
                <Text style={s.presSpecVal}>
                  {property.oppervlakte > 0 ? `${property.oppervlakte} m²` : '—'}
                </Text>
              </View>
              <View style={s.presSpec}>
                <Text style={s.presSpecLbl}>Slaapkamers</Text>
                <Text style={s.presSpecVal}>
                  {property.slaapkamers > 0 ? String(property.slaapkamers) : '—'}
                </Text>
              </View>
              <View style={s.presSpec}>
                <Text style={s.presSpecLbl}>Badkamers</Text>
                <Text style={s.presSpecVal}>
                  {property.badkamers > 0 ? String(property.badkamers) : '—'}
                </Text>
              </View>
              <View style={s.presSpec}>
                <Text style={s.presSpecLbl}>Type</Text>
                <Text style={s.presSpecVal}>{capitalize(property.type)}</Text>
              </View>
              <View style={s.presSpec}>
                <Text style={s.presSpecLbl}>Regio</Text>
                <Text style={s.presSpecVal}>{property.regio}</Text>
              </View>
            </View>

            <View style={s.presCols}>
              {property.omschrijving && (
                <View style={s.presColMain}>
                  <Text style={s.presEyebrow}>Beschrijving</Text>
                  <Text style={s.presH3}>Over deze woning</Text>
                  <Text style={s.presBody}>{property.omschrijving.substring(0, 800)}</Text>
                </View>
              )}
              {regioInfo && (
                <View style={s.presColSide}>
                  <Text style={s.presEyebrow}>Locatie</Text>
                  <Text style={s.presH3}>{property.regio}</Text>
                  <Text style={s.presBody}>{regioInfo.substring(0, 600)}</Text>
                </View>
              )}
            </View>
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      )}

      {/* ─── 03 ANALYSE B (pitch only) ──────────────────────────── */}
      {isPitch && (
        <Page size="A4" orientation="landscape" style={s.page} wrap>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <SectionTitle eyebrow="Ons perspectief" title="Costa Select advies" />

            {advies && (
              <View style={s.pitchAdvies}>
                <View style={s.pitchAdviesLbl}>
                  <View style={s.pitchAdviesBar} />
                  <Text style={{ color: SUN, fontSize: 9, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase' }}>
                    Ons advies
                  </Text>
                </View>
                <Text style={s.pitchAdviesText}>{advies}</Text>
              </View>
            )}

            <View style={s.pitchGrid}>
              {juridisch.length > 0 && (
                <View style={[s.pitchBlock, s.pitchBlockWarn]}>
                  <View style={s.pitchBlockTitle}>
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RED }}
                    />
                    <Text style={{ color: DEEPSEA, fontSize: 11, fontFamily: 'Bricolage Grotesque', fontWeight: 700 }}>
                      Juridische aandachtspunten
                    </Text>
                  </View>
                  {juridisch.slice(0, 6).map((r, i) => (
                    <BulletItem key={i} text={r} color={RED} />
                  ))}
                </View>
              )}
              {(verhuur || investering || buurtcontext) && (
                <View style={[s.pitchBlock, s.pitchBlockPos]}>
                  <View style={s.pitchBlockTitle}>
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEA }}
                    />
                    <Text style={{ color: DEEPSEA, fontSize: 11, fontFamily: 'Bricolage Grotesque', fontWeight: 700 }}>
                      Investering & buurt
                    </Text>
                  </View>
                  {verhuur && (
                    <Text style={[s.pitchBulletText, { marginBottom: 8 }]}>
                      <Text style={{ fontWeight: 700, color: DEEPSEA }}>Verhuur. </Text>
                      {verhuur}
                    </Text>
                  )}
                  {investering && (
                    <Text style={[s.pitchBulletText, { marginBottom: 8 }]}>
                      <Text style={{ fontWeight: 700, color: DEEPSEA }}>Investering. </Text>
                      {investering}
                    </Text>
                  )}
                  {buurtcontext && (
                    <Text style={s.pitchBulletText}>
                      <Text style={{ fontWeight: 700, color: DEEPSEA }}>Buurt. </Text>
                      {buurtcontext}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      )}

      {/* ─── 04 FINANCIEEL ─────────────────────────────────────── */}
      {(financial_data?.totale_investering ||
        financial_data?.hypotheek?.hypotheekbedrag) && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <SectionTitle eyebrow="Investering" title="Financieel overzicht" />

            <FinancialSection property={property} financial={financial_data!} />
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      )}

      {/* ─── 05 UNITS ──────────────────────────────────────────── */}
      {units_data && units_data.length > 0 && (
        <Page size="A4" orientation="landscape" style={s.page} wrap>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <SectionTitle
              eyebrow="Aanbod"
              title={`${units_data.length} beschikbare units`}
            />

            <View style={s.unitsTable}>
              <View style={s.unitsHeaderRow}>
                <Text style={[s.unitsTh, { flex: 2, paddingHorizontal: 10 }]}>Typologie</Text>
                <Text style={[s.unitsTh, { flex: 1, paddingHorizontal: 10 }]}>Kamers</Text>
                <Text style={[s.unitsTh, { flex: 1, paddingHorizontal: 10 }]}>m²</Text>
                <Text style={[s.unitsTh, { flex: 1, paddingHorizontal: 10, textAlign: 'right' }]}>
                  Vanafprijs
                </Text>
              </View>
              {units_data.map((u, i) => (
                <View key={i} style={s.unitsRow}>
                  <Text style={[s.unitsTd, { flex: 2, paddingHorizontal: 10 }]}>
                    {u.typology || '—'}
                  </Text>
                  <Text
                    style={[
                      s.unitsTd,
                      { flex: 1, paddingHorizontal: 10, color: GRAY_500 },
                    ]}
                  >
                    {u.rooms ? `${u.rooms} slk` : '—'}
                  </Text>
                  <Text
                    style={[
                      s.unitsTd,
                      { flex: 1, paddingHorizontal: 10, color: GRAY_500 },
                    ]}
                  >
                    {u.size_m2 ? `${u.size_m2}` : '—'}
                  </Text>
                  <Text
                    style={[s.unitsPrice, { flex: 1, paddingHorizontal: 10, textAlign: 'right' }]}
                  >
                    {u.price ? fmtEuro(u.price) : '—'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={s.unitsSummary}>
              <Text style={s.unitsSumLbl}>
                {units_data.length} units · Vanafprijs
              </Text>
              <Text style={s.unitsSumVal}>
                {fmtEuro(
                  Math.min(
                    ...units_data
                      .filter(u => u.price != null && u.price > 0)
                      .map(u => u.price as number)
                  )
                )}
              </Text>
            </View>
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      )}

      {/* ─── FOTO'S A — hero mosaic ─────────────────────────── */}
      {photoSlices[0] && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <View style={s.photoHeroLayout}>
              <View style={s.photoHeroLeft}>
                {photoSlices[0][0] ? (
                  <Image src={photoSlices[0][0]} style={s.photoImg} />
                ) : null}
              </View>
              <View style={s.photoHeroRight}>
                {photoSlices[0][1] && (
                  <View style={s.photoHeroSmall}>
                    <Image src={photoSlices[0][1]} style={s.photoImg} />
                  </View>
                )}
                {photoSlices[0][2] && (
                  <View style={s.photoHeroSmall}>
                    <Image src={photoSlices[0][2]} style={s.photoImg} />
                  </View>
                )}
              </View>
            </View>
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      )}

      {/* ─── FOTO'S B/C/D — 2×2 grids ─────────────────────────── */}
      {[1, 2, 3].map(idx => photoSlices[idx] ? (
        <Page key={`photos-${idx}`} size="A4" orientation="landscape" style={s.page}>
          <HeaderBar iconSrc={iconSrc} />
          <View style={s.contentBody}>
            <View style={s.photoGrid2x2}>
              {photoSlices[idx].map((url, i) => (
                <View key={i} style={s.photoCell}>
                  <Image src={url} style={s.photoImg} />
                </View>
              ))}
            </View>
          </View>
          <PageFooter pageLabel={pageLabel(++pageIdx)} />
        </Page>
      ) : null)}
    </Document>
  )
}

// ─── Financial section (extracted for clarity) ───────────────────────────
function FinancialSection({
  property,
  financial,
}: {
  property: DossierData['property']
  financial: NonNullable<DossierData['financial_data']>
}) {
  const aankoop = property.vraagprijs || 0
  const kosten = financial.kosten_koper?.totaal || 0
  const reno = financial.renovatie?.totaal || 0
  const totaal = financial.totale_investering || aankoop + kosten + reno
  const max = Math.max(aankoop, kosten, reno, 1)
  const mort = financial.hypotheek
  const eigen = mort?.eigen_inbreng_pct ?? 0

  return (
    <View style={s.finLayout}>
      <View style={s.finLeft}>
        <Text style={s.finHead}>Uitsplitsing</Text>

        <View style={s.finBarRow}>
          <Text style={s.finBarName}>Aankoopprijs</Text>
          <View style={s.finBarTrack}>
            <View
              style={[s.finBarFill, { width: `${(aankoop / max) * 100}%`, backgroundColor: DEEPSEA }]}
            />
          </View>
          <Text style={s.finBarAmt}>{fmtEuro(aankoop)}</Text>
        </View>

        {kosten > 0 && (
          <View style={s.finBarRow}>
            <Text style={s.finBarName}>Kosten koper</Text>
            <View style={s.finBarTrack}>
              <View
                style={[s.finBarFill, { width: `${(kosten / max) * 100}%`, backgroundColor: SEA }]}
              />
            </View>
            <Text style={s.finBarAmt}>{fmtEuro(kosten)}</Text>
          </View>
        )}

        {reno > 0 && (
          <View style={s.finBarRow}>
            <Text style={s.finBarName}>Renovatie</Text>
            <View style={s.finBarTrack}>
              <View
                style={[s.finBarFill, { width: `${(reno / max) * 100}%`, backgroundColor: SUN }]}
              />
            </View>
            <Text style={s.finBarAmt}>{fmtEuro(reno)}</Text>
          </View>
        )}

        <View style={s.finTotal}>
          <Text style={s.finTotalLbl}>Totale investering</Text>
          <Text style={s.finTotalAmt}>{fmtEuro(totaal)}</Text>
        </View>
      </View>

      {mort?.hypotheekbedrag ? (
        <View style={s.finRight}>
          <Text style={s.finHead}>Hypotheek</Text>
          <View style={s.mortCard}>
            <Text style={s.mortBigLbl}>Maandlast</Text>
            <Text style={s.mortBig}>
              {fmtEuro(mort.maandlast)}
              <Text style={s.mortBigUnit}> /mnd</Text>
            </Text>
            <View style={s.mortGrid}>
              <View style={s.mortItem}>
                <Text style={s.mortItemLbl}>Hypotheek</Text>
                <Text style={s.mortItemVal}>{fmtEuro(mort.hypotheekbedrag)}</Text>
              </View>
              <View style={s.mortItem}>
                <Text style={s.mortItemLbl}>Rente</Text>
                <Text style={s.mortItemVal}>{mort.rente}%</Text>
              </View>
              <View style={s.mortItem}>
                <Text style={s.mortItemLbl}>Looptijd</Text>
                <Text style={s.mortItemVal}>{mort.looptijd}j</Text>
              </View>
              <View style={s.mortItem}>
                <Text style={s.mortItemLbl}>Eigen inbreng</Text>
                <Text style={s.mortItemVal}>{eigen}%</Text>
              </View>
            </View>

            <View style={s.eigenBar}>
              <View style={s.eigenBarHead}>
                <Text style={s.eigenBarLbl}>Eigen inbreng vs hypotheek</Text>
                <Text style={s.eigenBarPct}>
                  {eigen}%
                  <Text style={{ fontSize: 10, color: GRAY_500 }}> / {100 - eigen}%</Text>
                </Text>
              </View>
              <View style={s.eigenTrack}>
                <View style={[s.eigenFillOwn, { width: `${eigen}%` }]} />
                <View style={s.eigenFillMort} />
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
