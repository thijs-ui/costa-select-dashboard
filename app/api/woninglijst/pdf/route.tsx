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
  ],
})
Font.registerHyphenationCallback((word) => [word])

const DEEPSEA = '#004B46'
const SUN = '#F5AF40'
const MARBLE = '#FFFAEF'
const WHITE = '#FFFFFF'

const s = StyleSheet.create({
  page: { backgroundColor: MARBLE, fontFamily: 'Raleway', padding: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: DEEPSEA, paddingHorizontal: 40, paddingVertical: 16 },
  headerLogo: { width: 120, height: 30 },
  headerTitle: { fontSize: 10, fontFamily: 'Raleway', fontWeight: 600, color: SUN, letterSpacing: 2, textTransform: 'uppercase' },
  body: { flex: 1, paddingHorizontal: 40, paddingTop: 20 },
  titleBlock: { marginBottom: 16 },
  title: { fontSize: 18, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: DEEPSEA, marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#7A8C8B' },
  itemRow: { flexDirection: 'row', marginBottom: 12, borderBottom: '1px solid rgba(0,75,70,0.08)', paddingBottom: 12, gap: 12 },
  thumb: { width: 80, height: 60, borderRadius: 6, objectFit: 'cover' },
  thumbPlaceholder: { width: 80, height: 60, borderRadius: 6, backgroundColor: '#E5E7EB' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 11, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: DEEPSEA, marginBottom: 3 },
  itemMeta: { fontSize: 9, color: '#6B7280', marginBottom: 2 },
  itemPrice: { fontSize: 11, fontFamily: 'Raleway', fontWeight: 600, color: '#0EAE96' },
  starText: { fontSize: 9, color: SUN, fontWeight: 600 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, paddingBottom: 14 },
  footerText: { fontSize: 8, color: '#7A8C8B' },
  footerPage: { fontSize: 8, fontWeight: 600, color: DEEPSEA },
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

function ShortlistPDF({ klantNaam, items, logoSrc }: { klantNaam: string; items: Item[]; logoSrc?: string }) {
  const datum = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const itemsPerPage = 5
  const pages: Item[][] = []
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage))
  }

  return (
    <Document>
      {pages.map((pageItems, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          <View style={s.header}>
            {logoSrc ? <Image src={logoSrc} style={s.headerLogo} /> : <Text style={{ fontSize: 12, fontFamily: 'Bricolage Grotesque', fontWeight: 700, color: WHITE }}>COSTA SELECT</Text>}
            <Text style={s.headerTitle}>Woningoverzicht</Text>
          </View>
          <View style={s.body}>
            {pageIdx === 0 && (
              <View style={s.titleBlock}>
                <Text style={s.title}>Woningoverzicht voor {klantNaam}</Text>
                <Text style={s.subtitle}>{datum} — {items.length} {items.length === 1 ? 'woning' : 'woningen'}</Text>
              </View>
            )}
            {pageItems.map((item, i) => (
              <View key={i} style={s.itemRow}>
                {item.thumbnail ? <Image src={item.thumbnail} style={s.thumb} /> : <View style={s.thumbPlaceholder} />}
                <View style={s.itemInfo}>
                  <Text style={s.itemTitle}>
                    {item.is_favorite ? '★ ' : ''}{item.title || 'Onbekend'}
                  </Text>
                  <Text style={s.itemMeta}>
                    {[item.location, item.size_m2 ? `${item.size_m2} m²` : null, item.bedrooms ? `${item.bedrooms} slk` : null, item.bathrooms ? `${item.bathrooms} bdk` : null].filter(Boolean).join(' · ')}
                  </Text>
                  {item.price && <Text style={s.itemPrice}>€ {item.price.toLocaleString('nl-NL')}</Text>}
                </View>
              </View>
            ))}
          </View>
          <View style={s.footer}>
            <Text style={s.footerText}>Costa Select | Premium Aankoopmakelaar Spanje</Text>
            <Text style={s.footerPage}>{pageIdx + 1}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}

function getLogoBase64(): string | undefined {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'costa-select-logo-light.svg')
    const svg = fs.readFileSync(logoPath)
    return `data:image/svg+xml;base64,${svg.toString('base64')}`
  } catch { return undefined }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { klant_naam, items } = await request.json()
  const logoSrc = getLogoBase64()

  const buffer = await renderToBuffer(<ShortlistPDF klantNaam={klant_naam || 'Klant'} items={items || []} logoSrc={logoSrc} />)

  const filename = `costa-select-woningoverzicht-${(klant_naam || 'klant').replace(/\s+/g, '-').toLowerCase()}.pdf`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
