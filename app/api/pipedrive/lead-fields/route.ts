import { NextResponse } from 'next/server'
import { fetchLeadFields } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

async function getToken(): Promise<string | null> {
  if (process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx') {
    return process.env.PIPEDRIVE_API_TOKEN
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
  return data?.value as string | null
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Geen API token' }, { status: 400 })
  }

  try {
    const fields = await fetchLeadFields(token)
    return NextResponse.json({ fields })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
