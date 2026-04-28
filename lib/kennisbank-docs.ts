export interface KennisbankDoc {
  slug: string
  code: string
  title: string
  category: string
  tags?: string[]
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

// Nieuw-vlag (binnen X dagen). Statisch want we hebben nog geen updated_at.
// Laat alleen 'CS-052' en hoger als 'nieuw' zien (latere additions).
export function isNew(doc: KennisbankDoc): boolean {
  const num = parseInt(doc.code.replace(/\D/g, ''), 10)
  return num >= 50
}
