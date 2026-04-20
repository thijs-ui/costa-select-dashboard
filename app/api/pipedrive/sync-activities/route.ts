import { NextResponse } from 'next/server'
import { fetchAllActivities, fetchUsers } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TARGET_TYPES: Record<string, string> = {
  'meeting': 'Kennismaking',
  'bezoek_nederland': 'Bezichtiging',
}

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
  if (!token) return NextResponse.json({ error: 'Geen API token' }, { status: 400 })

  const supabase = createServiceClient()

  const [allActivities, users, makelaarsRes] = await Promise.all([
    fetchAllActivities(token),
    fetchUsers(token),
    supabase.from('makelaars').select('id, naam'),
  ])

  const makelaars = (makelaarsRes.data ?? []) as Array<{ id: string; naam: string }>

  const userMap = new Map<number, string>()
  for (const u of users) userMap.set(u.id, u.name)

  const targets = allActivities.filter(a => TARGET_TYPES[a.type])

  let imported = 0
  let updated = 0

  for (const act of targets) {
    const datum = act.due_date ?? new Date().toISOString().split('T')[0]
    const lead_naam = (act.person_id as { name?: string } | null)?.name ?? act.person_name ?? 'Onbekend'
    const status = act.done ? 'Uitgevoerd' : 'Gepland'
    const type = TARGET_TYPES[act.type]

    // Match makelaar by Pipedrive user name
    const userId = typeof act.user_id === 'object' ? (act.user_id as { id: number }).id : act.user_id as number
    const userName = userMap.get(userId) ?? ''
    const firstWord = userName.toLowerCase().split(' ')[0]
    const makelaar = firstWord ? makelaars.find(m => m.naam.toLowerCase().includes(firstWord)) : null

    const { data: existing } = await supabase
      .from('afspraken')
      .select('id')
      .eq('pipedrive_activiteit_id', act.id)
      .single()

    if (existing) {
      await supabase.from('afspraken')
        .update({ datum, status, lead_naam })
        .eq('id', existing.id)
      updated++
    } else {
      await supabase.from('afspraken').insert({
        datum,
        lead_naam,
        makelaar_id: makelaar?.id ?? null,
        type,
        status,
        pipedrive_activiteit_id: act.id,
      })
      imported++
    }
  }

  return NextResponse.json({ ok: true, total: targets.length, imported, updated })
}
