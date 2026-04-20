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

  // Fetch leads, users, and all open deals in parallel
  const [leads, users, dealsRaw] = await Promise.all([
    fetchLeads(token),
    fetchUsers(token),
    (async () => {
      const results: { user_id: { id: number; name: string } | null; status: string }[] = []
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

  // Build user id → name map
  const userMap = new Map<number, string>()
  for (const u of users) {
    userMap.set(u.id, u.name)
  }

  // Count leads per user name
  const leadsPerUser: Record<string, number> = {}
  for (const lead of leads) {
    const name = userMap.get(lead.owner_id as number) ?? 'Onbekend'
    leadsPerUser[name] = (leadsPerUser[name] ?? 0) + 1
  }

  // Count open deals per user name
  const dealsPerUser: Record<string, number> = {}
  for (const deal of dealsRaw) {
    const name = (deal.user_id as { id: number; name: string } | null)?.name ?? 'Onbekend'
    dealsPerUser[name] = (dealsPerUser[name] ?? 0) + 1
  }

  // Merge into per-user stats
  const allNames = new Set([...Object.keys(leadsPerUser), ...Object.keys(dealsPerUser)])
  const perUser: Record<string, { leads: number; openDeals: number }> = {}
  for (const name of allNames) {
    perUser[name] = {
      leads: leadsPerUser[name] ?? 0,
      openDeals: dealsPerUser[name] ?? 0,
    }
  }

  return NextResponse.json({ perUser })
}
