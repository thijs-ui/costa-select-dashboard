'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

type Role = 'admin' | 'consultant'

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
  const supabase = createClient()

  async function loadUserRole(u: User) {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role, naam')
        .eq('user_id', u.id)
        .single()
      setRole(data?.role ?? 'consultant')
      setNaam(data?.naam ?? null)
    } catch {
      setRole('consultant')
      setNaam(null)
    }
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
      async (_event, session) => {
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
