/**
 * News-pipeline cross-source clustering — fase 2.7 (tussen dedup en classify).
 *
 * Items uit verschillende bronnen die hetzelfde onderwerp behandelen worden
 * gegroepeerd via OpenAI embeddings + cosine similarity > 0.85. Per cluster:
 *   - Leader = item met meest uitgebreide raw_content (best newsletter-bron),
 *     tiebreak op oudste published_at (originele bron).
 *   - Leader behoudt status 'scraped' + is_cluster_leader=true.
 *   - Niet-leaders worden status='archived' met error_message='cluster_member
 *     of <leader_id>'. Dit voorkomt dat classifier+summarizer 4× Sonnet-calls
 *     doen voor hetzelfde nieuws.
 *
 * Singletons krijgen óók een news_clusters rij (item_count=1) zodat alle
 * items downstream een cluster_id hebben.
 */

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIM = 1536
const EMBEDDING_BATCH_SIZE = 100
const SIMILARITY_THRESHOLD = 0.85
const MAX_RETRIES = 3

interface ItemForCluster {
  id: string
  source: string
  source_name: string
  title: string
  raw_content: string | null
  published_at: string | null
  embedding: number[] | null
}

interface ItemWithEmbedding extends ItemForCluster {
  embedding: number[]
}

export interface ClusterResult {
  itemsClustered: number
  clustersFormed: number
  embeddingTokens: number
}

export async function clusterItems(runId: string): Promise<ClusterResult> {
  const supabase = createServiceClient()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const { data, error } = await supabase
    .from('news_items')
    .select('id, source, source_name, title, raw_content, published_at, embedding')
    .eq('run_id', runId)
    .eq('status', 'scraped')

  if (error) throw new Error(`[cluster] fetch faalde: ${error.message}`)
  if (!data || data.length === 0) {
    return { itemsClustered: 0, clustersFormed: 0, embeddingTokens: 0 }
  }

  const items = data as ItemForCluster[]

  // Stap A: embeddings genereren voor items zonder embedding (re-runs slaan
  // bestaande embeddings over). pgvector geeft strings terug; parse defensief.
  const embeddings = new Map<string, number[]>()
  for (const it of items) {
    if (it.embedding) {
      const parsed = parseEmbedding(it.embedding)
      if (parsed && parsed.length === EMBEDDING_DIM) {
        embeddings.set(it.id, parsed)
      }
    }
  }

  const needsEmbedding = items.filter(i => !embeddings.has(i.id))
  let embeddingTokens = 0

  if (needsEmbedding.length > 0) {
    const batches = chunk(needsEmbedding, EMBEDDING_BATCH_SIZE)
    for (const batch of batches) {
      const inputs = batch.map(i => `${i.title}\n\n${(i.raw_content ?? '').slice(0, 1000)}`)
      const response = await callWithRetry(() =>
        openai.embeddings.create({ model: EMBEDDING_MODEL, input: inputs }),
      )
      embeddingTokens += response.usage.total_tokens

      // Persist + remember in-memory.
      const updates: Promise<unknown>[] = []
      for (let i = 0; i < batch.length; i++) {
        const emb = response.data[i].embedding
        embeddings.set(batch[i].id, emb)
        updates.push(
          Promise.resolve(
            supabase.from('news_items').update({ embedding: emb }).eq('id', batch[i].id),
          ),
        )
      }
      await Promise.all(updates)
    }
  }

  // Stap B: cluster via cosine similarity (union-find).
  const itemsList: ItemWithEmbedding[] = items
    .map(i => ({ ...i, embedding: embeddings.get(i.id)! }))
    .filter(i => Array.isArray(i.embedding) && i.embedding.length === EMBEDDING_DIM)

  const groups = clusterByEmbedding(itemsList, SIMILARITY_THRESHOLD)

  // Stap C: per groep DB-writes (cluster-rij + item-updates).
  let multiClusterCount = 0
  for (const group of groups) {
    if (group.length === 0) continue
    const leader = pickLeader(group)

    const { data: clusterRow, error: cErr } = await supabase
      .from('news_clusters')
      .insert({
        run_id: runId,
        leader_item_id: leader.id,
        item_count: group.length,
      })
      .select('id')
      .single()

    if (cErr || !clusterRow) {
      console.error('[cluster] news_clusters insert faalde:', cErr?.message)
      continue
    }

    if (group.length > 1) multiClusterCount++

    // Update items: leader behoudt status='scraped' + leader=true, members
    // worden gearchiveerd met error_message-trace naar de leader.
    await Promise.all(
      group.map(member => {
        const isLeader = member.id === leader.id
        const update: Record<string, unknown> = {
          cluster_id: clusterRow.id,
          is_cluster_leader: isLeader,
        }
        if (!isLeader) {
          update.status = 'archived'
          update.error_message = `cluster_member of ${leader.id}`
        }
        return supabase.from('news_items').update(update).eq('id', member.id)
      }),
    )
  }

  // Stap D: stats in news_runs.
  await supabase
    .from('news_runs')
    .update({
      items_clustered: items.length,
      clusters_formed: multiClusterCount,
    })
    .eq('id', runId)

  return {
    itemsClustered: items.length,
    clustersFormed: multiClusterCount,
    embeddingTokens,
  }
}

