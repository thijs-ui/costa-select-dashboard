// Dunne route — render-logica leeft in lib/dossier/render-pdf.tsx zodat
// we 'm ook vanuit de marketing-pipeline kunnen aanroepen zonder
// interne HTTP-roundtrip of duplicatie.

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import type { DossierData } from '@/components/dossier/DossierPDF'
import { renderDossierPdfBuffer } from '@/lib/dossier/render-pdf'

export const maxDuration = 120

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const data: DossierData = await request.json()

  try {
    const buffer = await renderDossierPdfBuffer(data)

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
