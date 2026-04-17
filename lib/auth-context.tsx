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
    // Methode 1: browser client (snel, maar kan falen door RLS)
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
    } catch { /* fallback naar methode 2 */ }

    // Methode 2: via API route (service client, altijd betrouwbaar)
    try {
      const res = await fetch('/api/todos/users')
      if (res.ok) {
        const { users } = await res.json()
        const me = users?.find((usr: { id: string }) => usr.id === u.id)
        if (me) {
          setRole((me.role as Role) ?? 'makelaar')
          setNaam(me.naam ?? null)
          return
        }
      }
    } catch { /* ignore */ }

    // Fallback
    setRole('makelaar')
    setNaam(null)
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
      async (_event: any, session: any) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await loadUserRole(currentUser)
        } else {
          setRole(null)
          setNaam(null)
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
