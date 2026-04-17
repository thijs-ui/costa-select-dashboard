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

  async function loadUserRole(u: User) {
    // Primair: direct via browser-client (leunt op `read_own_role` RLS-policy).
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role, naam')
        .eq('user_id', u.id)
        .single()
      if (data?.role) {
        setRole(data.role as Role)
        setNaam(data.naam ?? null)
        return
      }
    } catch { /* fall through naar fallback */ }

    // Fallback: /api/users gaat via service-client en bypasst RLS.
    // Voorkomt dat een JWT-timing issue de admin-rol "verliest" op cold start.
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const { users } = await res.json()
        const me = users?.find((x: { id: string }) => x.id === u.id)
        if (me?.role) {
          setRole(me.role as Role)
          setNaam(me.naam ?? null)
        }
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) await loadUserRole(user)
      } catch {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
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

    return () => subscription.unsubscribe()
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
