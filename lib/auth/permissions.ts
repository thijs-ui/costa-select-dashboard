import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/server-auth'
import { getUserRole, type Role } from '../auth/roles'
import { logSecurity } from '../logger'

/**
 * Permission-helpers voor API-routes.
 *
 * Patroon: elke helper retourneert OF een `User` (succes) OF een
 * `NextResponse` met 401/403. Route-handlers doen één check:
 *
 *    const auth = await requireAuth()
 *    if (auth instanceof NextResponse) return auth
 *    const user = auth   // typed als User
 *
 * Geen exceptions, geen try/catch nodig in route-handlers.
 */

export type AuthResult = User | NextResponse

/** Vereist een ingelogde user. Retourneert 401 als niet ingelogd. */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getServerUser()
  if (!user) {
    logSecurity({ action: 'auth_failure', reason: 'no_session' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

/**
 * Vereist dat de user een bepaalde rol heeft.
 * Admin heeft impliciet álle rollen (admin > makelaar/backoffice).
 */
export async function requireRole(role: Role): Promise<AuthResult> {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const userRole = await getUserRole(auth.id)

  if (userRole === 'admin') return auth
  if (userRole === role) return auth

  logSecurity({ action: 'forbidden', userId: auth.id, reason: `required_role=${role}, actual_role=${userRole}` })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/** Shortcut voor admin-only routes. */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('admin')
}

/**
 * Vereist dat de ingelogde user eigenaar is van een resource,
 * OF admin is. Gebruik voor resources met een `user_id`-kolom
 * (bv. eigen to-do's, eigen woninglijsten).
 */
export async function requireOwnership(resourceUserId: string | null | undefined): Promise<AuthResult> {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  if (resourceUserId && auth.id === resourceUserId) return auth

  const userRole = await getUserRole(auth.id)
  if (userRole === 'admin') return auth

  logSecurity({ action: 'forbidden', userId: auth.id, reason: `ownership_mismatch, resource_owner=${resourceUserId}` })
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
