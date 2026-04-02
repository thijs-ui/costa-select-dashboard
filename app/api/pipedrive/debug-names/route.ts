import { NextResponse } from 'next/server'
import { fetchLeadLabels, fetchPipelines } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'

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
  const token = await getToken()
  if (!token) return NextResponse.json({ error: 'Geen API token' }, { status: 400 })

  const supabase = createServiceClient()
  const [labels, pipelines, dealsRes, actTypesRes] = await Promise.all([
    fetchLeadLabels(token),
    fetchPipelines(token),
    supabase.from('deals').select('regio'),
    fetch(`https://api.pipedrive.com/v1/activityTypes?api_token=${token}`, { cache: 'no-store' }).then(r => r.json()),
  ])

  const dbRegios = Array.from(new Set((dealsRes.data ?? []).map((d: { regio: string | null }) => d.regio ?? 'null'))).sort()
  const activityTypes = (actTypesRes.data ?? []).map((t: { id: number; name: string; key_string: string }) => ({
    id: t.id, name: t.name, key: t.key_string,
  }))

  return NextResponse.json({
    leadLabels: labels.map(l => ({ id: l.id, name: l.name })),
    pipelines: pipelines.map(p => ({ id: p.id, name: p.name })),
    dbRegios,
    activityTypes,
  })
}
