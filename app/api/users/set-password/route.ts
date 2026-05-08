import { createServiceClient } from '@/lib/supabase'
import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/logger'

// Admin-set password voor een consultant. Bedoeld voor situaties waar de
// password-reset-email niet aankomt en de admin het wachtwoord direct wil
// vastpinnen. Gebruiker wijzigt 't daarna zelf via /login → wachtwoord
// vergeten flow indien gewenst.
async function requireAdmin() {
  const user = await getServerUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (data?.role !== 'admin') return null
  return user
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const { user_id, password } = await request.json()
  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id is verplicht' }, { status: 400 })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'Wachtwoord moet minimaal 8 tekens zijn' },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const { error } = await service.auth.admin.updateUserById(user_id, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log de actie. Het wachtwoord zelf NOOIT loggen — alleen het feit dat
  // het is gezet en door wie.
  logAudit({
    action: 'user.password_set_by_admin',
    userId: admin.id,
    resource: `user:${user_id}`,
  })

  return NextResponse.json({ success: true })
}
