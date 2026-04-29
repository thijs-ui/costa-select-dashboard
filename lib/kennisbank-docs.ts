export interface KennisbankDoc {
  slug: string
  code: string
  title: string
  category: string
  tags?: string[]
  created_at: string // ISO-datum (YYYY-MM-DD), bepaalt 'nieuw'-vlag en activity-sortering
}

export const categories = [
  'Aankoopproces',
  'Juridisch & Fiscaal',
  'Regio\'s',
  'Vastgoed & Markt',
  'Investeren',
  'Emigreren & Wonen',
  'Intern & Tools',
  'Marketing',
] as const

export type Category = typeof categories[number]

export const docs: KennisbankDoc[] = [
  // TIJDELIJK: alle bestaande docs (59 stuks) zijn verwijderd voor controlled
  // rebuild. Reversibel via `git checkout HEAD~1 -- content/kennisbank/ lib/kennisbank-docs.ts`.
  {
    slug: 'CS-microklimaten',
    code: 'CS-MICRO',
    title: 'Microklimaten in Spanje',
    category: "Regio's",
    created_at: '2026-04-22',
  },
  {
    slug: 'CS-prijzen-regios',
    code: 'CS-PRIJZEN',
    title: 'Prijzen & marktcontext per regio',
    category: "Regio's",
    created_at: '2026-04-28',
  },
]

export function getDocsByCategory(): Record<string, KennisbankDoc[]> {
  const grouped: Record<string, KennisbankDoc[]> = {}
  for (const cat of categories) {
    grouped[cat] = docs.filter(d => d.category === cat)
  }
  return grouped
}

export function getDocBySlug(slug: string): KennisbankDoc | undefined {
  return docs.find(d => d.slug === slug)
}

// Category-meta voor de redesign — icon-naam (lucide) + één-regel beschrijving.
export interface CategoryMeta {
  iconName: string
  desc: string
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Aankoopproces: {
    iconName: 'key-round',
    desc: 'Stap voor stap: van bod tot sleuteloverdracht.',
  },
  'Juridisch & Fiscaal': {
    iconName: 'scale',
    desc: 'NIE, notaris, belastingen, erfrecht, structuren.',
  },
  "Regio's": {
    iconName: 'map-pin',
    desc: "Costa's, steden, microklimaten, prijsniveaus.",
  },
  'Vastgoed & Markt': {
    iconName: 'home',
    desc: 'Marktdata, woningtypes, bouwkwaliteit, taxatie.',
  },
  Investeren: {
    iconName: 'trending-up',
    desc: 'Verhuur, rendement, fiscale optimalisatie.',
  },
  'Emigreren & Wonen': {
    iconName: 'plane',
    desc: 'Residencia, zorg, school, autoregistratie.',
  },
  'Intern & Tools': {
    iconName: 'wrench',
    desc: 'Onze processen, tooling, templates, sjablonen.',
  },
  Marketing: {
    iconName: 'megaphone',
    desc: 'Leadgen, content, advertising, brand-guidelines.',
  },
}

// Standaard reading-time + summary helpers — zolang er nog geen explicit veld
// per doc is, leiden we ze af van het slug-patroon (deterministisch).
export function getReadingMinutes(doc: KennisbankDoc): number {
  // Pseudorandom 4-12 op basis van slug — stabiel per doc.
  const hash = doc.slug.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return 4 + (hash % 9)
}

const SUMMARIES = [
  'Korte oriëntatie op het onderwerp en wanneer je dit document raadpleegt.',
  'Praktische checklist met de belangrijkste aandachtspunten in chronologische volgorde.',
  'Achtergrond, context en de vuistregels die we intern hanteren.',
  'Wat je moet weten voor het eerste klantgesprek over dit onderwerp.',
  'Stappenplan met voorbeelden, valkuilen en standaard-formuleringen.',
  'Verdiepende notitie — leestijd langer, maar dekkend voor de meeste edge-cases.',
] as const

export function getSummary(doc: KennisbankDoc): string {
  const hash = doc.slug.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return SUMMARIES[hash % SUMMARIES.length]
}

// Nieuw-vlag — doc telt als 'nieuw' als 'ie binnen de laatste 14 dagen is toegevoegd.
const NEW_WINDOW_DAYS = 14

export function isNew(doc: KennisbankDoc): boolean {
  const created = new Date(doc.created_at).getTime()
  if (Number.isNaN(created)) return false
  const ageDays = (Date.now() - created) / 86_400_000
  return ageDays >= 0 && ageDays <= NEW_WINDOW_DAYS
}
