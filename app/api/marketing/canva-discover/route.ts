// Discovery-endpoint: lijst alle brand templates van het gekoppelde
// Canva-account + per template de autofill data-fields. Output gebruiken
// we in stap 4B om de juiste template te kiezen en field-mapping op te
// stellen (listing-data → template field-namen).

import { NextResponse } from 'next/server'
import {
  listBrandTemplates,
  getBrandTemplateDataset,
  type DataField,
} from '@/lib/canva/client'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface EnrichedTemplate {
  id: string
  title: string
  view_url: string
  updated_at: string
  data_fields?: Array<{ name: string; type: DataField['type'] }>
  data_fields_error?: string
}

export async function GET() {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const templates = await listBrandTemplates()

    const enriched: EnrichedTemplate[] = await Promise.all(
      templates.map(async (t): Promise<EnrichedTemplate> => {
        const base = {
          id: t.id,
          title: t.title,
          view_url: t.view_url,
          updated_at: new Date(t.updated_at * 1000).toISOString(),
        }
        try {
          const dataset = await getBrandTemplateDataset(t.id)
          return {
            ...base,
            data_fields: Object.entries(dataset).map(([name, field]) => ({
              name,
              type: field.type,
            })),
          }
        } catch (err) {
          return {
            ...base,
            data_fields_error: err instanceof Error ? err.message : 'Onbekende fout',
          }
        }
      }),
    )

    return NextResponse.json({ ok: true, total: enriched.length, templates: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
