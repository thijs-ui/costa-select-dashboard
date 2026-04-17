import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase-browser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any>

// Top-level `supabase` export — gebruikt door 31 client-components.
// Delegeert naar de gedeelde singleton uit lib/supabase-browser.ts zodat
// pagina's dezelfde cookie-gebaseerde sessie zien als auth-context én
// server-side API-routes. Lazy proxy: client wordt pas aangemaakt bij
// eerste property-access (geen crash bij module-load op server).
export const supabase = new Proxy({} as AnyClient, {
  get(_, prop) {
    const c = createBrowserClient()
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
