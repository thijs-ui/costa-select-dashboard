import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

let _client: AnyClient | null = null

function getClient(): AnyClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase env-vars ontbreken (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = createClient<any>(url, key)
  return _client
}

// Lazy proxy: de client wordt pas aangemaakt bij eerste property-access,
// niet bij module-load. Zo faalt een build niet als een pagina deze module
// per ongeluk in de tree heeft maar geen Supabase-call doet tijdens prerender.
export const supabase = new Proxy({} as AnyClient, {
  get(_, prop) {
    const c = getClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (c as any)[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Service client env-vars ontbreken (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)'
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key)
}
