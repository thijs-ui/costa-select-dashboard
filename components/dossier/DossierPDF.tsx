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
// (Raleway 500 v37 ging op 26-04 op 404).
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

// ─── Design tokens (uit handoff) ─────────────────────────────────────────
const DEEPSEA = '#004B46'
const DEEPSEA_DEEP = '#072A24'
const SUN = '#F5AF40'
const SUN_DARK = '#C58118'
const MARBLE = '#FFFAEF'
const INK = '#1B2A28'
const INK_MUTE = '#8A9794'
const RULE = 'rgba(7,42,36,0.10)'
const RULE_STRONG = 'rgba(7,42,36,0.20)'
const ON_DARK_55 = 'rgba(255,250,239,0.55)'
const ON_DARK_20 = 'rgba(255,250,239,0.20)'

const PAD_X = 64

// ─── Types ────────────────────────────────────────────────────────────────
export interface DossierData {
  property: {
    adres: string
    regio: string
    type: string
    vraagprijs: number
    oppervlakte: number
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
  // Backwards-compat velden (worden niet meer gerendered):
  analyse?: unknown
  pitch_content?: unknown
  financial_data?: unknown
  units_data?: unknown
  generatedAt?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtEuro(n: number): string {
  if (!n) return '€ 0'
  return `€ ${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)}`
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
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
  coverBeeldmerkImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  coverBody: {
    marginTop: 'auto',
    flexDirection: 'column',
  },
  coverAddr: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 48,
    lineHeight: 0.98,
    letterSpacing: -1.2,
    color: MARBLE,
    marginBottom: 28,
    maxWidth: 480,
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
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 6,
  },
  coverPrice: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 38,
    color: SUN,
    letterSpacing: -0.95,
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
  coverSpecFirst: {
    borderLeftWidth: 0,
    paddingLeft: 0,
  },
  coverSpecLabel: {
    fontFamily: 'Raleway',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: ON_DARK_55,
    marginBottom: 6,
  },
  coverSpecValue: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 22,
    color: MARBLE,
    letterSpacing: -0.44,
    lineHeight: 1,
  },
  coverSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 10,
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
    height: 11,
    marginTop: 33,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hWordmarkImg: {
    height: 11,
    objectFit: 'contain',
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
  stitle: {
    marginBottom: 28,
    flexDirection: 'column',
  },
  stitleEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
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
    marginLeft: 12,
    marginRight: 12,
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
    marginBottom: 12,
  },
  stitleH2: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 32,
    lineHeight: 1.02,
    letterSpacing: -0.8,
    color: DEEPSEA,
    maxWidth: 880,
  },
  stitleTerminal: { color: SUN },

  // ── Detail page (presentatie) ──
  presSpecGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: RULE_STRONG,
  },
  presSpec: {
    flexBasis: '33.333%',
    width: '33.333%',
    paddingTop: 18,
    paddingRight: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: RULE,
    flexDirection: 'column',
  },
  presSpecSm: {
    flexBasis: '25%',
    width: '25%',
  },
  presSpecLabel: {
    fontFamily: 'Raleway',
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 1.87,
    textTransform: 'uppercase',
    color: INK_MUTE,
    marginBottom: 10,
  },
  presSpecValue: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 19,
    color: DEEPSEA,
    letterSpacing: -0.38,
    lineHeight: 1,
  },
  presSpecUnit: {
    fontFamily: 'Raleway',
    fontSize: 10,
    fontWeight: 500,
    color: INK_MUTE,
    marginLeft: 3,
  },
  presSpecAccent: {
    color: SUN_DARK,
    fontSize: 22,
  },
  presCols: {
    flexDirection: 'row',
    flex: 1,
  },
  presColsLeft: {
    flex: 1.25,
    flexDirection: 'column',
    paddingRight: 18,
  },
  presColsRight: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 18,
  },
  presBlockH: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  presBlockHNum: {
    fontFamily: 'Raleway',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1.98,
    textTransform: 'uppercase',
    color: INK_MUTE,
  },
  presBlockTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 600,
    fontSize: 16,
    color: DEEPSEA,
    letterSpacing: -0.24,
    lineHeight: 1.1,
    marginBottom: 14,
  },
  presBlockBody: {
    fontFamily: 'Raleway',
    fontSize: 9.5,
    fontWeight: 400,
    lineHeight: 1.65,
    color: INK,
  },

  // ── Foto-mosaic page ──
  photosBody: {
    flex: 1,
    paddingHorizontal: PAD_X,
    paddingTop: 16,
    paddingBottom: 72,
    flexDirection: 'column',
  },
  photosHero: {
    flexDirection: 'row',
    height: 650,
  },
  phHeroLeft: {
    flex: 1.35,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 14,
  },
  phHeroRight: {
    flex: 1,
    flexDirection: 'column',
  },
  phHeroSmall: {
    flex: 1,
    backgroundColor: DEEPSEA_DEEP,
    borderRadius: 2,
    overflow: 'hidden',
  },
  phHeroSmallSpacer: { height: 14 },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
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

