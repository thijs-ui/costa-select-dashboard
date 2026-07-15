import { NextResponse } from 'next/server'
import { createBotsClient } from '@/lib/supabase-bots'
import { logSecurity } from '@/lib/logger'
import { sendEmail } from '@/lib/email/resend'

export const maxDuration = 60

// Dagelijkse melding: nieuwe nieuwbouwprojecten in Costa del Sol die sinds de
// vorige run (venster van LOOKBACK_HOURS) op de kaart zijn verschenen. Stateless:
// de cron draait 1×/dag, dus een venster van 24u pakt elk project precies één keer.
// Bewust ontkoppeld van de ingestion — dit 'kijkt' alleen naar de listings-tabel.
const ALERT_REGION = 'Costa del Sol'
const LOOKBACK_HOURS = 24
const MAX_PROJECTS = 200

interface AlertProject {
  id: string
  title: string | null
  municipality: string | null
  region: string | null
  province: string | null
  price: number | null
  property_type: string | null
  url: string | null
  main_image_url: string | null
  first_seen_at: string | null
}

function fmtEUR(n: number | null): string {
  if (n == null || !isFinite(n) || n <= 0) return 'Prijs op aanvraag'
  return '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

function buildHtml(projects: AlertProject[], mapUrl: string | null): string {
  const rows = projects.map(p => {
    const loc = [p.municipality, p.region].filter(Boolean).map(esc).join(' · ')
    const cta = p.url
      ? `<a href="${esc(p.url)}" style="color:#004B46;font-weight:600;text-decoration:underline;">Bekijk listing →</a>`
      : ''
    const thumb = p.main_image_url
      ? `<td width="84" valign="top" style="padding:14px 0 14px 16px;border-bottom:1px solid #E5E0D2;">
           <img src="${esc(p.main_image_url)}" width="72" height="72" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px;display:block;border:1px solid #E5E0D2;" />
         </td>`
      : ''
    return `
      <tr>
        ${thumb}
        <td valign="top" style="padding:14px 16px;border-bottom:1px solid #E5E0D2;">
          <div style="font-family:Georgia,serif;font-size:16px;font-weight:700;color:#004B46;letter-spacing:-0.01em;">${esc(p.title) || 'Nieuwbouwproject'}</div>
          <div style="font-size:12px;color:#7A8C8B;margin-top:3px;">${loc}${p.property_type ? ' · ' + esc(p.property_type) : ''}</div>
          <div style="font-size:14px;color:#C58118;font-weight:700;margin-top:6px;">${fmtEUR(p.price)}</div>
          <div style="font-size:12px;margin-top:6px;">${cta}</div>
        </td>
      </tr>`
  }).join('')

  const mapBtn = mapUrl
    ? `<div style="text-align:center;padding:8px 0 4px;">
         <a href="${esc(mapUrl)}/nieuwbouwkaart" style="display:inline-block;background:#004B46;color:#FFFAEF;font-size:13px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:8px;">Open de nieuwbouwkaart</a>
       </div>`
    : ''

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F4EDDD;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EDDD;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#FFFAEF;border-radius:14px;overflow:hidden;border:1px solid #E5E0D2;">
        <tr><td style="background:#004B46;padding:22px 24px;">
          <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#F5AF40;">Costa Select · Nieuwbouwkaart</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#FFFAEF;margin-top:6px;letter-spacing:-0.01em;">${projects.length} nieuw${projects.length === 1 ? '' : 'e'} project${projects.length === 1 ? '' : 'en'} in ${esc(ALERT_REGION)}<span style="color:#F5AF40;">.</span></div>
        </td></tr>
        <tr><td style="padding:8px 8px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">${rows}</table>
        </td></tr>
        ${mapBtn ? `<tr><td style="padding:8px 16px 20px;">${mapBtn}</td></tr>` : ''}
        <tr><td style="padding:14px 24px 20px;border-top:1px solid #E5E0D2;">
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#8A9794;line-height:1.5;">Automatische melding vanuit het Costa Select dashboard. Alleen nieuwe projecten in ${esc(ALERT_REGION)} van de afgelopen 24 uur.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function GET(request: Request) {
  // Vercel Cron stuurt `Authorization: Bearer ${CRON_SECRET}`. Fail-closed.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logSecurity({ action: 'auth_failure', path: '/api/cron/nieuwbouw-alert', reason: 'invalid_cron_secret' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recipients = (process.env.NIEUWBOUW_ALERT_RECIPIENTS || 'thijs@costaselect.com,ed.bouterse@costaselect.com')
    .split(',').map(s => s.trim()).filter(Boolean)
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Geen ontvangers geconfigureerd (NIEUWBOUW_ALERT_RECIPIENTS)' }, { status: 500 })
  }

  // Test-modus (?test=1): negeer het 24u-venster, pak de recentste projecten en
  // stuur altijd — zodat je de mail kunt controleren zonder op een nieuwe sync
  // te wachten. Vereist nog steeds de CRON_SECRET-auth hierboven.
  const isTest = new URL(request.url).searchParams.get('test') === '1'

  const supabase = createBotsClient()
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString()

  let query = supabase
    .from('listings')
    .select('id, title, municipality, region, province, price, property_type, url, main_image_url, first_seen_at')
    .eq('is_active', true)
    .ilike('region', ALERT_REGION)
  if (!isTest) query = query.gte('first_seen_at', cutoff)
  const { data, error } = await query
    .order('first_seen_at', { ascending: false })
    .limit(isTest ? 6 : MAX_PROJECTS)

  if (error) {
    console.error('[nieuwbouw-alert] listings query failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data ?? []) as AlertProject[]
  // Buiten test-modus: niets sturen als er geen nieuwe projecten zijn.
  if (projects.length === 0 && !isTest) {
    return NextResponse.json({ ok: true, count: 0, message: 'Geen nieuwe projecten' })
  }

  const mapUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? null
  const html = buildHtml(projects, mapUrl)
  const subject = (isTest ? '[TEST] ' : '') +
    `${projects.length} nieuw${projects.length === 1 ? '' : 'e'} nieuwbouwproject${projects.length === 1 ? '' : 'en'} — ${ALERT_REGION}`
  const from = process.env.NIEUWBOUW_ALERT_FROM || process.env.RESEND_FROM || 'Costa Select <nieuwbouw@costaselect.com>'

  const sent = await sendEmail({ to: recipients, subject, html, from })
  if (!sent.ok) {
    console.error('[nieuwbouw-alert] email failed:', sent.error)
    return NextResponse.json({ error: sent.error, count: projects.length }, { status: 500 })
  }

  console.log(`[nieuwbouw-alert] ${projects.length} nieuwe projecten gemaild naar ${recipients.length} ontvanger(s)`)
  return NextResponse.json({ ok: true, count: projects.length, recipients: recipients.length, emailId: sent.id })
}
