'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Compass,
  Handshake,
  CalendarDays,
  Receipt,
  FileText,
  TrendingUp,
  CreditCard,
  Zap,
  Settings,
  MapPin,
  Users,
  Building2,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const platformItems = [
  { href: '/woningbot', label: 'Woningbot', icon: MessageSquare },
  { href: '/kennisbank', label: 'Kennisbank', icon: BookOpen },
  { href: '/training', label: 'Training', icon: GraduationCap },
  { href: '/kompas', label: 'Costa Kompas', icon: Compass },
]

const dashboardItems = [
  { href: '/dashboard', label: 'Overzicht', icon: LayoutDashboard },
  { href: '/dashboard/regios', label: "Regio's & Funnel", icon: MapPin },
  { href: '/dashboard/makelaars', label: 'Consultants', icon: Users },
  { href: '/dashboard/partners', label: 'Partners', icon: Building2 },
  { href: '/dashboard/deals', label: 'Sales', icon: Handshake },
  { href: '/dashboard/afspraken', label: 'Afspraken', icon: CalendarDays },
  { href: '/dashboard/commissies', label: 'Commissies', icon: CreditCard },
  { href: '/dashboard/pl', label: 'P&L', icon: TrendingUp },
  { href: '/dashboard/maandkosten', label: 'Maandkosten', icon: Receipt },
  { href: '/dashboard/bonnen', label: 'Bonnen & facturen', icon: FileText },
  { href: '/dashboard/pipedrive', label: 'Pipedrive', icon: Zap },
  { href: '/dashboard/aannames', label: 'Aannames', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { role, signOut, user } = useAuth()
  const isAdmin = role === 'admin'
  const [dashboardOpen, setDashboardOpen] = useState(pathname.startsWith('/dashboard'))

  function renderNavItem(item: { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }) {
    const { href, label, icon: Icon } = item
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
          isActive
            ? 'font-semibold text-white bg-white/15'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0" />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`w-56 bg-[#004B46] fixed left-0 top-0 bottom-0 z-40 overflow-y-auto flex flex-col transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0`}
      >
        {/* Mobile close */}
        <div className="flex justify-end px-3 pt-3 md:hidden">
          <button onClick={onClose} className="text-white/40 hover:text-white p-1 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Top spacing */}
        <div className="h-6" />

        {/* Platform section */}
        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Menu
          </span>
        </div>
        <nav className="space-y-0.5">
          {platformItems.map(renderNavItem)}
        </nav>

        {/* Dashboard section — admin only */}
        {isAdmin && (
          <>
            <div className="px-4 pt-6 pb-1">
              <button
                onClick={() => setDashboardOpen(!dashboardOpen)}
                className="flex items-center justify-between w-full text-[10px] font-semibold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/60 transition-colors"
              >
                <span>Financieel</span>
                {dashboardOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>
            {dashboardOpen && (
              <nav className="space-y-0.5">
                {dashboardItems.map(renderNavItem)}
              </nav>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          {user && (
            <div className="text-[11px] text-white/40 mb-2 truncate">
              {user.email}
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-[12px] text-white/40 hover:text-white/80 transition-colors cursor-pointer"
          >
            <LogOut size={13} strokeWidth={1.5} />
            <span>Uitloggen</span>
          </button>
        </div>
      </aside>
    </>
  )
}
