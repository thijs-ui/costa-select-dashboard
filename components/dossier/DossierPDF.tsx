import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

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

const DEEPSEA = '#004B46'
const SUN = '#F5AF40'
const MARBLE = '#FFFAEF'
const GRAY = '#374151'
const GRAY_LIGHT = '#9CA3AF'

const s = StyleSheet.create({
  // ─── Page 1: Omslag ──────────────────────────────
  page: { backgroundColor: MARBLE, fontFamily: 'Helvetica' },
  header: { backgroundColor: DEEPSEA, paddingHorizontal: 40, paddingTop: 40, paddingBottom: 32 },
  tagline: { color: SUN, fontSize: 10, letterSpacing: 3, fontFamily: 'Helvetica-Bold', marginTop: 8 },
  logoText: { color: '#FFFAEF', fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  logoSub: { color: '#FFFAEF', fontSize: 7, letterSpacing: 4, marginTop: 2, opacity: 0.5 },
  omslagContent: { padding: 40 },
  heroImage: { width: '100%', height: 220, objectFit: 'cover', borderRadius: 6, marginBottom: 20 },
  adres: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: DEEPSEA, marginBottom: 6 },
  prijs: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: DEEPSEA, marginBottom: 16 },
  kenmerkenRij: { flexDirection: 'row', gap: 20, marginBottom: 24 },
  kenmerk: { fontSize: 11, color: GRAY, fontFamily: 'Helvetica' },
  kenmerkBold: { fontFamily: 'Helvetica-Bold', color: DEEPSEA },
  datum: { fontSize: 9, color: GRAY_LIGHT, marginTop: 12 },
  divider: { height: 2, backgroundColor: SUN, width: 40, marginVertical: 16 },

  // ─── Page 2+3: Content ───────────────────────────
  contentPage: { backgroundColor: MARBLE, padding: 40, paddingBottom: 60 },
  sectionHeader: {
    fontSize: 13, fontFamily: 'Helvetica-Bold', color: DEEPSEA,
    marginTop: 20, marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: DEEPSEA,
  },
  body: { fontSize: 10, color: GRAY, lineHeight: 1.6, marginBottom: 8 },
  fotoGrid: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  gridFoto: { flex: 1, height: 120, objectFit: 'cover', borderRadius: 4 },
  tweeKolommen: { flexDirection: 'row', gap: 24, marginTop: 8 },
  kolom: { flex: 1 },
  subheader: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DEEPSEA, marginBottom: 6 },
  bulletRij: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bulletGreen: { fontSize: 10, color: '#16a34a', fontFamily: 'Helvetica-Bold', width: 12 },
  bulletAmber: { fontSize: 10, color: '#d97706', fontFamily: 'Helvetica-Bold', width: 12 },
  bulletRed: { fontSize: 10, color: '#dc2626', fontFamily: 'Helvetica-Bold', width: 12 },
  bulletText: { fontSize: 10, color: GRAY, flex: 1, lineHeight: 1.5 },

  // ─── Adviesblok ──────────────────────────────────
  adviesBlok: { backgroundColor: DEEPSEA, padding: 16, borderRadius: 6, marginTop: 20 },
  adviesLabel: { fontSize: 8, color: SUN, letterSpacing: 2, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  adviesText: { fontSize: 10, color: MARBLE, lineHeight: 1.6 },

  // ─── Footer ──────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between',
    fontSize: 8, color: GRAY_LIGHT,
  },
  pageNum: { fontSize: 8, color: GRAY_LIGHT },
})

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

