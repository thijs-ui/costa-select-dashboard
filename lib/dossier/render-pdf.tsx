// Shared render-helper voor de Dossier-PDF.
// Eerder leefde deze logica in /api/dossier/pdf/route.tsx — geëxtraheerd
// zodat zowel die route als de marketing-pipeline (brochure-generator)
// dezelfde render kunnen uitvoeren zonder code-duplicatie of een interne
// HTTP-roundtrip.

import { renderToBuffer } from '@react-pdf/renderer'
import { Resvg } from '@resvg/resvg-js'
import fs from 'fs'
import path from 'path'
import { DossierPDF, type DossierData } from '@/components/dossier/DossierPDF'

// Cache geconverteerde PNG-buffers per request-cycle. SVG → PNG via resvg
// loopt < 50ms maar geen reden 'm bij elke pagina opnieuw te draaien.
const pngCache = new Map<string, string>()

function getBrandAssetBase64(filename: string): string | undefined {
  try {
    const cached = pngCache.get(filename)
    if (cached) return cached

    const assetPath = path.join(process.cwd(), 'public', 'brand', filename)
    const buf = fs.readFileSync(assetPath)
    const ext = filename.split('.').pop()?.toLowerCase()

    // SVG's worden naar PNG geconverteerd (react-pdf <Image> rendert
    // multi-path SVGs met clip-path onbetrouwbaar; PNG werkt 100%).
    if (ext === 'svg') {
      const resvg = new Resvg(buf, {
        fitTo: { mode: 'width', value: 1600 }, // hoge resolutie zodat 't crisp blijft
      })
      const png = resvg.render().asPng()
      const dataUrl = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
      pngCache.set(filename, dataUrl)
      return dataUrl
    }

    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream'
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
    pngCache.set(filename, dataUrl)
    return dataUrl
  } catch (err) {
    console.error(`[render-pdf] getBrandAssetBase64 ${filename} failed:`, err)
    return undefined
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  // Probeer eerst direct, dan via weserv.nl proxy als fallback.
  // Idealista CDN blokkeert soms server-IPs; weserv proxy heeft eigen IPs.
  const urlsToTry = [
    url,
    `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
  ]

  for (const tryUrl of urlsToTry) {
    try {
      const res = await fetch(tryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: 'https://www.idealista.com/',
        },
      })
      if (!res.ok) {
        console.log(`[render-pdf] ${res.status} for ${tryUrl.substring(0, 60)}`)
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.byteLength < 1000) {
        console.log(`[render-pdf] Too small (${buffer.byteLength}b)`)
        continue
      }
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      return `data:${contentType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.log('[render-pdf] Error:', err)
    }
  }
  return null
}

const MAX_PHOTOS_IN_PDF = 15

/**
 * Render een DossierData payload naar een PDF-buffer.
 *
 * Verwacht dat `data.property.fotos` URL-strings bevat (idealista of
 * andere) of al data:base64 strings. Idealista-URLs worden hier
 * geconverteerd naar base64 (max 15) zodat react-pdf 'm kan embedden.
 */
export async function renderDossierPdfBuffer(data: DossierData): Promise<Buffer> {
  const beeldmerkSrc = getBrandAssetBase64('beeldmerk-sun.png')
  const wordmarkSrc = getBrandAssetBase64('logo-primary-deepsea.svg')

  if (data.property.fotos?.length > 0) {
    const maxPhotos = Math.min(data.property.fotos.length, MAX_PHOTOS_IN_PDF)
    const convertedPhotos: string[] = []

    for (const url of data.property.fotos.slice(0, maxPhotos)) {
      if (url.startsWith('data:')) {
        convertedPhotos.push(url)
      } else if (url.includes('idealista.com')) {
        const base64 = await fetchImageAsBase64(url)
        if (base64) convertedPhotos.push(base64)
      } else {
        convertedPhotos.push(url)
      }
    }

    data.property.fotos = convertedPhotos
  }

  // renderToBuffer constructs JSX outside try/catch by spec — caller
  // omhult eventuele fouten als die belangrijk zijn voor flow control.
  return renderToBuffer(
    <DossierPDF data={data} beeldmerkSrc={beeldmerkSrc} wordmarkSrc={wordmarkSrc} />,
  )
}
