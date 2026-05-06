import { NextResponse } from 'next/server'
import { fetchLeads, fetchLeadLabels, fetchUsers } from '@/lib/pipedrive'
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

  // Fetch leads (incl. gearchiveerde — geconverteerde leads worden in
  // Pipedrive automatisch archived en zouden anders uit de telling vallen),
  // users, en alle open deals in parallel.
  const [leads, users, dealsRaw] = await Promise.all([
    fetchLeads(token, 'all'),
    fetchUsers(token),
    (async () => {
      const results: {
        user_id: { id: number; name: string } | null
        status: string
        add_time: string
      }[] = []
      let start = 0
      while (true) {
        const res = await fetch(
          `https://api.pipedrive.com/v1/deals?api_token=${token}&status=open&limit=500&start=${start}`,
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

  const userMap = new Map<number, string>()
  for (const u of users) userMap.set(u.id, u.name)

  // Per user: lijst van add_time-datums (YYYY-MM-DD), niet alleen totalen.
  // Datums laten de UI client-side filteren op de geselecteerde periode —
  // anders zou de leads-kolom altijd een lifetime-totaal tonen, ongeacht
  // de periode-picker.
  const perUser: Record<string, { leadDates: string[]; openDealDates: string[] }> = {}
  function bucket(name: string) {
    if (!perUser[name]) perUser[name] = { leadDates: [], openDealDates: [] }
    return perUser[name]
  }

  for (const lead of leads) {
    const name = userMap.get(lead.owner_id as number) ?? 'Onbekend'
    const date = ((lead.add_time as string) ?? '').split('T')[0]
    if (date) bucket(name).leadDates.push(date)
  }
  for (const deal of dealsRaw) {
    const name = (deal.user_id as { id: number; name: string } | null)?.name ?? 'Onbekend'
    const date = (deal.add_time ?? '').split(' ')[0]
    if (date) bucket(name).openDealDates.push(date)
  }

  return NextResponse.json({ perUser })
}
