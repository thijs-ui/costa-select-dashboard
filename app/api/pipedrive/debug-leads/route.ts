import { NextResponse } from 'next/server'
import { fetchLeads, fetchUsers } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'

// Tijdelijke diagnose-endpoint. Voor de eerste 20 leads teruggeven we de
// raw Pipedrive-velden owner_id en creator_id + de namen die wij erbij
// vinden via de users-lijst. Vergelijken met de Pipedrive UI laat zien
// of we het verkeerde veld gebruiken of of Pipedrive zelf alle leads op
// Marc heeft staan. Endpoint mag verwijderd worden zodra de
// consultant-funnel mapping correct is.

export const dynamic = 'force-dynamic'

async function getToken(): Promise<string | null> {
  if (process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx') {
    return process.env.PIPEDRIVE_API_TOKEN
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
  return data?.value as string | null
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Geen API token' }, { status: 400 })
  }

  const archivedParam = new URL(req.url).searchParams.get('archived')
  const archivedStatus: 'not_archived' | 'archived' | 'all' =
    archivedParam === 'all' || archivedParam === 'archived' ? archivedParam : 'not_archived'

  const [leadsRaw, users] = await Promise.all([
    fetchLeads(token, archivedStatus),
    fetchUsers(token),
  ])

  const userMap = new Map<number, string>()
  for (const u of users) userMap.set(u.id, u.name)

  // Tellingen per owner-naam over de volledige set
  const ownerCounts: Record<string, number> = {}
  const creatorCounts: Record<string, number> = {}
  for (const l of leadsRaw) {
    const ownerName = userMap.get(l.owner_id as number) ?? `Onbekend(${l.owner_id ?? 'null'})`
    ownerCounts[ownerName] = (ownerCounts[ownerName] ?? 0) + 1
    const creatorId = (l as { creator_id?: number }).creator_id
    const creatorName = creatorId != null
      ? (userMap.get(creatorId) ?? `Onbekend(${creatorId})`)
      : '—'
    creatorCounts[creatorName] = (creatorCounts[creatorName] ?? 0) + 1
  }

  // Sample: eerste 20 leads volledig
  const sample = leadsRaw.slice(0, 20).map(l => {
    const creatorId = (l as { creator_id?: number }).creator_id
    return {
      id: l.id,
      title: l.title,
      add_time: l.add_time,
      is_archived: l.is_archived,
      owner_id: l.owner_id,
      owner_name: userMap.get(l.owner_id as number) ?? null,
      creator_id: creatorId ?? null,
      creator_name: creatorId != null ? (userMap.get(creatorId) ?? null) : null,
      person_name: (l.person_id as { name?: string } | null)?.name ?? null,
    }
  })

  return NextResponse.json({
    total: leadsRaw.length,
    archived_status: archivedStatus,
    users_loaded: users.length,
    user_list: users.map(u => ({ id: u.id, name: u.name, active: u.active_flag })),
    owner_counts: ownerCounts,
    creator_counts: creatorCounts,
    sample,
  })
}
