/**
 * News-pipeline Slack delivery — fase 5 (multi-channel routing).
 *
 * Item-routing logica:
 *   1. Per primary slack_channel een eigen kanaal-bericht (header + items).
 *   2. Items met audience_invest=true gaan ÓÓK naar #info-invest (parallel).
 *   3. Newsletter-concepten gaan in 4 berichten naar #marketing-ideeën.
 *   4. 0 summarized items → één 'rustige week' bericht naar #info-algemeen.
 *
 * 500ms delay tussen alle berichten, retry op webhook-fail (transient).
 */

import { createServiceClient } from '@/lib/supabase'
import {
  PIPELINE_CONFIG,
  SLACK_CHANNEL_LABELS,
  SLACK_WEBHOOK_ENV,
  type SlackChannel,
} from '@/lib/news/config'
import type { NewsletterResult } from '@/lib/news/newsletter'

const SEND_DELAY_MS = 500
const MAX_PER_CHANNEL = PIPELINE_CONFIG.maxItemsPerCategorySlack

type PrimaryChannel = Exclude<SlackChannel, 'invest' | 'marketing_ideeen'>

interface SummarizedItem {
  id: string
  title: string
  url: string | null
  source_name: string
  category: string | null
  region: string | null
  slack_channel: PrimaryChannel | null
  audience_invest: boolean
  urgency: number
  impact_score: number | null
  summary_nl: string
  buyer_implication: string
}

