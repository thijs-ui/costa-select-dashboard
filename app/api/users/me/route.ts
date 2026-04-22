import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth/permissions'

// GET: eigen user-data (id, email, role, naam). Alleen voor de ingelogde user.
// Gebruikt door auth-context als fallback voor rol-lookup bij cold start JWT-races.
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const service = createServiceClient()
  const { data } = await service
    .from('user_roles')
    .select('role, naam')
    .eq('user_id', auth.id)
    .single()

  return NextResponse.json({
    id: auth.id,
    email: auth.email ?? '',
    role: data?.role ?? null,
    naam: data?.naam ?? null,
  })
}
