'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Role } from '@/lib/auth/roles'

interface AuthContextType {
  user: User | null
  role: Role | null
  naam: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  naam: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [naam, setNaam] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  // Race-helper: faalt na `ms` als de promise niet eerst resolveert.
  // Voorkomt dat een hangende fetch/query auth-context oneindig blokkeert.
  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`[auth] ${label} timeout after ${ms}ms`)), ms)
      ),
    ])
  }

  async function loadUserRole(_u: User) {
    // Primaire path was: direct via browser-client + `read_own_role` RLS.
    // Bleek 5s+ te hangen (zie commit 5ef1e71 logs). Verwijderd, gaat nu
    // direct via service-client (bypasst RLS, sub-100ms latency).
    // De RLS-policy `read_own_role` op user_roles wordt binnen Supabase
    // nog onderzocht; tot dan is de service-client path de enige.
    try {
      const res = await withTimeout(fetch('/api/users/me'), 5000, '/api/users/me')
      if (res.ok) {
        const me = await res.json()
        if (me?.role) {
          setRole(me.role as Role)
          setNaam(me.naam ?? null)
        }
      }
    } catch (e) {
      console.warn('[auth] /api/users/me failed/timeout:', e)
    }
  }

  useEffect(() => {
    let cancelled = false

    // Watchdog: garandeer dat loading=false na 8s, ongeacht wat hangt.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        console.warn('[auth] watchdog tripped — forcing loading=false na 8s')
        setLoading(false)
      }
    }, 8000)

    async function getUser() {
      console.log('[auth] getUser start')
      try {
        const result = await withTimeout(
          supabase.auth.getUser() as Promise<{ data: { user: User | null } }>,
          6000,
          'getUser'
        )
        const user = result.data.user
        if (cancelled) return
        console.log('[auth] getUser resolved, user=', !!user)
        setUser(user)
        if (user) await loadUserRole(user)
      } catch (e) {
        console.error('[auth] getUser failed:', e)
        if (!cancelled) {
          setUser(null)
          setRole(null)
        }
      } finally {
        if (!cancelled) {
          clearTimeout(watchdog)
          console.log('[auth] setLoading(false)')
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        const currentUser = session?.user ?? null

        // Alleen bij echte sign-in/out het user-object én de rol updaten.
        // TOKEN_REFRESHED en USER_UPDATED raken de rol niet en moeten geen
        // reload van user_roles triggeren (race + flicker).
        if (event === 'SIGNED_OUT' || !currentUser) {
          setUser(null)
          setRole(null)
          setNaam(null)
          return
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setUser(currentUser)
          await loadUserRole(currentUser)
        }
      }
    )

    return () => {
      cancelled = true
      clearTimeout(watchdog)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    setNaam(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, role, naam, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
