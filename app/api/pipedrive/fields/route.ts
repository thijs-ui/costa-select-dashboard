import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { fetchDealFields } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'

async function getToken(): Promise<string | null> {
  if (process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx') {
    return process.env.PIPEDRIVE_API_TOKEN
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
  return data?.value as string | null
}

export async function GET() {
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Geen Pipedrive API token ingesteld.' }, { status: 400 })
  }

  try {
    const fields = await fetchDealFields(token)
    return NextResponse.json({ fields })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
