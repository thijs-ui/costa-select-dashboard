import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'

Font.register({
  family: 'Bricolage Grotesque',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvRviyM0.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvfzlyM0.ttf', fontWeight: 700 },
  ],
})
Font.register({
  family: 'Raleway',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaooCP.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVsEpYCP.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/raleway/v37/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVscpoCP.ttf', fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback((word) => [word])

// Costa Select kleurpalet (gedeeld met DossierPDF)
const DEEPSEA = '#004B46'
const DEEPSEA_LIGHT = '#0A6B63'
const DEEPSEA_DEEP = '#072A24'
const SUN = '#F5AF40'
const SUN_DARK = '#D4921A'
const MARBLE = '#FFFAEF'
const SEA = '#0EAE96'
const WHITE = '#FFFFFF'
const GRAY_500 = '#7A8C8B'
const BORDER = 'rgba(0,75,70,0.12)'

const s = StyleSheet.create({
  page: { backgroundColor: MARBLE, fontFamily: 'Raleway', padding: 0 },
  darkPage: { backgroundColor: DEEPSEA, fontFamily: 'Raleway', padding: 0, color: MARBLE },

  // ─── Cover ───
  coverContainer: { flexDirection: 'column', width: '100%', height: '100%' },
  coverTop: { padding: 40, paddingBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  coverLogo: { height: 22 },
  coverTag: {
    fontSize: 10,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  coverMain: { paddingHorizontal: 40, paddingTop: 80, paddingBottom: 24 },
  coverEyebrow: {
    fontSize: 11,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SEA,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  coverTitle: {
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    fontSize: 44,
    color: MARBLE,
    lineHeight: 1.05,
    letterSpacing: -0.5,
    marginBottom: 18,
  },
  coverDivider: { width: 56, height: 3, backgroundColor: SUN, marginBottom: 18 },
  coverMeta: {
    fontSize: 13,
    fontFamily: 'Raleway',
    fontWeight: 400,
    color: 'rgba(255,250,239,0.75)',
    marginBottom: 6,
  },
  coverMetaStrong: {
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: MARBLE,
  },
  coverHeroWrap: { flex: 1, paddingHorizontal: 40, paddingBottom: 32 },
  coverHero: { width: '100%', height: '100%', borderRadius: 12, objectFit: 'cover', backgroundColor: DEEPSEA_DEEP },
  coverFooter: {
    paddingHorizontal: 40,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverFooterText: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: 'rgba(255,250,239,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ─── Header bar (listing pages) ───
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DEEPSEA,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  headerLogo: { height: 18 },
  headerTitle: {
    fontSize: 9.5,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ─── Body ───
  body: { flex: 1, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 16 },
  pageHeading: { marginBottom: 18 },
  pageHeadingEyebrow: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SUN_DARK,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pageHeadingTitle: {
    fontSize: 22,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: DEEPSEA,
    letterSpacing: -0.3,
  },
  pageHeadingRule: { width: 40, height: 3, backgroundColor: SUN, marginTop: 10 },

  // ─── Listing card ───
  cards: { flex: 1, gap: 16 },
  card: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: BORDER,
  },
  cardFav: {
    borderWidth: 1.5,
    borderColor: SUN,
  },
  cardThumbWrap: {
    width: 245,
    backgroundColor: DEEPSEA_LIGHT,
    position: 'relative',
  },
  cardThumb: { width: '100%', height: '100%', objectFit: 'cover' },
  cardFavBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: SUN,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFavBadgeStar: {
    fontSize: 10,
    color: DEEPSEA,
    fontWeight: 700,
  },
  cardFavBadgeText: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: DEEPSEA,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardInfoTop: { flexDirection: 'column' },
  cardRegio: {
    fontSize: 9,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: SEA,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: DEEPSEA,
    lineHeight: 1.2,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  cardMetaItem: { flexDirection: 'column' },
  cardMetaLabel: {
    fontSize: 7.5,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: GRAY_500,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardMetaValue: {
    fontSize: 12,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: DEEPSEA,
  },
  cardPrice: {
    fontSize: 22,
    fontFamily: 'Bricolage Grotesque',
    fontWeight: 700,
    color: SUN,
    letterSpacing: -0.4,
  },
  cardPriceMuted: {
    fontSize: 13,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: GRAY_500,
  },

  // ─── Footer ───
  footer: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 600,
    color: GRAY_500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  footerPage: {
    fontSize: 8,
    fontFamily: 'Raleway',
    fontWeight: 700,
    color: DEEPSEA,
    letterSpacing: 1.2,
  },
})

interface Item {
  title: string
  url: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  thumbnail: string | null
  is_favorite: boolean
}

function fmtEuro(n: number): string {
  return `€ ${n.toLocaleString('nl-NL')}`
}

function pickHero(items: Item[]): string | null {
  // Eerst proberen de favoriete woning, anders de eerste met thumbnail.
  const fav = items.find(i => i.is_favorite && i.thumbnail)
  if (fav?.thumbnail) return fav.thumbnail
  const first = items.find(i => i.thumbnail)
  return first?.thumbnail ?? null
}

function uniqueRegions(items: Item[]): string[] {
  const set = new Set<string>()
  items.forEach(i => {
    if (i.location) set.add(i.location.split(/[·,]/)[0].trim())
  })
  return Array.from(set)
}

function ListingCard({ item }: { item: Item }) {
  return (
    <View style={[s.card, item.is_favorite ? s.cardFav : {}]} wrap={false}>
      <View style={s.cardThumbWrap}>
        {item.thumbnail ? (
          <Image src={item.thumbnail} style={s.cardThumb} />
        ) : null}
        {item.is_favorite && (
          <View style={s.cardFavBadge}>
            <Text style={s.cardFavBadgeStar}>★</Text>
            <Text style={s.cardFavBadgeText}>Favoriet</Text>
          </View>
        )}
      </View>
      <View style={s.cardInfo}>
        <View style={s.cardInfoTop}>
          {item.location ? <Text style={s.cardRegio}>{item.location}</Text> : null}
          <Text style={s.cardTitle}>{item.title || 'Onbekend'}</Text>

          <View style={s.cardMetaRow}>
            {item.size_m2 ? (
              <View style={s.cardMetaItem}>
                <Text style={s.cardMetaLabel}>Woonopp.</Text>
                <Text style={s.cardMetaValue}>{item.size_m2} m²</Text>
              </View>
            ) : null}
            {item.bedrooms ? (
              <View style={s.cardMetaItem}>
                <Text style={s.cardMetaLabel}>Slaapk.</Text>
                <Text style={s.cardMetaValue}>{item.bedrooms}</Text>
              </View>
            ) : null}
            {item.bathrooms ? (
              <View style={s.cardMetaItem}>
                <Text style={s.cardMetaLabel}>Badk.</Text>
                <Text style={s.cardMetaValue}>{item.bathrooms}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.price ? (
          <Text style={s.cardPrice}>{fmtEuro(item.price)}</Text>
        ) : (
          <Text style={s.cardPriceMuted}>Prijs op aanvraag</Text>
        )}
      </View>
    </View>
  )
}

function ShortlistPDF({
  klantNaam,
  items,
  logoSrc,
}: {
  klantNaam: string
  items: Item[]
  logoSrc?: string
}) {
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const itemsPerPage = 2
  const pages: Item[][] = []
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage))
  }

  const totalListingPages = pages.length
  const totalPages = totalListingPages + 1 // +1 voor cover
  const heroSrc = pickHero(items)
  const regios = uniqueRegions(items)
  const favCount = items.filter(i => i.is_favorite).length

  return (
    <Document>
      {/* ─── Cover ─── */}
      <Page size="A4" style={s.darkPage}>
        <View style={s.coverContainer}>
          <View style={s.coverTop}>
            {logoSrc ? (
              <Image src={logoSrc} style={s.coverLogo} />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: 'Bricolage Grotesque',
                  fontWeight: 700,
                  color: MARBLE,
                  letterSpacing: 2,
                }}
              >
                COSTA SELECT
              </Text>
            )}
            <Text style={s.coverTag}>Woningoverzicht</Text>
          </View>

          <View style={s.coverMain}>
            <Text style={s.coverEyebrow}>Voor</Text>
            <Text style={s.coverTitle}>{klantNaam}</Text>
            <View style={s.coverDivider} />
            <Text style={[s.coverMeta, s.coverMetaStrong]}>{datum}</Text>
            <Text style={[s.coverMeta, s.coverMetaStrong]}>
              {items.length} {items.length === 1 ? 'woning' : 'woningen'}
              {favCount > 0
                ? ` · ${favCount} ${favCount === 1 ? 'favoriet' : 'favorieten'}`
                : ''}
            </Text>
            {regios.length > 0 ? (
              <Text style={[s.coverMeta, s.coverMetaStrong]}>
                {regios.slice(0, 4).join(' · ')}
                {regios.length > 4 ? ` +${regios.length - 4}` : ''}
              </Text>
            ) : null}
          </View>

          <View style={s.coverHeroWrap}>
            {heroSrc ? (
              <Image src={heroSrc} style={s.coverHero} />
            ) : (
              <View style={s.coverHero} />
            )}
          </View>

          <View style={s.coverFooter}>
            <Text style={s.coverFooterText}>Costa Select · Premium Aankoopmakelaar Spanje</Text>
            <Text style={s.coverFooterText}>01 / {String(totalPages).padStart(2, '0')}</Text>
          </View>
        </View>
      </Page>

      {/* ─── Listing pages ─── */}
      {pages.map((pageItems, pageIdx) => {
        const physicalPage = pageIdx + 2 // +1 cover, +1 (1-indexed)
        return (
          <Page key={pageIdx} size="A4" style={s.page}>
            <View style={s.header}>
              {logoSrc ? (
                <Image src={logoSrc} style={s.headerLogo} />
              ) : (
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'Bricolage Grotesque',
                    fontWeight: 700,
                    color: WHITE,
                    letterSpacing: 1.6,
                  }}
                >
                  COSTA SELECT
                </Text>
              )}
              <Text style={s.headerTitle}>Woningoverzicht · {klantNaam}</Text>
            </View>

            <View style={s.body}>
              {pageIdx === 0 && (
                <View style={s.pageHeading}>
                  <Text style={s.pageHeadingEyebrow}>Selectie</Text>
                  <Text style={s.pageHeadingTitle}>
                    {items.length} {items.length === 1 ? 'woning' : 'woningen'} voor je geselecteerd
                  </Text>
                  <View style={s.pageHeadingRule} />
                </View>
              )}

              <View style={s.cards}>
                {pageItems.map((item, i) => (
                  <ListingCard key={i} item={item} />
                ))}
              </View>
            </View>

            <View style={s.footer}>
              <Text style={s.footerText}>Costa Select · Premium Aankoopmakelaar Spanje</Text>
              <Text style={s.footerPage}>
                {String(physicalPage).padStart(2, '0')} /{' '}
                {String(totalPages).padStart(2, '0')}
              </Text>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

function getLogoBase64(): string | undefined {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'costa-select-wordmark-white.svg')
    const svg = fs.readFileSync(logoPath)
    return `data:image/svg+xml;base64,${svg.toString('base64')}`
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { klant_naam, items } = await request.json()
  const logoSrc = getLogoBase64()

  const buffer = await renderToBuffer(
    <ShortlistPDF klantNaam={klant_naam || 'Klant'} items={items || []} logoSrc={logoSrc} />
  )

  const filename = `costa-select-woningoverzicht-${(klant_naam || 'klant').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
