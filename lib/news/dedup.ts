/**
 * News-pipeline deduplicatie — fase 2.5 (tussen scrape en classify).
 *
 * Twee bronnen die hetzelfde verhaal anders koppen geven we wél door
 * (cross-source perspectief is waardevol). Twee items van DEZELFDE bron
 * met bijna-identieke titel zijn dubbele publicaties — die verspillen
 * classifier-tokens en stapelen in de Slack-output. Dedup grijpt alleen
 * intra-source.
 *
 * Algoritme: per source pairwise Levenshtein op de titles. Similarity
 * = 1 - distance / max(len(a), len(b)). > 0.85 = duplicaat. Behoud
 * item met langste raw_content (meeste context); markeer rest als
 * archived met error_message='duplicate of <id>'.
 */

import levenshtein from 'fast-levenshtein'
import { createServiceClient } from '@/lib/supabase'

const SIMILARITY_THRESHOLD = 0.85

interface ScrapedItem {
  id: string
  source: string
  title: string
  raw_content: string | null
}

export interface DedupResult {
  itemsDeduplicated: number
  duplicateGroups: number
}

export async function deduplicateItems(runId: string): Promise<DedupResult> {
  const supabase = createServiceClient()

  const { data: items, error } = await supabase
    .from('news_items')
    .select('id, source, title, raw_content')
    .eq('run_id', runId)
    .eq('status', 'scraped')

  if (error) throw new Error(`[dedup] fetch faalde: ${error.message}`)
  if (!items || items.length === 0) {
    await persistDedupCount(supabase, runId, 0)
    return { itemsDeduplicated: 0, duplicateGroups: 0 }
  }

  const bySource = groupBySource(items as ScrapedItem[])
  const toArchive: { id: string; keeperId: string }[] = []
  let groupCount = 0

  for (const list of bySource.values()) {
    if (list.length < 2) continue
    const groups = clusterDuplicates(list)
    for (const group of groups) {
      if (group.length < 2) continue
      groupCount++
      const keeper = pickKeeper(group)
      for (const item of group) {
        if (item.id !== keeper.id) {
          toArchive.push({ id: item.id, keeperId: keeper.id })
        }
      }
    }
  }

  // Markeer duplicaten in batches om DB-roundtrips te beperken.
  await Promise.all(
    toArchive.map(({ id, keeperId }) =>
      supabase
        .from('news_items')
        .update({ status: 'archived', error_message: `duplicate of ${keeperId}` })
        .eq('id', id),
    ),
  )

  await persistDedupCount(supabase, runId, toArchive.length)
  return { itemsDeduplicated: toArchive.length, duplicateGroups: groupCount }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function groupBySource(items: ScrapedItem[]): Map<string, ScrapedItem[]> {
  const out = new Map<string, ScrapedItem[]>()
  for (const it of items) {
    const list = out.get(it.source) ?? []
    list.push(it)
    out.set(it.source, list)
  }
  return out
}

// Eenvoudig union-find clusteren — als A~B en B~C, dan {A,B,C} samen.
function clusterDuplicates(items: ScrapedItem[]): ScrapedItem[][] {
  const parent = new Map<string, string>(items.map(i => [i.id, i.id]))
  const find = (id: string): string => {
    let p = parent.get(id) ?? id
    while (p !== parent.get(p)) p = parent.get(p) ?? p
    parent.set(id, p)
    return p
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (similarity(items[i].title, items[j].title) > SIMILARITY_THRESHOLD) {
        union(items[i].id, items[j].id)
      }
    }
  }

  const groups = new Map<string, ScrapedItem[]>()
  for (const it of items) {
    const root = find(it.id)
    const g = groups.get(root) ?? []
    g.push(it)
    groups.set(root, g)
  }
  return [...groups.values()]
}

function similarity(a: string, b: string): number {
  const A = a.toLowerCase().trim()
  const B = b.toLowerCase().trim()
  if (A === B) return 1
  const maxLen = Math.max(A.length, B.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein.get(A, B) / maxLen
}

function pickKeeper(group: ScrapedItem[]): ScrapedItem {
  return group.reduce((best, cur) => {
    const bLen = best.raw_content?.length ?? 0
    const cLen = cur.raw_content?.length ?? 0
    return cLen > bLen ? cur : best
  })
}

async function persistDedupCount(
  supabase: ReturnType<typeof createServiceClient>,
  runId: string,
  count: number,
): Promise<void> {
  // news_runs heeft (nog) geen items_deduplicated kolom — we plakken het
  // aantal in de errors-jsonb onder _dedup_count. Niet ideaal qua netheid
  // maar voorkomt een schema-migratie; later op te schonen naar een eigen
  // kolom als de schema-discipline dat vraagt.
  const { data, error: fetchErr } = await supabase
    .from('news_runs')
    .select('errors')
    .eq('id', runId)
    .single()
  if (fetchErr) {
    console.error(`[dedup] news_runs read faalde: ${fetchErr.message}`)
    return
  }
  const merged = { ...(data?.errors ?? {}), _dedup_count: count }
  const { error: updErr } = await supabase
    .from('news_runs')
    .update({ errors: merged })
    .eq('id', runId)
  if (updErr) console.error(`[dedup] news_runs write faalde: ${updErr.message}`)
}
