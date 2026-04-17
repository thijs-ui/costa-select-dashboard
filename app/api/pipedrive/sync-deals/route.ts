import { NextResponse } from 'next/server'
import { fetchDeals, fetchDealFields, fetchPipelines, fetchUsers, PipedriveDealField } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { berekenCommissie } from '@/lib/calculations'
import { requireAdmin } from '@/lib/auth/permissions'

async function getToken(): Promise<string | null> {
  if (process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx') {
    return process.env.PIPEDRIVE_API_TOKEN
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
  return data?.value as string | null
}

function resolveFieldValue(
  deal: Record<string, unknown>,
  fieldKey: string,
  fields: PipedriveDealField[]
): string {
  const raw = deal[fieldKey]
  if (raw === null || raw === undefined || raw === '') return ''
  const fieldDef = fields.find(f => f.key === fieldKey)
  if (fieldDef?.options && (typeof raw === 'number' || typeof raw === 'string')) {
    const opt = fieldDef.options.find(o => String(o.id) === String(raw))
    return opt?.label ?? String(raw)
  }
  // Only split on space for date fields (e.g. "2024-01-15 00:00:00" → "2024-01-15")
  if (fieldDef?.field_type === 'date' || fieldDef?.field_type === 'daterange') {
    return String(raw).split(' ')[0]
  }
  return String(raw)
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()

  // Optional body: { force_update: true } updates mapped fields on already-synced deals
  let force_update = false
  try {
    const body = await req.json()
    force_update = !!body?.force_update
  } catch { /* no body */ }

  // 1. Get token
  const token = await getToken()
  if (!token) {
    return NextResponse.json({ error: 'Geen Pipedrive API token ingesteld.' }, { status: 400 })
  }

  // 2. Load settings
  const { data: settingsData } = await supabase.from('settings').select('key, value')
  const settings: Record<string, unknown> = {}
  ;(settingsData ?? []).forEach((r: { key: string; value: unknown }) => { settings[r.key] = r.value })

  const fieldMapping = (settings.pipedrive_deal_field_mapping as Record<string, string>) ?? {
    datum_passering: '', regio: '', type_deal: '', bron: ''
  }
  const minimumFee = Number(settings.minimum_fee) || 6000
  const makelaarCommissiePct = Number(settings.makelaar_commissie_pct) || 0.40
  const commissiePerType = (settings.commissie_per_type as Record<string, number>) || {
    resale: 0.02, nieuwbouw: 0.04, invest: 0.03, renovatie: 0.05
  }

  // 3. Fetch Pipedrive data
  const [dealFields, allDeals, users, pipelines] = await Promise.all([
    fetchDealFields(token),
    fetchDeals(token),
    fetchUsers(token),
    fetchPipelines(token),
  ])

  // Build userId → userName map
  const userMap = new Map<number, string>()
  for (const u of users) {
    userMap.set(u.id, u.name)
  }

  // Build pipelineId → pipeline name map (used as regio)
  const pipelineMap = new Map<number, string>()
  for (const p of pipelines) {
    pipelineMap.set(p.id, p.name)
  }

  // 4. Get won deals only
  const wonDeals = allDeals.filter(d => d.status === 'won')

  // 5. Get existing synced deals (id + pipedrive_deal_id + current regio/bron)
  const { data: existingRows } = await supabase
    .from('deals')
    .select('id, pipedrive_deal_id, regio, bron')
    .not('pipedrive_deal_id', 'is', null)

  // Map pipedrive_deal_id → supabase row for quick lookup
  const existingMap = new Map<number, { id: string; regio: string; bron: string }>(
    (existingRows ?? []).map((r: { id: string; pipedrive_deal_id: number; regio: string; bron: string }) => [
      r.pipedrive_deal_id, { id: r.id, regio: r.regio, bron: r.bron }
    ])
  )

  // 6. Get makelaars
  const { data: makelaars } = await supabase.from('makelaars').select('id, naam')
  const makelaarsList = (makelaars ?? []) as Array<{ id: string; naam: string }>

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  let updated = 0

  for (const deal of wonDeals) {
    const existing = existingMap.get(deal.id)

    try {
      const rawDeal = deal as unknown as Record<string, unknown>

      // Resolve mapped fields
      const aankoopprijs = deal.value ?? 0

      let datum_passering: string
      if (fieldMapping.datum_passering) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.datum_passering, dealFields)
        datum_passering = resolved || deal.won_time?.split(' ')[0] || deal.close_time?.split(' ')[0] || new Date().toISOString().split('T')[0]
      } else {
        datum_passering = deal.won_time?.split(' ')[0] || deal.close_time?.split(' ')[0] || new Date().toISOString().split('T')[0]
      }

      // Regio = pipeline naam
      const regio = pipelineMap.get(deal.pipeline_id) ?? 'Onbekend'

      let type_deal = 'Resale'
      if (fieldMapping.type_deal) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.type_deal, dealFields)
        type_deal = resolved || 'Resale'
      }

      let bron = 'Pipedrive'
      if (fieldMapping.bron) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.bron, dealFields)
        bron = resolved || 'Pipedrive'
      }

      // ── Already synced: update mapped fields if needed ─────────────────
      if (existing) {
        // Only update if:
        // - force_update=true (user explicitly asked), OR
        // - still has placeholder values from initial sync without mapping
        const hasPlaceholders = existing.regio === 'Onbekend' || existing.bron === 'Pipedrive'
        if (force_update || hasPlaceholders) {
          const { error } = await supabase.from('deals')
            .update({ regio, type_deal, bron, datum_passering, aankoopprijs })
            .eq('id', existing.id)
          if (error) errors.push(`Update deal ${deal.id}: ${error.message}`)
          else updated++
        } else {
          skipped++
        }
        continue
      }

      // ── New deal: full insert ───────────────────────────────────────────
      const ownerName = deal.user_id?.name ?? ''
      const ownerFirstWord = ownerName.toLowerCase().split(' ')[0]
      const makelaar = makelaarsList.find(m =>
        ownerFirstWord && m.naam.toLowerCase().includes(ownerFirstWord)
      )

      const calc = berekenCommissie({
        aankoopprijs,
        commissie_pct: null,
        type_deal,
        eigen_netwerk: false,
        makelaar_pct: makelaarCommissiePct,
        is_overdracht: false,
        overdracht_scenario: null,
        makelaar2_pct: 0,
        partner_deal: false,
        partner_pct: 0,
        area_manager_pct: 0,
        commissie_per_type: commissiePerType,
        minimum_fee: minimumFee,
      })

      const { error } = await supabase.from('deals').insert({
        datum_passering,
        regio,
        type_deal,
        bron,
        aankoopprijs,
        commissie_pct: null,
        min_fee_toegepast: calc.min_fee_toegepast,
        bruto_commissie: calc.bruto_commissie,
        eigen_netwerk: false,
        makelaar_id: makelaar?.id ?? null,
        makelaar_pct: calc.makelaar_pct_effectief,
        makelaar_commissie: calc.makelaar_commissie,
        is_overdracht: false,
        overdracht_scenario: null,
        makelaar2_id: null,
        makelaar2_pct: 0,
        makelaar2_commissie: null,
        area_manager_id: null,
        area_manager_kpi: false,
        area_manager_commissie: null,
        partner_deal: false,
        partner_naam: null,
        partner_pct: 0,
        partner_commissie: null,
        netto_commissie_cs: calc.netto_commissie_cs,
        notities: `Auto-import via Pipedrive (deal: ${deal.title})`,
        pipedrive_deal_id: deal.id,
      })

      if (error) errors.push(`Deal ${deal.id} (${deal.title}): ${error.message}`)
      else imported++
    } catch (e) {
      errors.push(`Deal ${deal.id}: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({ imported, updated, skipped, errors })
}
