import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton — één browser-client per tab. Supabase heeft interne auth
// state-machines en token-refresh timers die racen als er meerdere clients
// in dezelfde tab leven. Alle component-aanroepen krijgen dezelfde instance.
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

  _client = createClient(url, key)
  return _client
}
