'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/')
    }
  }, [role, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm" style={{ color: '#7A8C8B' }}>Laden...</div>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  return <>{children}</>
}
