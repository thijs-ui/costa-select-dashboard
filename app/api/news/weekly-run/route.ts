import { NextResponse } from 'next/server'
import { runScrape } from '@/lib/news/scraper'
import { deduplicateItems } from '@/lib/news/dedup'
import { classifyItems } from '@/lib/news/classifier'
import { summarizeItems } from '@/lib/news/summarizer'
import { deliverToSlack } from '@/lib/news/slack'
import { createServiceClient } from '@/lib/supabase'

// Maandagochtend cron + handmatige trigger. Vercel cron stuurt
// 'Authorization: Bearer ${CRON_SECRET}' header automatisch; handmatige
// curl-trigger gebruikt ?secret=... query param. Beide zijn geldig.
export const maxDuration = 800

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get('authorization') ?? ''
  const querySecret = searchParams.get('secret')
  const secret = process.env.CRON_SECRET

  if (!secret) return NextResponse.json({ error: 'CRON_SECRET niet gezet' }, { status: 500 })

  const valid = authHeader === `Bearer ${secret}` || querySecret === secret
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const t0 = Date.now()
  try {
    const scrape = await runScrape()
    const tScrape = Date.now() - t0

    const dedup = await deduplicateItems(scrape.runId)
    const tDedup = Date.now() - t0 - tScrape

    const classify = await classifyItems(scrape.runId)
    const tClassify = Date.now() - t0 - tScrape - tDedup

    const summarize = await summarizeItems(scrape.runId)
    const tSummarize = Date.now() - t0 - tScrape - tDedup - tClassify

    const slack = await deliverToSlack(scrape.runId)
    const tSlack = Date.now() - t0 - tScrape - tDedup - tClassify - tSummarize

    // Markeer run als verzonden zodat we kunnen detecteren of er al een
    // delivery is geweest (en niet dubbel posten bij re-run).
    const supabase = createServiceClient()
    await supabase
      .from('news_runs')
      .update({ slack_sent: true, slack_sent_at: new Date().toISOString() })
      .eq('id', scrape.runId)

    return NextResponse.json({
      runId: scrape.runId,
      scrape: {
        itemsScraped: scrape.itemsScraped,
        itemsFiltered: scrape.itemsFiltered,
        itemsFilteredOut: scrape.itemsFilteredOut,
        errors: scrape.errors,
        ms: tScrape,
      },
      dedup: { ...dedup, ms: tDedup },
      classify: { ...classify, ms: tClassify },
      summarize: { ...summarize, ms: tSummarize },
      slack: { ...slack, ms: tSlack },
      totalMs: Date.now() - t0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[weekly-run] faalde:', msg)
    return NextResponse.json({ error: msg, ms: Date.now() - t0 }, { status: 500 })
  }
}
