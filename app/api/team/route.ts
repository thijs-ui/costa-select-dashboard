import { NextResponse } from 'next/server'
import { createUserClient } from '../../../lib/supabase/user-client'
import { requireAuth } from '../../../lib/auth/permissions'

// Read-only endpoint voor de Samenwerkingen 'Team'-tab. Mutatie gebeurt
// voorlopig handmatig in Supabase — UI heeft geen create/edit-flow per
// expliciete afspraak.
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = await createUserClient()
  const { data, error } = await supabase
    .from('team_members')
    .select(
      'id, name, role, region, contact_name, contact_phone, contact_email, ' +
      'internal_notes, reliability_score, is_active, is_preferred, last_contact_days',
    )
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
