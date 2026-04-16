import { createServiceClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Rol-systeem voor Costa Select Dashboard.
 *
 * Drie rollen:
 *  - admin      → volledige toegang (instellingen, users, alle data)
 *  - makelaar   → klantwerk (deals, afspraken, bezichtigingen, marketing)
 *  - backoffice → administratief (dossiers, kosten, facturen)
 *
 * Backward compatible: de bestaande rol 'consultant' wordt hier behandeld
 * als 'makelaar', zodat bestaande users niets hoeven te wijzigen totdat
 * de data-migratie is uitgevoerd.
 */

export type Role = 'admin' | 'makelaar' | 'backoffice'

/**
 * Haalt de rol van een user op uit de `user_roles` tabel.
 * Gebruikt de service client om RLS-restricties te omzeilen
 * (user_roles is niet voor de user zelf leesbaar).
 *
 * Returnt `null` als er geen rol is geregistreerd.
 */
export async function getUserRole(userId: string): Promise<Role | null> {
  if (!userId) return null

  const service = createServiceClient()
  const { data, error } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  // Backward compat: 'consultant' → 'makelaar'
  if (data.role === 'consultant') return 'makelaar'
  if (data.role === 'admin' || data.role === 'makelaar' || data.role === 'backoffice') {
    return data.role
  }
  return null
}

/** Checkt of een user admin is. Accepteert User-object of user-id string. */
export async function isAdmin(user: User | string | null | undefined): Promise<boolean> {
  if (!user) return false
  const id = typeof user === 'string' ? user : user.id
  const role = await getUserRole(id)
  return role === 'admin'
}

/** Checkt of een user makelaar is. Admin telt NIET automatisch mee — gebruik expliciete role-checks. */
export async function isMakelaar(user: User | string | null | undefined): Promise<boolean> {
  if (!user) return false
  const id = typeof user === 'string' ? user : user.id
  const role = await getUserRole(id)
  return role === 'makelaar'
}

/** Checkt of een user backoffice is. */
export async function isBackoffice(user: User | string | null | undefined): Promise<boolean> {
  if (!user) return false
  const id = typeof user === 'string' ? user : user.id
  const role = await getUserRole(id)
  return role === 'backoffice'
}
