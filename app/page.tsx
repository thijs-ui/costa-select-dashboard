'use client'

import { useAuth } from '@/lib/auth-context'
import { PageLayout } from '@/components/page-layout'
import { createBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import {
  MessageSquare, BookOpen, GraduationCap, Compass, LayoutDashboard,
  CheckSquare, MapPin, FileText, ArrowRight, Circle, CheckCircle2,
} from 'lucide-react'

const platformCards = [
  { href: '/woningbot', label: 'Woningbot', description: 'Zoek en vergelijk woningen met AI', icon: MessageSquare, accent: '#0EAE96' },
  { href: '/kennisbank', label: 'Kennisbank', description: 'Doorzoek alle Costa Select documentatie', icon: BookOpen, accent: '#004B46' },
  { href: '/training', label: 'Training', description: 'Onboarding en trainingsmateriaal', icon: GraduationCap, accent: '#F5AF40' },
  { href: '/kompas', label: 'Costa Kompas', description: 'Vind de juiste Spaanse regio voor je klant', icon: Compass, accent: '#0EAE96' },
]

interface DashboardData {
  todoCount: number
  todos: Array<{ id: string; description: string; deadline: string | null; created_by: string; status: string }>
  recentDossiers: Array<{ id: string; adres: string; regio: string; vraagprijs: number; created_at: string }>
  nextTrip: { id: string; client_name: string; trip_date: string; status: string; stop_count: number } | null
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

export default function HomePage() {
  const { user, role, naam, loading } = useAuth()
  const supabase = useMemo(() => createBrowserClient(), [])
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [todosRes, dossiersRes, tripsRes] = await Promise.all([
        supabase.from('todos').select('id, description, deadline, created_by, status').eq('status', 'open').eq('assigned_to', user!.id).order('deadline', { ascending: true, nullsFirst: false }).limit(5),
        supabase.from('dossier_history').select('id, adres, regio, vraagprijs, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('viewing_trips').select('id, client_name, trip_date, status, viewing_stops(id)').gte('trip_date', new Date().toISOString().split('T')[0]).order('trip_date', { ascending: true }).limit(1),
      ])

      const trips = (tripsRes.data ?? []) as Array<{ id: string; client_name: string; trip_date: string; status: string; viewing_stops: Array<{ id: string }> }>

      setData({
        todoCount: todosRes.data?.length ?? 0,
        todos: (todosRes.data ?? []) as DashboardData['todos'],
        recentDossiers: (dossiersRes.data ?? []) as DashboardData['recentDossiers'],
        nextTrip: trips[0] ? { id: trips[0].id, client_name: trips[0].client_name, trip_date: trips[0].trip_date, status: trips[0].status, stop_count: trips[0].viewing_stops?.length ?? 0 } : null,
      })
    }
    load()
  }, [user, supabase])

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-400">Laden...</div>
        </div>
      </PageLayout>
    )
  }

  const firstName = naam ?? user?.email?.split('@')[0] ?? ''

  return (
    <PageLayout
      title={`${getGreeting()}, ${firstName}`}
      subtitle="Jouw overzicht van het Costa Select platform"
    >
      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/dashboard/todos" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <CheckSquare size={18} className="text-rose-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{data.todoCount}</div>
                <div className="text-xs text-slate-500">Openstaande taken</div>
              </div>
            </div>
          </Link>

          {data.nextTrip && (
            <Link href={`/bezichtigingen/${data.nextTrip.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MapPin size={18} className="text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{data.nextTrip.client_name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(data.nextTrip.trip_date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })} — {data.nextTrip.stop_count} woningen
                  </div>
                </div>
              </div>
            </Link>
          )}

          <Link href="/dossier" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileText size={18} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{data.recentDossiers.length}</div>
                <div className="text-xs text-slate-500">Recente dossiers</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {platformCards.map(({ href, label, description, icon: Icon, accent }) => (
          <Link key={href} href={href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${accent}12` }}>
              <Icon size={20} style={{ color: accent }} strokeWidth={1.5} />
            </div>
            <h2 className="font-heading font-bold text-base text-[#004B46] mb-1.5 group-hover:text-[#0A6B63] transition-colors">{label}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
          </Link>
        ))}

        {role === 'admin' && (
          <Link href="/dashboard"
            className="bg-white rounded-2xl border-2 border-[#F5AF40]/30 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-[#F5AF40]/10">
              <LayoutDashboard size={20} className="text-[#F5AF40]" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading font-bold text-base text-[#004B46] mb-1.5 group-hover:text-[#0A6B63] transition-colors">Financieel Dashboard</h2>
            <p className="text-sm text-gray-500 leading-relaxed">Omzet, commissies en rapportages</p>
          </Link>
        )}
      </div>

      {/* Twee-kolom: To-do's + Laatste dossiers */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Openstaande to-do's */}
          {data.todos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Openstaande taken</h3>
                <Link href="/dashboard/todos" className="text-xs text-[#004B46] hover:underline flex items-center gap-1">
                  Alle taken <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {data.todos.map(todo => (
                  <div key={todo.id} className="flex items-start gap-2 py-1.5">
                    <Circle size={16} className="text-slate-300 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate">{todo.description}</p>
                      {todo.deadline && (
                        <p className={`text-[10px] ${new Date(todo.deadline) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                          {new Date(todo.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Laatste dossiers */}
          {data.recentDossiers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Laatste dossiers</h3>
                <Link href="/dossier" className="text-xs text-[#004B46] hover:underline flex items-center gap-1">
                  Alle dossiers <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {data.recentDossiers.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#004B46] truncate">{d.adres}</p>
                      <p className="text-[10px] text-slate-400">{d.regio} — {new Date(d.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {d.vraagprijs > 0 && (
                      <span className="text-xs text-slate-500 shrink-0 ml-3">€ {Number(d.vraagprijs).toLocaleString('nl-NL')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  )
}
