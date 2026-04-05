import { getDocBySlug, docs } from '@/lib/kennisbank-docs'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function generateStaticParams() {
  return docs.map(doc => ({ slug: doc.slug }))
}

export default async function KennisbankDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) notFound()

  const filePath = path.join(process.cwd(), 'content', 'kennisbank', `${slug}.md`)

  let content = ''
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    notFound()
  }

  // Strip anchor tags from mammoth conversion
  const cleanContent = content
    .replace(/<a id="[^"]*"><\/a>/g, '')
    .replace(/\\\./g, '.')
    .replace(/\\\-/g, '-')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')

  return (
    <div className="px-8 py-8">
      <Link
        href="/kennisbank"
        className="inline-flex items-center gap-1.5 text-xs mb-6 hover:opacity-70 transition-opacity"
        style={{ color: '#7A8C8B' }}
      >
        <ArrowLeft size={14} />
        Terug naar kennisbank
      </Link>

      <div className="mb-4">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: '#F5F5F5', color: '#7A8C8B' }}
        >
          {doc.code}
        </span>
        <span className="text-xs ml-2" style={{ color: '#7A8C8B' }}>
          {doc.category}
        </span>
      </div>

      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: '#004B46', fontFamily: 'var(--font-heading, sans-serif)' }}
      >
        {doc.title}
      </h1>

      <article
        className="bg-white rounded-xl border border-gray-100 p-6 md:p-8 prose prose-sm max-w-none"
        style={{ fontFamily: 'var(--font-body, sans-serif)' }}
        dangerouslySetInnerHTML={{ __html: markdownToHtml(cleanContent) }}
      />
    </div>
  )
}

function markdownToHtml(md: string): string {
  // Simple markdown to HTML conversion for display
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>')

  // Wrap list items
  html = html.replace(/(<li>.*?<\/li>(?:<br\/>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br\/>/g, '') + '</ul>'
  })

  return '<p>' + html + '</p>'
}
