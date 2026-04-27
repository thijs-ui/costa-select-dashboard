import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth/permissions'

const WONINGBOT_API_URL = process.env.WONINGBOT_API_URL || 'http://localhost:3001'
const WONINGBOT_API_KEY = process.env.WONINGBOT_API_KEY || ''

/**
 * GET /api/woninglijst/[id]/alert
 * Lijst van actieve alerts voor deze klant-shortlist.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id: shortlistId } = await params

  try {
    const res = await fetch(
      `${WONINGBOT_API_URL}/api/alert/by-shortlist?shortlist_id=${encodeURIComponent(shortlistId)}`,
      { headers: { 'x-api-key': WONINGBOT_API_KEY } },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Woningbot niet bereikbaar' }))
      return NextResponse.json(err, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/woninglijst/[id]/alert
 * Body: { query_text }
 * Maakt een alert aan voor deze klant. Email + klant_naam worden server-side
 * opgehaald (uit auth + shortlist) zodat de client ze niet kan vervalsen.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id: shortlistId } = await params
  const { query_text } = await request.json()

  if (!query_text?.trim()) {
    return NextResponse.json({ error: 'query_text is verplicht' }, { status: 400 })
  }

  // Haal klant_naam op uit shortlist
  const supabase = createServiceClient()
  const { data: shortlist, error: slErr } = await supabase
    .from('shortlists')
    .select('klant_naam')
    .eq('id', shortlistId)
    .single()

  if (slErr || !shortlist) {
    return NextResponse.json({ error: 'Klant-shortlist niet gevonden' }, { status: 404 })
  }

  if (!auth.email) {
    return NextResponse.json({ error: 'Geen email in auth-session' }, { status: 400 })
  }

  try {
    const res = await fetch(`${WONINGBOT_API_URL}/api/alert/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WONINGBOT_API_KEY,
      },
      body: JSON.stringify({
        query_text: query_text.trim(),
        shortlist_id: shortlistId,
        klant_naam: shortlist.klant_naam,
        user_email: auth.email,
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/woninglijst/[id]/alert?alert_id=...
 * Deactiveert een alert (owner-check via email server-side).
 */
export async function DELETE(
  request: Request,
  { params: _params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const url = new URL(request.url)
  const alertId = url.searchParams.get('alert_id')

  if (!alertId) {
    return NextResponse.json({ error: 'alert_id query-param is verplicht' }, { status: 400 })
  }

  if (!auth.email) {
    return NextResponse.json({ error: 'Geen email in auth-session' }, { status: 400 })
  }

  try {
    const res = await fetch(`${WONINGBOT_API_URL}/api/alert/${encodeURIComponent(alertId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WONINGBOT_API_KEY,
      },
      body: JSON.stringify({ user_email: auth.email }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}
