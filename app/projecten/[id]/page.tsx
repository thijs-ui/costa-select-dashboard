'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { createBrowserClient } from '@/lib/supabase-browser'
import {
  PjIcon, PjPhaseColumn, PjAside,
  computeProject, statusInfo, fmtDateNL,
  colorStyle, userDisplayName,
  type PjProjectDetail, type PjUser,
} from '@/components/projecten/parts'

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const supabase = createBrowserClient()
  const [project, setProject] = useState<PjProjectDetail | null>(null)
  const [users, setUsers] = useState<PjUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('actief')
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [projRes, usersRes] = await Promise.all([
        fetch(`/api/projecten?id=${id}`),
        fetch('/api/todos/users'),
      ])
      if (cancelled) return
      if (projRes.ok) {
        const data: PjProjectDetail = await projRes.json()
        setProject(data)
        setName(data.name)
        setDescription(data.description ?? '')
        setStatus(data.status)
        setTargetDate(data.target_date ?? '')
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users ?? [])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="pj-page">
        <div className="pj-shell">
          <div style={{ color: 'var(--pj-fg-subtle)', fontSize: 13 }}>Laden…</div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="pj-page">
        <div className="pj-shell">
          <div style={{ color: 'var(--pj-fg-subtle)', fontSize: 13 }}>Project niet gevonden.</div>
        </div>
      </div>
    )
  }

  async function reloadProject() {
    const res = await fetch(`/api/projecten?id=${id}`)
    if (res.ok) setProject(await res.json())
  }

  async function saveProjectMeta() {
    if (!project) return
    const updates = {
      name: name.trim() || project.name,
      description: description.trim() || null,
      status,
      target_date: targetDate || null,
    }
    setProject({ ...project, ...updates })
    await fetch('/api/projecten', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setEditing(false)
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

  async function toggleTodo(todoId: string) {
    if (!project) return
    const todo = project.todos.find(t => t.id === todoId)
    if (!todo) return
    const isDone = todo.status === 'afgerond'
    const newStatus = isDone ? 'open' : 'afgerond'
    const newCompleted = isDone ? null : new Date().toISOString()
    setProject({
      ...project,
      todos: project.todos.map(t => t.id === todoId ? { ...t, status: newStatus, completed_at: newCompleted } : t),
    })
    await supabase.from('todos').update({ status: newStatus, completed_at: newCompleted }).eq('id', todoId)
  }

  async function pinTodo(todoId: string) {
    if (!project) return
    const todo = project.todos.find(t => t.id === todoId)
    if (!todo) return
    const newFocus = !todo.is_week_focus
    const monday = newFocus ? getMonday() : null
    setProject({
      ...project,
      todos: project.todos.map(t => t.id === todoId ? { ...t, is_week_focus: newFocus } : t),
    })
    await supabase.from('todos').update({ is_week_focus: newFocus, week_focus_date: monday }).eq('id', todoId)
  }

  async function quickAddTodo(input: { title: string; phase_id: string; due_date: string | null; assigned_to: string | null }) {
    await supabase.from('todos').insert({
      title: input.title,
      project_id: id,
      phase_id: input.phase_id,
      due_date: input.due_date,
      assigned_to: input.assigned_to,
      created_by: user?.id,
      status: 'open',
      is_week_focus: false,
    })
    await reloadProject()
  }

  async function inlineAddTodo(phaseId: string) {
    const title = prompt('Beschrijving van de nieuwe taak')
    if (!title?.trim()) return
    await supabase.from('todos').insert({
      title: title.trim(),
      project_id: id,
      phase_id: phaseId,
      assigned_to: user?.id,
      created_by: user?.id,
      status: 'open',
      is_week_focus: false,
    })
    await reloadProject()
  }

  async function renamePhase(phaseId: string, newName: string) {
    if (!project) return
    setProject({
      ...project,
      phases: project.phases.map(ph => ph.id === phaseId ? { ...ph, name: newName } : ph),
    })
    await fetch('/api/projecten/phases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: phaseId, name: newName }),
    })
  }

  async function deletePhase(phaseId: string) {
    if (!confirm('Fase verwijderen? Alle taken in deze fase worden losgekoppeld.')) return
    await fetch('/api/projecten/phases', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: phaseId }),
    })
    await reloadProject()
  }

  async function addPhase() {
    if (!project) return
    const phaseName = prompt('Naam voor de nieuwe fase?')
    if (!phaseName?.trim()) return
    const order = project.phases.length
    await fetch('/api/projecten/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: id, name: phaseName.trim(), sort_order: order }),
    })
    await reloadProject()
  }

  const computed = computeProject(project)
  const owner = users.find(u => u.id === project.owner_id) || null
  const stat = statusInfo(computed)
  const pct = computed.total > 0 ? Math.round((computed.done / computed.total) * 100) : 0

  return (
    <div className="pj-page">
      <div className="pj-shell">
        <header className="pj-detail-header" style={colorStyle(project.color)}>
          <div className="pj-breadcrumb">
            <Link href="/projecten">Projecten</Link>
            <span className="pj-breadcrumb-sep"><PjIcon name="chevron-right" size={11} /></span>
            <span>{project.name}</span>
          </div>
          <div className="pj-detail-row">
            <div className="pj-detail-titleblock">
              {editing ? (
                <>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pj-detail-title"
                    style={{ background: 'transparent', border: 0, borderBottom: '1px solid var(--pj-deepsea)', outline: 'none', width: '100%', padding: 0 }}
                  />
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Korte beschrijving van het project"
                    rows={2}
                    className="pj-detail-desc"
                    style={{ background: 'transparent', border: '1px solid var(--pj-border)', borderRadius: 8, outline: 'none', width: '100%', padding: 8, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    <select className="pj-quick-select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
                      <option value="actief">Actief</option>
                      <option value="on hold">On hold</option>
                      <option value="afgerond">Afgerond</option>
                    </select>
                    <input className="pj-quick-input" style={{ width: 'auto' }} type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                    <button className="pj-btn pj-btn--primary" onClick={saveProjectMeta}>Opslaan</button>
                    <button className="pj-btn pj-btn--ghost" onClick={() => {
                      setName(project.name)
                      setDescription(project.description ?? '')
                      setStatus(project.status)
                      setTargetDate(project.target_date ?? '')
                      setEditing(false)
                    }}>Annuleer</button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="pj-detail-title">{project.name}</h1>
                  {project.description && <p className="pj-detail-desc">{project.description}</p>}
                  <div className="pj-detail-meta">
                    {owner && (
                      <span className="pj-detail-meta-item">
                        <PjIcon name="user" size={13} /> Eigenaar <strong>{userDisplayName(owner)}</strong>
                      </span>
                    )}
                    {project.target_date && (
                      <span className="pj-detail-meta-item">
                        <PjIcon name="target" size={13} /> Doel <strong>{fmtDateNL(project.target_date)}</strong>
                      </span>
                    )}
                    {computed.estimatedDate && computed.health !== 'done' && computed.health !== 'on_hold' && (
                      <span className="pj-detail-meta-item">
                        <PjIcon name="trending-up" size={13} /> Prognose <strong>{fmtDateNL(computed.estimatedDate)}</strong>
                      </span>
                    )}
                    {computed.currentPhase && (
                      <span className="pj-detail-meta-item">
                        <PjIcon name="layers" size={13} /> Huidige fase <strong>{computed.currentPhase.name}</strong>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="pj-detail-actions">
              <div className={`pj-pill ${stat.pill}`}>{stat.label}</div>
              <button className="pj-btn pj-btn--icon" title={editing ? 'Sluit bewerken' : 'Bewerken'} onClick={() => setEditing(e => !e)}>
                <PjIcon name="pencil" size={14} />
              </button>
              <button className="pj-btn pj-btn--icon" title="Verwijderen" onClick={deleteProject}>
                <PjIcon name="trash-2" size={14} />
              </button>
            </div>
          </div>

          <div className="pj-detail-stats">
            <div>
              <div className="pj-dstat-label">Voortgang</div>
              <div className="pj-dstat-value">{pct}%</div>
              <div className="pj-dstat-sub">{computed.done} van {computed.total} taken</div>
            </div>
            <div>
              <div className="pj-dstat-label">Open taken</div>
              <div className="pj-dstat-value">{computed.open}</div>
              <div className="pj-dstat-sub">verdeeld over {computed.phases.length} fases</div>
            </div>
            <div>
              <div className="pj-dstat-label">Afgerond</div>
              <div className="pj-dstat-value">{computed.done}</div>
              <div className="pj-dstat-sub">tempo {computed.velocityPerWeek}/wk</div>
            </div>
            <div>
              <div className="pj-dstat-label">Focus deze week</div>
              <div className="pj-dstat-value" style={{ color: computed.weekFocus > 0 ? 'var(--pj-sun-dark)' : undefined }}>
                {computed.weekFocus}
              </div>
              <div className="pj-dstat-sub">{computed.weekFocus === 0 ? 'niets gepind' : 'taken gepind'}</div>
            </div>
          </div>
        </header>

        <div className="pj-detail-body">
          <div className="pj-phases">
            {project.phases.map(ph => (
              <PjPhaseColumn
                key={ph.id}
                phase={ph}
                todos={project.todos.filter(t => t.phase_id === ph.id)}
                users={users}
                onToggle={toggleTodo}
                onPin={pinTodo}
                onAddTodo={inlineAddTodo}
                onRenamePhase={renamePhase}
                onDeletePhase={deletePhase}
              />
            ))}
            <button className="pj-new-phase" onClick={addPhase}>
              <PjIcon name="plus" size={14} /> Nieuwe fase toevoegen
            </button>
          </div>
          <PjAside project={computed} users={users} onAdd={quickAddTodo} />
        </div>
      </div>
    </div>
  )
}
