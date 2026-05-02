/**
 * News-pipeline Slack delivery — fase 5.
 *
 * Stuurt een serie berichten naar #cs-news via een incoming webhook.
 * Volgorde: header → 1 bericht per categorie met items → concept-newsletter
 *   → dashboard-link. 500ms delay tussen berichten ivm Slack rate limits.
 *
 * Edge case: 0 summarized items → één 'rustige week'-bericht en klaar.
 */

import { createServiceClient } from '@/lib/supabase'
import { generateNewsletter } from '@/lib/news/newsletter'
import { CATEGORY_LABELS, PIPELINE_CONFIG, type Category } from '@/lib/news/config'

const SEND_DELAY_MS = 500
const MAX_PER_CATEGORY = PIPELINE_CONFIG.maxItemsPerCategorySlack

interface SummarizedItem {
  title: string
  url: string | null
  source_name: string
  category: Category
  region: string | null
  urgency: number
  summary_nl: string
  buyer_implication: string
}

export interface SlackDeliveryResult {
  messagesSent: number
  rustigeWeek: boolean
  newsletterGenerated: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SlackBlock = Record<string, any>
type SlackPayload = { blocks: SlackBlock[] }

export async function deliverToSlack(runId: string): Promise<SlackDeliveryResult> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) throw new Error('[slack] SLACK_WEBHOOK_URL ontbreekt')

  const supabase = createServiceClient()

  const [runRes, itemsRes] = await Promise.all([
    supabase.from('news_runs').select('items_scraped').eq('id', runId).single(),
    supabase
      .from('news_items')
      .select('title, url, source_name, category, region, urgency, summary_nl, buyer_implication')
      .eq('run_id', runId)
      .eq('status', 'summarized')
      .order('urgency', { ascending: false }),
  ])

  if (runRes.error) throw new Error(`[slack] news_runs fetch faalde: ${runRes.error.message}`)
  if (itemsRes.error) throw new Error(`[slack] news_items fetch faalde: ${itemsRes.error.message}`)

  const items = (itemsRes.data ?? []) as SummarizedItem[]
  const totalScraped = runRes.data?.items_scraped ?? 0

  // Edge case: rustige week — geen items boven urgency-threshold.
  if (items.length === 0) {
    await postBlocks(webhook, {
      blocks: [
        section(
          `🌿 *Rustige week* — geen items boven urgency ${PIPELINE_CONFIG.summarizeUrgencyThreshold} om te delen. Volledige scrape: ${totalScraped} bekeken.`,
        ),
      ],
    })
    return { messagesSent: 1, rustigeWeek: true, newsletterGenerated: false }
  }

  let messagesSent = 0

  // 1. Header met categorie-totalen.
  const byCat = groupByCategory(items)
  const categoryTotalsLine = (Object.entries(byCat) as [Category, SummarizedItem[]][])
    .filter(([, list]) => list.length > 0)
    .map(([cat, list]) => `${CATEGORY_LABELS[cat].emoji} ${CATEGORY_LABELS[cat].label}: ${list.length}`)
    .join(' · ')

  const isoWeek = getISOWeek(new Date())
  await postBlocks(webhook, {
    blocks: [
      header(`📰 Costa Select Weekly — week ${isoWeek}`),
      section(categoryTotalsLine || '_Geen items deze week._'),
      { type: 'divider' },
    ],
  })
  messagesSent++

  // 2-7. Per categorie — alleen tonen als er items zijn.
  // CATEGORY_LABELS-volgorde respecteren voor consistente leesvolgorde.
  for (const cat of Object.keys(CATEGORY_LABELS) as Category[]) {
    const list = byCat[cat]
    if (!list || list.length === 0) continue

    const top = list.slice(0, MAX_PER_CATEGORY)
    const blocks: SlackBlock[] = [
      header(`${CATEGORY_LABELS[cat].emoji} ${CATEGORY_LABELS[cat].label}`),
    ]

    for (const item of top) {
      const sourceLink = item.url ? `<${item.url}|${item.source_name}>` : item.source_name
      blocks.push(
        section(`*${escapeMrkdwn(item.title)}*\n${item.summary_nl}\n> ${item.buyer_implication}`),
        context(`Bron: ${sourceLink} · Urgency: ${item.urgency}/10${item.region ? ` · ${item.region}` : ''}`),
      )
    }

    await sleep(SEND_DELAY_MS)
    await postBlocks(webhook, { blocks })
    messagesSent++
  }

  // 8. Concept-klantnieuwsbrief.
  let newsletterGenerated = false
  try {
    const newsletter = await generateNewsletter(runId)
    if (newsletter) {
      await sleep(SEND_DELAY_MS)
      await postBlocks(webhook, {
        blocks: [
          header('📧 Concept klantnieuwsbrief'),
          section(`*Onderwerp:* ${escapeMrkdwn(newsletter.subject)}`),
          section('```\n' + newsletter.body.slice(0, 2800) + '\n```'),
        ],
      })
      messagesSent++
      newsletterGenerated = true
    }
  } catch (err) {
    console.error('[slack] newsletter genereren faalde:', err instanceof Error ? err.message : err)
    // Slack-bericht dat het misging, ipv stilte.
    await sleep(SEND_DELAY_MS)
    await postBlocks(webhook, {
      blocks: [section('⚠️ Concept-klantnieuwsbrief kon niet gegenereerd worden — check de logs.')],
    })
    messagesSent++
  }

  // 9. Dashboard-link.
  const dashboardUrl = process.env.DASHBOARD_URL
  if (dashboardUrl) {
    await sleep(SEND_DELAY_MS)
    await postBlocks(webhook, {
      blocks: [section(`📊 Volledig archief: <${dashboardUrl}/news|open dashboard>`)],
    })
    messagesSent++
  }

  return { messagesSent, rustigeWeek: false, newsletterGenerated }
}

// ─── Block builders ────────────────────────────────────────────────────────

function header(text: string): SlackBlock {
  return { type: 'header', text: { type: 'plain_text', text: text.slice(0, 150) } }
}

function section(text: string): SlackBlock {
  return { type: 'section', text: { type: 'mrkdwn', text: text.slice(0, 2900) } }
}

function context(text: string): SlackBlock {
  return { type: 'context', elements: [{ type: 'mrkdwn', text: text.slice(0, 2900) }] }
}

// Slack mrkdwn escaping — minimaal: < > & en backticks om te voorkomen dat
// item-titels per ongeluk Slack-formatting triggeren.
function escapeMrkdwn(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function groupByCategory(items: SummarizedItem[]): Partial<Record<Category, SummarizedItem[]>> {
  const out: Partial<Record<Category, SummarizedItem[]>> = {}
  for (const it of items) {
    if (!it.category) continue
    if (!out[it.category]) out[it.category] = []
    out[it.category]!.push(it)
  }
  return out
}

async function postBlocks(webhook: string, payload: SlackPayload): Promise<void> {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[slack] webhook ${res.status}: ${body.slice(0, 200)}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ISO 8601 week-nummer berekening (jaar-week zoals in Europa).
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
