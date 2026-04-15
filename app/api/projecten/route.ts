import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const [projectRes, phasesRes, todosRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('project_phases').select('*').eq('project_id', id).order('sort_order'),
      supabase.from('todos').select('*').eq('project_id', id).order('created_at'),
    ])
    if (projectRes.error) return NextResponse.json({ error: projectRes.error.message }, { status: 500 })
    return NextResponse.json({ ...projectRes.data, phases: phasesRes.data ?? [], todos: todosRes.data ?? [] })
  }

  // Overzicht: projecten + todos count
  const { data: projects, error } = await supabase.from('projects').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Haal todos counts per project
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: allTodos } = await supabase
    .from('todos')
    .select('id, project_id, phase_id, status, completed_at, is_week_focus')
    .in('project_id', projectIds.length > 0 ? projectIds : ['none'])

  // Haal fases op
  const { data: allPhases } = await supabase
    .from('project_phases')
    .select('id, project_id, name, sort_order')
    .in('project_id', projectIds.length > 0 ? projectIds : ['none'])
    .order('sort_order')

  const enriched = (projects ?? []).map(p => {
    const todos = (allTodos ?? []).filter(t => t.project_id === p.id)
    const phases = (allPhases ?? []).filter(ph => ph.project_id === p.id)
    const done = todos.filter(t => t.status === 'afgerond').length
    const total = todos.length
    const weekFocus = todos.filter(t => t.is_week_focus && t.status === 'open').length

    // Huidige fase: eerste fase die niet 100% af is
    let currentPhase = null
    for (const phase of phases) {
      const phaseTodos = todos.filter(t => t.phase_id === phase.id)
      const phaseDone = phaseTodos.filter(t => t.status === 'afgerond').length
      if (phaseTodos.length === 0 || phaseDone < phaseTodos.length) {
        currentPhase = phase.name
        break
      }
    }

    // Velocity: afgeronde todos in laatste 14 dagen
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const recentDone = todos.filter(t => t.status === 'afgerond' && t.completed_at && t.completed_at > twoWeeksAgo).length
    const velocityPerWeek = recentDone / 2
    const remaining = total - done
    const estimatedWeeks = velocityPerWeek > 0 ? remaining / velocityPerWeek : null
    const estimatedDate = estimatedWeeks ? new Date(Date.now() + estimatedWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null

    return { ...p, done, total, weekFocus, currentPhase, estimatedDate, velocityPerWeek }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  const { data, error } = await supabase.from('projects').insert({
    name: body.name,
    description: body.description || null,
    owner_id: body.owner_id || null,
    target_date: body.target_date || null,
    status: body.status || 'actief',
    color: body.color || '#0EAE96',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  updates.updated_at = new Date().toISOString()
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = createServiceClient()
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
