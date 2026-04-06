import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// ─── Register brand fonts ──────────────────────────────────────────────
Font.register({
  family: 'Bricolage Grotesque',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvRviyM0.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvcXlyM0.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvfzlyM0.ttf',
      fontWeight: 700,
    },
  ],
})

Font.register({
  family: 'Raleway',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaooCP.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVsEpYCP.ttf',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVs9pYCP.ttf',
      fontWeight: 700,
    },
  ],
})

// Disable hyphenation for cleaner text
Font.registerHyphenationCallback((word) => [word])

// ─── Types ─────────────────────────────────────────────────────────────
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
  analyse: {
    samenvatting: string
    prijsanalyse: string
    sterke_punten: string[]
    aandachtspunten: string[]
    juridische_risicos: string[]
    verhuurpotentieel: string
    advies_consultant: string
  }
  generatedAt: string
}

// ─── Brand tokens ──────────────────────────────────────────────────────
const DEEPSEA = '#004B46'
const DEEPSEA_LIGHT = '#0A6B63'
const SUN = '#F5AF40'
const MARBLE = '#FFFAEF'
const SEA = '#0EAE96'
const GRAY = '#374151'
const GRAY_MID = '#7A8C8B'
const GRAY_LIGHT = '#9CA3AF'
const WHITE = '#FFFFFF'

// ─── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ─── Cover page ─────────────────────────────────────────
  coverPage: {
    backgroundColor: DEEPSEA,
    padding: 0,
    fontFamily: 'Raleway',
  },
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 20,
  },
  coverLogo: {
    width: 160,
    height: 40,
  },
  coverTagline: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: SUN,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  coverBody: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 48,
    paddingBottom: 36,
    gap: 40,
  },
  coverLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  coverDivider: {
    width: 48,
    height: 3,
    backgroundColor: SUN,
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: WHITE,
    marginBottom: 12,
    lineHeight: 1.2,
  },
  coverPrice: {
    fontSize: 32,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: SUN,
    marginBottom: 24,
  },
  coverSpecs: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  coverSpec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverSpecValue: {
    fontSize: 16,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: WHITE,
  },
  coverSpecLabel: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: MARBLE,
    opacity: 0.7,
  },
  coverRegio: {
    fontSize: 11,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: SEA,
    letterSpacing: 1,
    marginBottom: 6,
  },
  coverType: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: MARBLE,
    opacity: 0.6,
  },
  coverRight: {
    width: 380,
    justifyContent: 'center',
  },
  coverHero: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    objectFit: 'cover',
  },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 24,
  },
  coverDate: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: MARBLE,
    opacity: 0.5,
  },
  coverBranding: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: MARBLE,
    opacity: 0.4,
    letterSpacing: 1,
  },

  // ─── Content pages ──────────────────────────────────────
  contentPage: {
    backgroundColor: MARBLE,
    fontFamily: 'Raleway',
    padding: 0,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DEEPSEA,
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  headerLogo: {
    width: 120,
    height: 30,
  },
  headerPageLabel: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: SUN,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  contentBody: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 20,
  },

  // ─── Section headers ────────────────────────────────────
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: SUN,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: DEEPSEA,
    marginBottom: 10,
  },
  sectionDivider: {
    width: 32,
    height: 2,
    backgroundColor: SUN,
    marginBottom: 16,
  },

  // ─── Body text ──────────────────────────────────────────
  body: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY,
    lineHeight: 1.7,
    marginBottom: 6,
  },

  // ─── Layout helpers ─────────────────────────────────────
  row: {
    flexDirection: 'row',
    gap: 32,
  },
  col: {
    flex: 1,
  },

  // ─── Photo pages ─────────────────────────────────────────
  photoPageGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  photoCell: {
    width: '48%',
    height: 220,
    borderRadius: 10,
    objectFit: 'cover',
  },

  // ─── Bullet lists ──────────────────────────────────────
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  bulletGreen: {
    backgroundColor: SEA,
  },
  bulletAmber: {
    backgroundColor: SUN,
  },
  bulletRed: {
    backgroundColor: '#E05252',
  },
  bulletText: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY,
    lineHeight: 1.6,
    flex: 1,
  },

  // ─── Advies block ──────────────────────────────────────
  adviesBlock: {
    backgroundColor: DEEPSEA,
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
  },
  adviesLabel: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: SUN,
    letterSpacing: 3,
    marginBottom: 8,
  },
  adviesText: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: MARBLE,
    lineHeight: 1.7,
  },

  // ─── Card style section ─────────────────────────────────
  card: {
    backgroundColor: WHITE,
    borderRadius: 10,
    padding: 20,
    border: `1px solid rgba(0,75,70,0.08)`,
  },

  // ─── Footer ────────────────────────────────────────────
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: GRAY_MID,
  },
  footerPage: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: DEEPSEA,
  },
})

