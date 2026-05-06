import { NextResponse } from 'next/server'
import { fetchLeads, fetchLeadLabels } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { normalizeRegio } from '@/lib/calculations'
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

  const [leads, labels] = await Promise.all([
    fetchLeads(token, archivedStatus),
    fetchLeadLabels(token),
  ])

  const labelMap = new Map<string, string>()
  for (const l of labels) {
    labelMap.set(l.id, l.name)
  }

  const result = leads.map(lead => {
    const labelIds = (lead.label_ids ?? []) as string[]
    const regio = normalizeRegio(
      labelIds.length > 0 ? (labelMap.get(labelIds[0]) ?? 'Onbekend') : 'Onbekend'
    )

    const person = lead.person_id as { value: number; name: string } | null
    return {
      id: lead.id,
      title: lead.title,
      regio,
      person_id: person?.value ?? null,
      person_name: person?.name ?? null,
      add_time: (lead.add_time as string)?.split('T')[0] ?? '',
      is_archived: Boolean(lead.is_archived),
    }
  })

  return NextResponse.json({ leads: result })
}
