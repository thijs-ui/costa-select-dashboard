// Sanity-check voor de Canva-koppeling. Roept /users/me aan met een
// access-token uit de helper en bewijst zo dat refresh-rotatie werkt.
// Refresh deze route 2x: als de tweede call ook 200 returnt, weet je
// dat de nieuwe refresh-token correct is opgeslagen.

import { NextResponse } from 'next/server'
import { getCanvaAccessToken } from '@/lib/canva/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = await getCanvaAccessToken()

    const res = await fetch('https://api.canva.com/rest/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    return NextResponse.json({ ok: res.ok, status: res.status, canva_user: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