// ─── Header (content pages, page 2+) ─────────────────────────────────────
function Header({ wordmarkSrc }: { wordmarkSrc?: string }) {
  return (
    <View style={s.hbar}>
      <View style={s.hWordmark}>
        {wordmarkSrc ? <Image src={wordmarkSrc} style={s.hWordmarkImg} /> : null}
      </View>
    </View>
  )
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
  const mosaicFotos = [fotos[1], fotos[2], fotos[3]]

  const omschrijving = truncateAtSentence(property.omschrijving ?? '', 720)
  const regioText = truncateAtSentence(regioInfo ?? '', 600)

  return (
    <Document>
      {/* ─── 01 COVER ─────────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.cover}>
          <View style={s.coverLeft}>
            <View style={s.coverBeeldmerk}>
              {beeldmerkSrc ? (
                <Image src={beeldmerkSrc} style={s.coverBeeldmerkImg} />
              ) : null}
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
                <View style={[s.coverSpec, s.coverSpecFirst]}>
                  <Text style={s.coverSpecLabel}>Slaapkamers</Text>
                  <Text style={s.coverSpecValue}>{property.slaapkamers || '—'}</Text>
                </View>
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecLabel}>Badkamers</Text>
                  <Text style={s.coverSpecValue}>{property.badkamers || '—'}</Text>
                </View>
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecLabel}>Woonopp.</Text>
                  <Text style={s.coverSpecValue}>
                    {property.oppervlakte || '—'}
                    <Text style={s.coverSpecUnit}>m²</Text>
                  </Text>
                </View>
                {property.bouwjaar ? (
                  <View style={s.coverSpec}>
                    <Text style={s.coverSpecLabel}>Bouwjaar</Text>
                    <Text style={s.coverSpecValue}>{String(property.bouwjaar)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={s.coverRight}>
            {heroFoto ? <Image src={heroFoto} style={s.coverHeroImg} /> : null}
          </View>
        </View>
      </Page>

      {/* ─── 02 DETAIL (presentatie) ───────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <Header wordmarkSrc={wordmarkSrc} />
        <View style={s.pdfBody}>
          <SectionTitle
            eyebrow="Kenmerken & locatie"
            counter="02 · Detail"
            title={property.adres}
          />

          <View style={s.presSpecGrid}>
            <View style={[s.presSpec, s.presSpecAccent]}>
              <Text style={s.presSpecLabel}>Vraagprijs</Text>
              <Text style={[s.presSpecValue, s.presSpecAccent]}>
                {fmtEuro(property.vraagprijs)}
              </Text>
            </View>
            <View style={s.presSpec}>
              <Text style={s.presSpecLabel}>Oppervlakte</Text>
              <Text style={s.presSpecValue}>
                {property.oppervlakte || '—'}
                <Text style={s.presSpecUnit}>m²</Text>
              </Text>
            </View>
            <View style={s.presSpec}>
              <Text style={s.presSpecLabel}>Slaapkamers</Text>
              <Text style={s.presSpecValue}>{property.slaapkamers || '—'}</Text>
            </View>
            <View style={[s.presSpec, s.presSpecSm]}>
              <Text style={s.presSpecLabel}>Badkamers</Text>
              <Text style={s.presSpecValue}>{property.badkamers || '—'}</Text>
            </View>
            <View style={[s.presSpec, s.presSpecSm]}>
              <Text style={s.presSpecLabel}>Type</Text>
              <Text style={s.presSpecValue}>{capitalize(property.type)}</Text>
            </View>
            <View style={[s.presSpec, s.presSpecSm]}>
              <Text style={s.presSpecLabel}>Regio</Text>
              <Text style={s.presSpecValue}>{property.regio}</Text>
            </View>
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
            <View style={s.presColsLeft}>
              <View style={s.presBlockH}>
                <Text style={s.presBlockHNum}>01 / Beschrijving</Text>
              </View>
              <Text style={s.presBlockTitle}>
                Over deze woning
                <Text style={s.stitleTerminal}>.</Text>
              </Text>
              {omschrijving ? (
                <Text style={s.presBlockBody}>{omschrijving}</Text>
              ) : null}
            </View>
            <View style={s.presColsRight}>
              <View style={s.presBlockH}>
                <Text style={s.presBlockHNum}>02 / Locatie</Text>
              </View>
              <Text style={s.presBlockTitle}>
                {property.regio}
                <Text style={s.stitleTerminal}>.</Text>
              </Text>
              {regioText ? (
                <Text style={s.presBlockBody}>{regioText}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Page>

      {/* ─── 03 FOTO-MOSAIC ────────────────────────────────────── */}
      {(mosaicFotos[0] || mosaicFotos[1] || mosaicFotos[2]) && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <Header wordmarkSrc={wordmarkSrc} />
          <View style={s.photosBody}>
            <View style={s.photosHero}>
              <View style={s.phHeroLeft}>
                {mosaicFotos[0] ? (
                  <Image src={mosaicFotos[0]} style={s.photoImg} />
                ) : null}
              </View>
              <View style={s.phHeroRight}>
                <View style={s.phHeroSmall}>
                  {mosaicFotos[1] ? (
                    <Image src={mosaicFotos[1]} style={s.photoImg} />
                  ) : null}
                </View>
                <View style={s.phHeroSmallSpacer} />
                <View style={s.phHeroSmall}>
                  {mosaicFotos[2] ? (
                    <Image src={mosaicFotos[2]} style={s.photoImg} />
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </Page>
      )}
    </Document>
  )
}
