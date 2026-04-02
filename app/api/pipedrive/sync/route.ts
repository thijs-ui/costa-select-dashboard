import { NextResponse } from 'next/server'
import { fetchAllActivities, fetchUsers } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const supabase = createServiceClient()

  // Haal token op
  const token = process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx'
    ? process.env.PIPEDRIVE_API_TOKEN
    : null

  if (!token) {
    return NextResponse.json({ error: 'Geen API token' }, { status: 400 })
  }

  // Check of reset gevraagd wordt
  let reset = false
  try {
    const body = await req.json()
    reset = body?.reset === true
  } catch { /* geen body */ }

  if (reset) {
    await supabase.from('afspraken').delete().not('pipedrive_activiteit_id', 'is', null)
  }

  // Haal settings op
  const { data: settingsData } = await supabase.from('settings').select('key, value')
  const settings: Record<string, unknown> = {}
  ;(settingsData ?? []).forEach((r: { key: string; value: unknown }) => { settings[r.key] = r.value })

  const activiteitNamen = (settings.pipedrive_activiteit_namen as string[]) ?? ['teams meeting', 'bezoek nederland']
  const namenLower = activiteitNamen.map((n: string) => n.toLowerCase())

  // Map activiteitsnaam → afspraak type
  const typeMap: Record<string, string> = {
    'teams meeting': 'Kennismaking',
    'bezoek nederland': 'Bezichtiging',
  }

  // Haal makelaars op voor user mapping
  const { data: makelaars } = await supabase.from('makelaars').select('id, naam')

  // Haal Pipedrive users op om userId → userName te mappen
  const users = await fetchUsers(token)
  const userMap = new Map<number, string>()
  for (const u of users) {
    userMap.set(u.id, u.name)
  }

  // Haal alle activiteiten op (gepland én voltooid)
  const activities = await fetchAllActivities(token)

  // Filter op naam én alleen geplande activiteiten (done=false)
  // Afgeronde activiteiten komen binnen via de updated.activity webhook
  const relevant = activities.filter((act) =>
    namenLower.includes(act.subject?.toLowerCase()) && !act.done
  )

  if (relevant.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0 })
  }

  // Haal alle bestaande pipedrive_activiteit_ids in één query op
  const { data: bestaande } = await supabase
    .from('afspraken')
    .select('pipedrive_activiteit_id')
    .not('pipedrive_activiteit_id', 'is', null)

  const bestaandeIds = new Set((bestaande ?? []).map((r) => r.pipedrive_activiteit_id))

  // Bouw bulk insert lijst
  const nieuw = relevant
    .filter((act) => !bestaandeIds.has(act.id))
    .map((act) => {
      const userName = userMap.get(act.user_id) ?? ''
      const userFirstWord = userName.toLowerCase().split(' ')[0]
      const makelaar = (makelaars ?? []).find((m: { id: string; naam: string }) =>
        userFirstWord && m.naam.toLowerCase().includes(userFirstWord)
      )
      const type = typeMap[act.subject?.toLowerCase() ?? ''] ?? 'Bezichtiging'
      const status = act.done ? 'Uitgevoerd' : 'Gepland'
      return {
        datum: act.due_date,
        lead_naam: act.person_name ?? act.person_id?.name ?? 'Onbekend',
        makelaar_id: makelaar?.id ?? null,
        type,
        status,
        pipedrive_activiteit_id: act.id,
      }
    })

  if (nieuw.length > 0) {
    await supabase.from('afspraken').insert(nieuw)
  }

  return NextResponse.json({ imported: nieuw.length, skipped: relevant.length - nieuw.length })
}
