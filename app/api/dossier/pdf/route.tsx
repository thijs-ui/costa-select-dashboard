import { renderToBuffer } from '@react-pdf/renderer'
import { DossierPDF, type DossierData } from '@/components/dossier/DossierPDF'

export async function POST(request: Request) {
  const data: DossierData = await request.json()

  try {
    const buffer = await renderToBuffer(<DossierPDF data={data} />)

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="costa-select-dossier.pdf"`,
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
