'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Trash2, CheckCircle2, Circle, ClipboardList } from 'lucide-react'

interface Todo {
  id: string
  created_at: string
  created_by: string
  assigned_to: string
  description: string
  deadline: string | null
  status: 'open' | 'afgerond'
  completed_at: string | null
}

interface UserInfo {
  id: string
  email: string
}

export default function TodosPage() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'

  const [todos, setTodos] = useState<Todo[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)
  const [adminFilter, setAdminFilter] = useState<'alle' | 'mijn'>('alle')

  // Form state
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
      if (!isAdmin) setAssignedTo(user.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role])

  async function loadData() {
    const todosRes = await supabase
      .from('todos')
      .select('*')
      .order('deadline', { ascending: true, nullsFirst: false })

    setTodos((todosRes.data ?? []) as Todo[])

    // Haal users op via API route (service role nodig voor auth.admin)
    try {
      const res = await fetch('/api/todos/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      }
    } catch {
      if (user) setUsers([{ id: user.id, email: user.email ?? 'Onbekend' }])
    }

    setLoading(false)
  }

  function getUserEmail(userId: string) {
    return users.find(u => u.id === userId)?.email ?? 'Onbekend'
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
    })

    if (error) {
      setFormError('Fout bij opslaan: ' + error.message)
    } else {
      setDescription('')
      setDeadline('')
      if (isAdmin) setAssignedTo('')
      await loadData()
    }
    setSaving(false)
  }

  async function toggleStatus(todo: Todo) {
    const newStatus = todo.status === 'open' ? 'afgerond' : 'open'
    const newCompletedAt = newStatus === 'afgerond' ? new Date().toISOString() : null

    // Optimistic update
    setTodos(prev => prev.map(t =>
      t.id === todo.id ? { ...t, status: newStatus, completed_at: newCompletedAt } : t
    ))

    const { error } = await supabase
      .from('todos')
      .update({ status: newStatus, completed_at: newCompletedAt })
      .eq('id', todo.id)

    if (error) {
      // Revert
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, status: todo.status, completed_at: todo.completed_at } : t
      ))
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm('Taak verwijderen?')) return
    const prev = todos
    setTodos(todos.filter(t => t.id !== id))

    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) setTodos(prev)
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

  // Sortering: open eerst, dan op deadline (nulls last), dan op created_at
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
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
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
              return (
                <tr key={todo.id} className={`border-b border-slate-50 ${done ? '' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-2.5">
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
                    {todo.description}
                  </td>
                  <td className={`px-3 py-2.5 ${done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getUserEmail(todo.assigned_to)}
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${overdue ? 'text-red-500 font-medium' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {todo.deadline
                      ? new Date(todo.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className={`px-3 py-2.5 ${done ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getUserEmail(todo.created_by)}
                  </td>
                  <td className={`px-3 py-2.5 whitespace-nowrap ${done ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(todo.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5">
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
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'
