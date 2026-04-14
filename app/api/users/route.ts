import { createServiceClient } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET: lijst alle gebruikers met hun rollen en namen
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const service = createServiceClient()

  const [authRes, rolesRes] = await Promise.all([
    service.auth.admin.listUsers(),
    service.from('user_roles').select('user_id, role, naam'),
  ])

  if (authRes.error) {
    return NextResponse.json({ error: authRes.error.message }, { status: 500 })
  }

  const rolesMap = new Map<string, { role: string; naam: string | null }>()
  for (const r of (rolesRes.data ?? []) as { user_id: string; role: string; naam: string | null }[]) {
    rolesMap.set(r.user_id, { role: r.role, naam: r.naam })
  }

  const users = (authRes.data.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? '',
    role: rolesMap.get(u.id)?.role ?? 'consultant',
    naam: rolesMap.get(u.id)?.naam ?? null,
    created_at: u.created_at,
  }))

  return NextResponse.json({ users })
}

// POST: nieuwe gebruiker uitnodigen
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { email, naam, role } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email is verplicht' }, { status: 400 })

  const service = createServiceClient()

  // Maak gebruiker aan via Supabase Auth (stuurt invite email)
  const { data: newUser, error: authError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Voeg user_roles record toe
  if (newUser.user) {
    await service.from('user_roles').upsert({
      user_id: newUser.user.id,
      role: role || 'consultant',
      naam: naam || null,
    }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ success: true, user_id: newUser.user?.id })
}

// PUT: gebruiker bijwerken (naam, rol)
export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { user_id, naam, role } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 })

  const service = createServiceClient()

  const { error } = await service.from('user_roles').upsert({
    user_id,
    role: role || 'consultant',
    naam: naam || null,
  }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE: gebruiker verwijderen
export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 })
  if (user_id === user.id) return NextResponse.json({ error: 'Je kunt jezelf niet verwijderen' }, { status: 400 })

  const service = createServiceClient()

  // Verwijder user_roles record (cascade vanuit auth.users)
  const { error } = await service.auth.admin.deleteUser(user_id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
