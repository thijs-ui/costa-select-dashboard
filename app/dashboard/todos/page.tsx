'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { createBrowserClient } from '@/lib/supabase-browser'
import {
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinModal,
  FinSection,
} from '@/components/financieel/parts'

const LABEL_PALETTE = [
  { bg: 'rgba(0,75,70,0.13)', color: '#004B46' },
  { bg: 'rgba(245,175,64,0.18)', color: '#D4921A' },
  { bg: 'rgba(123,108,194,0.14)', color: '#4f3f8a' },
  { bg: 'rgba(91,141,134,0.16)', color: '#2c5e57' },
  { bg: 'rgba(190,98,72,0.14)', color: '#8a3f29' },
  { bg: 'rgba(16,185,129,0.16)', color: '#0d7456' },
  { bg: 'rgba(212,146,26,0.14)', color: '#a06a0c' },
  { bg: 'rgba(120,118,113,0.14)', color: '#5F7472' },
]

const labelColorCache: Record<string, { bg: string; color: string }> = {}
function getLabelColor(label: string) {
  if (!labelColorCache[label]) {
    const idx = Object.keys(labelColorCache).length % LABEL_PALETTE.length
    labelColorCache[label] = LABEL_PALETTE[idx]
  }
  return labelColorCache[label]
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
interface UserInfo { id: string; email: string; naam: string | null }
interface Project { id: string; name: string; color: string }
interface Phase { id: string; project_id: string; name: string }

export default function TodosPage() {
  const { user, role } = useAuth()
  const isAdmin = role === 'admin'
  const supabase = useMemo(() => createBrowserClient(), [])

  const [todos, setTodos] = useState<Todo[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)

  const [showCompleted, setShowCompleted] = useState(false)
  const [adminFilter, setAdminFilter] = useState<'alle' | 'mijn'>('alle')
  const [projectFilter, setProjectFilter] = useState<string>('alle')

  // Add form
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formProject, setFormProject] = useState('')
  const [formPhase, setFormPhase] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Detail modal
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [editFields, setEditFields] = useState({
    description: '',
    notities: '',
    deadline: '',
    assigned_to: '',
    label: '',
  })
  const [detailSaving, setDetailSaving] = useState(false)

  // Reassign modal
  const [reassignTodo, setReassignTodo] = useState<Todo | null>(null)
  const [reassignProject, setReassignProject] = useState('')
  const [reassignPhase, setReassignPhase] = useState('')

  useEffect(() => {
    if (!user) return
    void loadData()
    if (!isAdmin) setAssignedTo(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role])

  async function loadData() {
    const [todosRes, settingsRes, projectsRes, phasesRes] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .order('deadline', { ascending: true, nullsFirst: false }),
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
        setUsers((data.users ?? []) as UserInfo[])
      }
    } catch {
      if (user) setUsers([{ id: user.id, email: user.email ?? 'Onbekend', naam: null }])
    }
    setLoading(false)
  }

  function getUserName(userId: string) {
    const u = users.find(x => x.id === userId)
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
    if (isAdmin) {
      updates.description = editFields.description.trim()
      updates.deadline = editFields.deadline || null
      updates.assigned_to = editFields.assigned_to
    }
    const { error } = await supabase.from('todos').update(updates).eq('id', selectedTodo.id)
    if (!error) {
      setTodos(prev =>
        prev.map(t => (t.id === selectedTodo.id ? ({ ...t, ...updates } as Todo) : t))
      )
      setSelectedTodo(prev => (prev ? ({ ...prev, ...updates } as Todo) : null))
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
      phase_id: formProject && formPhase ? formPhase : null,
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
    const newStatus: Todo['status'] = todo.status === 'open' ? 'afgerond' : 'open'
    const newCompletedAt = newStatus === 'afgerond' ? new Date().toISOString() : null
    setTodos(prev =>
      prev.map(t =>
        t.id === todo.id ? { ...t, status: newStatus, completed_at: newCompletedAt } : t
      )
    )
    if (selectedTodo?.id === todo.id) {
      setSelectedTodo(prev =>
        prev ? { ...prev, status: newStatus, completed_at: newCompletedAt } : null
      )
    }
    const { error } = await supabase
      .from('todos')
      .update({ status: newStatus, completed_at: newCompletedAt })
      .eq('id', todo.id)
    if (error) {
      setTodos(prev =>
        prev.map(t =>
          t.id === todo.id ? { ...t, status: todo.status, completed_at: todo.completed_at } : t
        )
      )
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
    const p = projects.find(x => x.id === todo.project_id)
    if (!p) return null
    const phase = todo.phase_id ? phases.find(ph => ph.id === todo.phase_id) : null
    return { name: p.name, phaseName: phase?.name, color: p.color }
  }

  async function saveReassign() {
    if (!reassignTodo) return
    const newProject = reassignProject || null
    const newPhase = reassignProject && reassignPhase ? reassignPhase : null
    setTodos(prev =>
      prev.map(t =>
        t.id === reassignTodo.id ? { ...t, project_id: newProject, phase_id: newPhase } : t
      )
    )
    await supabase
      .from('todos')
      .update({ project_id: newProject, phase_id: newPhase })
      .eq('id', reassignTodo.id)
    setReassignTodo(null)
    setReassignProject('')
    setReassignPhase('')
  }

  function isOverdue(todo: Todo) {
    if (!todo.deadline || todo.status === 'afgerond') return false
    return new Date(todo.deadline) < new Date(new Date().toDateString())
  }

  const filtered = useMemo(() => {
    let r = todos
    if (!showCompleted) r = r.filter(t => t.status === 'open')
    if (isAdmin && adminFilter === 'mijn' && user) {
      r = r.filter(t => t.assigned_to === user.id || t.created_by === user.id)
    }
    if (projectFilter === 'los') r = r.filter(t => !t.project_id)
    else if (projectFilter === 'projecten') r = r.filter(t => !!t.project_id)
    else if (projectFilter !== 'alle') r = r.filter(t => t.project_id === projectFilter)
    return [...r].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
      if (a.deadline) return -1
      if (b.deadline) return 1
      return b.created_at.localeCompare(a.created_at)
    })
  }, [todos, showCompleted, adminFilter, isAdmin, user, projectFilter])

  const open = todos.filter(t => t.status === 'open').length
  const overdue = todos.filter(isOverdue).length
  const afgerond = todos.filter(t => t.status === 'afgerond').length

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader title="To-do" subtitle="Taken voor het team — los of binnen een project." />

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          <>
            <FinKpiGrid cols={3}>
              <FinKpi label="Open" value={open} sub={`${overdue} over deadline`} tone={overdue > 0 ? 'negative' : 'default'} />
              <FinKpi label="Afgerond" value={afgerond} sub="totaal" tone="positive" />
              <FinKpi label="Projecten" value={projects.length} sub="actieve" />
            </FinKpiGrid>

            <FinSection title="Nieuwe taak">
              <div className="fin-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="fin-field" style={{ gridColumn: 'span 2' }}>
                  <label>Omschrijving *</label>
                  <input
                    type="text"
                    className="fin-input"
                    value={description}
                    onChange={e => {
                      setDescription(e.target.value)
                      setFormError('')
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void addTodo()
                    }}
                    placeholder="Wat moet er gebeuren?"
                  />
                  {formError && (
                    <span style={{ fontSize: 11, color: 'var(--negative-text)', marginTop: 2 }}>
                      {formError}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="fin-field">
                    <label>Toewijzen aan</label>
                    <select
                      className="fin-select"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                    >
                      <option value="">Kies gebruiker</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.naam ?? u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {labels.length > 0 && (
                  <div className="fin-field">
                    <label>Label</label>
                    <select
                      className="fin-select"
                      value={formLabel}
                      onChange={e => setFormLabel(e.target.value)}
                    >
                      <option value="">Geen label</option>
                      {labels.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="fin-field">
                  <label>Project</label>
                  <select
                    className="fin-select"
                    value={formProject}
                    onChange={e => {
                      setFormProject(e.target.value)
                      setFormPhase('')
                    }}
                  >
                    <option value="">— Geen project (los) —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {formProject && (
                  <div className="fin-field">
                    <label>Fase</label>
                    <select
                      className="fin-select"
                      value={formPhase}
                      onChange={e => setFormPhase(e.target.value)}
                    >
                      <option value="">— Geen fase —</option>
                      {phases
                        .filter(ph => ph.project_id === formProject)
                        .map(ph => (
                          <option key={ph.id} value={ph.id}>
                            {ph.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                <div className="fin-field">
                  <label>Deadline</label>
                  <input
                    type="date"
                    className="fin-input"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="fin-btn primary"
                  onClick={() => void addTodo()}
                  disabled={saving}
                >
                  {saving ? 'Opslaan…' : 'Taak toevoegen'}
                </button>
              </div>
            </FinSection>

            {/* Filters */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <label className="fin-toggle-line">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={e => setShowCompleted(e.target.checked)}
                />
                Toon afgeronde taken
              </label>
              {isAdmin && (
                <select
                  className="fin-select"
                  value={adminFilter}
                  onChange={e => setAdminFilter(e.target.value as 'alle' | 'mijn')}
                  style={{ width: 'auto', minWidth: 140 }}
                >
                  <option value="alle">Alle taken</option>
                  <option value="mijn">Mijn taken</option>
                </select>
              )}
              <select
                className="fin-select"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                style={{ width: 'auto', minWidth: 180 }}
              >
                <option value="alle">Alle projecten</option>
                <option value="projecten">Alleen project-taken</option>
                <option value="los">Alleen losse taken</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-subtle)' }}>
                {filtered.length} {filtered.length === 1 ? 'taak' : 'taken'}
              </span>
            </div>

            <div className="fin-table-wrap" style={{ borderRadius: 12 }}>
              <table className="fin-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Omschrijving</th>
                    <th>Toegewezen aan</th>
                    <th>Deadline</th>
                    <th>Aangemaakt door</th>
                    <th>Aangemaakt op</th>
                    {isAdmin && <th style={{ width: 36 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdmin ? 7 : 6}
                        style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-subtle)' }}
                      >
                        <ClipboardList size={28} style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 13 }}>Geen openstaande taken</div>
                      </td>
                    </tr>
                  )}
                  {filtered.map(todo => {
                    const done = todo.status === 'afgerond'
                    const od = isOverdue(todo)
                    const isSelected = selectedTodo?.id === todo.id
                    const projectLabel = getProjectLabel(todo)
                    return (
                      <tr
                        key={todo.id}
                        onClick={() => openDetail(todo)}
                        style={{ cursor: 'pointer' }}
                        className={isSelected ? 'fin-row-editing' : ''}
                      >
                        <td onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(todo)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 2,
                              cursor: 'pointer',
                              color: done ? 'var(--positive)' : 'var(--fg-subtle)',
                              display: 'inline-flex',
                            }}
                            aria-label={done ? 'Markeer als open' : 'Markeer als afgerond'}
                          >
                            {done ? (
                              <CheckCircle2 size={18} strokeWidth={2} />
                            ) : (
                              <Circle size={18} strokeWidth={1.5} />
                            )}
                          </button>
                        </td>
                        <td
                          style={{
                            color: done ? 'var(--fg-subtle)' : 'var(--fg)',
                            textDecoration: done ? 'line-through' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {todo.description}
                            {todo.label && (() => {
                              const c = getLabelColor(todo.label)
                              return (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    background: c.bg,
                                    color: c.color,
                                    padding: '1px 7px',
                                    borderRadius: 5,
                                  }}
                                >
                                  {todo.label}
                                </span>
                              )
                            })()}
                            {todo.notities && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: 'var(--deepsea-lighter)',
                                  color: 'var(--fg-muted)',
                                  padding: '1px 7px',
                                  borderRadius: 5,
                                }}
                              >
                                notitie
                              </span>
                            )}
                            {projectLabel ? (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  setReassignTodo(todo)
                                  setReassignProject(todo.project_id ?? '')
                                  setReassignPhase(todo.phase_id ?? '')
                                }}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: `${projectLabel.color}20`,
                                  color: projectLabel.color,
                                  padding: '1px 7px',
                                  borderRadius: 5,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {projectLabel.name}
                                {projectLabel.phaseName ? ` › ${projectLabel.phaseName}` : ''}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  setReassignTodo(todo)
                                  setReassignProject('')
                                  setReassignPhase('')
                                }}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: 'var(--deepsea-lighter)',
                                  color: 'var(--fg-muted)',
                                  padding: '1px 7px',
                                  borderRadius: 5,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Los
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={done ? 'muted' : ''}>{getUserName(todo.assigned_to)}</td>
                        <td
                          className={done ? 'muted' : ''}
                          style={{
                            color: od
                              ? 'var(--negative-text)'
                              : done
                                ? 'var(--fg-subtle)'
                                : 'var(--fg)',
                            fontWeight: od ? 600 : 'normal',
                          }}
                        >
                          {todo.deadline
                            ? new Date(todo.deadline).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className={done ? 'muted' : ''}>{getUserName(todo.created_by)}</td>
                        <td className="muted">
                          {new Date(todo.created_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        {isAdmin && (
                          <td onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="fin-row-action danger"
                              onClick={() => void deleteTodo(todo.id)}
                              aria-label="Verwijderen"
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

            <div style={{ height: 60 }} />
          </>
        )}

        {/* Detail-modal */}
        <FinModal
          open={selectedTodo !== null}
          onClose={closeDetail}
          title="Taakdetails"
          size="lg"
          footer={
            <>
              {isAdmin && selectedTodo && (
                <button
                  type="button"
                  className="fin-btn"
                  onClick={() => void deleteTodo(selectedTodo.id)}
                  style={{ marginRight: 'auto', color: 'var(--negative-text)' }}
                >
                  Verwijderen
                </button>
              )}
              <button type="button" className="fin-btn" onClick={closeDetail}>
                Annuleren
              </button>
              <button
                type="button"
                className="fin-btn primary"
                onClick={() => void saveDetail()}
                disabled={detailSaving}
              >
                {detailSaving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </>
          }
        >
          {selectedTodo && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => void toggleStatus(selectedTodo)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    color:
                      selectedTodo.status === 'afgerond'
                        ? 'var(--positive)'
                        : 'var(--fg-subtle)',
                    display: 'inline-flex',
                  }}
                >
                  {selectedTodo.status === 'afgerond' ? (
                    <CheckCircle2 size={20} strokeWidth={2} />
                  ) : (
                    <Circle size={20} strokeWidth={1.5} />
                  )}
                </button>
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      selectedTodo.status === 'afgerond'
                        ? 'var(--positive-text)'
                        : 'var(--fg)',
                  }}
                >
                  {selectedTodo.status === 'afgerond' ? 'Afgerond' : 'Open'}
                </span>
                {selectedTodo.completed_at && (
                  <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                    op{' '}
                    {new Date(selectedTodo.completed_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              <div className="fin-form-grid">
                <div className="fin-field full">
                  <label>Omschrijving</label>
                  {isAdmin ? (
                    <input
                      type="text"
                      className="fin-input"
                      value={editFields.description}
                      onChange={e =>
                        setEditFields({ ...editFields, description: e.target.value })
                      }
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)' }}>
                      {selectedTodo.description}
                    </p>
                  )}
                </div>
                <div className="fin-field full">
                  <label>Notities</label>
                  <textarea
                    className="fin-textarea"
                    rows={5}
                    value={editFields.notities}
                    onChange={e =>
                      setEditFields({ ...editFields, notities: e.target.value })
                    }
                    placeholder="Voeg extra context toe…"
                  />
                </div>
                {labels.length > 0 && (
                  <div className="fin-field">
                    <label>Label</label>
                    <select
                      className="fin-select"
                      value={editFields.label}
                      onChange={e => setEditFields({ ...editFields, label: e.target.value })}
                    >
                      <option value="">Geen label</option>
                      {labels.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="fin-field">
                  <label>Toegewezen aan</label>
                  {isAdmin ? (
                    <select
                      className="fin-select"
                      value={editFields.assigned_to}
                      onChange={e =>
                        setEditFields({ ...editFields, assigned_to: e.target.value })
                      }
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.naam ?? u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
                      {getUserName(selectedTodo.assigned_to)}
                    </p>
                  )}
                </div>
                <div className="fin-field">
                  <label>Deadline</label>
                  {isAdmin ? (
                    <input
                      type="date"
                      className="fin-input"
                      value={editFields.deadline}
                      onChange={e =>
                        setEditFields({ ...editFields, deadline: e.target.value })
                      }
                    />
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: isOverdue(selectedTodo)
                          ? 'var(--negative-text)'
                          : 'var(--fg-muted)',
                      }}
                    >
                      {selectedTodo.deadline
                        ? new Date(selectedTodo.deadline).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Geen deadline'}
                    </p>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 11.5,
                  color: 'var(--fg-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Aangemaakt door</span>
                  <span>{getUserName(selectedTodo.created_by)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Aangemaakt op</span>
                  <span>
                    {new Date(selectedTodo.created_at).toLocaleString('nl-NL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </>
          )}
        </FinModal>

        {/* Reassign-to-project modal */}
        <FinModal
          open={reassignTodo !== null}
          onClose={() => setReassignTodo(null)}
          title="Koppel aan project"
          footer={
            <>
              <button
                type="button"
                className="fin-btn"
                onClick={() => setReassignTodo(null)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="fin-btn primary"
                onClick={() => void saveReassign()}
              >
                Koppelen
              </button>
            </>
          }
        >
          {reassignTodo && (
            <>
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 12.5,
                  color: 'var(--fg-subtle)',
                }}
              >
                {reassignTodo.description}
              </p>
              <div className="fin-form-grid">
                <div className="fin-field full">
                  <label>Project</label>
                  <select
                    className="fin-select"
                    value={reassignProject}
                    onChange={e => {
                      setReassignProject(e.target.value)
                      setReassignPhase('')
                    }}
                  >
                    <option value="">— Geen project (los) —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {reassignProject && (
                  <div className="fin-field full">
                    <label>Fase</label>
                    <select
                      className="fin-select"
                      value={reassignPhase}
                      onChange={e => setReassignPhase(e.target.value)}
                    >
                      <option value="">— Geen fase —</option>
                      {phases
                        .filter(ph => ph.project_id === reassignProject)
                        .map(ph => (
                          <option key={ph.id} value={ph.id}>
                            {ph.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}
        </FinModal>
      </div>
    </div>
  )
}
