// Defense-in-depth admin-check voor Canva-OAuth routes.
//
// Reguliere admin-routes gebruiken requireAdmin() dat alleen op
// user_roles.role='admin' check. Voor de Canva-koppeling is dat te
// fragiel: één foutje in de role-config en je raakt buitengesloten van
// je eigen integratie zonder weg om hem opnieuw te koppelen.
//
// Daarom een dubbele guard: role-check OF hardcoded email-whitelist.
// Whitelist override-baar via CANVA_ADMIN_EMAILS env-var
// (comma-separated) maar valt altijd terug op de default.
//
// Faalt fail-safe: bij elke onverwachte error returnt 403 zodat je nooit
// per ongeluk de OAuth-flow doorlaat aan een non-admin.

import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/server-auth'
import { getUserRole } from '@/lib/auth/roles'
import { logSecurity } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

const DEFAULT_ADMIN_EMAILS = ['thijs@costaselect.com', 'marc@costaselect.com']

function adminEmails(): string[] {
  const fromEnv = (process.env.CANVA_ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...DEFAULT_ADMIN_EMAILS.map(e => e.toLowerCase()), ...fromEnv])]
}

/**
 * Permit alleen admins (via user_roles) OF emails op de whitelist.
 * Returns User on success; NextResponse 401/403 bij falen.
 */
export async function requireCanvaAdmin(): Promise<User | NextResponse> {
  let user: User | null = null
  try {
    user = await getServerUser()
  } catch (err) {
    logSecurity({ action: 'auth_failure', reason: `canva_guard_session_error: ${String(err)}` })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user) {
    logSecurity({ action: 'auth_failure', reason: 'canva_guard_no_session' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = user.email?.toLowerCase() ?? ''
  const inWhitelist = email && adminEmails().includes(email)

  let isRoleAdmin = false
  try {
    isRoleAdmin = (await getUserRole(user.id)) === 'admin'
  } catch (err) {
    // Role-check faalt? Whitelist beslist.
    logSecurity({
      action: 'forbidden',
      userId: user.id,
      reason: `canva_guard_role_lookup_error: ${String(err)} (whitelist-fallback: ${inWhitelist})`,
    })
  }

  if (!isRoleAdmin && !inWhitelist) {
    logSecurity({
      action: 'forbidden',
      userId: user.id,
      reason: `canva_guard_denied (email=${email}, role-admin=${isRoleAdmin})`,
    })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return user
}
