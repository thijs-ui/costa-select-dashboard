import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Calendar, Clock, Sparkles } from 'lucide-react'
import {
  CATEGORY_META,
  docs,
  getDocBySlug,
  getReadingMinutes,
  isNew,
  type Category,
} from '@/lib/kennisbank-docs'
import KbDetailFeedback from '@/components/kennisbank/Feedback'
import { CategoryIcon } from '@/components/kennisbank/CategoryIcon'

export function generateStaticParams() {
  return docs.map(doc => ({ slug: doc.slug }))
}

interface ParsedHeading {
  id: string
  text: string
  level: 2 | 3
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractHeadings(markdown: string): ParsedHeading[] {
  const headings: ParsedHeading[] = []
  const lines = markdown.split('\n')
  for (const line of lines) {
    const m2 = /^##\s+(.+)$/.exec(line)
    if (m2) {
      headings.push({ id: slugify(m2[1]), text: m2[1].trim(), level: 2 })
      continue
    }
    const m3 = /^###\s+(.+)$/.exec(line)
    if (m3) {
      headings.push({ id: slugify(m3[1]), text: m3[1].trim(), level: 3 })
    }
  }
  return headings
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInline(text: string): string {
  // Order: bold → italic → links
  let out = escapeHtml(text)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<em>$1</em>')
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return out
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\\([._\-()[\]])/g, '$1').split('\n')
  const out: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let paragraph: string[] = []

  function flushParagraph() {
    if (paragraph.length) {
      out.push('<p>' + renderInline(paragraph.join(' ')) + '</p>')
      paragraph = []
    }
  }
  function closeList() {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = raw
    // empty line — flush
    if (/^\s*$/.test(line)) {
      flushParagraph()
      closeList()
      continue
    }
    const h2 = /^##\s+(.+)$/.exec(line)
    if (h2) {
      flushParagraph()
      closeList()
      const id = slugify(h2[1])
      out.push(`<h2 id="${id}">${escapeHtml(h2[1].trim())}</h2>`)
      continue
    }
    const h3 = /^###\s+(.+)$/.exec(line)
    if (h3) {
      flushParagraph()
      closeList()
      const id = slugify(h3[1])
      out.push(`<h3 id="${id}">${escapeHtml(h3[1].trim())}</h3>`)
      continue
    }
    const h1 = /^#\s+(.+)$/.exec(line)
    if (h1) {
      flushParagraph()
      closeList()
      out.push(`<h2>${escapeHtml(h1[1].trim())}</h2>`)
      continue
    }
    const ul = /^[-*]\s+(.+)$/.exec(line)
    if (ul) {
      flushParagraph()
      if (listType !== 'ul') {
        closeList()
        out.push('<ul>')
        listType = 'ul'
      }
      out.push('<li>' + renderInline(ul[1]) + '</li>')
      continue
    }
    const ol = /^\d+\.\s+(.+)$/.exec(line)
    if (ol) {
      flushParagraph()
      if (listType !== 'ol') {
        closeList()
        out.push('<ol>')
        listType = 'ol'
      }
      out.push('<li>' + renderInline(ol[1]) + '</li>')
      continue
    }
    // anchor cleanup (mammoth artefacts)
    const cleaned = line.replace(/<a id="[^"]*"><\/a>/g, '').trim()
    if (!cleaned) continue
    paragraph.push(cleaned)
  }
  flushParagraph()
  closeList()
  return out.join('\n')
}

export default async function KennisbankDocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) notFound()

  const filePath = path.join(process.cwd(), 'content', 'kennisbank', `${slug}.md`)
  let markdown = ''
  try {
    markdown = fs.readFileSync(filePath, 'utf-8')
  } catch {
    notFound()
  }

  const headings = extractHeadings(markdown)
  const html = markdownToHtml(markdown)

  // Pseudo-random "updated" datum
  const hash = doc.slug.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const daysAgo = hash % 90
  const updatedDate = new Date(Date.now() - daysAgo * 24 * 3600 * 1000) // eslint-disable-line react-hooks/purity
  const updatedLabel = updatedDate.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Prev / next: same-category siblings ordered by code
  const sameCat = docs
    .filter(d => d.category === doc.category)
    .sort((a, b) => a.code.localeCompare(b.code))
  const idx = sameCat.findIndex(d => d.slug === doc.slug)
  const prevDoc = idx > 0 ? sameCat[idx - 1] : null
  const nextDoc = idx < sameCat.length - 1 ? sameCat[idx + 1] : null

  // Related: 3 stable-pseudorandom siblings same-category (excl current)
  const others = sameCat.filter(d => d.slug !== doc.slug)
  const related = others.slice(0, 3)

  const meta = CATEGORY_META[doc.category as Category]
  const reading = getReadingMinutes(doc)
  const _new = isNew(doc)

  return (
    <div className="kb-page">
      <div className="kb-shell">
        <Link href="/kennisbank" className="kb-detail-back">
          <ArrowLeft size={13} strokeWidth={2} /> Terug naar kennisbank
        </Link>

        <div className="kb-detail-layout">
          {headings.length > 0 && (
            <aside className="kb-toc" aria-label="Inhoudsopgave">
              <div className="kb-toc-label">Inhoud</div>
              <ul className="kb-toc-list">
                {headings.map(h => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className={h.level === 3 ? 'indent' : ''}>
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <article className="kb-detail-main">
            <nav className="kb-breadcrumb" aria-label="Kruimelpad">
              <Link href="/kennisbank">Kennisbank</Link>
              <span className="sep">›</span>
              <Link href="/kennisbank">{doc.category}</Link>
              <span className="sep">›</span>
              <span className="current">
                {doc.code} · {doc.title}
              </span>
            </nav>

            <div className="kb-detail-eyebrow">
              <span className="code">{doc.code}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CategoryIcon name={meta.iconName} size={12} />
                {doc.category}
              </span>
            </div>

            <h1 className="kb-detail-title">{doc.title}</h1>

            <div className="kb-detail-meta">
              <span className="kb-detail-meta-item">
                <Clock size={13} strokeWidth={2} /> {reading} min lezen
              </span>
              <span className="kb-detail-meta-item">
                <Calendar size={13} strokeWidth={2} /> Bijgewerkt {updatedLabel}
              </span>
              {_new && (
                <span
                  className="kb-detail-meta-item"
                  style={{ color: 'var(--sun-dark)' }}
                >
                  <Sparkles size={13} strokeWidth={2} /> Nieuw
                </span>
              )}
            </div>

            <div className="kb-prose" dangerouslySetInnerHTML={{ __html: html }} />

            <KbDetailFeedback slug={doc.slug} />

            {(prevDoc || nextDoc) && (
              <div className="kb-detail-nav">
                {prevDoc ? (
                  <Link
                    href={`/kennisbank/${prevDoc.slug}`}
                    className="kb-detail-nav-btn"
                  >
                    <span className="kb-detail-nav-btn-eyebrow">
                      <ArrowLeft size={11} strokeWidth={2.4} /> Vorige
                    </span>
                    <span className="kb-detail-nav-btn-title">
                      {prevDoc.code} · {prevDoc.title}
                    </span>
                  </Link>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
                {nextDoc ? (
                  <Link
                    href={`/kennisbank/${nextDoc.slug}`}
                    className="kb-detail-nav-btn next"
                  >
                    <span className="kb-detail-nav-btn-eyebrow">
                      Volgende <ArrowRight size={11} strokeWidth={2.4} />
                    </span>
                    <span className="kb-detail-nav-btn-title">
                      {nextDoc.code} · {nextDoc.title}
                    </span>
                  </Link>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </div>
            )}

            {related.length > 0 && (
              <div className="kb-related">
                <div className="kb-related-label">Gerelateerde documenten</div>
                <div className="kb-related-grid">
                  {related.map(d => (
                    <Link
                      key={d.slug}
                      href={`/kennisbank/${d.slug}`}
                      className="kb-doc-card"
                    >
                      <div className="kb-doc-card-head">
                        <span className="kb-doc-code">{d.code}</span>
                        <span className="kb-doc-arrow">
                          <ArrowRight size={14} strokeWidth={2} />
                        </span>
                      </div>
                      <h3 className="kb-doc-title">{d.title}</h3>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
