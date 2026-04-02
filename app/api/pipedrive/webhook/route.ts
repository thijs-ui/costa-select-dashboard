import { NextRequest, NextResponse } from 'next/server'
import { fetchDealFields, fetchPipelines, fetchUsers, PipedriveDealField } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { berekenCommissie } from '@/lib/calculations'

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
  if (fieldDef?.field_type === 'date' || fieldDef?.field_type === 'daterange') {
    return String(raw).split(' ')[0]
  }
  return String(raw)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const supabase = createServiceClient()

    // Handle added.activity en updated.activity
    if (body.event === 'added.activity' || body.event === 'updated.activity') {
      const act = body.data
      if (!act) return NextResponse.json({ ok: true })

      // Haal activiteitsnamen op uit settings
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'pipedrive_activiteit_namen')
        .single()

      const activiteitNamen = (settingsRow?.value as string[]) ?? ['teams meeting', 'bezoek nederland']
      const namenLower = activiteitNamen.map((n: string) => n.toLowerCase())
      const typeMap: Record<string, string> = {
        'teams meeting': 'Kennismaking',
        'bezoek nederland': 'Bezichtiging',
      }

      if (!namenLower.includes((act.subject ?? '').toLowerCase())) {
        return NextResponse.json({ ok: true, skipped: true })
      }

      const status = act.done ? 'Uitgevoerd' : 'Gepland'
      const datum = act.due_date ?? new Date().toISOString().split('T')[0]
      const lead_naam = act.person?.name ?? 'Onbekend (Pipedrive)'

      // Check of afspraak al bestaat
      const { data: existing } = await supabase
        .from('afspraken')
        .select('id')
        .eq('pipedrive_activiteit_id', act.id)
        .single()

      if (existing && body.event === 'updated.activity') {
        // Update bestaande afspraak (datum, status, naam)
        await supabase.from('afspraken')
          .update({ datum, status, lead_naam })
          .eq('id', existing.id)
        return NextResponse.json({ ok: true, updated: true })
      }

      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      // Haal makelaars op voor user mapping
      const { data: makelaars } = await supabase.from('makelaars').select('id, naam')
      const makelaar = (makelaars ?? []).find((m: { id: string; naam: string }) =>
        m.naam.toLowerCase().includes((act.user?.name ?? '').toLowerCase().split(' ')[0])
      )

      const type = typeMap[(act.subject ?? '').toLowerCase()] ?? 'Bezichtiging'
      await supabase.from('afspraken').insert({
        datum,
        lead_naam,
        makelaar_id: makelaar?.id ?? null,
        type,
        status,
        pipedrive_activiteit_id: act.id,
      })

      return NextResponse.json({ ok: true, imported: true })
    }

    // Handle updated.deal
    if (body.event === 'updated.deal') {
      const dealData = body.data
      if (!dealData || dealData.status !== 'won') {
        return NextResponse.json({ ok: true })
      }

      // Check if deal already synced
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('pipedrive_deal_id', dealData.id)
        .single()

      if (existingDeal) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      const token = await getToken()
      if (!token) {
        return NextResponse.json({ ok: false, error: 'Geen API token' }, { status: 400 })
      }

      // Load settings
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

      // Fetch deal fields, users and pipelines
      const [dealFields, users, pipelines] = await Promise.all([
        fetchDealFields(token),
        fetchUsers(token),
        fetchPipelines(token),
      ])

      const userMap = new Map<number, string>()
      for (const u of users) {
        userMap.set(u.id, u.name)
      }

      const pipelineMap = new Map<number, string>()
      for (const p of pipelines) {
        pipelineMap.set(p.id, p.name)
      }

      const rawDeal = dealData as Record<string, unknown>
      const aankoopprijs = (dealData.value as number) ?? 0

      // Resolve datum_passering
      let datum_passering: string
      if (fieldMapping.datum_passering) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.datum_passering, dealFields)
        datum_passering = resolved || (dealData.won_time as string | null)?.split(' ')[0] || (dealData.close_time as string | null)?.split(' ')[0] || new Date().toISOString().split('T')[0]
      } else {
        datum_passering = (dealData.won_time as string | null)?.split(' ')[0] || (dealData.close_time as string | null)?.split(' ')[0] || new Date().toISOString().split('T')[0]
      }

      // Regio = pipeline naam
      const pipelineId = (dealData.pipeline_id as number | null) ?? null
      const regio = pipelineId ? (pipelineMap.get(pipelineId) ?? 'Onbekend') : 'Onbekend'

      // Resolve type_deal
      let type_deal = 'Resale'
      if (fieldMapping.type_deal) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.type_deal, dealFields)
        type_deal = resolved || 'Resale'
      }

      // Resolve bron
      let bron = 'Pipedrive'
      if (fieldMapping.bron) {
        const resolved = resolveFieldValue(rawDeal, fieldMapping.bron, dealFields)
        bron = resolved || 'Pipedrive'
      }

      // Match makelaar
      const ownerId = (dealData.user_id as { id: number; name: string } | null)?.id
      const ownerName = ownerId ? (userMap.get(ownerId) ?? '') : ''
      const ownerFirstWord = ownerName.toLowerCase().split(' ')[0]

      const { data: makelaars } = await supabase.from('makelaars').select('id, naam')
      const makelaarsList = (makelaars ?? []) as Array<{ id: string; naam: string }>
      const makelaar = makelaarsList.find(m =>
        ownerFirstWord && m.naam.toLowerCase().includes(ownerFirstWord)
      )

      // Calculate commissie
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

      const dealTitle = (dealData.title as string) ?? 'Pipedrive deal'

      await supabase.from('deals').insert({
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
        notities: `Auto-import via Pipedrive webhook (deal: ${dealTitle})`,
        pipedrive_deal_id: dealData.id,
      })

      return NextResponse.json({ ok: true, imported: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
