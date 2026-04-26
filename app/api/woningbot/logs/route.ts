import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/permissions'
import { createServiceClient } from '@/lib/supabase'

// Server-side read voor de woningbot-logs admin-view.
// GET /api/woningbot/logs?limit=100&since=YYYY-MM-DD&status=&intent=

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500)
  const since = searchParams.get('since')
  const status = searchParams.get('status')
  const intent = searchParams.get('intent')

  const supabase = createServiceClient()
  let query = supabase
    .from('woningbot_query_logs')
    .select('id, created_at, user_id, session_id, user_message, intent, status, error_message, total_ms, steps, selected_count, total_found, source')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (since) query = query.gte('created_at', since)
  if (status) query = query.eq('status', status)
  if (intent) query = query.eq('intent', intent)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}
