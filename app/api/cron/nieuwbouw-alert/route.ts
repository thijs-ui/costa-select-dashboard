import { NextResponse } from 'next/server'
import { logSecurity } from '@/lib/logger'
import { runNieuwbouwAlert } from '@/lib/nieuwbouw-alert'

export const maxDuration = 60

// Dagelijkse melding (vercel.json cron): nieuwe Costa del Sol-projecten van de
// afgelopen 24u → digest-mail via Resend. Test-modus ?test=1 stuurt altijd de
// recentste projecten, zodat de mail te controleren is zonder op een sync te
// wachten.
export async function GET(request: Request) {
  // Vercel Cron stuurt `Authorization: Bearer ${CRON_SECRET}`. Fail-closed.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logSecurity({ action: 'auth_failure', path: '/api/cron/nieuwbouw-alert', reason: 'invalid_cron_secret' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const test = new URL(request.url).searchParams.get('test') === '1'
  const result = await runNieuwbouwAlert({ test })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
