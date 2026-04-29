import { renderToBuffer } from '@react-pdf/renderer'
import { DossierPDF, type DossierData } from '@/components/dossier/DossierPDF'
import { Resvg } from '@resvg/resvg-js'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'

export const maxDuration = 120

// Cache geconverteerde PNG-buffers per request-cycle. SVG → PNG via resvg
// loopt < 50ms maar geen reden 'm bij elke pagina opnieuw te draaien.
const pngCache = new Map<string, string>()

function getAssetBase64(filename: string): string | undefined {
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
    console.error(`[PDF] getAssetBase64 ${filename} failed:`, err)
    return undefined
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  // Probeer eerst direct, dan via weserv.nl proxy als fallback
  const urlsToTry = [
    url,
    `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`,
  ]

  for (const tryUrl of urlsToTry) {
    try {
      const res = await fetch(tryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Referer': 'https://www.idealista.com/',
        },
      })
      if (!res.ok) { console.log(`[PDF] ${res.status} for ${tryUrl.substring(0, 60)}`); continue }
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.byteLength < 1000) { console.log(`[PDF] Too small (${buffer.byteLength}b)`); continue }
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      console.log(`[PDF] OK ${buffer.byteLength}b via ${tryUrl.includes('weserv') ? 'proxy' : 'direct'}`)
      return `data:${contentType};base64,${buffer.toString('base64')}`
    } catch (err) {
      console.log(`[PDF] Error:`, err)
    }
  }
  return null
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const data: DossierData = await request.json()
  const beeldmerkSrc = getAssetBase64('beeldmerk-sun.png')
  const wordmarkSrc = getAssetBase64('logo-primary-deepsea.svg')

  // PDF gebruikt tot 15 foto's: 1 cover + 3 mosaic + 11 in 2x3 grid-pages.
  // Idealista URLs via weserv.nl proxy → base64.
  if (data.property.fotos?.length > 0) {
    const maxPhotos = Math.min(data.property.fotos.length, 15)
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

  try {
    const buffer = await renderToBuffer(
      <DossierPDF data={data} beeldmerkSrc={beeldmerkSrc} wordmarkSrc={wordmarkSrc} />
    )

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
