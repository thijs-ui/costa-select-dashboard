'use client'

import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/page-layout'
import { useAuth } from '@/lib/auth-context'
import { Plus, Layers, CheckSquare, Pin, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string | null
  target_date: string | null
  status: string
  color: string
  done: number
  total: number
  weekFocus: number
  currentPhase: string | null
  estimatedDate: string | null
  velocityPerWeek: number | null
}

const STATUS_COLORS: Record<string, string> = {
  actief: 'bg-emerald-500',
  'on hold': 'bg-blue-400',
  afgerond: 'bg-slate-400',
}

export default function ProjectenPage() {
  const { user, naam } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; naam: string | null; email: string }>>([])

  useEffect(() => {
    async function load() {
      const [projRes, usersRes] = await Promise.all([
        fetch('/api/projecten'),
        fetch('/api/todos/users'),
      ])
      if (projRes.ok) setProjects(await projRes.json())
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function createProject() {
    setCreating(true)
    const res = await fetch('/api/projecten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nieuw project', owner_id: user?.id }),
    })
    if (res.ok) {
      const proj = await res.json()
      router.push(`/projecten/${proj.id}`)
    }
    setCreating(false)
  }

  function getUserName(id: string | null) {
    if (!id) return '—'
    const u = users.find(u => u.id === id)
    return u?.naam ?? u?.email ?? '—'
  }

  function getStatusInfo(p: Project) {
    if (p.status === 'on hold') return { label: 'On hold', color: 'text-blue-600' }
    if (p.status === 'afgerond') return { label: 'Afgerond', color: 'text-slate-500' }
    if (!p.target_date) return { label: p.estimatedDate ? `Geschat: ${fmtDate(p.estimatedDate)}` : '', color: 'text-slate-500' }
    const deadline = new Date(p.target_date)
    const now = new Date()
    if (deadline < now && p.done < p.total) return { label: 'Deadline verstreken', color: 'text-red-600' }
    if (p.estimatedDate && new Date(p.estimatedDate) > deadline) return { label: 'Loopt achter', color: 'text-amber-600' }
    return { label: 'Op schema', color: 'text-emerald-600' }
  }

  const active = projects.filter(p => p.status === 'actief')
  const other = projects.filter(p => p.status !== 'actief')
  const weekFocusTotal = projects.reduce((sum, p) => sum + p.weekFocus, 0)

  if (loading) return <PageLayout title="Projecten"><div className="text-slate-400 text-sm">Laden...</div></PageLayout>

  return (
    <PageLayout title="Projecten" subtitle="Strategisch overzicht van alle projecten">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Layers size={18} className="text-emerald-500" /></div>
            <div><div className="text-2xl font-bold text-slate-900">{active.length}</div><div className="text-xs text-slate-500">Actieve projecten</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Pin size={18} className="text-amber-500" /></div>
            <div><div className="text-2xl font-bold text-slate-900">{weekFocusTotal}</div><div className="text-xs text-slate-500">Focus deze week</div></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><CheckSquare size={18} className="text-blue-500" /></div>
            <div><div className="text-2xl font-bold text-slate-900">{projects.reduce((s, p) => s + p.done, 0)}</div><div className="text-xs text-slate-500">Taken afgerond</div></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Actieve projecten</h2>
        <button onClick={createProject} disabled={creating}
          className="bg-[#004B46] text-[#FFFAEF] font-medium px-4 py-2.5 rounded-xl hover:bg-[#0A6B63] flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Project toevoegen
        </button>
      </div>

      {/* Project cards */}
      <div className="space-y-4">
        {active.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Layers size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-400 text-sm">Nog geen actieve projecten</p>
          </div>
        )}
        {active.map(p => {
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
          const statusInfo = getStatusInfo(p)
          return (
            <Link key={p.id} href={`/projecten/${p.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
              style={{ borderLeftWidth: 4, borderLeftColor: p.color }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[p.status]}`} />
                    <h3 className="text-base font-bold text-[#004B46]">{p.name}</h3>
                  </div>
                  {p.description && <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{getUserName(p.owner_id)}</span>
              </div>

              {p.currentPhase && <p className="text-xs text-slate-500 mb-2">Huidige fase: <span className="font-medium text-[#004B46]">{p.currentPhase}</span></p>}

              {/* Voortgangsbalk */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums w-10 text-right">{pct}%</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{p.done} afgerond · {p.total - p.done} open</span>
                {p.weekFocus > 0 && <span className="text-amber-600">{p.weekFocus} deze week</span>}
                {p.target_date && <span>Deadline: {fmtDate(p.target_date)}</span>}
                {statusInfo.label && <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>}
              </div>
            </Link>
          )
        })}

        {/* Andere projecten */}
        {other.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-500 mt-6">Overige projecten</h2>
            {other.map(p => (
              <Link key={p.id} href={`/projecten/${p.id}`}
                className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 opacity-60 hover:opacity-80 transition-all">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[p.status]}`} />
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.status}</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </PageLayout>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
