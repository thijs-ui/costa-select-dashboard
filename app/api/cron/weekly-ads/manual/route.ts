// Handmatige trigger voor de wekelijkse-ads cron — admin-only.
// Roept de echte cron-route aan met de juiste Bearer-token zodat we
// de flow kunnen testen zonder op zaterdag 06:00 UTC te wachten.

import { NextRequest, NextResponse } from 'next/server'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET ontbreekt in env — kan cron niet aanroepen' },
      { status: 500 },
    )
  }

  const url = new URL('/api/cron/weekly-ads', req.url)
  // Forward query-string (bv. ?limit=3 voor dev-tests).
  const incomingLimit = req.nextUrl.searchParams.get('limit')
  if (incomingLimit) url.searchParams.set('limit', incomingLimit)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
