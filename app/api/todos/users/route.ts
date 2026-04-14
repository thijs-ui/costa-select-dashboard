import { createServiceClient } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  // Verifieer dat de aanvrager is ingelogd en admin is
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  // Haal alle users op via de service client (admin API)
  const serviceClient = createServiceClient()
  const [authRes, rolesRes] = await Promise.all([
    serviceClient.auth.admin.listUsers(),
    serviceClient.from('user_roles').select('user_id, naam'),
  ])

  if (authRes.error) {
    return NextResponse.json({ error: authRes.error.message }, { status: 500 })
  }

  const nameMap = new Map<string, string>()
  for (const r of (rolesRes.data ?? []) as { user_id: string; naam: string | null }[]) {
    if (r.naam) nameMap.set(r.user_id, r.naam)
  }

  const userList = (authRes.data.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? 'Onbekend',
    naam: nameMap.get(u.id) ?? null,
  }))

  return NextResponse.json({ users: userList })
}
