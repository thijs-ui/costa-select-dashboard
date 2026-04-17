import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/server-auth'
import { requireAdmin } from '@/lib/auth/permissions'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const user = await getServerUser()
    const body = await request.json()

    const supabase = createServiceClient()
    const { data, error } = await supabase.from('marketing_content').insert({
      category: body.category,
      subcategory: body.subcategory || null,
      language: body.language || 'nl',
      title: body.title,
      prompt_used: body.prompt_used,
      content: body.content,
      is_favorite: body.is_favorite || false,
      tags: body.tags || null,
      created_by: user?.id || null,
    }).select().single()

    if (error) {
      console.error('Marketing save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Marketing save exception:', err)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
