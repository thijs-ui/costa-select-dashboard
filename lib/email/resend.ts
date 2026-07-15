// Minimale Resend-client via de REST API — geen SDK-dependency nodig.
// Vereist env RESEND_API_KEY (zelfde Resend-account als de website).
// Default afzender via RESEND_FROM; per-call te overrulen met `from`.

interface SendEmailArgs {
  to: string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY ontbreekt' }
  if (!to.length) return { ok: false, error: 'geen ontvangers' }

  const sender = from || process.env.RESEND_FROM || 'Costa Select <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })
    const data = await res.json().catch(() => ({} as { message?: string; id?: string }))
    if (!res.ok) {
      return { ok: false, error: (data as { message?: string }).message || `HTTP ${res.status}` }
    }
    return { ok: true, id: (data as { id?: string }).id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}
