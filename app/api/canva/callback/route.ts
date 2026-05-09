// Vangt de redirect van Canva op (?code=... & ?state=...), wisselt de
// auth-code in voor access + refresh tokens en upsert die in
// oauth_tokens (provider='canva'). Eénmalig handmatig doorheen lopen.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return new NextResponse(`Canva fout: ${error}`, { status: 400 })
  }

  const c = await cookies()
  const savedState = c.get('canva_oauth_state')?.value
  const codeVerifier = c.get('canva_pkce_verifier')?.value

  if (!code || !state || state !== savedState) {
    return new NextResponse(
      'Ongeldige state — start opnieuw via /api/canva/auth',
      { status: 400 },
    )
  }
  if (!codeVerifier) {
    return new NextResponse('Verifier verlopen — start opnieuw', { status: 400 })
  }

  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  const redirectUri = process.env.CANVA_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      'CANVA env-variabelen ontbreken in .env.local',
      { status: 500 },
    )
  }

  // Code → tokens. Canva accepteert client-credentials via Basic auth.
  const tokenRes = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const detail = await tokenRes.text()
    return new NextResponse(`Token ruil mislukt: ${detail}`, { status: 500 })
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }

  const supabase = createServiceClient()
  const { error: dbError } = await supabase
    .from('oauth_tokens')
    .upsert({
      provider: 'canva',
      refresh_token: tokens.refresh_token,
      updated_at: new Date().toISOString(),
    })

  if (dbError) {
    return new NextResponse(`DB fout: ${dbError.message}`, { status: 500 })
  }

  c.delete('canva_pkce_verifier')
  c.delete('canva_oauth_state')

  return new NextResponse(
    `<!doctype html>
<html><head><meta charset="utf-8"><title>Canva gekoppeld</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 560px; margin: 60px auto; padding: 0 20px; color: #1B2A28; }
  h1 { color: #004B46; font-size: 22px; margin: 0 0 8px; }
  code { background: #FFFAEF; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #C58118; }
  .ok { color: #0B8474; font-weight: 600; }
</style></head>
<body>
  <h1><span class="ok">✓</span> Canva gekoppeld</h1>
  <p>Refresh token opgeslagen in <code>oauth_tokens</code>. Je kunt dit tabblad sluiten.</p>
  <p style="font-size: 12px; color: #4A5A57;">Scopes: ${tokens.scope}</p>
</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