// ─── Helper: Section Header ───────────────────────────────────────────
function SectionBlock({ label, title }: { label: string; title: string }) {
  return (
    <View>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionDivider} />
    </View>
  )
}

// ─── Helper: Bullet Item ──────────────────────────────────────────────
function BulletItem({
  text,
  color,
}: {
  text: string
  color: 'green' | 'amber' | 'red'
}) {
  const dotStyle =
    color === 'green'
      ? s.bulletGreen
      : color === 'amber'
        ? s.bulletAmber
        : s.bulletRed
  return (
    <View style={s.bulletRow}>
      <View style={[s.bulletDot, dotStyle]} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

// ─── Main PDF Component ───────────────────────────────────────────────
export function DossierPDF({
  data,
  logoSrc,
}: {
  data: DossierData
  logoSrc?: string
}) {
  const { property, regioInfo, analyse, generatedAt } = data
  const fotos = property.fotos || []

  const prijsFormatted = property.vraagprijs
    ? `\u20AC ${property.vraagprijs.toLocaleString('nl-NL')}`
    : 'Prijs op aanvraag'

  const datumFormatted = new Date(generatedAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Document>
      {/* ─── PAGE 1: COVER ──────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.coverPage}>
        {/* Top bar: Logo + tagline */}
        <View style={s.coverTop}>
          {logoSrc ? (
            <Image src={logoSrc} style={s.coverLogo} />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Bricolage Grotesque',
                fontWeight: 700,
                color: WHITE,
                letterSpacing: 2,
              }}
            >
              COSTA SELECT
            </Text>
          )}
          <Text style={s.coverTagline}>Woningdossier</Text>
        </View>

        {/* Main content: left info + right hero image */}
        <View style={s.coverBody}>
          <View style={s.coverLeft}>
            <View style={s.coverDivider} />

            <Text style={s.coverRegio}>{property.regio}</Text>
            <Text style={s.coverTitle}>{property.adres}</Text>
            <Text style={s.coverPrice}>{prijsFormatted}</Text>

            <View style={s.coverSpecs}>
              {property.slaapkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>
                    {property.slaapkamers}
                  </Text>
                  <Text style={s.coverSpecLabel}>slaapkamers</Text>
                </View>
              )}
              {property.badkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>
                    {property.badkamers}
                  </Text>
                  <Text style={s.coverSpecLabel}>badkamers</Text>
                </View>
              )}
              {property.oppervlakte > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>
                    {property.oppervlakte}
                  </Text>
                  <Text style={s.coverSpecLabel}>m2</Text>
                </View>
              )}
            </View>

            <Text style={s.coverType}>
              {property.type.charAt(0).toUpperCase() +
                property.type.slice(1)}
            </Text>
          </View>

          {fotos[0] && (
            <View style={s.coverRight}>
              <Image src={fotos[0]} style={s.coverHero} />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={s.coverFooter}>
          <Text style={s.coverDate}>
            Gegenereerd op {datumFormatted}
          </Text>
          <Text style={s.coverBranding}>
            Costa Select | Premium Aankoopmakelaar Spanje
          </Text>
        </View>
      </Page>

      {/* ─── PAGE 2: ANALYSE ────────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.contentPage}>
        {/* Header bar */}
        <View style={s.headerBar}>
          {logoSrc ? (
            <Image src={logoSrc} style={s.headerLogo} />
          ) : (
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Bricolage Grotesque',
                fontWeight: 700,
                color: WHITE,
              }}
            >
              COSTA SELECT
            </Text>
          )}
          <Text style={s.headerPageLabel}>Analyse</Text>
        </View>

        <View style={s.contentBody}>
          {/* Samenvatting + Prijsanalyse */}
          <View style={s.row}>
            <View style={s.col}>
              <SectionBlock label="Overzicht" title="Samenvatting" />
              <Text style={s.body}>{analyse.samenvatting}</Text>
              {property.omschrijving && (
                <Text style={[s.body, { marginTop: 4, color: GRAY_MID }]}>
                  {property.omschrijving.substring(0, 400)}
                </Text>
              )}
            </View>
            <View style={s.col}>
              <SectionBlock label="Markt" title="Prijsanalyse" />
              <Text style={s.body}>{analyse.prijsanalyse}</Text>
            </View>
          </View>

          {/* Sterke punten + Aandachtspunten */}
          <View style={[s.row, { marginTop: 20 }]}>
            <View style={s.col}>
              <Text
                style={[
                  s.sectionLabel,
                  { color: SEA, marginBottom: 10 },
                ]}
              >
                Sterke punten
              </Text>
              {analyse.sterke_punten.map((p, i) => (
                <BulletItem key={i} text={p} color="green" />
              ))}
            </View>
            <View style={s.col}>
              <Text
                style={[
                  s.sectionLabel,
                  { color: SUN, marginBottom: 10 },
                ]}
              >
                Aandachtspunten
              </Text>
              {analyse.aandachtspunten.map((p, i) => (
                <BulletItem key={i} text={p} color="amber" />
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.pageFooter}>
          <Text style={s.footerText}>
            Costa Select | Premium Aankoopmakelaar Spanje
          </Text>
          <Text style={s.footerPage}>2</Text>
        </View>
      </Page>

      {/* ─── PAGE 3: REGIO & ADVIES ─────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.contentPage}>
        {/* Header bar */}
        <View style={s.headerBar}>
          {logoSrc ? (
            <Image src={logoSrc} style={s.headerLogo} />
          ) : (
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Bricolage Grotesque',
                fontWeight: 700,
                color: WHITE,
              }}
            >
              COSTA SELECT
            </Text>
          )}
          <Text style={s.headerPageLabel}>
            Regio &amp; Advies
          </Text>
        </View>

        <View style={s.contentBody}>
          <View style={s.row}>
            {/* Left column: Regio + Verhuur */}
            <View style={s.col}>
              <SectionBlock
                label="Regio"
                title={property.regio}
              />
              <Text style={s.body}>{regioInfo}</Text>

              <View style={{ marginTop: 20 }}>
                <SectionBlock
                  label="Rendement"
                  title="Verhuurpotentieel"
                />
                <Text style={s.body}>
                  {analyse.verhuurpotentieel}
                </Text>
              </View>
            </View>

            {/* Right column: Juridisch */}
            <View style={s.col}>
              {analyse.juridische_risicos.length > 0 && (
                <View>
                  <SectionBlock
                    label="Juridisch"
                    title="Aandachtspunten"
                  />
                  {analyse.juridische_risicos.map((r, i) => (
                    <BulletItem key={i} text={r} color="red" />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Advies block */}
          <View style={s.adviesBlock}>
            <Text style={s.adviesLabel}>
              Advies voor consultant
            </Text>
            <Text style={s.adviesText}>
              {analyse.advies_consultant}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.pageFooter}>
          <Text style={s.footerText}>
            Costa Select | Premium Aankoopmakelaar Spanje
          </Text>
          <Text style={s.footerPage}>3</Text>
        </View>
      </Page>

      {/* ─── PHOTO PAGES (4 photos per page, up to 8 total) ──── */}
      {fotos.length > 0 &&
        [0, 1].map((pageIdx) => {
          const pagePhotos = fotos.slice(pageIdx * 4, pageIdx * 4 + 4)
          if (pagePhotos.length === 0) return null
          return (
            <Page
              key={`photos-${pageIdx}`}
              size="A4"
              orientation="landscape"
              style={s.contentPage}
            >
              <View style={s.headerBar}>
                {logoSrc ? (
                  <Image src={logoSrc} style={s.headerLogo} />
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: 'Bricolage Grotesque',
                      fontWeight: 700,
                      color: WHITE,
                    }}
                  >
                    COSTA SELECT
                  </Text>
                )}
                <Text style={s.headerPageLabel}>
                  {`Foto\u2019s ${pageIdx + 1}`}
                </Text>
              </View>

              <View style={s.contentBody}>
                <View style={s.photoPageGrid}>
                  {pagePhotos.map((url, i) => (
                    <Image
                      key={i}
                      src={url}
                      style={s.photoCell}
                    />
                  ))}
                </View>
              </View>

              <View style={s.pageFooter}>
                <Text style={s.footerText}>
                  Costa Select | Premium Aankoopmakelaar Spanje
                </Text>
                <Text style={s.footerPage}>{4 + pageIdx}</Text>
              </View>
            </Page>
          )
        })}
    </Document>
  )
}
