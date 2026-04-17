import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json([])

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('web_chats')
    .select('id, session_id, title, messages, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[woningbot/history] GET error:', error)
    return NextResponse.json([])
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { user_id, session_id, title, messages, chat_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 })

  const supabase = createServiceClient()

  if (chat_id) {
    await supabase
      .from('web_chats')
      .update({ messages, title, session_id: session_id || '', updated_at: new Date().toISOString() })
      .eq('id', chat_id)
      .eq('user_id', user_id)

    return NextResponse.json({ id: chat_id })
  }

  const { data, error } = await supabase
    .from('web_chats')
    .insert({ user_id, session_id: session_id || '', title, messages })
    .select('id')
    .single()

  if (error) {
    console.error('[woningbot/history] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id, user_id } = await request.json()
  if (!user_id || !id) return NextResponse.json({ error: 'Missende parameters' }, { status: 400 })

  const supabase = createServiceClient()
  await supabase
    .from('web_chats')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id)

  return NextResponse.json({ ok: true })
}
