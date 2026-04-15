import { createClient } from '@supabase/supabase-js'

export function createBotsClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.BOTS_SUPABASE_URL!,
    process.env.BOTS_SUPABASE_SERVICE_ROLE_KEY!
  )
}
