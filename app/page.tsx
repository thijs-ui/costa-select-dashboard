'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createBrowserClient } from '@/lib/supabase-browser'
import {
  CATEGORY_META,
  docs as kbDocs,
  getReadingMinutes,
  getSummary as getKbSummary,
  isNew as isKbNew,
} from '@/lib/kennisbank-docs'
import { TR_VIDEOS, trIsVideoNew } from '@/lib/training/data'
import {
  HmActionRow,
  HmActivityFeed,
  HmDossiersCol,
  HmHero,
  HmPlatformGrid,
  HmSpotlight,
  type HmActivityEvent,
  type HmDossierItem,
  type HmPill,
  type HmSpotlightItem,
  type HmSummaryParts,
  type HmTodoLite,
  type HmTripLite,
} from '@/components/home/parts'

interface TodoRow {
  id: string
  description: string
  deadline: string | null
  status: string
  created_by: string
  created_at: string
}
interface DossierRow {
  id: string
  adres: string
  regio: string | null
  vraagprijs: number | null
  created_at: string
}
interface TripRow {
  id: string
  client_name: string
  trip_date: string
  start_time: string | null
  status: string
  viewing_stops: Array<{ id: string }>
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Goedenacht'
  if (hour < 12) return 'Goedemorgen'
  if (hour < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function getDateLabel(): string {
  const days = [
    'zondag',
    'maandag',
    'dinsdag',
    'woensdag',
    'donderdag',
    'vrijdag',
    'zaterdag',
  ]
  const months = [
    'januari',
    'februari',
    'maart',
    'april',
    'mei',
    'juni',
    'juli',
    'augustus',
    'september',
    'oktober',
    'november',
    'december',
  ]
  const d = new Date()
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function tripDateLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tripDay = new Date(d)
  tripDay.setHours(0, 0, 0, 0)
  const diff = (tripDay.getTime() - today.getTime()) / (24 * 3600 * 1000)
  if (diff === 0) return 'Vandaag'
  if (diff === 1) return 'Morgen'
  if (diff > 1 && diff < 7) {
    return d.toLocaleDateString('nl-NL', { weekday: 'long' })
  }
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = (now - d.getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s geleden`
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`
  if (diff < 24 * 3600) return `${Math.floor(diff / 3600)} uur geleden`
  if (diff < 48 * 3600) return 'Gisteren'
  return `${Math.floor(diff / (24 * 3600))} dagen geleden`
}

export default function HomePage() {
  const { user, role, naam, loading } = useAuth()
  const supabase = useMemo(() => createBrowserClient(), [])

  const [todos, setTodos] = useState<TodoRow[]>([])
  const [dossiers, setDossiers] = useState<DossierRow[]>([])
  const [nextTrip, setNextTrip] = useState<TripRow | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setDataLoading(false)
        return
      }
      try {
        const todayIso = new Date().toISOString().split('T')[0]
        const results = await Promise.allSettled([
          supabase
            .from('todos')
            .select('id, description, deadline, status, created_by, created_at')
            .eq('status', 'open')
            .eq('assigned_to', user.id)
            .order('deadline', { ascending: true, nullsFirst: false })
            .limit(8),
          supabase
            .from('dossier_history')
            .select('id, adres, regio, vraagprijs, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('viewing_trips')
            .select('id, client_name, trip_date, start_time, status, viewing_stops(id)')
            .gte('trip_date', todayIso)
            .order('trip_date', { ascending: true })
            .limit(1),
        ])

        const [todosRes, dossiersRes, tripsRes] = results
        const todosData = todosRes.status === 'fulfilled' ? (todosRes.value.data ?? []) : []
        const dossiersData = dossiersRes.status === 'fulfilled' ? (dossiersRes.value.data ?? []) : []
        const tripsData = tripsRes.status === 'fulfilled' ? (tripsRes.value.data ?? []) : []
        setTodos(todosData as TodoRow[])
        setDossiers(dossiersData as DossierRow[])
        setNextTrip((tripsData as TripRow[])[0] ?? null)
      } catch (error) {
        console.error('Homepage load error:', error)
      } finally {
        setDataLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (loading || dataLoading) {
    return (
      <div className="hm-page">
        <div className="hm-shell">
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: 'var(--fg-subtle)',
              fontSize: 13,
            }}
          >
            Laden…
          </div>
        </div>
      </div>
    )
  }

  const isAdmin = role === 'admin'
  const firstName =
    naam?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Costa'
  const greeting = getGreeting()
  const dateLabel = getDateLabel()

  // Todos transformeren
  const overdueCount = todos.filter(
    t => t.deadline && new Date(t.deadline) < new Date(new Date().toDateString())
  ).length
  const todoLite: HmTodoLite[] = todos.slice(0, 3).map(t => ({
    id: t.id,
    title: t.description,
    overdue:
      !!t.deadline &&
      new Date(t.deadline) < new Date(new Date().toDateString()),
    flagLabel: t.deadline
      ? new Date(t.deadline).toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'short',
        })
      : '',
  }))

