import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { requireAuth } from '@/lib/auth/permissions'
import { CalculatorPDF } from '@/components/calculators/CalculatorPDF'
import type { CalculatorViewModel } from '@/lib/calculator-pdf-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/calculators/pdf
// Body: { vm: CalculatorViewModel }
// Response: application/pdf
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  let body: { vm?: CalculatorViewModel }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const vm = body.vm
  if (!vm || !vm.mode || !vm.klantnaam) {
    return NextResponse.json({ error: 'vm.mode en vm.klantnaam zijn verplicht' }, { status: 400 })
  }

  const doc = <CalculatorPDF vm={vm} />
  try {
    const buffer = await renderToBuffer(doc)
    const safeKlant = vm.klantnaam.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const filename = `costa-select-calculatie-${safeKlant || 'export'}.pdf`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[calculators/pdf] render failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'render failed' }, { status: 500 })
  }
}
