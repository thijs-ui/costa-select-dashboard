import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient as createServerClient } from '@/lib/supabase-server'

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 200 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('web_chats')
    .select('id, session_id, title, messages, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[woningbot/history] GET error:', error)
    return NextResponse.json([], { status: 200 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { session_id, title, messages, chat_id } = await request.json()
  const supabase = createServiceClient()

  if (chat_id) {
    await supabase
      .from('web_chats')
      .update({ messages, title, session_id: session_id || '', updated_at: new Date().toISOString() })
      .eq('id', chat_id)
      .eq('user_id', user.id)

    return NextResponse.json({ id: chat_id })
  }

  const { data, error } = await supabase
    .from('web_chats')
    .insert({ user_id: user.id, session_id: session_id || '', title, messages })
    .select('id')
    .single()

  if (error) {
    console.error('[woningbot/history] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { id } = await request.json()
  const supabase = createServiceClient()

  await supabase
    .from('web_chats')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
