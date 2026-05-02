import { NextResponse } from 'next/server'
import { runScrape } from '@/lib/news/scraper'
import { classifyItems } from '@/lib/news/classifier'
import { summarizeItems } from '@/lib/news/summarizer'

// scrape (~30-60s op de 13 RSS-bronnen) + classify (Haiku batches, ~10-30s)
// + summarize (Sonnet, één call per urgent item, ~30-90s) — totaal kan
// 2-3 minuten zijn, dus 300s headroom.
export const maxDuration = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  try {
    const scrape = await runScrape()
    const tScrape = Date.now() - t0

    const classify = await classifyItems(scrape.runId)
    const tClassify = Date.now() - t0 - tScrape

    const summarize = await summarizeItems(scrape.runId)
    const tSummarize = Date.now() - t0 - tScrape - tClassify

    return NextResponse.json({
      runId: scrape.runId,
      scrape: {
        itemsScraped: scrape.itemsScraped,
        itemsFiltered: scrape.itemsFiltered,
        itemsFilteredOut: scrape.itemsFilteredOut,
        errors: scrape.errors,
        ms: tScrape,
      },
      classify: {
        itemsClassified: classify.itemsClassified,
        itemsArchived: classify.itemsArchived,
        errors: classify.errors,
        ms: tClassify,
      },
      summarize: {
        itemsSummarized: summarize.itemsSummarized,
        errors: summarize.errors,
        ms: tSummarize,
      },
      totalMs: Date.now() - t0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[test-pipeline] faalde:', msg)
    return NextResponse.json({ error: msg, ms: Date.now() - t0 }, { status: 500 })
  }
}
