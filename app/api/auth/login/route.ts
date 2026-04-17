// Legacy route — auth gaat nu via Supabase client-side.
// Dit endpoint wordt niet meer gebruikt maar blijft staan om 404's te voorkomen.
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/permissions'

export async function POST() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  return NextResponse.json(
    { error: 'Gebruik de nieuwe login via Supabase Auth' },
    { status: 410 }
  )
}
