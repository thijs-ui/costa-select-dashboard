import { createBotsClient } from '@/lib/supabase-bots'
import { sendEmail } from '@/lib/email/resend'

// Gedeelde logica voor de nieuwbouw-melding, gebruikt door zowel de wekelijkse
// cron (/api/cron/nieuwbouw-alert) als de sessie-geauthenticeerde test-trigger
// (/api/nieuwbouw/alert-test). Bewust ontkoppeld van de ingestion — kijkt alleen
// naar de listings-tabel. Per regio één digest naar de eigen ontvangers.
//
// LET OP: de ingestion-pipeline (Apify → listings) draait WEKELIJKS op ZONDAG
// (repo costa-select-nieuwbouw, .github/workflows/pipeline.yml). De alert draait
// daarom maandagochtend (0 7 * * 1 = 09:00 NL), ná de zondag-run, met een 7-daags
// venster zodat de volledige weekbatch precies één keer wordt gemeld — een
// dagelijks 24u-venster miste de batch omdat projecten maar ~1 dag 'vers' zijn.
const LOOKBACK_HOURS = 168 // 7 dagen
const MAX_PROJECTS = 200
const TEST_PROJECTS = 6
const SELECT_COLS = 'id, property_code, title, municipality, region, province, price, property_type, url, main_image_url, first_seen_at'

// Regio → ontvangers. `region` moet exact matchen met listings.region (zie de
// dashboard REGION_ORDER). Per regio te overrulen met env
// NIEUWBOUW_ALERT_RECIPIENTS_<SLUG> (bv. NIEUWBOUW_ALERT_RECIPIENTS_VALENCIA),
// anders geldt de default hieronder.
export interface RegionAlert {
  region: string
  recipients: string[]
}

export const REGION_ALERTS: RegionAlert[] = [
  { region: 'Costa del Sol',      recipients: ['thijs@costaselect.com', 'ed.bouterse@costaselect.com'] },
  { region: 'Costa Blanca Noord', recipients: ['denise@costaselect.com', 'thijs@costaselect.com', 'danielle@costaselect.com'] },
  { region: 'Valencia',           recipients: ['thijs@costaselect.com'] },
]

type BotsClient = ReturnType<typeof createBotsClient>

interface AlertProject {
  id: string
  property_code: string | null
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

export interface RegionResult {
  region: string
  ok: boolean
  count: number
  recipients?: number
  emailId?: string
  message?: string
  error?: string
}

export interface AlertRunResult {
  ok: boolean
  test: boolean
  regions: RegionResult[]
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

// Env-key per regio: uppercase, accenten weg, niet-alfanumeriek → underscore.
function envSlug(region: string): string {
  return region.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function resolveRecipients(cfg: RegionAlert): string[] {
  const envVal = process.env[`NIEUWBOUW_ALERT_RECIPIENTS_${envSlug(cfg.region)}`]
  const raw = envVal && envVal.trim() ? envVal : cfg.recipients.join(',')
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function buildHtml(projects: AlertProject[], mapUrl: string | null, test: boolean, region: string): string {
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
          ${p.property_code ? `<div style="font-size:11px;color:#8A9794;margin-top:5px;">Code: <span style="font-family:'Courier New',monospace;color:#4A5A57;">${esc(p.property_code)}</span></div>` : ''}
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
    ? `Test — nieuwbouwmelding ${esc(region)}`
    : `${projects.length} nieuw${projects.length === 1 ? '' : 'e'} project${projects.length === 1 ? '' : 'en'} in ${esc(region)}`

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
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#8A9794;line-height:1.5;">Automatische wekelijkse melding vanuit het Costa Select dashboard. Nieuwe projecten in ${esc(region)} van de afgelopen week.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// Eén regio: query listings → bouw digest → verstuur naar de regio-ontvangers.
// test=true negeert het 24u-venster (recentste projecten) en stuurt altijd.
async function runRegionAlert(
  cfg: RegionAlert, test: boolean, supabase: BotsClient, mapUrl: string | null, from: string,
  overrideTo?: string[],
): Promise<RegionResult> {
  // overrideTo (test-trigger) → alleen naar de tester, niet de echte teams.
  const to = overrideTo && overrideTo.length ? overrideTo : resolveRecipients(cfg)
  if (to.length === 0) {
    return { region: cfg.region, ok: false, count: 0, error: 'Geen ontvangers geconfigureerd' }
  }

  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString()
  let query = supabase
    .from('listings')
    .select(SELECT_COLS)
    .eq('is_active', true)
    .ilike('region', cfg.region)
  if (!test) query = query.gte('first_seen_at', cutoff)
  const { data, error } = await query
    .order('first_seen_at', { ascending: false })
    .limit(test ? TEST_PROJECTS : MAX_PROJECTS)

  if (error) {
    console.error(`[nieuwbouw-alert] query failed (${cfg.region}):`, error)
    return { region: cfg.region, ok: false, count: 0, error: error.message }
  }

  const projects = (data ?? []) as AlertProject[]
  // Buiten test-modus: niets sturen als er geen nieuwe projecten zijn.
  if (projects.length === 0 && !test) {
    return { region: cfg.region, ok: true, count: 0, message: 'Geen nieuwe projecten' }
  }

  const html = buildHtml(projects, mapUrl, test, cfg.region)
  const subject = (test ? '[TEST] ' : '') +
    `${projects.length} nieuw${projects.length === 1 ? '' : 'e'} nieuwbouwproject${projects.length === 1 ? '' : 'en'} — ${cfg.region}`

  const sent = await sendEmail({ to, subject, html, from })
  if (!sent.ok) {
    console.error(`[nieuwbouw-alert] email failed (${cfg.region}):`, sent.error)
    return { region: cfg.region, ok: false, count: projects.length, error: sent.error }
  }

  console.log(`[nieuwbouw-alert] ${cfg.region}: ${projects.length} projecten → ${to.length} ontvanger(s)${test ? ' (test)' : ''}`)
  return { region: cfg.region, ok: true, count: projects.length, recipients: to.length, emailId: sent.id }
}

// Draait de melding voor álle geconfigureerde regio's (elk een eigen digest).
// overrideTo: stuur alle regio-digests naar dit adres i.p.v. de echte teams
// (gebruikt door de test-trigger zodat testen collega's niet lastigvalt).
export async function runNieuwbouwAlert(
  { test, overrideTo }: { test: boolean; overrideTo?: string[] },
): Promise<AlertRunResult> {
  const supabase = createBotsClient()
  const mapUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? null
  const from = process.env.NIEUWBOUW_ALERT_FROM || process.env.RESEND_FROM || 'Costa Select <nieuwbouw@costaselect.com>'

  const regions: RegionResult[] = []
  for (const cfg of REGION_ALERTS) {
    regions.push(await runRegionAlert(cfg, test, supabase, mapUrl, from, overrideTo))
  }
  return { ok: regions.every(r => r.ok), test, regions }
}
