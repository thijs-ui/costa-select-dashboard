'use client'

import { useEffect, useState, use } from 'react'
import { PageLayout } from '@/components/page-layout'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase-browser'
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Circle, CheckCircle2,
  Pin, Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Phase { id: string; project_id: string; name: string; sort_order: number }
interface Todo {
  id: string; description: string; status: string; deadline: string | null
  assigned_to: string | null; project_id: string | null; phase_id: string | null
  is_week_focus: boolean; completed_at: string | null
}
interface Project {
  id: string; name: string; description: string | null; owner_id: string | null
  target_date: string | null; status: string; color: string
  phases: Phase[]; todos: Todo[]
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; naam: string | null; email: string }>>([])

  // New todo
  const [newTodoDesc, setNewTodoDesc] = useState('')
  const [newTodoPhase, setNewTodoPhase] = useState('')
  // New phase
  const [newPhaseName, setNewPhaseName] = useState('')

  useEffect(() => { loadProject() }, [id])

  async function loadProject() {
    const [projRes, usersRes] = await Promise.all([
      fetch(`/api/projecten?id=${id}`),
      fetch('/api/todos/users'),
    ])
    if (projRes.ok) setProject(await projRes.json())
    if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users ?? []) }
    setLoading(false)
  }

  function getUserName(uid: string | null) {
    if (!uid) return ''
    const u = users.find(u => u.id === uid)
    return u?.naam ?? u?.email?.split('@')[0] ?? ''
  }

  async function updateProject(updates: Partial<Project>) {
    await fetch('/api/projecten', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setProject(prev => prev ? { ...prev, ...updates } as Project : null)
  }

  async function addPhase() {
    if (!newPhaseName.trim()) return
    const order = (project?.phases.length ?? 0)
    const res = await fetch('/api/projecten/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: id, name: newPhaseName.trim(), sort_order: order }),
    })
    if (res.ok) { setNewPhaseName(''); await loadProject() }
  }

  async function addTodo(phaseId: string) {
    if (!newTodoDesc.trim()) return
    await supabase.from('todos').insert({
      description: newTodoDesc.trim(),
      project_id: id,
      phase_id: phaseId,
      assigned_to: user?.id,
      created_by: user?.id,
    })
    setNewTodoDesc('')
    setNewTodoPhase('')
    await loadProject()
  }

  async function toggleTodo(todo: Todo) {
    const newStatus = todo.status === 'open' ? 'afgerond' : 'open'
    const newCompleted = newStatus === 'afgerond' ? new Date().toISOString() : null
    // Optimistic
    setProject(prev => {
      if (!prev) return null
      return { ...prev, todos: prev.todos.map(t => t.id === todo.id ? { ...t, status: newStatus, completed_at: newCompleted } : t) }
    })
    await supabase.from('todos').update({ status: newStatus, completed_at: newCompleted }).eq('id', todo.id)
  }

  async function toggleWeekFocus(todo: Todo) {
    const newFocus = !todo.is_week_focus
    const monday = getMonday()
    setProject(prev => {
      if (!prev) return null
      return { ...prev, todos: prev.todos.map(t => t.id === todo.id ? { ...t, is_week_focus: newFocus, week_focus_date: newFocus ? monday : null } : t) }
    })
    await supabase.from('todos').update({ is_week_focus: newFocus, week_focus_date: newFocus ? monday : null }).eq('id', todo.id)
  }

  async function renamePhase(phaseId: string, name: string) {
    if (!name.trim()) return
    await fetch('/api/projecten/phases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: phaseId, name: name.trim() }),
    })
    setProject(prev => prev ? { ...prev, phases: prev.phases.map(p => p.id === phaseId ? { ...p, name: name.trim() } : p) } : null)
  }

  async function deletePhase(phaseId: string) {
    if (!confirm('Fase verwijderen? Alle taken in deze fase worden losgekoppeld.')) return
    await fetch('/api/projecten/phases', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: phaseId }),
    })
    await loadProject()
  }

  async function deleteProject() {
    if (!confirm('Project verwijderen? Dit kan niet ongedaan worden gemaakt.')) return
    await fetch('/api/projecten', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    window.location.href = '/projecten'
  }

  async function deleteTodo(todoId: string) {
    setProject(prev => prev ? { ...prev, todos: prev.todos.filter(t => t.id !== todoId) } : null)
    await supabase.from('todos').delete().eq('id', todoId)
  }

  if (loading) return <PageLayout><div className="text-slate-400 text-sm p-8">Laden...</div></PageLayout>
  if (!project) return <PageLayout><div className="text-slate-400 text-sm p-8">Project niet gevonden</div></PageLayout>

  const totalDone = project.todos.filter(t => t.status === 'afgerond').length
  const totalAll = project.todos.length
  const pct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/projecten" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <input value={project.name} onChange={e => setProject({ ...project, name: e.target.value })}
            onBlur={() => updateProject({ name: project.name })}
            className="text-xl font-bold text-[#004B46] bg-transparent border-none focus:outline-none w-full" />
          <input value={project.description ?? ''} onChange={e => setProject({ ...project, description: e.target.value })}
            onBlur={() => updateProject({ description: project.description })}
            placeholder="Beschrijving..."
            className="text-sm text-slate-500 bg-transparent border-none focus:outline-none w-full mt-0.5" />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={project.status} onChange={e => updateProject({ status: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option value="actief">Actief</option>
          <option value="on hold">On hold</option>
          <option value="afgerond">Afgerond</option>
        </select>
        <input type="date" value={project.target_date ?? ''} onChange={e => updateProject({ target_date: e.target.value || null })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        <button onClick={deleteProject} className="text-slate-300 hover:text-red-500 p-1.5 cursor-pointer" title="Project verwijderen">
          <Trash2 size={15} />
        </button>
        <div className="flex items-center gap-2 ml-auto text-sm text-slate-500">
          <div className="flex-1 w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
          </div>
          <span className="font-semibold tabular-nums">{pct}%</span>
          <span className="text-xs">({totalDone}/{totalAll})</span>
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-4">
        {project.phases.map(phase => {
          const phaseTodos = project.todos.filter(t => t.phase_id === phase.id)
          return (
            <PhaseCard
              key={phase.id}
              phase={phase}
              todos={phaseTodos}
              projectColor={project.color}
              getUserName={getUserName}
              onToggleTodo={toggleTodo}
              onToggleWeekFocus={toggleWeekFocus}
              onDeleteTodo={deleteTodo}
              onAddTodo={addTodo}
              onRenamePhase={renamePhase}
              onDeletePhase={deletePhase}
              newTodoPhase={newTodoPhase}
              newTodoDesc={newTodoDesc}
              setNewTodoPhase={setNewTodoPhase}
              setNewTodoDesc={setNewTodoDesc}
            />
          )
        })}

        {/* Nieuwe fase */}
        <div className="flex gap-2">
          <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPhase() }}
            placeholder="Nieuwe fase toevoegen..." className={inp} />
          <button onClick={addPhase} disabled={!newPhaseName.trim()}
            className="bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] disabled:opacity-50 cursor-pointer whitespace-nowrap">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </PageLayout>
  )
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

function PhaseCard({ phase, todos, projectColor, getUserName, onToggleTodo, onToggleWeekFocus, onDeleteTodo, onAddTodo, onRenamePhase, onDeletePhase, newTodoPhase, newTodoDesc, setNewTodoPhase, setNewTodoDesc }: {
  phase: Phase; todos: Todo[]; projectColor: string
  getUserName: (id: string | null) => string
  onToggleTodo: (t: Todo) => void; onToggleWeekFocus: (t: Todo) => void; onDeleteTodo: (id: string) => void; onAddTodo: (phaseId: string) => void
  onRenamePhase: (phaseId: string, name: string) => void; onDeletePhase: (phaseId: string) => void
  newTodoPhase: string; newTodoDesc: string; setNewTodoPhase: (s: string) => void; setNewTodoDesc: (s: string) => void
}) {
  const phaseDone = todos.filter(t => t.status === 'afgerond').length
  const phaseTotal = todos.length
  const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0
  const isComplete = phaseTotal > 0 && phaseDone === phaseTotal
  const [expanded, setExpanded] = useState(!isComplete)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(phase.name)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 cursor-pointer">
          {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          {editingName ? (
            <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={() => { onRenamePhase(phase.id, nameValue); setEditingName(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onRenamePhase(phase.id, nameValue); setEditingName(false) }; if (e.key === 'Escape') { setNameValue(phase.name); setEditingName(false) } }}
              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-[#004B46] focus:outline-none" />
          ) : (
            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true) }}
              className={`text-sm font-semibold ${isComplete ? 'text-slate-400' : 'text-slate-700'}`}>{phase.name}</span>
          )}
        </button>
        <div className="flex items-center gap-3">
          {isComplete ? (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Afgerond</span>
          ) : (
            <>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${phasePct}%`, backgroundColor: projectColor }} />
              </div>
              <span className="text-xs text-slate-500 tabular-nums">{phasePct}%</span>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDeletePhase(phase.id) }}
            className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"><Trash2 size={13} /></button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-slate-50">
          <div className="space-y-1 mt-3">
            {todos.map(todo => {
              const done = todo.status === 'afgerond'
              const overdue = todo.deadline && !done && new Date(todo.deadline) < new Date()
              return (
                <div key={todo.id} className="flex items-center gap-2 py-1.5 group">
                  <button onClick={() => onToggleTodo(todo)}
                    className={`cursor-pointer shrink-0 ${done ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-500'}`}>
                    {done ? <CheckCircle2 size={16} strokeWidth={2} /> : <Circle size={16} strokeWidth={1.5} />}
                  </button>
                  <span className={`flex-1 text-sm ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{todo.description}</span>
                  {todo.is_week_focus && <Pin size={12} className="text-amber-500 shrink-0" />}
                  {todo.deadline && (
                    <span className={`text-[10px] shrink-0 ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {new Date(todo.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {getUserName(todo.assigned_to) && (
                    <span className="text-[10px] text-slate-400 shrink-0">{getUserName(todo.assigned_to)}</span>
                  )}
                  <button onClick={() => onToggleWeekFocus(todo)}
                    className={`opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 ${todo.is_week_focus ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}>
                    <Pin size={12} />
                  </button>
                  <button onClick={() => onDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 cursor-pointer shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>

          {newTodoPhase === phase.id ? (
            <div className="flex gap-2 mt-3">
              <input autoFocus value={newTodoDesc} onChange={e => setNewTodoDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onAddTodo(phase.id); if (e.key === 'Escape') setNewTodoPhase('') }}
                placeholder="Nieuwe taak..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#004B46]" />
              <button onClick={() => onAddTodo(phase.id)} className="text-sm text-[#004B46] font-medium cursor-pointer">Toevoegen</button>
              <button onClick={() => setNewTodoPhase('')} className="text-sm text-slate-400 cursor-pointer">Annuleer</button>
            </div>
          ) : (
            <button onClick={() => setNewTodoPhase(phase.id)}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-[#004B46] mt-2 cursor-pointer">
              <Plus size={14} /> Taak toevoegen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
