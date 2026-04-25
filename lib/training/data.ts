export type TrCategoryKey =
  | 'onboarding'
  | 'tools'
  | 'opvolging'
  | 'aankoopproces'
  | 'processen'
  | 'afhandeling'

export interface TrCategory {
  key: TrCategoryKey
  label: string
  iconName: string // lucide name
  desc: string
}

export interface TrainingVideo {
  id: string
  title: string
  youtubeId: string
  category: TrCategoryKey
  description?: string
  duration_seconds?: number
  order_in_category?: number
  is_required?: boolean
  related_doc_slugs?: string[]
  created_at?: string
}

export interface RelatedDoc {
  code: string
  title: string
}

export const TR_CATEGORIES: TrCategory[] = [
  { key: 'onboarding', label: 'Onboarding', iconName: 'graduation-cap', desc: 'Start hier in week 1.' },
  { key: 'tools', label: 'Tools', iconName: 'wrench', desc: 'Walkthroughs van Calculator, Dossier, Kennisbank.' },
  { key: 'opvolging', label: 'Opvolging', iconName: 'phone-call', desc: 'Leads warm houden, follow-ups, terugbel-ritmes.' },
  { key: 'aankoopproces', label: 'Aankoopproces', iconName: 'key-round', desc: 'Van bod tot levering bij de notaris.' },
  { key: 'processen', label: 'Processen', iconName: 'git-branch', desc: 'Interne workflows en handovers.' },
  { key: 'afhandeling', label: 'Afhandeling', iconName: 'check-circle-2', desc: 'Aftercare, evaluatie, archivering.' },
]

// Seed met 12 demo-videos. Vervang youtubeId door echte trainingen
// of haal binnen via /api/training/videos zodra de DB-tabel bestaat.
export const TR_VIDEOS: TrainingVideo[] = [
  // Onboarding (5)
  {
    id: 'v-onb-01',
    title: 'Welkom bij Costa Select',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'onboarding',
    description: 'Wie zijn we, wat doen we, en hoe begeleiden we onze klanten van eerste vraag tot sleuteloverdracht.',
    duration_seconds: 7 * 60 + 12,
    order_in_category: 1,
    is_required: true,
    related_doc_slugs: ['CS-001-het-aankoopproces'],
    created_at: '2025-09-12',
  },
  {
    id: 'v-onb-02',
    title: 'Onze waarden en werkwijze',
    youtubeId: 'M7lc1UVf-VE',
    category: 'onboarding',
    description: "Hoe we communiceren met klanten, partners en collega's. Eerlijkheid, eigenaarschap, expertise.",
    duration_seconds: 9 * 60 + 38,
    order_in_category: 2,
    is_required: true,
    created_at: '2025-09-12',
  },
  {
    id: 'v-onb-03',
    title: 'Het Costa Select dashboard — een rondleiding',
    youtubeId: 'jNQXAC9IVRw',
    category: 'onboarding',
    description: 'Sidebar, secties, sneltoetsen. Waar vind je wat, en hoe navigeer je snel.',
    duration_seconds: 11 * 60 + 4,
    order_in_category: 3,
    is_required: true,
    created_at: '2025-09-18',
  },
  {
    id: 'v-onb-04',
    title: 'Een klant aannemen — eerste 24 uur',
    youtubeId: 'Ks-_Mh1QhMc',
    category: 'onboarding',
    description: 'Lead binnen via Woningbot. Wat doe je in het eerste etmaal? Welke vragen stel je, wat leg je vast.',
    duration_seconds: 14 * 60 + 22,
    order_in_category: 4,
    is_required: true,
    related_doc_slugs: ['CS-007-de-verkopende-makelaar'],
    created_at: '2025-09-25',
  },
  {
    id: 'v-onb-05',
    title: 'Compliance, AVG en geheimhouding',
    youtubeId: '9bZkp7q19f0',
    category: 'onboarding',
    description: "Wat mag wel en niet met klantdata, hoe ga je om met paspoorten en NIE's, geheimhoudingsregels.",
    duration_seconds: 8 * 60 + 17,
    order_in_category: 5,
    is_required: true,
    created_at: '2025-10-02',
  },

  // Tools (3)
  {
    id: 'v-too-01',
    title: 'De Calculator — kosten, belastingen, hypotheek',
    youtubeId: 'L_jWHffIx5E',
    category: 'tools',
    description: 'Hoe je in 5 minuten een complete kostenraming maakt voor je klant, inclusief ITP, notaris en hypotheek.',
    duration_seconds: 12 * 60 + 48,
    order_in_category: 1,
    is_required: false,
    related_doc_slugs: ['CS-003-belastingen-bij-aankoop'],
    created_at: '2026-02-04',
  },
  {
    id: 'v-too-02',
    title: 'Dossier opbouwen — van NIE tot escritura',
    youtubeId: 'fJ9rUzIMcZQ',
    category: 'tools',
    description: 'Welke documenten verzamel je in welke fase. Hoe je het dossier-tabblad gebruikt om niets te missen.',
    duration_seconds: 16 * 60 + 5,
    order_in_category: 2,
    is_required: false,
    created_at: '2026-04-19',
  },
  {
    id: 'v-too-03',
    title: 'Woningbot — leads filteren en toewijzen',
    youtubeId: 'QH2-TGUlwu4',
    category: 'tools',
    description: 'Hoe Woningbot leads scoort, waar je handmatig kunt sturen, en wanneer je een lead aan een collega doorgeeft.',
    duration_seconds: 9 * 60 + 51,
    order_in_category: 3,
    is_required: false,
    created_at: '2026-04-15',
  },

  // Opvolging (1)
  {
    id: 'v-opv-01',
    title: 'Het 7-dagen follow-up ritme',
    youtubeId: 'RgKAFK5djSk',
    category: 'opvolging',
    description: 'Wanneer je belt, wanneer je mailt, wanneer je loslaat. Het belritme dat onze conversie 22% hoger maakte.',
    duration_seconds: 13 * 60 + 30,
    order_in_category: 1,
    is_required: false,
    created_at: '2025-08-14',
  },

  // Aankoopproces (1)
  {
    id: 'v-aan-01',
    title: 'Van bod tot voorlopig koopcontract',
    youtubeId: 'OPf0YbXqDm0',
    category: 'aankoopproces',
    description: 'De Spaanse aankoopfase uitgelegd: arras, contrato privado, anticipo. Wie tekent wat, wanneer.',
    duration_seconds: 18 * 60 + 12,
    order_in_category: 1,
    is_required: false,
    related_doc_slugs: ['CS-001-het-aankoopproces', 'CS-006-onderhandelen'],
    created_at: '2025-06-20',
  },

  // Processen (1)
  {
    id: 'v-pro-01',
    title: 'Handover van consultant naar afhandeling',
    youtubeId: 'kJQP7kiw5Fk',
    category: 'processen',
    description: 'Wanneer draag je een dossier over aan het afhandelteam, en hoe zorg je dat niets tussen wal en schip valt.',
    duration_seconds: 6 * 60 + 44,
    order_in_category: 1,
    is_required: false,
    created_at: '2025-07-08',
  },

  // Afhandeling (1)
  {
    id: 'v-afh-01',
    title: 'Na de notaris — de eerste 30 dagen',
    youtubeId: 'JGwWNGJdvx8',
    category: 'afhandeling',
    description: 'Wat doe je voor je klant ná de levering: aansluitingen, registraties, eerste belastingaangifte.',
    duration_seconds: 11 * 60 + 27,
    order_in_category: 1,
    is_required: false,
    related_doc_slugs: ['CS-004-belastingen-na-aankoop'],
    created_at: '2025-10-15',
  },
]

