'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { Trash2, CheckCircle2, Circle, ClipboardList, X, Tag } from 'lucide-react'

const LABEL_COLORS: Record<string, { bg: string; text: string }> = {}
const COLOR_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
]

function getLabelColor(label: string) {
  if (!LABEL_COLORS[label]) {
    const idx = Object.keys(LABEL_COLORS).length % COLOR_PALETTE.length
    LABEL_COLORS[label] = COLOR_PALETTE[idx]
  }
  return LABEL_COLORS[label]
}

interface Todo {
  id: string
  created_at: string
  created_by: string
  assigned_to: string
  description: string
  notities: string | null
  label: string | null
  deadline: string | null
  status: 'open' | 'afgerond'
  completed_at: string | null
  project_id: string | null
  phase_id: string | null
}

interface UserInfo {
  id: string
  email: string
  naam: string | null
}

interface Project {
  id: string
  name: string
  color: string
}

interface Phase {
  id: string
  project_id: string
  name: string
}

export default function TodosPage() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const supabase = useMemo(() => createBrowserClient(), [])

  const [todos, setTodos] = useState<Todo[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [adminFilter, setAdminFilter] = useState<'alle' | 'mijn'>('alle')
  const [projects, setProjects] = useState<Project[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [projectFilter, setProjectFilter] = useState<string>('alle')
  const [reassignTodo, setReassignTodo] = useState<Todo | null>(null)
  const [reassignProject, setReassignProject] = useState('')
  const [reassignPhase, setReassignPhase] = useState('')

  // Form state
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formProject, setFormProject] = useState('')
  const [formPhase, setFormPhase] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [labels, setLabels] = useState<string[]>([])

  // Detail panel state
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [editFields, setEditFields] = useState({ description: '', notities: '', deadline: '', assigned_to: '', label: '' })
  const [detailSaving, setDetailSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
      if (!isAdmin) setAssignedTo(user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role])

  async function loadData() {
    const [todosRes, settingsRes, projectsRes, phasesRes] = await Promise.all([
      supabase.from('todos').select('*').order('deadline', { ascending: true, nullsFirst: false }),
      supabase.from('settings').select('key, value').eq('key', 'todo_labels'),
      supabase.from('projects').select('id, name, color').eq('status', 'actief').order('name'),
      supabase.from('project_phases').select('id, project_id, name').order('sort_order'),
    ])

    setTodos((todosRes.data ?? []) as Todo[])
    setProjects((projectsRes.data ?? []) as Project[])
    setPhases((phasesRes.data ?? []) as Phase[])

    if (settingsRes.data?.[0]?.value) {
      setLabels(settingsRes.data[0].value as string[])
    }

    try {
      const res = await fetch('/api/todos/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      }
    } catch {
      if (user) setUsers([{ id: user.id, email: user.email ?? 'Onbekend', naam: null }])
    }

    setLoading(false)
  }

  function getUserName(userId: string) {
    const u = users.find(u => u.id === userId)
    return u?.naam ?? u?.email ?? 'Onbekend'
  }

  function openDetail(todo: Todo) {
    setSelectedTodo(todo)
    setEditFields({
      description: todo.description,
      notities: todo.notities ?? '',
      deadline: todo.deadline ?? '',
      assigned_to: todo.assigned_to,
      label: todo.label ?? '',
    })
  }

  function closeDetail() {
    setSelectedTodo(null)
  }

  async function saveDetail() {
    if (!selectedTodo || !editFields.description.trim()) return
    setDetailSaving(true)

    const updates: Record<string, unknown> = {
      notities: editFields.notities.trim() || null,
      label: editFields.label || null,
    }

    // Admins kunnen alles bewerken
    if (isAdmin) {
      updates.description = editFields.description.trim()
      updates.deadline = editFields.deadline || null
      updates.assigned_to = editFields.assigned_to
    }

    const { error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', selectedTodo.id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === selectedTodo.id ? { ...t, ...updates } as Todo : t
      ))
      setSelectedTodo(prev => prev ? { ...prev, ...updates } as Todo : null)
    }
    setDetailSaving(false)
  }

  async function addTodo() {
    setFormError('')
    if (!description.trim()) {
      setFormError('Omschrijving mag niet leeg zijn')
      return
    }
    const targetUser = isAdmin && assignedTo ? assignedTo : user!.id
    setSaving(true)

    const { error } = await supabase.from('todos').insert({
      description: description.trim(),
      assigned_to: targetUser,
      created_by: user!.id,
      deadline: deadline || null,
      label: formLabel || null,
      project_id: formProject || null,
      phase_id: (formProject && formPhase) ? formPhase : null,
    })

    if (error) {
      setFormError('Fout bij opslaan: ' + error.message)
    } else {
      setDescription('')
      setDeadline('')
      setFormLabel('')
      setFormProject('')
      setFormPhase('')
      if (isAdmin) setAssignedTo('')
      await loadData()
    }
    setSaving(false)
  }

  async function toggleStatus(todo: Todo) {
    const newStatus = todo.status === 'open' ? 'afgerond' : 'open'
    const newCompletedAt = newStatus === 'afgerond' ? new Date().toISOString() : null

    setTodos(prev => prev.map(t =>
      t.id === todo.id ? { ...t, status: newStatus, completed_at: newCompletedAt } : t
    ))
    if (selectedTodo?.id === todo.id) {
      setSelectedTodo(prev => prev ? { ...prev, status: newStatus, completed_at: newCompletedAt } : null)
    }

    const { error } = await supabase
      .from('todos')
      .update({ status: newStatus, completed_at: newCompletedAt })
      .eq('id', todo.id)

    if (error) {
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, status: todo.status, completed_at: todo.completed_at } : t
      ))
      if (selectedTodo?.id === todo.id) {
        setSelectedTodo(prev => prev ? { ...prev, status: todo.status, completed_at: todo.completed_at } : null)
      }
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm('Taak verwijderen?')) return
    const prev = todos
    setTodos(todos.filter(t => t.id !== id))
    if (selectedTodo?.id === id) closeDetail()

    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) setTodos(prev)
  }

  function getProjectLabel(todo: Todo) {
    if (!todo.project_id) return null
    const p = projects.find(p => p.id === todo.project_id)
    if (!p) return null
    const phase = todo.phase_id ? phases.find(ph => ph.id === todo.phase_id) : null
    return { name: p.name, phaseName: phase?.name, color: p.color }
  }

  async function saveReassign() {
    if (!reassignTodo) return
    const newProject = reassignProject || null
    const newPhase = reassignProject && reassignPhase ? reassignPhase : null
    setTodos(prev => prev.map(t => t.id === reassignTodo.id ? { ...t, project_id: newProject, phase_id: newPhase } : t))
    await supabase.from('todos').update({ project_id: newProject, phase_id: newPhase }).eq('id', reassignTodo.id)
    setReassignTodo(null)
    setReassignProject('')
    setReassignPhase('')
  }

  function isOverdue(todo: Todo) {
    if (!todo.deadline || todo.status === 'afgerond') return false
    return new Date(todo.deadline) < new Date(new Date().toDateString())
  }

  // Filtering
  let filtered = todos
  if (!showCompleted) {
    filtered = filtered.filter(t => t.status === 'open')
  }
  if (isAdmin && adminFilter === 'mijn') {
    filtered = filtered.filter(t => t.assigned_to === user!.id || t.created_by === user!.id)
  }
  if (projectFilter === 'los') {
    filtered = filtered.filter(t => !t.project_id)
  } else if (projectFilter === 'projecten') {
    filtered = filtered.filter(t => !!t.project_id)
  } else if (projectFilter !== 'alle') {
    filtered = filtered.filter(t => t.project_id === projectFilter)
  }

  filtered = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return b.created_at.localeCompare(a.created_at)
  })

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-6">To-do</h1>

      {/* Invoerformulier */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Nieuwe taak</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Omschrijving *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setFormError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
              placeholder="Wat moet er gebeuren?"
              className={inp}
            />
            {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
          </div>

          {isAdmin && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Toewijzen aan</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inp}
              >
                <option value="">Kies gebruiker</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.naam ?? u.email}</option>
                ))}
              </select>
            </div>
          )}

          {labels.length > 0 && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Label</label>
              <select
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className={inp}
              >
                <option value="">Geen label</option>
                {labels.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Project</label>
            <select value={formProject} onChange={e => { setFormProject(e.target.value); setFormPhase('') }} className={inp}>
              <option value="">— Geen project (los) —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {formProject && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fase</label>
              <select value={formPhase} onChange={e => setFormPhase(e.target.value)} className={inp}>
                <option value="">— Geen fase —</option>
                {phases.filter(ph => ph.project_id === formProject).map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 mb-1">Deadline</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inp}
              />
              <button
                onClick={addTodo}
                disabled={saving}
                className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                {saving ? 'Opslaan...' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-slate-300"
          />
          Toon afgeronde taken
        </label>

        {isAdmin && (
          <select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value as 'alle' | 'mijn')}
            className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white"
          >
            <option value="alle">Alle taken</option>
            <option value="mijn">Mijn taken</option>
          </select>
        )}

        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white">
          <option value="alle">Alle projecten</option>
          <option value="projecten">Alleen projectto-do&apos;s</option>
          <option value="los">Alleen losse to-do&apos;s</option>
          <option disabled>──────</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} {filtered.length === 1 ? 'taak' : 'taken'}
        </span>
      </div>

      {/* Takenlijst */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium w-10"></th>
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Omschrijving</th>
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Toegewezen aan</th>
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Deadline</th>
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Aangemaakt door</th>
              <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">Aangemaakt op</th>
              {isAdmin && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center">
                  <ClipboardList size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400 text-sm">Geen openstaande taken</p>
                </td>
              </tr>
            )}
            {filtered.map((todo) => {
              const done = todo.status === 'afgerond'
              const overdue = isOverdue(todo)
              const isSelected = selectedTodo?.id === todo.id
              return (
                <tr
                  key={todo.id}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : done ? '' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => openDetail(todo)}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleStatus(todo)}
                      className={`cursor-pointer transition-colors ${done ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
                    >
                      {done
                        ? <CheckCircle2 size={18} strokeWidth={2} />
                        : <Circle size={18} strokeWidth={1.5} />
                      }
                    </button>
                  </td>
                  <td className={`px-3 py-2.5 ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    <div className="flex items-center gap-2">
                      {todo.description}
                      {todo.label && (() => {
                        const c = getLabelColor(todo.label)
                        return <span className={`text-[10px] ${c.bg} ${c.text} px-1.5 py-0.5 rounded font-medium flex-shrink-0`}>{todo.label}</span>
                      })()}
                      {todo.notities && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex-shrink-0">notitie</span>
                      )}
                      {(() => {
                        const pl = getProjectLabel(todo)
                        if (pl) {
                          return (
                            <button onClick={e => { e.stopPropagation(); setReassignTodo(todo); setReassignProject(todo.project_id || ''); setReassignPhase(todo.phase_id || '') }}
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: `${pl.color}20`, color: pl.color }}>
                              {pl.name}{pl.phaseName ? ` › ${pl.phaseName}` : ''}
                            </button>
                          )
                        }
                        return (
                          <button onClick={e => { e.stopPropagation(); setReassignTodo(todo); setReassignProject(''); setReassignPhase('') }}
                            className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium flex-shrink-0 cursor-pointer hover:bg-slate-200">
                            Los
                          </button>
                        )
                      })()}
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 ${done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getUserName(todo.assigned_to)}
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {todo.deadline
                      ? new Date(todo.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className={`px-3 py-2.5 ${done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getUserName(todo.created_by)}
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${done ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(todo.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-slate-300 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail paneel */}
      {selectedTodo && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closeDetail} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-slate-200 z-50 shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Taakdetails</h2>
              <button onClick={closeDetail} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleStatus(selectedTodo)}
                  className={`cursor-pointer transition-colors ${selectedTodo.status === 'afgerond' ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-500'}`}
                >
                  {selectedTodo.status === 'afgerond'
                    ? <CheckCircle2 size={20} strokeWidth={2} />
                    : <Circle size={20} strokeWidth={1.5} />
                  }
                </button>
                <span className={`text-sm font-medium ${selectedTodo.status === 'afgerond' ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {selectedTodo.status === 'afgerond' ? 'Afgerond' : 'Open'}
                </span>
                {selectedTodo.completed_at && (
                  <span className="text-xs text-slate-400">
                    op {new Date(selectedTodo.completed_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Omschrijving */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Omschrijving</label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={editFields.description}
                    onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                    className={inp}
                  />
                ) : (
                  <p className="text-sm text-slate-700">{selectedTodo.description}</p>
                )}
              </div>

              {/* Notities */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notities</label>
                <textarea
                  value={editFields.notities}
                  onChange={(e) => setEditFields({ ...editFields, notities: e.target.value })}
                  placeholder="Voeg extra details, opmerkingen of context toe..."
                  rows={5}
                  className={`${inp} resize-none`}
                />
              </div>

              {/* Label */}
              {labels.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label</label>
                  <select
                    value={editFields.label}
                    onChange={(e) => setEditFields({ ...editFields, label: e.target.value })}
                    className={inp}
                  >
                    <option value="">Geen label</option>
                    {labels.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toewijzen aan */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Toegewezen aan</label>
                {isAdmin ? (
                  <select
                    value={editFields.assigned_to}
                    onChange={(e) => setEditFields({ ...editFields, assigned_to: e.target.value })}
                    className={inp}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.naam ?? u.email}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-slate-600">{getUserName(selectedTodo.assigned_to)}</p>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Deadline</label>
                {isAdmin ? (
                  <input
                    type="date"
                    value={editFields.deadline}
                    onChange={(e) => setEditFields({ ...editFields, deadline: e.target.value })}
                    className={inp}
                  />
                ) : (
                  <p className={`text-sm ${isOverdue(selectedTodo) ? 'text-red-500 font-medium' : 'text-slate-600'}`}>
                    {selectedTodo.deadline
                      ? new Date(selectedTodo.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Geen deadline'}
                  </p>
                )}
              </div>

              {/* Meta info */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Aangemaakt door</span>
                  <span className="text-slate-600">{getUserName(selectedTodo.created_by)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Aangemaakt op</span>
                  <span className="text-slate-600">
                    {new Date(selectedTodo.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={saveDetail}
                disabled={detailSaving}
                className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                {detailSaving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={closeDetail}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2"
              >
                Annuleren
              </button>
              {isAdmin && (
                <button
                  onClick={() => deleteTodo(selectedTodo.id)}
                  className="ml-auto text-slate-300 hover:text-red-500 p-2 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reassign to project modal */}
      {reassignTodo && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setReassignTodo(null)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Koppel aan project</h3>
              <p className="text-xs text-slate-500 mb-3 truncate">{reassignTodo.description}</p>
              <div className="space-y-2 mb-4">
                <select value={reassignProject} onChange={e => { setReassignProject(e.target.value); setReassignPhase('') }} className={inp}>
                  <option value="">— Geen project (los) —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {reassignProject && (
                  <select value={reassignPhase} onChange={e => setReassignPhase(e.target.value)} className={inp}>
                    <option value="">— Geen fase —</option>
                    {phases.filter(ph => ph.project_id === reassignProject).map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setReassignTodo(null)} className="text-sm text-slate-500 px-3 py-2 cursor-pointer">Annuleren</button>
                <button onClick={saveReassign}
                  className="bg-[#004B46] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0A6B63] cursor-pointer">Koppelen</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'
