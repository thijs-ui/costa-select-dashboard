// Legacy route — auth gaat nu via Supabase client-side.
// Dit endpoint wordt niet meer gebruikt maar blijft staan om 404's te voorkomen.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Gebruik de nieuwe login via Supabase Auth' },
    { status: 410 }
  )
}
