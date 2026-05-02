/**
 * News-pipeline scraper — fase 1.
 *
 * Loop door RSS-bronnen uit config.SOURCES, filter op pubDate (lookbackDays)
 * en op preFilter() keyword-match, en schrijf items naar news_items
 * (passes) of filtered_out (rejects). Apify- en web-bronnen worden in deze
 * fase overgeslagen.
 *
 * Gebruik createServiceClient() — service-role key bypassed RLS, want dit
 * draait server-side / cron, geen user-context.
 */

import Parser from 'rss-parser'
import { createServiceClient } from '@/lib/supabase'
import { SOURCES, PIPELINE_CONFIG, preFilter, type NewsSource } from '@/lib/news/config'

const parser = new Parser({
  headers: { 'User-Agent': 'CostaSelect-NewsBot/1.0' },
  timeout: 15000,
})

export interface ScrapeResult {
  runId: string
  itemsScraped: number
  itemsFiltered: number
  itemsFilteredOut: number
  errors: Record<string, string>
}

export async function runScrape(): Promise<ScrapeResult> {
  const supabase = createServiceClient()

  const { data: run, error: runErr } = await supabase
    .from('news_runs')
    .insert({ status: 'running' })
    .select('id')
    .single()

  if (runErr || !run) {
    throw new Error(`[news] news_runs insert faalde: ${runErr?.message ?? 'onbekend'}`)
  }
  const runId = run.id as string

  const errors: Record<string, string> = {}
  let itemsScraped = 0
  let itemsFiltered = 0
  let itemsFilteredOut = 0

  const cutoff = new Date(Date.now() - PIPELINE_CONFIG.lookbackDays * 24 * 60 * 60 * 1000)

  for (const source of SOURCES) {
    if (source.type !== 'rss') continue
    if (source.disabled) continue

    try {
      const counts = await scrapeRssSource(source, runId, cutoff, supabase)
      itemsScraped += counts.scraped
      itemsFiltered += counts.filtered
      itemsFilteredOut += counts.filteredOut
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[news] ${source.id} faalde: ${msg}`)
      errors[source.id] = msg
    }
  }

  const status = Object.keys(errors).length > 0 ? 'partial' : 'success'
  await supabase
    .from('news_runs')
    .update({
      errors,
      items_scraped: itemsScraped,
      items_filtered: itemsFiltered,
      items_filtered_out: itemsFilteredOut,
      finished_at: new Date().toISOString(),
      status,
    })
    .eq('id', runId)

  return { runId, itemsScraped, itemsFiltered, itemsFilteredOut, errors }
}

async function scrapeRssSource(
  source: NewsSource,
  runId: string,
  cutoff: Date,
  supabase: ReturnType<typeof createServiceClient>,
): Promise<{ scraped: number; filtered: number; filteredOut: number }> {
  const feed = await parser.parseURL(source.url)

  let scraped = 0
  let filtered = 0
  let filteredOut = 0

  for (const item of feed.items) {
    const url = item.link
    const title = item.title
    if (!url || !title) continue

    // pubDate is optioneel in RSS — items zonder pubDate laten we door zodat
    // we eerder over- dan onder-includen. Met pubDate filteren op cutoff.
    const pubRaw = item.isoDate ?? item.pubDate ?? null
    const publishedAt = pubRaw ? new Date(pubRaw) : null
    if (publishedAt && !isNaN(publishedAt.getTime()) && publishedAt < cutoff) continue

    scraped++

    const content =
      (typeof item.contentSnippet === 'string' ? item.contentSnippet : '') ||
      (typeof item.content === 'string' ? item.content : '') ||
      (typeof item.summary === 'string' ? item.summary : '')

    const { passes, matchedKeywords } = preFilter(`${title} ${content}`)

    if (passes) {
      filtered++
      const { error } = await supabase.from('news_items').upsert(
        {
          source: source.id,
          source_name: source.name,
          url,
          title,
          published_at: publishedAt?.toISOString() ?? null,
          language: source.language,
          raw_content: content,
          matched_keywords: matchedKeywords,
          status: 'scraped',
          run_id: runId,
        },
        { onConflict: 'url', ignoreDuplicates: true },
      )
      if (error) console.error(`[news] news_items upsert faalde voor ${url}: ${error.message}`)
    } else {
      filteredOut++
      const { error } = await supabase.from('filtered_out').insert({
        source: source.id,
        url,
        title,
        reason: 'no_keyword_match',
        run_id: runId,
      })
      if (error) console.error(`[news] filtered_out insert faalde voor ${url}: ${error.message}`)
    }
  }

  return { scraped, filtered, filteredOut }
}
