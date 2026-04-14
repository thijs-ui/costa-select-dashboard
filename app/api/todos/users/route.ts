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
  const { data: { users }, error } = await serviceClient.auth.admin.listUsers()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return alleen id en email
  const userList = (users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? 'Onbekend',
  }))

  return NextResponse.json({ users: userList })
}
