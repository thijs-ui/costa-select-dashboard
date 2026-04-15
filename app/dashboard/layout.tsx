'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, loading, user } = useAuth()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (role !== 'admin') {
      router.push('/')
      return
    }
    setChecked(true)
  }, [role, loading, user, router])

  if (loading || !checked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm" style={{ color: '#7A8C8B' }}>Laden...</div>
      </div>
    )
  }

  return <>{children}</>
}
