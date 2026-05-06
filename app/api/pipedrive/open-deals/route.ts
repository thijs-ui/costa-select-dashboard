import { NextResponse } from 'next/server'
import { fetchPipelines } from '@/lib/pipedrive'
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

  // Fetch pipelines and all deals in parallel
  const [pipelines, allDealsRaw] = await Promise.all([
    fetchPipelines(token),
    (async () => {
      const results: Record<string, unknown>[] = []
      let start = 0
      while (true) {
        const res = await fetch(
          `https://api.pipedrive.com/v1/deals?api_token=${token}&status=all_not_deleted&limit=500&start=${start}`,
          { cache: 'no-store' }
        )
        if (!res.ok) break
        const json = await res.json()
        results.push(...(json.data ?? []))
        if (!json.additional_data?.pagination?.more_items_in_collection) break
        start += 500
      }
      return results
    })(),
  ])

  // Pipeline id → name map (used as regio)
  const pipelineMap = new Map<number, string>()
  for (const p of pipelines) {
    pipelineMap.set(p.id, p.name)
  }

  const allDeals = allDealsRaw.map(deal => {
    const pipelineId = deal.pipeline_id as number | null
    const regio = pipelineId ? (pipelineMap.get(pipelineId) ?? 'Onbekend') : 'Onbekend'
    const person = deal.person_id as { value: number; name: string } | null
    return {
      id: deal.id as number,
      title: deal.title as string,
      status: deal.status as string,
      value: (deal.value as number) ?? 0,
      regio,
      person_id: person?.value ?? null,
      person_name: person?.name ?? (deal.person_name as string | null) ?? null,
      add_time: (deal.add_time as string)?.split(' ')[0] ?? '',
      origin_id: (deal.origin_id as string | null) ?? null,
    }
  })

  return NextResponse.json({ allDeals })
}
