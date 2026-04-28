import type { Role } from '@/lib/auth/roles'

export interface MeResponse {
  id: string
  email: string
  role: Role | null
  naam: string | null
}

// Centrale auth-fetch voor de frontend: alle role/naam data komt hier vandaan.
// /api/users/me draait server-side via service-client, bypasst de RLS-hang
// op user_roles. Frontend mag NOOIT direct user_roles queryen.
export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch('/api/users/me', { cache: 'no-store' })
  if (!res.ok) throw new Error(`fetchMe failed: ${res.status}`)
  return res.json()
}