  // Trip
  const tripLite: HmTripLite | null = nextTrip
    ? {
        id: nextTrip.id,
        client: nextTrip.client_name || 'Onbekend',
        dateLabel: tripDateLabel(nextTrip.trip_date),
        timeLabel: (nextTrip.start_time ?? '09:00').substring(0, 5),
        region: '—',
        stops: nextTrip.viewing_stops?.length ?? 0,
      }
    : null

  // Hero pills
  const newKb = kbDocs.filter(isKbNew)
  const newTraining = TR_VIDEOS.filter(trIsVideoNew)
  const pills: HmPill[] = [
    {
      kind: 'todo',
      label: `${todos.length} open ${todos.length === 1 ? 'taak' : 'taken'}`,
      meta: overdueCount > 0 ? `${overdueCount} over deadline` : undefined,
      tone: overdueCount > 0 ? 'sun' : 'deepsea',
      href: '/dashboard/todos',
    },
  ]
  if (nextTrip) {
    pills.push({
      kind: 'trip',
      label: `Bezichtiging ${tripDateLabel(nextTrip.trip_date).toLowerCase()}`,
      meta: nextTrip.start_time?.substring(0, 5),
      tone: 'deepsea',
      href: `/bezichtigingen/${nextTrip.id}`,
    })
  }
  if (newKb.length > 0) {
    pills.push({
      kind: 'kb',
      label: `${newKb.length} ${newKb.length === 1 ? 'doc' : 'docs'} bijgewerkt`,
      meta: 'kennisbank',
      tone: 'sun',
      href: '/kennisbank',
    })
  }
  if (newTraining.length > 0) {
    pills.push({
      kind: 'training',
      label: `${newTraining.length} ${newTraining.length === 1 ? 'nieuwe' : 'nieuwe'} training`,
      meta: 'academie',
      tone: 'sun',
      href: '/training',
    })
  }
  if (dossiers.length > 0) {
    pills.push({
      kind: 'dossier',
      label: `${dossiers.length} recente dossiers`,
      meta: 'overzicht',
      tone: 'deepsea',
      href: '/dossier',
    })
  }

  // Hero summary line
  const summary: HmSummaryParts = {
    before: `${todos.length === 0 ? 'Geen' : todos.length === 1 ? 'Eén' : todos.length} `,
    numA: `${todos.length === 1 ? 'taak' : 'taken'} open`,
    middle: nextTrip
      ? `, en de eerstvolgende bezichtiging staat ${tripDateLabel(nextTrip.trip_date).toLowerCase()}. `
      : ', en geen bezichtigingen gepland. ',
    numB: newKb.length > 0 ? `${newKb.length} nieuwe docs` : 'Niets nieuws',
    end: newKb.length > 0 ? ' in de kennisbank deze week.' : ' deze week.',
  }

  // Spotlight: meest recent kb-doc met is_new=true
  const spotlightItem: HmSpotlightItem | null =
    newKb.length > 0
      ? (() => {
          const d = newKb[0]
          const meta = CATEGORY_META[d.category as keyof typeof CATEGORY_META]
          return {
            code: d.code,
            category: meta?.iconName ? d.category : d.category,
            title: d.title,
            summary: getKbSummary(d),
            readMinutes: getReadingMinutes(d),
            addedLabel: 'Toegevoegd deze week',
            href: `/kennisbank/${d.slug}`,
          }
        })()
      : null

