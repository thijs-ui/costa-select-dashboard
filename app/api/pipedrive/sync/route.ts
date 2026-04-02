import { NextResponse } from 'next/server'
import { fetchAllActivities, fetchUsers } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'

const TARGET_TYPES: Record<string, string> = {
  'meeting': 'Kennismaking',
  'bezoek_nederland': 'Bezichtiging',
}

export async function POST(req: Request) {
  const supabase = createServiceClient()

  const token = process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx'
    ? process.env.PIPEDRIVE_API_TOKEN
    : null

  if (!token) {
    const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
    if (!data?.value) return NextResponse.json({ error: 'Geen API token' }, { status: 400 })
  }

  const apiToken = token ?? (await (async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
    return data?.value as string
  })())

  let reset = false
  try {
    const body = await req.json()
    reset = body?.reset === true
  } catch { /* geen body */ }

  if (reset) {
    await supabase.from('afspraken').delete().not('pipedrive_activiteit_id', 'is', null)
  }

  const [activities, users, makelaarsRes] = await Promise.all([
    fetchAllActivities(apiToken),
    fetchUsers(apiToken),
    supabase.from('makelaars').select('id, naam'),
  ])

  const makelaars = (makelaarsRes.data ?? []) as Array<{ id: string; naam: string }>
  const userMap = new Map<number, string>()
  for (const u of users) userMap.set(u.id, u.name)

  // Filter op type key
  const relevant = activities.filter(act => TARGET_TYPES[act.type])

  // Haal bestaande pipedrive_activiteit_ids op
  const { data: bestaande } = await supabase
    .from('afspraken')
    .select('id, pipedrive_activiteit_id, status')
    .not('pipedrive_activiteit_id', 'is', null)

  const bestaandeMap = new Map<number, string>()
  for (const r of bestaande ?? []) bestaandeMap.set(r.pipedrive_activiteit_id, r.id)

  const nieuw: object[] = []
  let updated = 0

  for (const act of relevant) {
    const userId = typeof act.user_id === 'object'
      ? (act.user_id as { id: number }).id
      : act.user_id as number
    const userName = userMap.get(userId) ?? ''
    const firstWord = userName.toLowerCase().split(' ')[0]
    const makelaar = firstWord ? makelaars.find(m => m.naam.toLowerCase().includes(firstWord)) : null

    const datum = act.due_date
    const lead_naam = act.person_name ?? (act.person_id as { name?: string } | null)?.name ?? 'Onbekend'
    const status = act.done ? 'Uitgevoerd' : 'Gepland'
    const type = TARGET_TYPES[act.type]

    if (bestaandeMap.has(act.id)) {
      if (!reset) {
        await supabase.from('afspraken')
          .update({ datum, status, lead_naam })
          .eq('id', bestaandeMap.get(act.id)!)
        updated++
      }
    } else {
      nieuw.push({
        datum,
        lead_naam,
        makelaar_id: makelaar?.id ?? null,
        type,
        status,
        pipedrive_activiteit_id: act.id,
      })
    }
  }

  if (nieuw.length > 0) {
    await supabase.from('afspraken').insert(nieuw)
  }

  return NextResponse.json({ imported: nieuw.length, updated, skipped: 0 })
}
