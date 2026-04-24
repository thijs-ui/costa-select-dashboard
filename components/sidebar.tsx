'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createBrowserClient } from '@/lib/supabase-browser'
import {
  BookOpen,
  Building2,
  Calculator,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  CreditCard,
  FileText,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  Layers,
  LogOut,
  MapPin,
  MessageSquare,
  Receipt,
  Route,
  Settings,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  badgeKey?: 'todos'
}

interface NavSection {
  key: string
  label: string
  items: NavItem[]
  adminOnly?: boolean
}

const SECTIONS: NavSection[] = [
  {
    key: 'menu',
    label: 'Menu',
    items: [
      { href: '/woningbot', label: 'Woningbot', icon: MessageSquare },
      { href: '/woninglijst', label: 'Woninglijsten', icon: ClipboardList },
      { href: '/bezichtigingen', label: 'Bezichtigingen', icon: Route },
      { href: '/calculators', label: 'Calculators', icon: Calculator },
      { href: '/samenwerkingen', label: 'Samenwerkingen', icon: Building2 },
      { href: '/nieuwbouwkaart', label: 'Nieuwbouwkaart', icon: MapPin },
      { href: '/dossier', label: 'Dossier', icon: FileText },
      { href: '/kennisbank', label: 'Kennisbank', icon: BookOpen },
      { href: '/training', label: 'Training', icon: GraduationCap },
      { href: '/kompas-v2', label: 'Costa Kompas', icon: Compass },
    ],
  },
  {
    key: 'fin',
    label: 'Financieel',
    adminOnly: true,
    items: [
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
    ],
  },
  {
    key: 'mkt',
    label: 'Marketing',
    adminOnly: true,
    items: [
      { href: '/marketing/social-media', label: 'Social Media', icon: MessageSquare },
      { href: '/marketing/advertenties', label: 'Advertenties', icon: Zap },
      { href: '/marketing/website-blog', label: 'Website & Blog', icon: FileText },
      { href: '/marketing/email', label: 'Email', icon: Receipt },
      { href: '/marketing/video', label: 'Video', icon: GraduationCap },
      { href: '/marketing/brochures', label: 'Brochures', icon: BookOpen },
      { href: '/marketing/bibliotheek', label: 'Bibliotheek', icon: ClipboardList },
    ],
  },
  {
    key: 'ops',
    label: 'Operations',
    adminOnly: true,
    items: [
      { href: '/dashboard/todos', label: 'To-do', icon: CheckSquare, badgeKey: 'todos' },
      { href: '/projecten', label: 'Projecten', icon: Layers },
    ],
  },
]

type OpenSections = Record<string, boolean>

function readOpenSections(): OpenSections {
  if (typeof window === 'undefined') return { menu: true, fin: true, mkt: true, ops: true }
  try {
    const raw = localStorage.getItem('cs_sidebar_sections')
    if (!raw) return { menu: true, fin: true, mkt: true, ops: true }
    return JSON.parse(raw) as OpenSections
  } catch {
    return { menu: true, fin: true, mkt: true, ops: true }
  }
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('cs_sidebar_collapsed') === '1'
}

function computeInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '··'
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { role, loading: authLoading, signOut, user, naam } = useAuth()
  const isAdmin = role === 'admin'
  const showAdmin = isAdmin || authLoading

  const [collapsed, setCollapsed] = useState(false)
  const [openSections, setOpenSections] = useState<OpenSections>({
    menu: true,
    fin: true,
    mkt: true,
    ops: true,
  })
  const [todoCount, setTodoCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Hydrate localStorage on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(readCollapsed())
    setOpenSections(readOpenSections())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem('cs_sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem('cs_sidebar_sections', JSON.stringify(openSections))
  }, [openSections, mounted])

  // Todo count polling
  useEffect(() => {
    if (!user) return
    const supabase = createBrowserClient()
    const fetchCount = async () => {
      const { count } = await supabase
        .from('todos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('assigned_to', user.id)
      setTodoCount(count ?? 0)
    }
    void fetchCount()
    const interval = setInterval(() => void fetchCount(), 60000)
    return () => clearInterval(interval)
  }, [user])

  const toggleSection = (key: string) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }))

  const isActive = (href: string): boolean => {
    if (pathname === href) return true
    // Special-case: /dashboard should NOT match /dashboard/anything
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href + '/')
  }

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || showAdmin)
  const initials = computeInitials(naam, user?.email)
  const displayName = naam ?? (user?.email?.split('@')[0] ?? 'Gebruiker')
  const displayEmail = user?.email ?? ''

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${isOpen ? 'is-open' : ''}`}
        aria-label="Hoofdnavigatie"
      >
        {/* Mobile close */}
        <button
          className="sb-mobile-close"
          onClick={onClose}
          aria-label="Sluiten"
          type="button"
        >
          <X size={18} />
        </button>

        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-brand-inner">
            <Image
              src="/brand/beeldmerk-on-deepsea.svg"
              alt="Costa Select"
              width={52}
              height={52}
              priority
            />
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          className="sb-collapse-float"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Uitklappen' : 'Inklappen'}
          aria-label={collapsed ? 'Uitklappen' : 'Inklappen'}
          type="button"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>

        {/* Scroll region */}
        <div className="sb-scroll">
          {visibleSections.map((section, idx) => {
            const open = openSections[section.key] ?? true
            return (
              <div key={section.key} className="sb-section">
                {!collapsed ? (
                  <button
                    className={`sb-sect-label ${open ? 'open' : ''}`}
                    onClick={() => toggleSection(section.key)}
                    aria-expanded={open}
                    type="button"
                  >
                    <span className="sb-sect-text">{section.label}</span>
                    <span className="sb-sect-count">{section.items.length}</span>
                    <span className="sb-sect-chev">
                      <ChevronDown />
                    </span>
                  </button>
                ) : (
                  idx > 0 && <div className="sb-divider" />
                )}
                {(collapsed || open) && (
                  <nav className="sb-nav" aria-label={section.label}>
                    {section.items.map(item => {
                      const active = isActive(item.href)
                      const Icon = item.icon
                      const badge =
                        item.badgeKey === 'todos' && todoCount > 0 ? todoCount : null
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={active ? 'active' : ''}
                          title={collapsed ? item.label : undefined}
                          aria-current={active ? 'page' : undefined}
                          onClick={onClose}
                        >
                          <span className="sb-nav-icon">
                            <Icon />
                          </span>
                          <span className="sb-nav-label">{item.label}</span>
                          {badge != null && <span className="sb-nav-badge">{badge}</span>}
                          {active && <span className="sb-nav-dot" aria-hidden="true" />}
                        </Link>
                      )
                    })}
                  </nav>
                )}
              </div>
            )
          })}
        </div>

        {/* User block */}
        <div className="sb-user">
          <div className="sb-user-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="sb-user-main">
            <div className="sb-user-name">{displayName}</div>
            {displayEmail && <div className="sb-user-mail">{displayEmail}</div>}
          </div>
          <button
            className="sb-user-logout"
            onClick={signOut}
            title="Uitloggen"
            aria-label="Uitloggen"
            type="button"
          >
            <LogOut />
          </button>
        </div>
      </aside>
    </>
  )
}
