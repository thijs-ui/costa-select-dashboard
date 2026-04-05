'use client'

import { useAuth } from '@/lib/auth-context'
import { PageLayout } from '@/components/page-layout'
import Link from 'next/link'
import {
  MessageSquare,
  BookOpen,
  GraduationCap,
  Compass,
  LayoutDashboard,
} from 'lucide-react'

const platformCards = [
  {
    href: '/woningbot',
    label: 'Woningbot',
    description: 'Zoek en vergelijk woningen met AI',
    icon: MessageSquare,
    accent: '#0EAE96',
  },
  {
    href: '/kennisbank',
    label: 'Kennisbank',
    description: 'Doorzoek alle Costa Select documentatie',
    icon: BookOpen,
    accent: '#004B46',
  },
  {
    href: '/training',
    label: 'Training',
    description: 'Onboarding en trainingsmateriaal',
    icon: GraduationCap,
    accent: '#F5AF40',
  },
  {
    href: '/kompas',
    label: 'Costa Kompas',
    description: 'Vind de juiste Spaanse regio voor je klant',
    icon: Compass,
    accent: '#0EAE96',
  },
]

export default function HomePage() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-400">Laden...</div>
        </div>
      </PageLayout>
    )
  }

  const firstName = user?.email?.split('@')[0] || ''

  return (
    <PageLayout
      title={`Welkom, ${firstName}`}
      subtitle="Jouw overzicht van het Costa Select platform"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformCards.map(({ href, label, description, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${accent}12` }}
            >
              <Icon size={20} style={{ color: accent }} strokeWidth={1.5} />
            </div>
            <h2 className="font-heading font-bold text-base text-[#004B46] mb-1.5 group-hover:text-[#0A6B63] transition-colors">
              {label}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
          </Link>
        ))}

        {role === 'admin' && (
          <Link
            href="/dashboard"
            className="bg-white rounded-2xl border-2 border-[#F5AF40]/30 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[#F5AF40]/10">
              <LayoutDashboard size={20} className="text-[#F5AF40]" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading font-bold text-base text-[#004B46] mb-1.5 group-hover:text-[#0A6B63] transition-colors">
              Financieel Dashboard
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Omzet, commissies en rapportages
            </p>
          </Link>
        )}
      </div>
    </PageLayout>
  )
}
