'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import type { Role } from '@/lib/auth/roles'
import { fetchMe } from '@/lib/auth-fetch'

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
  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`[auth] ${label} timeout after ${ms}ms`)), ms)
      ),
    ])
  }

  // Eén centrale role-loader. Frontend gebruikt NOOIT supabase.from('user_roles')
  // direct — alle role/naam data komt via /api/users/me (service-client).
  // Fail-hard: bij elke fetchMe-fout volgt forced logout + redirect.
  async function loadRole() {
    try {
      const me = await withTimeout(fetchMe(), 5000, 'fetchMe')
      setRole(me.role)
      setNaam(me.naam)
    } catch (e) {
      console.error('[auth] critical failure', e)
      setUser(null)
      setRole(null)
      setNaam(null)
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    let cancelled = false
    let bootstrapped = false

    async function bootstrap() {
      console.log('[auth] bootstrap start')
      try {
        const result = await withTimeout(
          supabase.auth.getUser() as Promise<{ data: { user: User | null } }>,
          6000,
          'getUser'
        )
        if (cancelled) return
        const u = result.data.user
        console.log('[auth] getUser resolved, user=', !!u)
        setUser(u)
        if (u) await loadRole()
      } catch (e) {
        console.error('[auth] critical failure', e)
        setUser(null)
        setRole(null)
        setNaam(null)
        await supabase.auth.signOut()
        window.location.href = '/login'
      } finally {
        if (!cancelled) {
          bootstrapped = true
          console.log('[auth] setLoading(false)')
          setLoading(false)
        }
      }
    }

    bootstrap()

    // Reageer alleen op echte sign-in/sign-out events. INITIAL_SESSION fired
    // óók bij mount en zou loadRole dubbel triggeren — bootstrap() doet dat
    // al, dus we negeren INITIAL_SESSION expliciet.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user?: User | null } | null) => {
        if (cancelled) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setRole(null)
          setNaam(null)
          return
        }

        if (event === 'SIGNED_IN') {
          // Skip als bootstrap dit al heeft gedaan voor dezelfde user.
          if (!bootstrapped || session?.user?.id !== user?.id) {
            setUser(session?.user ?? null)
            if (session?.user) await loadRole()
          }
        }
        // TOKEN_REFRESHED / USER_UPDATED / INITIAL_SESSION: niks doen.
      }
    )

    return () => {
      cancelled = true
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