export function DossierPDF({ data }: { data: DossierData }) {
  const { property, regioInfo, analyse, generatedAt } = data
  const fotos = property.fotos || []
  const prijsFormatted = property.vraagprijs
    ? `€ ${property.vraagprijs.toLocaleString('nl-NL')}`
    : 'Prijs op aanvraag'
  const datumFormatted = new Date(generatedAt).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document>
      {/* ─── Pagina 1: Omslag ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logoText}>COSTA SELECT</Text>
          <Text style={s.logoSub}>PREMIUM AANKOOPMAKELAAR SPANJE</Text>
          <View style={s.divider} />
          <Text style={s.tagline}>WONINGDOSSIER</Text>
        </View>

        <View style={s.omslagContent}>
          {fotos[0] && <Image src={fotos[0]} style={s.heroImage} />}

          <Text style={s.adres}>{property.adres}</Text>
          <Text style={s.prijs}>{prijsFormatted}</Text>

          <View style={s.kenmerkenRij}>
            {property.slaapkamers > 0 && (
              <Text style={s.kenmerk}>
                <Text style={s.kenmerkBold}>{property.slaapkamers}</Text> slaapkamers
              </Text>
            )}
            {property.badkamers > 0 && (
              <Text style={s.kenmerk}>
                <Text style={s.kenmerkBold}>{property.badkamers}</Text> badkamers
              </Text>
            )}
            {property.oppervlakte > 0 && (
              <Text style={s.kenmerk}>
                <Text style={s.kenmerkBold}>{property.oppervlakte}</Text> m²
              </Text>
            )}
            {property.type && (
              <Text style={s.kenmerk}>{property.type}</Text>
            )}
          </View>

          <Text style={s.kenmerk}>Regio: {property.regio}</Text>
          <Text style={s.datum}>Gegenereerd op {datumFormatted}</Text>
        </View>

        <View style={s.footer}>
          <Text>Costa Select — Premium Aankoopmakelaar Spanje</Text>
          <Text style={s.pageNum}>1</Text>
        </View>
      </Page>

      {/* ─── Pagina 2: Details & Analyse ──────────────────────── */}
      <Page size="A4" style={s.contentPage}>
        <SectionHeader title="Objectomschrijving" />
        <Text style={s.body}>{analyse.samenvatting}</Text>

        {property.omschrijving && (
          <Text style={s.body}>{property.omschrijving.substring(0, 600)}</Text>
        )}

        {fotos.length > 1 && (
          <View style={s.fotoGrid}>
            {fotos.slice(1, 4).map((url, i) => (
              <Image key={i} src={url} style={s.gridFoto} />
            ))}
          </View>
        )}

        <SectionHeader title="Prijsanalyse" />
        <Text style={s.body}>{analyse.prijsanalyse}</Text>

        <View style={s.tweeKolommen}>
          <View style={s.kolom}>
            <Text style={s.subheader}>Sterke punten</Text>
            {analyse.sterke_punten.map((p, i) => (
              <View key={i} style={s.bulletRij}>
                <Text style={s.bulletGreen}>✓</Text>
                <Text style={s.bulletText}>{p}</Text>
              </View>
            ))}
          </View>
          <View style={s.kolom}>
            <Text style={s.subheader}>Aandachtspunten</Text>
            {analyse.aandachtspunten.map((p, i) => (
              <View key={i} style={s.bulletRij}>
                <Text style={s.bulletAmber}>!</Text>
                <Text style={s.bulletText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <Text>Costa Select — Premium Aankoopmakelaar Spanje</Text>
          <Text style={s.pageNum}>2</Text>
        </View>
      </Page>

      {/* ─── Pagina 3: Regio & Advies ─────────────────────────── */}
      <Page size="A4" style={s.contentPage}>
        <SectionHeader title={`Regio: ${property.regio}`} />
        <Text style={s.body}>{regioInfo}</Text>

        <SectionHeader title="Juridische aandachtspunten" />
        {analyse.juridische_risicos.map((r, i) => (
          <View key={i} style={s.bulletRij}>
            <Text style={s.bulletRed}>⚠</Text>
            <Text style={s.bulletText}>{r}</Text>
          </View>
        ))}

        <SectionHeader title="Verhuurpotentieel" />
        <Text style={s.body}>{analyse.verhuurpotentieel}</Text>

        <View style={s.adviesBlok}>
          <Text style={s.adviesLabel}>ADVIES CONSULTANT</Text>
          <Text style={s.adviesText}>{analyse.advies_consultant}</Text>
        </View>

        <View style={s.footer}>
          <Text>Costa Select — Premium Aankoopmakelaar Spanje</Text>
          <Text style={s.pageNum}>3</Text>
        </View>
      </Page>
    </Document>
  )
}