// ─── Clustering helpers ──────────────────────────────────────────────────

function clusterByEmbedding(
  items: ItemWithEmbedding[],
  threshold: number,
): ItemWithEmbedding[][] {
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
      const sim = cosineSimilarity(items[i].embedding, items[j].embedding)
      if (sim > threshold) union(items[i].id, items[j].id)
    }
  }

  const groups = new Map<string, ItemWithEmbedding[]>()
  for (const it of items) {
    const root = find(it.id)
    const g = groups.get(root) ?? []
    g.push(it)
    groups.set(root, g)
  }
  return [...groups.values()]
}

function pickLeader(group: ItemWithEmbedding[]): ItemWithEmbedding {
  // Primair: langste raw_content (meest uitgebreide coverage = beste leader
  // voor de newsletter). Tiebreak: oudste published_at (originele bron eerst).
  return group.reduce((best, cur) => {
    const bLen = best.raw_content?.length ?? 0
    const cLen = cur.raw_content?.length ?? 0
    if (cLen > bLen) return cur
    if (cLen < bLen) return best
    const bDate = best.published_at ? new Date(best.published_at).getTime() : Infinity
    const cDate = cur.published_at ? new Date(cur.published_at).getTime() : Infinity
    return cDate < bDate ? cur : best
  })
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

// ─── HTTP helpers ────────────────────────────────────────────────────────

async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isLast = attempt === MAX_RETRIES
      if (
        err instanceof OpenAI.RateLimitError ||
        err instanceof OpenAI.InternalServerError ||
        err instanceof OpenAI.APIConnectionError
      ) {
        if (isLast) throw err
        const waitMs = 5000 * Math.pow(2, attempt - 1)
        console.warn(`[cluster] ${err.constructor.name} attempt ${attempt}/${MAX_RETRIES}, wacht ${waitMs}ms`)
        await new Promise(r => setTimeout(r, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error('[cluster] retry-loop unreachable')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ─── Slack helper: cluster-members ophalen voor "Ook gemeld door" ────────

export interface ClusterMember {
  source_name: string
  url: string | null
}

export async function getClusterMembers(
  runId: string,
  clusterId: string,
): Promise<ClusterMember[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('news_items')
    .select('source_name, url, published_at')
    .eq('run_id', runId)
    .eq('cluster_id', clusterId)
    .eq('is_cluster_leader', false)
    .order('published_at', { ascending: true, nullsFirst: false })
  if (error) {
    console.error('[cluster] member fetch faalde:', error.message)
    return []
  }
  return (data ?? []).map(d => ({ source_name: d.source_name, url: d.url }))
}
