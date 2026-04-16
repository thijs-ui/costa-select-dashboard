import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client die namens de ingelogde user queryt.
 *
 * - Gebruikt de anon key (GEEN service role).
 * - Leest de sessie uit cookies via @supabase/ssr.
 * - Queries vallen onder RLS — de user krijgt alleen te zien
 *   waar hij via RLS-policies toegang toe heeft.
 *
 * Gebruik dit als standaard in API-routes die namens de user werken.
 * Gebruik `createServiceClient()` (in `lib/supabase.ts`) alleen nog voor
 * system-tasks (crons, webhooks, role-lookups, user-management).
 *
 * Voorbeeld:
 *
 *   const auth = await requireAuth()
 *   if (auth instanceof NextResponse) return auth
 *   const supabase = await createUserClient()
 *   const { data } = await supabase.from('deals').select('*')
 *   // → alleen deals die RLS voor deze user toelaat
 */
export async function createUserClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In route-handlers kunnen cookies bij token-refresh worden gezet.
          // Faal stilletjes in read-only contexten (bv. Server Components).
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            /* read-only context — ok */
          }
        },
      },
    }
  )
}
