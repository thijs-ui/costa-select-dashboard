import { renderToBuffer } from '@react-pdf/renderer'
import { DossierPDF, type DossierData } from '@/components/dossier/DossierPDF'
import fs from 'fs'
import path from 'path'

function getLogoBase64(): string | undefined {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', 'costa-select-logo-light.svg')
    const svg = fs.readFileSync(logoPath)
    return `data:image/svg+xml;base64,${svg.toString('base64')}`
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  const data: DossierData = await request.json()
  const logoSrc = getLogoBase64()

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
