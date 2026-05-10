// Wekelijkse cron — selecteert 20 listings, verwerkt parallel, schrijft
// resultaten naar ad_batches + ad_candidates, ping't Slack.
//
// Auth: Bearer-token CRON_SECRET (Vercel cron stuurt dit automatisch
// mee als je het in Vercel-env zet).
//
// Vercel Hobby: 60s hard timeout. 20 candidates parallel meten ~30-40s
// in praktijk. Failures van individuele candidates slepen de rest niet
// mee — Promise.allSettled vangt 'm af.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { selectWeeklyCandidates } from '@/lib/marketing/bots-query'
import { generateForCandidate } from '@/lib/marketing/batch-generator'
import { sendBatchSlackNotification } from '@/lib/marketing/slack-notify'
import { getIsoWeek } from '@/lib/utils/iso-week'
import { getCanvaAccessToken } from '@/lib/canva/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export async function GET(req: NextRequest) {
  // 1. Auth check — Vercel cron stuurt Authorization: Bearer $CRON_SECRET.
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  const weekIso = getIsoWeek()
  const supabase = createServiceClient()

  try {
    // 2. Maak batch rij aan. UNIQUE-constraint op week_iso voorkomt
    // dubbele runs (bv. cron + handmatige trigger op zelfde dag).
    const { data: batch, error: batchError } = await supabase
      .from('ad_batches')
      .insert({ week_iso: weekIso, status: 'generating' })
      .select()
      .single()

    if (batchError) {
      return NextResponse.json({
        ok: false,
        error: `Batch insert faalde: ${batchError.message}`,
        hint: 'Mogelijk al een batch voor deze week aangemaakt (UNIQUE constraint op week_iso)',
      }, { status: 500 })
    }

    // 3. Selecteer 20 candidates via de stap-2 helper.
    // Dev-knob: ?limit=N capt de set zodat we klein kunnen testen.
    const limitParam = req.nextUrl.searchParams.get('limit')
    const limit = limitParam ? Number.parseInt(limitParam, 10) : null
    const allCandidates = await selectWeeklyCandidates()
    const candidates = limit && limit > 0 ? allCandidates.slice(0, limit) : allCandidates

    if (candidates.length === 0) {
      await supabase
        .from('ad_batches')
        .update({
          status: 'ready',
          total_candidates: 0,
          generation_log: { warning: 'Geen kandidaten gevonden in Bots Supabase' },
        })
        .eq('id', batch.id)

      await sendBatchSlackNotification({
        batchId: batch.id,
        weekIso,
        totalAttempted: 0,
        successCount: 0,
        failedCount: 0,
      })

      return NextResponse.json({ ok: true, batch_id: batch.id, count: 0, message: 'Geen candidates' })
    }

    // 3b. Warm de Canva-token cache vóór de parallel burst. Anders
    // proberen 20 candidates tegelijk te refreshen met dezelfde
    // refresh_token → Canva revoket alle tokens. Single-flight in
    // getCanvaAccessToken vangt 't ook af, maar deze warm-up is
    // expliciet bewijs van bedoeling.
    await getCanvaAccessToken().catch(err => {
      console.error('[cron weekly-ads] Canva token warm-up faalde:', err)
      // Niet fatal: als warm-up faalt door bv. invalid_grant zal de
      // eerste candidate daarna alsnog een duidelijke error geven.
    })

    // 4. Verwerk parallel. generateForCandidate vangt eigen errors —
    // Promise.allSettled is hier nog defensieve dubbele zekerheid.
    const results = await Promise.allSettled(
      candidates.map(listing => generateForCandidate(batch.id, weekIso, listing)),
    )

    // 5. Tel + verzamel errors.
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ listing_id: string; error: string }> = []

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.status === 'success') successCount++
        else {
          failedCount++
          errors.push({ listing_id: r.value.listingId, error: r.value.error ?? 'unknown' })
        }
      } else {
        failedCount++
        errors.push({ listing_id: 'unknown', error: errorMessage(r.reason) })
      }
    }

    // 6. Update batch met telling + log.
    await supabase
      .from('ad_batches')
      .update({
        status: 'ready',
        total_candidates: successCount,
        generation_log: {
          attempted: candidates.length,
          success: successCount,
          failed: failedCount,
          duration_ms: Date.now() - startTime,
          errors,
        },
      })
      .eq('id', batch.id)

    // 7. Slack ping (faalt silent als webhook niet gezet is).
    await sendBatchSlackNotification({
      batchId: batch.id,
      weekIso,
      totalAttempted: candidates.length,
      successCount,
      failedCount,
    })

    return NextResponse.json({
      ok: true,
      batch_id: batch.id,
      week_iso: weekIso,
      attempted: candidates.length,
      success: successCount,
      failed: failedCount,
      duration_ms: Date.now() - startTime,
    })
  } catch (err) {
    console.error('[cron weekly-ads] catastrofale fail:', err)
    return NextResponse.json({
      ok: false,
      error: errorMessage(err),
      duration_ms: Date.now() - startTime,
    }, { status: 500 })
  }
}
