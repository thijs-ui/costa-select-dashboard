import { NextResponse } from 'next/server'
import { runScrape } from '@/lib/news/scraper'

// 14 RSS-bronnen serieel scrapen (parser.parseURL met 15s timeout per feed)
// + DB-writes per item kan oplopen tot enkele minuten. Vercel default = 10s,
// dus expliciet 300s zodat lange runs niet halverwege geknipt worden.
export const maxDuration = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runScrape()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[news/test-scrape] runScrape faalde:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
