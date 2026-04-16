/**
 * Upload alle kennisbank documenten als chunks naar Supabase.
 *
 * Gebruik: npx tsx scripts/upload-kennisbank.ts
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { docs } from '../lib/kennisbank-docs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Run with: npx dotenv -e .env.local -- npx tsx scripts/upload-kennisbank.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const CONTENT_DIR = path.join(process.cwd(), 'content', 'kennisbank')
const MAX_CHUNK_LENGTH = 1500

interface Chunk {
  doc_slug: string
  doc_code: string
  doc_title: string
  doc_category: string
  chunk_index: number
  heading: string | null
  content: string
  tags: string[] | null
}

function chunkDocument(
  content: string,
  doc: { slug: string; code: string; title: string; category: string; tags?: string[] }
): Chunk[] {
  // Clean up mammoth artifacts
  const clean = content
    .replace(/<a id="[^"]*"><\/a>/g, '')
    .replace(/\\\./g, '.')
    .replace(/\\\-/g, '-')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')

  // Split on headings
  const sections: { heading: string | null; content: string }[] = []
  const lines = clean.split('\n')
  let currentHeading: string | null = null
  let currentContent: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/)
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
      }
      currentHeading = headingMatch[1]
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }
  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
  }

  // Create chunks, splitting large sections
  const chunks: Chunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    if (!section.content.trim()) continue

    if (section.content.length <= MAX_CHUNK_LENGTH) {
      chunks.push({
        doc_slug: doc.slug,
        doc_code: doc.code,
        doc_title: doc.title,
        doc_category: doc.category,
        tags: doc.tags ?? null,
        chunk_index: chunkIndex++,
        heading: section.heading,
        content: section.content,
      })
    } else {
      // Split large sections by paragraphs
      const paragraphs = section.content.split(/\n\n+/)
      let buffer = ''

      for (const para of paragraphs) {
        if (buffer.length + para.length > MAX_CHUNK_LENGTH && buffer.trim()) {
          chunks.push({
            doc_slug: doc.slug,
            doc_code: doc.code,
            doc_title: doc.title,
            doc_category: doc.category,
            tags: doc.tags ?? null,
            chunk_index: chunkIndex++,
            heading: section.heading,
            content: buffer.trim(),
          })
          buffer = ''
        }
        buffer += (buffer ? '\n\n' : '') + para
      }

      if (buffer.trim()) {
        chunks.push({
          doc_slug: doc.slug,
          doc_code: doc.code,
          doc_title: doc.title,
          doc_category: doc.category,
          tags: doc.tags ?? null,
          chunk_index: chunkIndex++,
          heading: section.heading,
          content: buffer.trim(),
        })
      }
    }
  }

  return chunks
}

async function main() {
  console.log('Uploading kennisbank documents...\n')

  // Clear existing chunks
  const { error: deleteError } = await supabase.from('kb_chunks').delete().neq('id', 0)
  if (deleteError) {
    console.error('Error clearing existing chunks:', deleteError.message)
    process.exit(1)
  }
  console.log('Cleared existing chunks.')

  let totalChunks = 0

  for (const doc of docs) {
    const filePath = path.join(CONTENT_DIR, `${doc.slug}.md`)

    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${doc.slug} (file not found)`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const chunks = chunkDocument(content, doc)

    if (chunks.length === 0) {
      console.warn(`  SKIP: ${doc.slug} (no chunks)`)
      continue
    }

    // Upload in batches of 50
    for (let i = 0; i < chunks.length; i += 50) {
      const batch = chunks.slice(i, i + 50)
      const { error } = await supabase.from('kb_chunks').insert(batch)
      if (error) {
        console.error(`  ERROR: ${doc.slug}:`, error.message)
        continue
      }
    }

    totalChunks += chunks.length
    console.log(`  OK: ${doc.code} — ${doc.title} (${chunks.length} chunks)`)
  }

  console.log(`\nDone! Uploaded ${totalChunks} chunks from ${docs.length} documents.`)
}

main().catch(console.error)
