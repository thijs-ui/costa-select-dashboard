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
    { src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvRviyM0.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvcXlyM0.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvfzlyM0.ttf', fontWeight: 700 },
  ],
})

Font.register({
  family: 'Raleway',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaooCP.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVsEpYCP.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVs9pYCP.ttf', fontWeight: 700 },
  ],
})

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
  generatedAt: string
}

// ─── Brand tokens ──────────────────────────────────────────────────────
const DEEPSEA = '#004B46'
const SUN = '#F5AF40'
const MARBLE = '#FFFAEF'
const SEA = '#0EAE96'
const GRAY = '#374151'
const GRAY_MID = '#7A8C8B'
const WHITE = '#FFFFFF'

// ─── Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  coverPage: { backgroundColor: DEEPSEA, padding: 0, fontFamily: 'Raleway' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 48, paddingTop: 36, paddingBottom: 20 },
  coverLogo: { width: 160, height: 40 },
  coverTagline: { fontSize: 9, fontFamily: 'Raleway', fontWeight: 600, color: SUN, letterSpacing: 4, textTransform: 'uppercase' },
  coverBody: { flexDirection: 'row', flex: 1, paddingHorizontal: 48, paddingBottom: 36, gap: 40 },
  coverLeft: { flex: 1, justifyContent: 'center', paddingRight: 8 },
  coverDivider: { width: 48, height: 3, backgroundColor: SUN, marginBottom: 20 },
  coverTitle: { fontSize: 28, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: WHITE, marginBottom: 12, lineHeight: 1.2 },
  coverPrice: { fontSize: 32, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: SUN, marginBottom: 24 },
  coverSpecs: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  coverSpec: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverSpecValue: { fontSize: 16, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: WHITE },
  coverSpecLabel: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: MARBLE, opacity: 0.7 },
  coverRegio: { fontSize: 11, fontFamily: 'Raleway', fontWeight: 600, color: SEA, letterSpacing: 1, marginBottom: 6 },
  coverType: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: MARBLE, opacity: 0.6 },
  coverRight: { width: 380, justifyContent: 'center' },
  coverHero: { width: '100%', height: 320, borderRadius: 12, objectFit: 'cover' },
  coverFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 48, paddingBottom: 24 },
  coverDate: { fontSize: 9, fontFamily: 'Raleway', fontWeight: 400, color: MARBLE, opacity: 0.5 },
  coverBranding: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 400, color: MARBLE, opacity: 0.4, letterSpacing: 1 },
  contentPage: { backgroundColor: MARBLE, fontFamily: 'Raleway', padding: 0 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DEEPSEA, paddingHorizontal: 48, paddingVertical: 14 },
  headerLogo: { width: 120, height: 30 },
  headerPageLabel: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: SUN, letterSpacing: 3, textTransform: 'uppercase' },
  contentBody: { flex: 1, paddingHorizontal: 48, paddingTop: 28, paddingBottom: 20 },
  sectionLabel: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: SUN, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: DEEPSEA, marginBottom: 10 },
  sectionDivider: { width: 32, height: 2, backgroundColor: SUN, marginBottom: 16 },
  body: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: GRAY, lineHeight: 1.7, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 32 },
  col: { flex: 1 },
  photoPageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  photoCell: { width: '48%', height: 220, borderRadius: 10, objectFit: 'cover' },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  bulletGreen: { backgroundColor: SEA },
  bulletAmber: { backgroundColor: SUN },
  bulletRed: { backgroundColor: '#E05252' },
  bulletText: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: GRAY, lineHeight: 1.6, flex: 1 },
  adviesBlock: { backgroundColor: DEEPSEA, borderRadius: 12, padding: 24, marginTop: 16 },
  adviesLabel: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: SUN, letterSpacing: 3, marginBottom: 8 },
  adviesText: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: MARBLE, lineHeight: 1.7 },
  pageFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 48, paddingBottom: 16 },
  footerText: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 400, color: GRAY_MID },
  footerPage: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: DEEPSEA },
  // Presentatie-specifieke styles
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  specCard: { backgroundColor: WHITE, borderRadius: 8, padding: 14, width: '30%', border: '1px solid rgba(0,75,70,0.08)' },
  specCardLabel: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: GRAY_MID, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  specCardValue: { fontSize: 14, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: DEEPSEA },
  // Buurtcontext style
  buurtBlock: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 20, marginTop: 12 },
  buurtLabel: { fontSize: 8, fontFamily: 'Raleway', fontWeight: 600, color: '#1E40AF', letterSpacing: 3, marginBottom: 8 },
  buurtText: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 400, color: GRAY, lineHeight: 1.7 },
})

function SectionBlock({ label, title }: { label: string; title: string }) {
  return (
    <View>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionDivider} />
    </View>
  )
}

function BulletItem({ text, color }: { text: string; color: 'green' | 'amber' | 'red' }) {
  const dotStyle = color === 'green' ? s.bulletGreen : color === 'amber' ? s.bulletAmber : s.bulletRed
  return (
    <View style={s.bulletRow}>
      <View style={[s.bulletDot, dotStyle]} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  )
}

