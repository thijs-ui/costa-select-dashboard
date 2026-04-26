import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// Server-side accept van logs vanaf de woningbot (Railway).
// Auth via shared API key (zelfde key als andere woningbot proxies).
//
// Request shape (zie woningbot/src/services/query-logger.js):
// {
//   user_id?: string                    -- optioneel; null voor Slack
//   session_id?: string
//   user_message: string
//   intent?: string
//   status: 'success'|'no_results'|'parse_error'|'scrape_error'|'selector_error'|'exception'
//   error_message?: string
//   total_ms: number
//   steps: { intent_detection?: {...}, parser?: {...}, scrape?: {...}, ... }
//   selected_count?: number
//   total_found?: number
//   source?: 'web'|'slack'
// }

const WONINGBOT_API_KEY = process.env.WONINGBOT_API_KEY || ''

export async function POST(request: Request) {
  // Auth: zelfde shared key als de chat-proxy gebruikt (omgekeerde richting).
  const apiKey = request.headers.get('x-api-key')
  if (!WONINGBOT_API_KEY || apiKey !== WONINGBOT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.user_message || !body.status || typeof body.total_ms !== 'number') {
    return NextResponse.json({ error: 'user_message, status, total_ms required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('woningbot_query_logs').insert({
    user_id: body.user_id || null,
    session_id: body.session_id || null,
    user_message: String(body.user_message).slice(0, 2000),
    intent: body.intent || null,
    status: body.status,
    error_message: body.error_message || null,
    total_ms: body.total_ms,
    steps: body.steps || {},
    selected_count: body.selected_count ?? null,
    total_found: body.total_found ?? null,
    source: body.source || 'web',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
