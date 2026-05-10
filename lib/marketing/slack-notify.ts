// Slack-notificatie voor de wekelijkse ad-batch. Rapporteert succes,
// gedeeltelijke fail of volledige fail met juiste emoji + kleur, en
// mention't Thijs alleen bij volledige fail (zodat hij een Slack push
// krijgt — partial fail is review-werk, niet pager-werk).

interface NotifyParams {
  batchId: string
  weekIso: string
  totalAttempted: number
  successCount: number
  failedCount: number
}

export async function sendBatchSlackNotification(params: NotifyParams): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_MARKETING_IDEEEN
  if (!webhook) {
    console.warn('[slack] SLACK_WEBHOOK_MARKETING_IDEEEN ontbreekt, skip notificatie')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://costa-select-dashboard.vercel.app'
  const reviewUrl = `${appUrl}/marketing/weekbatch/${params.batchId}`

  const isFullFailure = params.failedCount === params.totalAttempted && params.totalAttempted > 0
  const isPartial = params.failedCount > 0 && params.successCount > 0

  // Mention Thijs alleen bij volledige fail — anders push-spam.
  const userIdThijs = process.env.SLACK_USER_ID_THIJS
  const mentionPrefix = isFullFailure && userIdThijs ? `<@${userIdThijs}> ` : ''

  let emoji: string, color: string, title: string, subtitle: string
  if (isFullFailure) {
    emoji = '🚨'
    color = '#C73E1D'
    title = `Wekelijkse ad-batch volledig gefaald (week ${params.weekIso})`
    subtitle = `Alle ${params.totalAttempted} generaties faalden. Check de generation_log voor details.`
  } else if (isPartial) {
    emoji = '⚠️'
    color = '#F5AF40'
    title = `${params.successCount}/${params.totalAttempted} ads klaar (week ${params.weekIso})`
    subtitle = `${params.failedCount} listings geskipt of gefaald — zie review pagina.`
  } else if (params.totalAttempted === 0) {
    emoji = '🤷'
    color = '#8A9794'
    title = `Wekelijkse ad-batch heeft 0 kandidaten (week ${params.weekIso})`
    subtitle = 'Geen listings gevonden in Bots-DB die voldoen aan de filters.'
  } else {
    emoji = '🎉'
    color = '#0EAE96'
    title = `${params.successCount} ads klaar voor review (week ${params.weekIso})`
    subtitle = 'Alles succesvol gegenereerd.'
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} ${title}`,
        attachments: [{
          color,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `${mentionPrefix}*${emoji} ${title}*\n${subtitle}` },
            },
            {
              type: 'actions',
              elements: [{
                type: 'button',
                text: { type: 'plain_text', text: 'Open review pagina' },
                url: reviewUrl,
                style: 'primary',
              }],
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error(`[slack] webhook faalde ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    // Slack-fail mag de cron niet meeslepen — log en swallow
    console.error('[slack] webhook gooide error:', err)
  }
}
