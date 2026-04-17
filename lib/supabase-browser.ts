import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton — één browser-client per tab om racing auth state te voorkomen.
// Gebruikt @supabase/ssr zodat de sessie óók als cookie wordt opgeslagen;
// server-side API-routes (die uit cookies lezen via createServerClient) zien
// daardoor dezelfde sessie. Met @supabase/supabase-js zat sessie alleen in
// localStorage → server zag de user als anon → 401 op elke protected route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any> | null = null

export function createBrowserClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return null as any
  }

  _client = createSsrBrowserClient(url, key)
  return _client
}
