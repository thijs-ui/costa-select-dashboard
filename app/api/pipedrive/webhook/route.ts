import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { fetchDealFields, fetchPipelines, fetchUsers, PipedriveDealField } from '@/lib/pipedrive'
import { createServiceClient } from '@/lib/supabase'
import { berekenCommissie } from '@/lib/calculations'
import { logSecurity, logAudit } from '@/lib/logger'

function checkBasicAuth(req: NextRequest): boolean {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  const expectedUser = process.env.PIPEDRIVE_WEBHOOK_USER
  const expectedPass = process.env.PIPEDRIVE_WEBHOOK_PASSWORD
  if (!expectedUser || !expectedPass) return false

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const sep = decoded.indexOf(':')
  if (sep < 0) return false
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)

  const actual = createHash('sha256').update(`${user}:${pass}`).digest()
  const expected = createHash('sha256').update(`${expectedUser}:${expectedPass}`).digest()
  return timingSafeEqual(actual, expected)
}

async function getToken(): Promise<string | null> {
  if (process.env.PIPEDRIVE_API_TOKEN && process.env.PIPEDRIVE_API_TOKEN !== 'xxx') {
    return process.env.PIPEDRIVE_API_TOKEN
  }
  const supabase = createServiceClient()
  const { data } = await supabase.from('settings').select('value').eq('key', 'pipedrive_api_token').single()
  return data?.value as string | null
}

function getEventInfo(body: Record<string, unknown>): { action: string | null; entity: string | null } {
  // v2 format: body.meta.action ('create'|'change'|'delete') + body.meta.entity
  const meta = body.meta as Record<string, unknown> | undefined
  if (meta?.action && meta?.entity) {
    const map: Record<string, string> = { create: 'added', change: 'updated', update: 'updated', delete: 'deleted' }
    return { action: map[meta.action as string] ?? null, entity: meta.entity as string }
  }
  // v1 format: body.event = "added.activity"
  if (typeof body.event === 'string' && body.event.includes('.')) {
    const [action, entity] = body.event.split('.')
    return { action, entity }
  }
  return { action: null, entity: null }
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
  if (!checkBasicAuth(req)) {
    logSecurity({ action: 'webhook_auth_failure', path: '/api/pipedrive/webhook', ip: req.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, entity } = getEventInfo(body)

    console.log('[Pipedrive webhook]', { action, entity, type: body.data?.type, id: body.data?.id })

    const supabase = createServiceClient()

    // Handle added/updated activity
    if ((action === 'added' || action === 'updated') && entity === 'activity') {
      // Alleen Teams Meeting (meeting) en Bezoek Nederland (bezoek_nederland) importeren
      const TARGET_TYPES: Record<string, string> = {
        'meeting': 'Kennismaking',
        'bezoek_nederland': 'Bezichtiging',
      }
      const actType = (body.data?.type ?? '') as string
      if (!TARGET_TYPES[actType]) {
        return NextResponse.json({ ok: true, skipped: 'wrong type' })
      }

      // v2 webhook payload bevat alleen ID's, geen enriched names.
      // Haal volledige activity via v1 API op voor person_name, user info, deal_id.
      const actId = body.data?.id as number | undefined
      if (!actId) return NextResponse.json({ ok: true, skipped: 'no id' })

      const apiToken = await getToken()
      if (!apiToken) return NextResponse.json({ ok: false, error: 'Geen API token' }, { status: 400 })

      const actRes = await fetch(`https://api.pipedrive.com/v1/activities/${actId}?api_token=${apiToken}`, { cache: 'no-store' }).then(r => r.json())
      const act = actRes?.data
      if (!act) return NextResponse.json({ ok: true, skipped: 'not found' })

      const status = act.done ? 'Uitgevoerd' : 'Gepland'
      const datum = act.due_date ?? new Date().toISOString().split('T')[0]
      const lead_naam = act.person?.name ?? act.person_name ?? 'Onbekend (Pipedrive)'

      // Check of afspraak al bestaat
      const { data: existing } = await supabase
        .from('afspraken')
        .select('id')
        .eq('pipedrive_activiteit_id', act.id)
        .single()

      if (existing) {
        await supabase.from('afspraken')
          .update({ datum, status, lead_naam })
          .eq('id', existing.id)
        logAudit({ action: 'afspraak.updated_from_pipedrive', userId: 'system:pipedrive-webhook', resource: `afspraak:${existing.id}`, metadata: { pipedrive_activiteit_id: act.id, status } })
        return NextResponse.json({ ok: true, updated: true })
      }

      // Haal makelaars op voor user mapping
      const { data: makelaars } = await supabase.from('makelaars').select('id, naam')
      const userName = (act.user?.name ?? act.assigned_to_user_name ?? '') as string
      const firstWord = userName.toLowerCase().split(' ')[0]
      const makelaar = firstWord
        ? (makelaars ?? []).find((m: { id: string; naam: string }) => m.naam.toLowerCase().includes(firstWord))
        : null

      // Regio en bron ophalen via gekoppelde deal
      let regio: string | null = null
      let bron: string | null = null
      const dealId = act.deal_id as number | null
      if (dealId) {
        const [dealRes, pipelines] = await Promise.all([
          fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${apiToken}`, { cache: 'no-store' }).then(r => r.json()),
          fetchPipelines(apiToken),
        ])
        const deal = dealRes?.data
        if (deal) {
          const pipelineMap = new Map<number, string>()
          for (const p of pipelines) pipelineMap.set(p.id, p.name)
          regio = pipelineMap.get(deal.pipeline_id) ?? null
          bron = deal.channel ?? null
        }
      }

      await supabase.from('afspraken').insert({
        datum,
        lead_naam,
        makelaar_id: makelaar?.id ?? null,
        type: TARGET_TYPES[actType],
        status,
        regio,
        bron,
        pipedrive_activiteit_id: act.id,
      })

      logAudit({ action: 'afspraak.imported_from_pipedrive', userId: 'system:pipedrive-webhook', resource: `pipedrive_activiteit_id:${act.id}`, metadata: { type: TARGET_TYPES[actType], lead_naam, regio } })

      return NextResponse.json({ ok: true, imported: true })
    }

    // Handle updated deal
    if (action === 'updated' && entity === 'deal') {
      const dealId = body.data?.id as number | undefined
      if (!dealId) return NextResponse.json({ ok: true, skipped: 'no id' })

      // Check if deal already synced (vóór API-fetch, scheelt call)
      const { data: existingDeal } = await supabase
        .from('deals')
        .select('id')
        .eq('pipedrive_deal_id', dealId)
        .single()

      if (existingDeal) {
        return NextResponse.json({ ok: true, duplicate: true })
      }

      const token = await getToken()
      if (!token) {
        return NextResponse.json({ ok: false, error: 'Geen API token' }, { status: 400 })
      }

      // v2 webhook payload mist enriched fields + custom fields.
      // Haal volledige deal via v1 API op.
      const dealRes = await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${token}`, { cache: 'no-store' }).then(r => r.json())
      const dealData = dealRes?.data
      if (!dealData) return NextResponse.json({ ok: true, skipped: 'not found' })
      if (dealData.status !== 'won') return NextResponse.json({ ok: true, skipped: 'not won' })

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

      logAudit({ action: 'deal.imported_from_pipedrive', userId: 'system:pipedrive-webhook', resource: `pipedrive_deal_id:${dealData.id}`, metadata: { dealTitle, aankoopprijs, regio, type_deal } })

      return NextResponse.json({ ok: true, imported: true })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Webhook error:', e)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
