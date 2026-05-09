// Test-endpoint voor de wekelijkse-kandidaat-selectie. Returnt count +
// 3 sample-listings zodat we kunnen verifiëren dat de filters kloppen.
// Admin-only via dezelfde guard als /api/canva/*.

import { NextResponse } from 'next/server'
import { selectWeeklyCandidates } from '@/lib/marketing/bots-query'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const candidates = await selectWeeklyCandidates()
    return NextResponse.json({
      ok: true,
      count: candidates.length,
      sample: candidates.slice(0, 3).map(c => ({
        id: c.id,
        project_name: c.project_name,
        city: c.city,
        region: c.region,
        price_from: c.price_from,
        property_type: c.property_type,
        photo_count: c.photo_count,
        source_url: c.source_url,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
