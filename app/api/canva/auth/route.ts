// Tijdelijke route voor de eenmalige Canva OAuth flow.
// Genereert PKCE-verifier + CSRF-state, zet ze in cookies en redirect
// naar Canva's autorisatiepagina. Loop hier eenmaal doorheen lokaal
// (http://127.0.0.1:3000/api/canva/auth); de callback slaat de
// refresh_token op in Supabase.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { requireCanvaAdmin } from '@/lib/canva/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireCanvaAdmin()
  if (auth instanceof NextResponse) return auth

  const codeVerifier = crypto.randomBytes(64).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  const state = crypto.randomBytes(32).toString('base64url')

  // Cookies: 10 minuten geldig. secure=true op prod (https), false in dev.
  const isProd = process.env.NODE_ENV === 'production'
  const c = await cookies()
  c.set('canva_pkce_verifier', codeVerifier, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 600, path: '/',
  })
  c.set('canva_oauth_state', state, {
    httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 600, path: '/',
  })

  const scopes = [
    'design:content:read',
    'design:content:write',
    'design:meta:read',
    'asset:read',
    'asset:write',
    'brandtemplate:meta:read',
    'brandtemplate:content:read',
  ].join(' ')

  const clientId = process.env.CANVA_CLIENT_ID
  const redirectUri = process.env.CANVA_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return new NextResponse(
      'CANVA_CLIENT_ID en/of CANVA_REDIRECT_URI ontbreekt in .env.local',
      { status: 500 },
    )
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return NextResponse.redirect(
    `https://www.canva.com/api/oauth/authorize?${params.toString()}`,
  )
}
