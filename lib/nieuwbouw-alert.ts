import { createBotsClient } from '@/lib/supabase-bots'
import { sendEmail } from '@/lib/email/resend'

// Gedeelde logica voor de nieuwbouw-melding, gebruikt door zowel de dagelijkse
// cron (/api/cron/nieuwbouw-alert) als de sessie-geauthenticeerde test-trigger
// (/api/nieuwbouw/alert-test). Bewust ontkoppeld van de ingestion — kijkt alleen
// naar de listings-tabel.
export const ALERT_REGION = 'Costa del Sol'
const LOOKBACK_HOURS = 24
const MAX_PROJECTS = 200
const TEST_PROJECTS = 6

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

export interface AlertResult {
  ok: boolean
  count: number
  test: boolean
  recipients?: number
  emailId?: string
  message?: string
  error?: string
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

function recipients(): string[] {
  return (process.env.NIEUWBOUW_ALERT_RECIPIENTS || 'thijs@costaselect.com,ed.bouterse@costaselect.com')
    .split(',').map(s => s.trim()).filter(Boolean)
}

function buildHtml(projects: AlertProject[], mapUrl: string | null, test: boolean): string {
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

  const empty = projects.length === 0
    ? `<tr><td style="padding:18px 16px;font-family:Arial,sans-serif;font-size:13px;color:#7A8C8B;">Geen projecten gevonden — dit is een testbericht om de opmaak en bezorging te controleren.</td></tr>`
    : ''

  const mapBtn = mapUrl
    ? `<div style="text-align:center;padding:8px 0 4px;">
         <a href="${esc(mapUrl)}/nieuwbouwkaart" style="display:inline-block;background:#004B46;color:#FFFAEF;font-size:13px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:8px;">Open de nieuwbouwkaart</a>
       </div>`
    : ''

  const headline = test
    ? `Test — nieuwbouwmelding ${esc(ALERT_REGION)}`
    : `${projects.length} nieuw${projects.length === 1 ? '' : 'e'} project${projects.length === 1 ? '' : 'en'} in ${esc(ALERT_REGION)}`

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F4EDDD;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EDDD;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#FFFAEF;border-radius:14px;overflow:hidden;border:1px solid #E5E0D2;">
        <tr><td style="background:#004B46;padding:22px 24px;">
          <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#F5AF40;">Costa Select · Nieuwbouwkaart</div>
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#FFFAEF;margin-top:6px;letter-spacing:-0.01em;">${headline}<span style="color:#F5AF40;">.</span></div>
        </td></tr>
        <tr><td style="padding:8px 8px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">${rows}${empty}</table>
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

// Draait de melding: query listings → bouw digest → verstuur via Resend.
// test=true negeert het 24u-venster (recentste projecten) en stuurt altijd.
export async function runNieuwbouwAlert({ test }: { test: boolean }): Promise<AlertResult> {
  const to = recipients()
  if (to.length === 0) {
    return { ok: false, count: 0, test, error: 'Geen ontvangers geconfigureerd (NIEUWBOUW_ALERT_RECIPIENTS)' }
  }

  const supabase = createBotsClient()
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString()

  let query = supabase
    .from('listings')
    .select('id, title, municipality, region, province, price, property_type, url, main_image_url, first_seen_at')
    .eq('is_active', true)
    .ilike('region', ALERT_REGION)
  if (!test) query = query.gte('first_seen_at', cutoff)
  const { data, error } = await query
    .order('first_seen_at', { ascending: false })
    .limit(test ? TEST_PROJECTS : MAX_PROJECTS)

  if (error) {
    console.error('[nieuwbouw-alert] listings query failed:', error)
    return { ok: false, count: 0, test, error: error.message }
  }

  const projects = (data ?? []) as AlertProject[]
  // Buiten test-modus: niets sturen als er geen nieuwe projecten zijn.
  if (projects.length === 0 && !test) {
    return { ok: true, count: 0, test, message: 'Geen nieuwe projecten' }
  }

  const mapUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? null
  const html = buildHtml(projects, mapUrl, test)
  const subject = (test ? '[TEST] ' : '') +
    `${projects.length} nieuw${projects.length === 1 ? '' : 'e'} nieuwbouwproject${projects.length === 1 ? '' : 'en'} — ${ALERT_REGION}`
  const from = process.env.NIEUWBOUW_ALERT_FROM || process.env.RESEND_FROM || 'Costa Select <nieuwbouw@costaselect.com>'

  const sent = await sendEmail({ to, subject, html, from })
  if (!sent.ok) {
    console.error('[nieuwbouw-alert] email failed:', sent.error)
    return { ok: false, count: projects.length, test, error: sent.error }
  }

  console.log(`[nieuwbouw-alert] ${projects.length} projecten gemaild naar ${to.length} ontvanger(s)${test ? ' (test)' : ''}`)
  return { ok: true, count: projects.length, test, recipients: to.length, emailId: sent.id }
}