// Mini doc-titles map zodat de detail-view "Bijbehorende kennisbank"
// snel rendert zonder de hele kennisbank te laden.
export const TR_RELATED_DOCS: Record<string, RelatedDoc> = {
  'CS-001-het-aankoopproces': { code: 'CS-001', title: 'Het aankoopproces' },
  'CS-006-onderhandelen': { code: 'CS-006', title: 'Onderhandelen' },
  'CS-007-de-verkopende-makelaar': { code: 'CS-007', title: 'De verkopende makelaar' },
  'CS-003-belastingen-bij-aankoop': { code: 'CS-003', title: 'Belastingen bij aankoop' },
  'CS-004-belastingen-na-aankoop': { code: 'CS-004', title: 'Belastingen na aankoop — Spanje' },
}

// Default "wat ga je leren" bullets per video.
export const TR_DEFAULT_LEARNINGS: Record<string, string[]> = {
  'v-onb-01': [
    'De geschiedenis en filosofie van Costa Select',
    'Hoe onze rol verschilt van een traditionele makelaar',
    'Welke beloftes we klanten doen — en welke bewust niet',
  ],
  'v-onb-04': [
    'Welke 6 vragen je in het eerste gesprek altijd stelt',
    'Hoe je verwachtingen managet over tijdlijn en kosten',
    "Wat je vastlegt in het dossier voor je collega's",
  ],
  'v-too-01': [
    'Hoe ITP, AJD en BTW samenhangen per regio',
    'Wanneer een hypotheek-simulatie nuttig is',
    'Welke kosten klanten vaak vergeten',
  ],
  'v-aan-01': [
    'Het verschil tussen contrato de arras en contrato privado',
    'Wie de aanbetaling vasthoudt, en wat als de koop afketst',
    'Hoe je de notaris-afspraak voorbereidt',
  ],
}

export function trFmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function trFmtDurationLong(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

export function trFmtTimeRemaining(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}u ${m}m`
  return `${m} min`
}

export function trYtThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export function trIsVideoNew(video: TrainingVideo): boolean {
  if (!video.created_at) return false
  const created = new Date(video.created_at).getTime()
  const now = Date.now()
  return now - created < 14 * 24 * 3600 * 1000
}

export interface WatchEntry {
  watched: boolean
  progress: number
  ts: string
}
export type WatchedMap = Record<string, WatchEntry>
export type Bookmarks = Record<string, boolean>
export type NotesMap = Record<string, string>
export interface LastActivity {
  videoId: string
  videoTitle: string
  date: string
}

export const LS_KEYS = {
  watched: 'cs_tr_watched',
  bookmarks: 'cs_tr_bookmarks',
  notes: 'cs_tr_notes',
  skipped: 'cs_tr_onb_skipped',
  lastActivity: 'cs_tr_last_activity',
} as const
