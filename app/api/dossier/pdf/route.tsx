import { renderToBuffer } from '@react-pdf/renderer'
import { DossierPDF, type DossierData } from '@/components/dossier/DossierPDF'
import fs from 'fs'
import path from 'path'

export const maxDuration = 120

function getLogoBase64(): string | undefined {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'costa-select-logo-light.svg')
    const svg = fs.readFileSync(logoPath)
    return `data:image/svg+xml;base64,${svg.toString('base64')}`
  } catch {
    return undefined
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const data: DossierData = await request.json()
  const logoSrc = getLogoBase64()

  // Converteer externe foto-URLs naar base64 data URIs
  if (data.property.fotos?.length > 0) {
    const maxPhotos = Math.min(data.property.fotos.length, 6)
    const photosToConvert = data.property.fotos.slice(0, maxPhotos)
    const base64Photos: string[] = []

    for (const url of photosToConvert) {
      // Skip als het al een data URI is
      if (url.startsWith('data:')) {
        base64Photos.push(url)
        continue
      }
      const base64 = await fetchImageAsBase64(url)
      if (base64) base64Photos.push(base64)
    }

    data.property.fotos = base64Photos
  }

  try {
    const buffer = await renderToBuffer(<DossierPDF data={data} logoSrc={logoSrc} />)

    const filename = data.property.adres
      ? `costa-select-dossier-${data.property.adres.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}.pdf`
      : 'costa-select-dossier.pdf'

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('PDF generation failed:', err)
    return new Response(JSON.stringify({ error: 'PDF generatie mislukt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
