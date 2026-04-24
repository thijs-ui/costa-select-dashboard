'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import { AuthProvider } from '@/lib/auth-context'
import { ErrorBoundary } from './error-boundary'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-marble">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-50 bg-deepsea h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/80 text-xl leading-none cursor-pointer"
          >
            ☰
          </button>
          <span className="text-white text-sm font-semibold tracking-wide">COSTA SELECT</span>
        </div>

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="sb-shell-main min-h-screen bg-marble">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