export interface SlackDeliveryResult {
  messagesSent: number
  rustigeWeek: boolean
  channelsHit: string[]
  investItemCount: number
  newsletterDelivered: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlackBlock = Record<string, any>
type SlackPayload = { blocks: SlackBlock[] }

export async function deliverToSlack(
  runId: string,
  newsletter: NewsletterResult | null,
): Promise<SlackDeliveryResult> {
  const supabase = createServiceClient()

  const [runRes, itemsRes] = await Promise.all([
    supabase.from('news_runs').select('items_scraped').eq('id', runId).single(),
    supabase
      .from('news_items')
      .select(
        'id, title, url, source_name, category, region, slack_channel, audience_invest, urgency, impact_score, summary_nl, buyer_implication',
      )
      .eq('run_id', runId)
      .eq('status', 'summarized')
      .order('impact_score', { ascending: false, nullsFirst: false }),
  ])

  if (runRes.error) throw new Error(`[slack] news_runs fetch faalde: ${runRes.error.message}`)
  if (itemsRes.error) throw new Error(`[slack] news_items fetch faalde: ${itemsRes.error.message}`)

  const items = (itemsRes.data ?? []) as SummarizedItem[]
  const totalScraped = runRes.data?.items_scraped ?? 0
  const isoWeek = getISOWeek(new Date())

  // Edge case: rustige week — 0 summarized items.
  if (items.length === 0) {
    await postToChannel('algemeen', {
      blocks: [
        section(
          `🌿 *Rustige week* — geen items boven urgency ${PIPELINE_CONFIG.summarizeUrgencyThreshold} om te delen. Volledige scrape: ${totalScraped} bekeken.`,
        ),
      ],
    })
    return {
      messagesSent: 1,
      rustigeWeek: true,
      channelsHit: ['algemeen'],
      investItemCount: 0,
      newsletterDelivered: false,
    }
  }

  let messagesSent = 0
  const channelsHit: string[] = []

  // Items splitsen: invest-items gaan UITSLUITEND naar #info-invest, niet
  // ook nog naar hun primary kanaal. Zo voorkomen we dat hetzelfde verhaal
  // in twee kanalen verschijnt — invest is per definitie nis-content voor
  // de UHNWI-doelgroep, niet voor de bredere klantbase.
  const investItems = items.filter(i => i.audience_invest)
  const primaryItems = items.filter(i => !i.audience_invest)

  // 1. Per primary slack_channel een bericht — alleen kanalen met items.
  const byChannel = groupByChannel(primaryItems)
  const channelOrder: PrimaryChannel[] = [
    'algemeen', 'spanje', 'valencia',
    'costa_blanca_noord', 'costa_blanca_zuid',
    'costa_brava', 'costa_calida', 'costa_del_sol', 'costa_dorada',
  ]

  for (const channel of channelOrder) {
    const list = byChannel[channel]
    if (!list || list.length === 0) continue
    const top = list.slice(0, MAX_PER_CHANNEL)
    const blocks = buildItemBlocks(
      `📰 Costa Select Weekly — ${SLACK_CHANNEL_LABELS[channel]} — week ${isoWeek}`,
      top,
    )
    if (messagesSent > 0) await sleep(SEND_DELAY_MS)
    await postToChannel(channel, { blocks })
    messagesSent++
    channelsHit.push(channel)
  }

  // 2. CSI Invest — exclusieve routing voor audience_invest=true items.
  if (investItems.length > 0) {
    const blocks = buildItemBlocks(
      `💼 CSI Invest — week ${isoWeek}`,
      investItems.slice(0, MAX_PER_CHANNEL),
    )
    if (messagesSent > 0) await sleep(SEND_DELAY_MS)
    await postToChannel('invest', { blocks })
    messagesSent++
    channelsHit.push('invest')
  }

  // 3. Newsletter-concepten naar #marketing-ideeën (4 berichten).
  let newsletterDelivered = false
  if (newsletter) {
    try {
      const sent = await postNewsletter(newsletter, isoWeek)
      messagesSent += sent
      newsletterDelivered = sent > 0
      if (newsletterDelivered) channelsHit.push('marketing_ideeen')
    } catch (err) {
      console.error('[slack] newsletter posting faalde:', err instanceof Error ? err.message : err)
    }
  }

  return {
    messagesSent,
    rustigeWeek: false,
    channelsHit,
    investItemCount: investItems.length,
    newsletterDelivered,
  }
}

// ─── Newsletter-flow ─────────────────────────────────────────────────────

async function postNewsletter(newsletter: NewsletterResult, isoWeek: number): Promise<number> {
  const headerLines: string[] = []
  if (newsletter.selectedItem) {
    headerLines.push(`*Hoofdonderwerp:* ${escapeMrkdwn(newsletter.selectedItem.title)}`)
    headerLines.push(`*Waarom:* ${newsletter.selectedTopicReasoning}`)
    if (newsletter.selectedItem.url) {
      headerLines.push(`*Link:* <${newsletter.selectedItem.url}|${newsletter.selectedItem.source_name}>`)
    }
  } else {
    headerLines.push(`*Waarom:* ${newsletter.selectedTopicReasoning}`)
  }

  // Bericht 1 — header + selectie-context.
  await sleep(SEND_DELAY_MS)
  await postToChannel('marketing_ideeen', {
    blocks: [
      header(`📧 3 Newsletter-concepten — week ${isoWeek}`),
      section(headerLines.join('\n')),
    ],
  })

  // Berichten 2-4 — drie concepten.
  const concepts: { emoji: string; label: string; key: keyof NewsletterResult['concepts'] }[] = [
    { emoji: '📘', label: 'Concept 1 — Informatief & feitelijk', key: 'informatief' },
    { emoji: '🚨', label: 'Concept 2 — Direct & alarmerend', key: 'alarmerend' },
    { emoji: '🌱', label: 'Concept 3 — Kans-georiënteerd', key: 'kans' },
  ]

  for (const c of concepts) {
    const concept = newsletter.concepts[c.key]
    await sleep(SEND_DELAY_MS)
    await postToChannel('marketing_ideeen', {
      blocks: [
        header(`${c.emoji} ${c.label}`),
        section(`*Onderwerp:* ${escapeMrkdwn(concept.subject)}`),
        section('```\n' + concept.body.slice(0, 2700) + '\n```'),
      ],
    })
  }

  return 4
}

// ─── Per-channel item-formatting ─────────────────────────────────────────

function buildItemBlocks(headerText: string, items: SummarizedItem[]): SlackBlock[] {
  const blocks: SlackBlock[] = [header(headerText)]
  for (const item of items) {
    const sourceLink = item.url
      ? `<${item.url}|${escapeMrkdwn(item.source_name)}>`
      : escapeMrkdwn(item.source_name)
    const meta: string[] = [`Bron: ${sourceLink}`, `Urgency: ${item.urgency}/10`]
    if (item.impact_score != null) meta.push(`Impact: ${item.impact_score.toFixed(1)}`)
    if (item.region) meta.push(item.region)
    blocks.push(
      section(
        `*${escapeMrkdwn(item.title)}*\n${item.summary_nl}\n> ${item.buyer_implication}`,
      ),
      context(meta.join(' · ')),
    )
  }
  return blocks
}

function groupByChannel(items: SummarizedItem[]): Partial<Record<PrimaryChannel, SummarizedItem[]>> {
  const out: Partial<Record<PrimaryChannel, SummarizedItem[]>> = {}
  for (const it of items) {
    const ch = it.slack_channel
    if (!ch) continue
    if (!out[ch]) out[ch] = []
    out[ch]!.push(it)
  }
  return out
}

// ─── Block builders ──────────────────────────────────────────────────────

function header(text: string): SlackBlock {
  return { type: 'header', text: { type: 'plain_text', text: text.slice(0, 150) } }
}

function section(text: string): SlackBlock {
  return { type: 'section', text: { type: 'mrkdwn', text: text.slice(0, 2900) } }
}

function context(text: string): SlackBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text: text.slice(0, 2900) }] }
}

function escapeMrkdwn(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── HTTP + helpers ──────────────────────────────────────────────────────

async function postToChannel(channel: SlackChannel, payload: SlackPayload): Promise<void> {
  const envVar = SLACK_WEBHOOK_ENV[channel]
  const webhook = process.env[envVar]
  if (!webhook) {
    throw new Error(`[slack] webhook env-var ${envVar} ontbreekt voor kanaal ${channel}`)
  }
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[slack] ${channel} webhook ${res.status}: ${body.slice(0, 200)}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
