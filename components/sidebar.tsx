'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
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
  Filter,
  Building2,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/funnel', label: 'Funnel', icon: Filter },
  { href: '/regios', label: "Regio's", icon: MapPin },
  { href: '/makelaars', label: 'Makelaars', icon: Users },
  { href: '/partners', label: 'Partners', icon: Building2 },
  { href: '/deals', label: 'Sales', icon: Handshake },
  { href: '/afspraken', label: 'Afspraken', icon: CalendarDays },
  { href: '/commissies', label: 'Commissies', icon: CreditCard },
  { href: '/pl', label: 'P&L', icon: TrendingUp },
  { href: '/maandkosten', label: 'Maandkosten', icon: Receipt },
  { href: '/bonnen', label: 'Bonnen & facturen', icon: FileText },
  { href: '/pipedrive', label: 'Pipedrive', icon: Zap },
  { href: '/aannames', label: 'Aannames', icon: Settings },
]

function CostaLogoMark() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" aria-hidden="true">
      {/* Linker voet */}
      <rect x="0" y="13" width="7" height="3" rx="0.5" fill="#F5AF40" transform="rotate(-5 3.5 14.5)" />
      {/* Linker diagonaal */}
      <rect x="3" y="5" width="3" height="9" rx="0.5" fill="#F5AF40" transform="rotate(-35 4.5 9.5)" />
      {/* Midden verticaal */}
      <rect x="10.5" y="2" width="3" height="11" rx="0.5" fill="#F5AF40" />
      {/* Rechter diagonaal */}
      <rect x="17" y="5" width="3" height="9" rx="0.5" fill="#F5AF40" transform="rotate(35 18.5 9.5)" />
      {/* Rechter voet */}
      <rect x="17" y="13" width="7" height="3" rx="0.5" fill="#F5AF40" transform="rotate(5 20.5 14.5)" />
    </svg>
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-[244px] min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{ backgroundColor: '#004B46' }}
    >
      {/* Logo header */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <CostaLogoMark />
          <span
            className="text-white text-[13px] font-semibold uppercase tracking-widest leading-none"
            style={{ fontFamily: 'var(--font-heading, sans-serif)' }}
          >
            COSTA SELECT
          </span>
        </div>
        <div
          className="text-[11px] mt-1.5 ml-[36px]"
          style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body, sans-serif)' }}
        >
          Financieel dashboard
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative"
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-body, sans-serif)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
                }
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                  style={{ backgroundColor: '#F5AF40' }}
                />
              )}
              <Icon size={15} strokeWidth={1.5} className="flex-shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="text-[10px] leading-tight"
          style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-body, sans-serif)' }}
        >
          Premium aankoopmakelaar Spanje
        </div>
      </div>
    </aside>
  )
}
