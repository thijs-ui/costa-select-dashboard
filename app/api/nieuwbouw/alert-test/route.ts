import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { runNieuwbouwAlert } from '@/lib/nieuwbouw-alert'

export const maxDuration = 60

// Handmatige test-trigger voor de nieuwbouw-melding. Draait op je dashboard-
// sessie (requireAuth) i.p.v. de CRON_SECRET — zo kun je 'm gewoon in de browser
// openen terwijl je ingelogd bent, zonder de (verborgen) cron-secret te kennen.
// Stuurt altijd de recentste Costa del Sol-projecten naar de vaste ontvangers.
async function handle() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Test-mails gaan alleen naar de ingelogde gebruiker, niet naar de echte
  // regio-teams — zo kun je testen zonder collega's lastig te vallen.
  const overrideTo = auth.email ? [auth.email] : undefined
  const result = await runNieuwbouwAlert({ test: true, overrideTo })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function GET() {
  return handle()
}

export async function POST() {
  return handle()
}