function LogoOrText({ logoSrc, size = 'large' }: { logoSrc?: string; size?: 'large' | 'small' }) {
  if (logoSrc) {
    return <Image src={logoSrc} style={size === 'large' ? s.coverLogo : s.headerLogo} />
  }
  return (
    <Text style={{ fontSize: size === 'large' ? 16 : 12, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: WHITE, letterSpacing: 2 }}>
      COSTA SELECT
    </Text>
  )
}

function PageHeader({ logoSrc, label }: { logoSrc?: string; label: string }) {
  return (
    <View style={s.headerBar}>
      <LogoOrText logoSrc={logoSrc} size="small" />
      <Text style={s.headerPageLabel}>{label}</Text>
    </View>
  )
}

function PageFooterBar({ pageNum }: { pageNum: number }) {
  return (
    <View style={s.pageFooter}>
      <Text style={s.footerText}>Costa Select | Premium Aankoopmakelaar Spanje</Text>
      <Text style={s.footerPage}>{pageNum}</Text>
    </View>
  )
}

// ─── Main PDF Component ───────────────────────────────────────────────
export function DossierPDF({ data, logoSrc }: { data: DossierData; logoSrc?: string }) {
  const { property, regioInfo, analyse, pitch_content, generatedAt } = data
  const isPitch = data.brochure_type === 'pitch'
  const fotos = property.fotos || []

  // Gebruik pitch_content als beschikbaar, anders fallback naar analyse
  const voordelen = pitch_content?.voordelen ?? analyse?.sterke_punten ?? []
  const nadelen = pitch_content?.nadelen ?? analyse?.aandachtspunten ?? []
  const buurtcontext = pitch_content?.buurtcontext ?? ''
  const investering = pitch_content?.investering ?? ''
  const advies = pitch_content?.advies ?? analyse?.advies_consultant ?? ''
  const samenvatting = analyse?.samenvatting ?? ''
  const prijsanalyse = analyse?.prijsanalyse ?? ''
  const juridisch = analyse?.juridische_risicos ?? []
  const verhuur = analyse?.verhuurpotentieel ?? ''

  const prijsFormatted = property.vraagprijs
    ? `\u20AC ${property.vraagprijs.toLocaleString('nl-NL')}`
    : 'Prijs op aanvraag'

  const datumFormatted = new Date(generatedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  let pageCounter = 1

  return (
    <Document>
      {/* ─── PAGE 1: COVER ──────────────────────────────────── */}
      <Page size="A4" orientation="landscape" style={s.coverPage}>
        <View style={s.coverTop}>
          <LogoOrText logoSrc={logoSrc} size="large" />
          <Text style={s.coverTagline}>{isPitch ? 'Woningpitch' : 'Woningpresentatie'}</Text>
        </View>

        <View style={s.coverBody}>
          <View style={s.coverLeft}>
            <View style={s.coverDivider} />
            <Text style={s.coverRegio}>{property.regio}</Text>
            <Text style={s.coverTitle}>{property.adres}</Text>
            <Text style={s.coverPrice}>{prijsFormatted}</Text>
            <View style={s.coverSpecs}>
              {property.slaapkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>{property.slaapkamers}</Text>
                  <Text style={s.coverSpecLabel}>slaapkamers</Text>
                </View>
              )}
              {property.badkamers > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>{property.badkamers}</Text>
                  <Text style={s.coverSpecLabel}>badkamers</Text>
                </View>
              )}
              {property.oppervlakte > 0 && (
                <View style={s.coverSpec}>
                  <Text style={s.coverSpecValue}>{property.oppervlakte}</Text>
                  <Text style={s.coverSpecLabel}>m2</Text>
                </View>
              )}
            </View>
            <Text style={s.coverType}>{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</Text>
          </View>

          {fotos[0] && (
            <View style={s.coverRight}>
              <Image src={fotos[0]} style={s.coverHero} />
            </View>
          )}
        </View>

        <View style={s.coverFooter}>
          <Text style={s.coverDate}>Gegenereerd op {datumFormatted}</Text>
          <Text style={s.coverBranding}>Costa Select | Premium Aankoopmakelaar Spanje</Text>
        </View>
      </Page>

      {/* ─── PAGE 2: DETAILS (presentatie) of ANALYSE (pitch) ─── */}
      {!isPitch ? (
        /* PRESENTATIE: feitelijke details pagina */
        <Page size="A4" orientation="landscape" style={s.contentPage}>
          <PageHeader logoSrc={logoSrc} label="Woningdetails" />
          <View style={s.contentBody}>
            <SectionBlock label="Kenmerken" title={property.adres} />

            <View style={s.specGrid}>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Vraagprijs</Text>
                <Text style={s.specCardValue}>{prijsFormatted}</Text>
              </View>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Oppervlakte</Text>
                <Text style={s.specCardValue}>{property.oppervlakte > 0 ? `${property.oppervlakte} m\u00B2` : '\u2014'}</Text>
              </View>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Slaapkamers</Text>
                <Text style={s.specCardValue}>{property.slaapkamers > 0 ? String(property.slaapkamers) : '\u2014'}</Text>
              </View>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Badkamers</Text>
                <Text style={s.specCardValue}>{property.badkamers > 0 ? String(property.badkamers) : '\u2014'}</Text>
              </View>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Type</Text>
                <Text style={s.specCardValue}>{property.type.charAt(0).toUpperCase() + property.type.slice(1)}</Text>
              </View>
              <View style={s.specCard}>
                <Text style={s.specCardLabel}>Regio</Text>
                <Text style={s.specCardValue}>{property.regio}</Text>
              </View>
            </View>

            {property.omschrijving && (
              <View>
                <SectionBlock label="Beschrijving" title="Over deze woning" />
                <Text style={s.body}>{property.omschrijving.substring(0, 800)}</Text>
              </View>
            )}

            {regioInfo ? (
              <View style={{ marginTop: 16 }}>
                <SectionBlock label="Locatie" title={property.regio} />
                <Text style={s.body}>{regioInfo}</Text>
              </View>
            ) : null}
          </View>
          <PageFooterBar pageNum={++pageCounter} />
        </Page>
      ) : (
        /* PITCH: analyse pagina */
        <>
          <Page size="A4" orientation="landscape" style={s.contentPage}>
            <PageHeader logoSrc={logoSrc} label="Analyse" />
            <View style={s.contentBody}>
              <View style={s.row}>
                <View style={s.col}>
                  <SectionBlock label="Overzicht" title="Samenvatting" />
                  <Text style={s.body}>{samenvatting}</Text>
                  {property.omschrijving && (
                    <Text style={[s.body, { marginTop: 4, color: GRAY_MID }]}>{property.omschrijving.substring(0, 400)}</Text>
                  )}
                </View>
                <View style={s.col}>
                  <SectionBlock label="Markt" title="Prijsanalyse" />
                  <Text style={s.body}>{prijsanalyse}</Text>
                </View>
              </View>

              <View style={[s.row, { marginTop: 20 }]}>
                <View style={s.col}>
                  <Text style={[s.sectionLabel, { color: SEA, marginBottom: 10 }]}>Voordelen</Text>
                  {voordelen.map((p, i) => <BulletItem key={i} text={p} color="green" />)}
                </View>
                <View style={s.col}>
                  <Text style={[s.sectionLabel, { color: SUN, marginBottom: 10 }]}>Nadelen / aandachtspunten</Text>
                  {nadelen.map((p, i) => <BulletItem key={i} text={p} color="amber" />)}
                </View>
              </View>
            </View>
            <PageFooterBar pageNum={++pageCounter} />
          </Page>

          {/* PITCH PAGE 3: Regio, buurt, advies */}
          <Page size="A4" orientation="landscape" style={s.contentPage}>
            <PageHeader logoSrc={logoSrc} label="Regio & Advies" />
            <View style={s.contentBody}>
              <View style={s.row}>
                <View style={s.col}>
                  {buurtcontext && (
                    <View style={s.buurtBlock}>
                      <Text style={s.buurtLabel}>Buurtcontext</Text>
                      <Text style={s.buurtText}>{buurtcontext}</Text>
                    </View>
                  )}

                  {verhuur && (
                    <View style={{ marginTop: 16 }}>
                      <SectionBlock label="Rendement" title="Verhuurpotentieel" />
                      <Text style={s.body}>{verhuur}</Text>
                    </View>
                  )}

                  {investering && (
                    <View style={{ marginTop: 16 }}>
                      <SectionBlock label="Investering" title="Investeringspotentieel" />
                      <Text style={s.body}>{investering}</Text>
                    </View>
                  )}
                </View>
                <View style={s.col}>
                  {juridisch.length > 0 && (
                    <View>
                      <SectionBlock label="Juridisch" title="Aandachtspunten" />
                      {juridisch.map((r, i) => <BulletItem key={i} text={r} color="red" />)}
                    </View>
                  )}

                  {regioInfo ? (
                    <View style={{ marginTop: 16 }}>
                      <SectionBlock label="Regio" title={property.regio} />
                      <Text style={s.body}>{regioInfo}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={s.adviesBlock}>
                <Text style={s.adviesLabel}>Costa Select advies</Text>
                <Text style={s.adviesText}>{advies}</Text>
              </View>
            </View>
            <PageFooterBar pageNum={++pageCounter} />
          </Page>
        </>
      )}

      {/* ─── PHOTO PAGES ────────────────────────────────────── */}
      {fotos.length > 0 &&
        [0, 1].map((pageIdx) => {
          const pagePhotos = fotos.slice(pageIdx * 4, pageIdx * 4 + 4)
          if (pagePhotos.length === 0) return null
          return (
            <Page key={`photos-${pageIdx}`} size="A4" orientation="landscape" style={s.contentPage}>
              <PageHeader logoSrc={logoSrc} label={`Foto\u2019s ${pageIdx + 1}`} />
              <View style={s.contentBody}>
                <View style={s.photoPageGrid}>
                  {pagePhotos.map((url, i) => <Image key={i} src={url} style={s.photoCell} />)}
                </View>
              </View>
              <PageFooterBar pageNum={++pageCounter} />
            </Page>
          )
        })}
    </Document>
  )
}
