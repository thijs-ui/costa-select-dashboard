// Canva OAuth helper — haalt een access-token via de in oauth_tokens
// opgeslagen refresh-token. Canva rouleert refresh-tokens bij elke
// /oauth/token call, dus we slaan het nieuwe token meteen weer op.
// Gebruik je een oud refresh-token nog een keer dan revoken alle tokens —
// dan moet je opnieuw door /api/canva/auth.

import { createServiceClient } from '@/lib/supabase'

// In-memory cache binnen één serverless-invocation. Voorkomt onnodige
// /oauth/token roundtrips als één request meerdere Canva-API-calls doet.
let cached: { token: string; expiresAt: number } | null = null

export async function getCanvaAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('refresh_token')
    .eq('provider', 'canva')
    .single()

  if (error || !data) {
    throw new Error(
      'Geen Canva refresh-token gevonden — log opnieuw in via /api/canva/auth',
    )
  }

  const clientId = process.env.CANVA_CLIENT_ID
  const clientSecret = process.env.CANVA_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('CANVA_CLIENT_ID/CANVA_CLIENT_SECRET ontbreekt in env')
  }

  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(
      `Canva refresh faalde (${res.status}): ${errBody}. Log opnieuw in via /api/canva/auth`,
    )
  }

  const tokens = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }

  // Cruciaal: nieuwe refresh-token direct persisteren. Het oude is nu
  // ongeldig — race-conditions op deze update zijn dus serieuze bugs.
  const { error: updateError } = await supabase
    .from('oauth_tokens')
    .update({
      refresh_token: tokens.refresh_token,
      updated_at: new Date().toISOString(),
    })
    .eq('provider', 'canva')

  if (updateError) {
    throw new Error(
      `Kon nieuwe refresh-token niet opslaan: ${updateError.message}`,
    )
  }

  cached = {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }

  return tokens.access_token
}