  // Platform tiles
  const platformHero = {
    label: 'Woningbot',
    tagline: 'AI-aangedreven woningzoek',
    description:
      'Beschrijf wat de klant zoekt in natuurlijke taal — Woningbot doorzoekt en filtert duizenden woningen, en geeft een onderbouwde shortlist terug.',
    iconName: 'message-square',
    href: '/woningbot',
    statValue: `${kbDocs.length}+ bronnen`,
    statLabel: 'in kennisbank',
    ctaLabel: 'Open Woningbot',
  }
  const platformTiles = [
    {
      key: 'kennisbank',
      label: 'Kennisbank',
      iconName: 'book-open',
      href: '/kennisbank',
      hint: `${kbDocs.length} docs${newKb.length > 0 ? ` · ${newKb.length} nieuw` : ''}`,
    },
    {
      key: 'training',
      label: 'Training',
      iconName: 'graduation-cap',
      href: '/training',
      hint: `${TR_VIDEOS.length} video's${newTraining.length > 0 ? ` · ${newTraining.length} nieuw` : ''}`,
    },
    {
      key: 'kompas',
      label: 'Costa Kompas',
      iconName: 'compass',
      href: '/kompas-v2',
      hint: 'Regio-gids · 8 costa\'s',
    },
  ]

  // Dossier list
  const dossierItems: HmDossierItem[] = dossiers.map(d => {
    const initials = d.adres
      ? d.adres
          .split(/\s+/)
          .slice(0, 2)
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '??'
    return {
      id: d.id,
      client: d.adres || '—',
      initials,
      region: d.regio ?? '—',
      activity: d.vraagprijs
        ? `Vraagprijs € ${Number(d.vraagprijs).toLocaleString('nl-NL')}`
        : 'Dossier aangemaakt',
      stage: 'In behandeling',
      stageKind: 'neutral' as const,
      updatedLabel: relativeTime(d.created_at),
      href: '/dossier',
    }
  })

  // Activity feed: combineer recente todos + trips + dossiers
  const activity: HmActivityEvent[] = []
  for (const t of todos.slice(0, 2)) {
    activity.push({
      id: `todo-${t.id}`,
      iconName: 'check-square',
      actor: t.created_by === user?.id ? 'Jij' : 'Iemand',
      text: <>heeft een taak gemaakt — {t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}</>,
      timeLabel: relativeTime(t.created_at),
      href: '/dashboard/todos',
    })
  }
  if (nextTrip) {
    activity.push({
      id: `trip-${nextTrip.id}`,
      iconName: 'calendar-days',
      actor: 'Bezichtigingen',
      text: <>bezichtiging voor <b>{nextTrip.client_name}</b> staat gepland — {tripDateLabel(nextTrip.trip_date).toLowerCase()}.</>,
      timeLabel: tripDateLabel(nextTrip.trip_date),
      href: `/bezichtigingen/${nextTrip.id}`,
    })
  }
  for (const d of dossiers.slice(0, 3)) {
    activity.push({
      id: `dossier-${d.id}`,
      iconName: 'file-text',
      actor: 'Dossier',
      text: <>{d.adres} — {d.regio ?? 'regio onbekend'}.</>,
      timeLabel: relativeTime(d.created_at),
      href: '/dossier',
    })
  }
  if (newKb.length > 0) {
    activity.push({
      id: 'kb-new',
      iconName: 'book-open',
      actor: 'Kennisbank',
      text: <>nieuwe documenten toegevoegd — {newKb[0].title}.</>,
      timeLabel: 'Deze week',
      href: '/kennisbank',
    })
  }
  if (newTraining.length > 0) {
    activity.push({
      id: 'tr-new',
      iconName: 'graduation-cap',
      actor: 'Academie',
      text: <>nieuwe training toegevoegd — {newTraining[0].title}.</>,
      timeLabel: 'Deze week',
      href: '/training',
    })
  }

  return (
    <div className="hm-page">
      <div className="hm-shell">
        <HmHero
          greeting={greeting}
          name={firstName}
          dateLabel={dateLabel}
          summary={summary}
          pills={pills}
          isAdmin={isAdmin}
        />

        <HmActionRow
          todos={todoLite}
          trip={tripLite}
          totalTodos={todos.length}
          overdueCount={overdueCount}
        />

        <HmSpotlight item={spotlightItem} />

        <HmPlatformGrid hero={platformHero} tiles={platformTiles} />

        <div className="hm-twocol">
          <HmDossiersCol dossiers={dossierItems} />
          <HmActivityFeed events={activity} />
        </div>
      </div>
    </div>
  )
}
