// ============================================================================
// Costa Kompas v2 — data-foundation (TypeScript port voor dashboard)
//
// Gecopieerd uit /Users/thijskranenborg/costa-kompas/costa-kompas/src/data/.
// Bron: costa-kompas-v2-routeplan.md + mediaanprijzen.csv + type-woning-matrix.csv.
// Bij wijzigingen: synchroniseer met de standalone Kompas-repo.
// ============================================================================

export const SERVICE_BONUS = 0.02
export const DIMENSION_CAP = 0.30
export const ANSWER_SCORE: Record<'A' | 'B' | 'C', number> = { A: 2, B: 0, C: -2 }

export interface Region {
  id: string
  name: string
  subtitle: string
}

export const REGIONS: Region[] = [
  { id: 'costa-del-sol',       name: 'Costa del Sol',       subtitle: 'Málaga' },
  { id: 'costa-blanca-noord',  name: 'Costa Blanca Noord',  subtitle: 'Alicante noord' },
  { id: 'costa-blanca-sur',    name: 'Costa Blanca Sur',    subtitle: 'Alicante zuid' },
  { id: 'costa-calida',        name: 'Costa Cálida',        subtitle: 'Murcia' },
  { id: 'costa-tropical',      name: 'Costa Tropical',      subtitle: 'Granada' },
  { id: 'costa-de-valencia',   name: 'Costa de Valencia',   subtitle: 'Valencia provincie' },
  { id: 'costa-del-azahar',    name: 'Costa del Azahar',    subtitle: 'Castellón' },
  { id: 'costa-dorada',        name: 'Costa Dorada',        subtitle: 'Tarragona' },
  { id: 'costa-brava',         name: 'Costa Brava',         subtitle: 'Girona' },
  { id: 'costa-de-la-luz',     name: 'Costa de la Luz',     subtitle: 'Cádiz / Huelva' },
  { id: 'costa-de-almeria',    name: 'Costa de Almería',    subtitle: 'Almería' },
  { id: 'balearen',            name: 'Balearen',            subtitle: 'Mallorca / Menorca / Ibiza' },
  { id: 'canarische-eilanden', name: 'Canarische Eilanden', subtitle: 'Tenerife / Gran Canaria / Lanzarote' },
]

export const CONSULTANT_COVERAGE = [
  'costa-del-sol', 'costa-blanca-noord', 'costa-blanca-sur',
  'costa-de-valencia', 'costa-dorada', 'costa-brava',
]

export type DimensionId =
  | 'klimaat' | 'bereikbaarheid' | 'gemeenschap' | 'budget'
  | 'vastgoed' | 'levensstijl' | 'verhuur'

export interface Dimension {
  id: DimensionId
  name: string
}

export const DIMENSIONS: Dimension[] = [
  { id: 'klimaat',        name: 'Klimaat & Natuur' },
  { id: 'bereikbaarheid', name: 'Bereikbaarheid' },
  { id: 'gemeenschap',    name: 'Gemeenschap' },
  { id: 'budget',         name: 'Budget & Kosten' },
  { id: 'vastgoed',       name: 'Vastgoed & Aanbod' },
  { id: 'levensstijl',    name: 'Levensstijl & Passie' },
  { id: 'verhuur',        name: 'Verhuur & Gebruik' },
]

export interface QuestionOption {
  id: 'A' | 'B' | 'C'
  label: string
}

export interface Question {
  id: string
  dimension: DimensionId
  rank: 1 | 2 | 3
  text: string
  options: QuestionOption[]
}

export const QUESTIONS: Question[] = [
  { id: 'V1.1', dimension: 'klimaat', rank: 1, text: 'Welk klimaat past het best bij jou?', options: [
    { id: 'A', label: 'Altijd warm, bijna geen seizoenen' },
    { id: 'B', label: 'Warme zomer, zachte winter' },
    { id: 'C', label: 'Echte seizoenen: warme zomer en koude winter' },
  ]},
  { id: 'V1.2', dimension: 'klimaat', rank: 2, text: 'Welke natuur vind je het mooist?', options: [
    { id: 'A', label: 'Bergen en kliffen' },
    { id: 'B', label: 'Een mix van bergen en vlakke kust' },
    { id: 'C', label: 'Open en vlakke kust' },
  ]},
  { id: 'V1.3', dimension: 'klimaat', rank: 3, text: 'Hoe groen moet je omgeving zijn?', options: [
    { id: 'A', label: 'Veel groen en planten' },
    { id: 'B', label: 'Een mix van groen en droog' },
    { id: 'C', label: 'Droog met olijfbomen en cactussen' },
  ]},
  { id: 'V2.1', dimension: 'bereikbaarheid', rank: 1, text: 'Hoe belangrijk is snel naar Nederland of België kunnen vliegen?', options: [
    { id: 'A', label: 'Heel belangrijk, korte vluchten graag' },
    { id: 'B', label: 'Belangrijk, maar iets langer mag ook' },
    { id: 'C', label: 'Niet zo belangrijk' },
  ]},
  { id: 'V2.2', dimension: 'bereikbaarheid', rank: 2, text: 'Hoe ver mag je huis van het vliegveld zijn?', options: [
    { id: 'A', label: 'Minder dan 30 minuten rijden' },
    { id: 'B', label: 'Tussen 30 minuten en 1 uur' },
    { id: 'C', label: 'Meer dan 1 uur mag ook' },
  ]},
  { id: 'V2.3', dimension: 'bereikbaarheid', rank: 3, text: 'Wil je ook goede treinverbindingen in de buurt?', options: [
    { id: 'A', label: 'Ja, heel handig' },
    { id: 'B', label: 'Mag, maar hoeft niet' },
    { id: 'C', label: 'Nee, ik gebruik toch de auto' },
  ]},
  { id: 'V3.1', dimension: 'gemeenschap', rank: 1, text: 'Wat vind je van veel andere Nederlanders en Vlamingen in de buurt?', options: [
    { id: 'A', label: 'Fijn, dat maakt het makkelijker' },
    { id: 'B', label: 'Leuk om af en toe tegen te komen' },
    { id: 'C', label: 'Liever niet, ik wil iets anders' },
  ]},
  { id: 'V3.2', dimension: 'gemeenschap', rank: 2, text: 'Wat voor plek past bij jou?', options: [
    { id: 'A', label: 'Internationaal en toeristisch' },
    { id: 'B', label: 'Mix van lokaal en internationaal' },
    { id: 'C', label: 'Echt Spaans en lokaal' },
  ]},
  { id: 'V3.3', dimension: 'gemeenschap', rank: 3, text: 'Hoe groot moet je dorp of stad zijn?', options: [
    { id: 'A', label: 'Een klein dorp' },
    { id: 'B', label: 'Een middelgrote plaats' },
    { id: 'C', label: 'Een grote stad of drukke kustplaats' },
  ]},
  { id: 'V4.1', dimension: 'budget', rank: 1, text: 'Wat is het belangrijkst aan je huis?', options: [
    { id: 'A', label: 'Veel ruimte voor mijn geld' },
    { id: 'B', label: 'Een goede balans tussen ruimte en plek' },
    { id: 'C', label: 'Een mooi huis op een topplek' },
  ]},
  { id: 'V4.2', dimension: 'budget', rank: 2, text: 'Wil je in een bekende, chique plek wonen?', options: [
    { id: 'A', label: 'Ja, dat is belangrijk voor mij' },
    { id: 'B', label: 'Leuk, maar het hoeft niet' },
    { id: 'C', label: 'Nee, ik let vooral op het huis zelf' },
  ]},
  { id: 'V4.3', dimension: 'budget', rank: 3, text: 'Wat weegt zwaarder voor jou?', options: [
    { id: 'A', label: 'Lage maandkosten' },
    { id: 'B', label: 'Een middenweg' },
    { id: 'C', label: 'Toplocatie, ook als het duurder is' },
  ]},
  { id: 'V5.1', dimension: 'vastgoed', rank: 1, text: 'Wat voor huis zoek je?', options: [
    { id: 'A', label: 'Gloednieuw en kant-en-klaar' },
    { id: 'B', label: 'Niet te oud, in goede staat' },
    { id: 'C', label: 'Een huis met karakter, mag ouder zijn' },
  ]},
  { id: 'V5.2', dimension: 'vastgoed', rank: 2, text: 'Hoeveel keuze wil je in het aanbod?', options: [
    { id: 'A', label: 'Veel keuze: appartement, villa, finca' },
    { id: 'B', label: 'Een paar goede opties is genoeg' },
    { id: 'C', label: 'Ik weet al precies wat ik wil' },
  ]},
  { id: 'V5.3', dimension: 'vastgoed', rank: 3, text: 'Hoe moet je huis aanvoelen?', options: [
    { id: 'A', label: 'Modern en strak' },
    { id: 'B', label: 'Mix van modern en klassiek' },
    { id: 'C', label: 'Echt Spaans met karakter' },
  ]},
  { id: 'V6.1', dimension: 'levensstijl', rank: 1, text: 'Hoe actief ben je in je vrije tijd?', options: [
    { id: 'A', label: 'Heel actief: sport, wandelen, watersport' },
    { id: 'B', label: 'Mix van actief en rustig' },
    { id: 'C', label: 'Vooral rustig, niet zo sportief' },
  ]},
  { id: 'V6.2', dimension: 'levensstijl', rank: 2, text: 'Hoe belangrijk zijn restaurants, kunst en uitgaan?', options: [
    { id: 'A', label: 'Heel belangrijk' },
    { id: 'B', label: 'Af en toe leuk' },
    { id: 'C', label: 'Niet belangrijk' },
  ]},
  { id: 'V6.3', dimension: 'levensstijl', rank: 3, text: 'Hoe druk mag je omgeving zijn?', options: [
    { id: 'A', label: 'Druk en levendig' },
    { id: 'B', label: 'Niet te druk, niet te stil' },
    { id: 'C', label: 'Rustig en stil' },
  ]},
  { id: 'V7.1', dimension: 'verhuur', rank: 1, text: 'Wat is je hoofddoel met het huis?', options: [
    { id: 'A', label: 'Vooral verhuren (investering)' },
    { id: 'B', label: 'Zelf gebruiken en soms verhuren' },
    { id: 'C', label: 'Alleen zelf gebruiken' },
  ]},
  { id: 'V7.2', dimension: 'verhuur', rank: 2, text: 'Hoeveel maanden per jaar wil je er zelf zijn?', options: [
    { id: 'A', label: 'Minder dan 2 maanden' },
    { id: 'B', label: 'Tussen 3 en 6 maanden' },
    { id: 'C', label: 'Meer dan 6 maanden' },
  ]},
  { id: 'V7.3', dimension: 'verhuur', rank: 3, text: 'Als je verhuurt, wie zoek je dan?', options: [
    { id: 'A', label: 'Toeristen voor korte tijd (een week of twee)' },
    { id: 'B', label: 'Mensen die langer blijven (maanden)' },
    { id: 'C', label: 'Maakt mij niet uit' },
  ]},
]

export const REGION_POSITIONS: Record<string, Record<string, number>> = {
  'costa-del-sol':       { 'V1.1':1,'V1.2':-1,'V1.3':-2,'V2.1':2,'V2.2':1,'V2.3':0,'V3.1':2,'V3.2':-2,'V3.3':-1,'V4.1':-2,'V4.2':2,'V4.3':-1,'V5.1':2,'V5.2':2,'V5.3':-1,'V6.1':2,'V6.2':2,'V6.3':2,'V7.1':2,'V7.2':-1,'V7.3':1 },
  'costa-blanca-noord':  { 'V1.1':1,'V1.2':1,'V1.3':-1,'V2.1':1,'V2.2':1,'V2.3':-1,'V3.1':2,'V3.2':-1,'V3.3':0,'V4.1':0,'V4.2':1,'V4.3':0,'V5.1':1,'V5.2':2,'V5.3':0,'V6.1':1,'V6.2':0,'V6.3':0,'V7.1':1,'V7.2':0,'V7.3':-1 },
  'costa-blanca-sur':    { 'V1.1':1,'V1.2':-1,'V1.3':-2,'V2.1':2,'V2.2':2,'V2.3':-1,'V3.1':1,'V3.2':-1,'V3.3':-1,'V4.1':1,'V4.2':0,'V4.3':1,'V5.1':2,'V5.2':1,'V5.3':-1,'V6.1':1,'V6.2':-1,'V6.3':1,'V7.1':2,'V7.2':0,'V7.3':1 },
  'costa-calida':        { 'V1.1':1,'V1.2':-1,'V1.3':-2,'V2.1':1,'V2.2':1,'V2.3':-1,'V3.1':1,'V3.2':0,'V3.3':0,'V4.1':2,'V4.2':-1,'V4.3':2,'V5.1':1,'V5.2':1,'V5.3':-1,'V6.1':0,'V6.2':-1,'V6.3':-1,'V7.1':0,'V7.2':1,'V7.3':-1 },
  'costa-tropical':      { 'V1.1':1,'V1.2':2,'V1.3':0,'V2.1':-1,'V2.2':-1,'V2.3':-1,'V3.1':0,'V3.2':2,'V3.3':1,'V4.1':2,'V4.2':-1,'V4.3':2,'V5.1':-1,'V5.2':0,'V5.3':1,'V6.1':1,'V6.2':0,'V6.3':-2,'V7.1':0,'V7.2':1,'V7.3':0 },
  'costa-de-valencia':   { 'V1.1':0,'V1.2':0,'V1.3':0,'V2.1':1,'V2.2':1,'V2.3':2,'V3.1':-1,'V3.2':1,'V3.3':0,'V4.1':-1,'V4.2':0,'V4.3':1,'V5.1':-1,'V5.2':1,'V5.3':1,'V6.1':0,'V6.2':2,'V6.3':1,'V7.1':1,'V7.2':0,'V7.3':0 },
  'costa-del-azahar':    { 'V1.1':0,'V1.2':0,'V1.3':-1,'V2.1':0,'V2.2':0,'V2.3':1,'V3.1':-1,'V3.2':2,'V3.3':1,'V4.1':2,'V4.2':-1,'V4.3':2,'V5.1':0,'V5.2':0,'V5.3':1,'V6.1':0,'V6.2':-1,'V6.3':-1,'V7.1':0,'V7.2':1,'V7.3':0 },
  'costa-dorada':        { 'V1.1':0,'V1.2':0,'V1.3':0,'V2.1':1,'V2.2':1,'V2.3':2,'V3.1':1,'V3.2':0,'V3.3':0,'V4.1':1,'V4.2':0,'V4.3':1,'V5.1':0,'V5.2':1,'V5.3':1,'V6.1':0,'V6.2':1,'V6.3':1,'V7.1':2,'V7.2':0,'V7.3':2 },
  'costa-brava':         { 'V1.1':-1,'V1.2':2,'V1.3':1,'V2.1':1,'V2.2':0,'V2.3':2,'V3.1':1,'V3.2':0,'V3.3':1,'V4.1':-1,'V4.2':1,'V4.3':0,'V5.1':0,'V5.2':2,'V5.3':2,'V6.1':1,'V6.2':1,'V6.3':0,'V7.1':2,'V7.2':-1,'V7.3':2 },
  'costa-de-la-luz':     { 'V1.1':0,'V1.2':1,'V1.3':1,'V2.1':-1,'V2.2':-1,'V2.3':1,'V3.1':0,'V3.2':1,'V3.3':1,'V4.1':0,'V4.2':0,'V4.3':1,'V5.1':0,'V5.2':0,'V5.3':1,'V6.1':2,'V6.2':1,'V6.3':-1,'V7.1':1,'V7.2':0,'V7.3':0 },
  'costa-de-almeria':    { 'V1.1':1,'V1.2':1,'V1.3':-2,'V2.1':0,'V2.2':0,'V2.3':-1,'V3.1':-1,'V3.2':1,'V3.3':1,'V4.1':2,'V4.2':-1,'V4.3':2,'V5.1':1,'V5.2':0,'V5.3':-1,'V6.1':1,'V6.2':-1,'V6.3':-2,'V7.1':0,'V7.2':1,'V7.3':0 },
  'balearen':            { 'V1.1':1,'V1.2':1,'V1.3':0,'V2.1':1,'V2.2':0,'V2.3':-2,'V3.1':1,'V3.2':0,'V3.3':0,'V4.1':-2,'V4.2':2,'V4.3':-2,'V5.1':0,'V5.2':2,'V5.3':2,'V6.1':1,'V6.2':1,'V6.3':1,'V7.1':2,'V7.2':-1,'V7.3':2 },
  'canarische-eilanden': { 'V1.1':2,'V1.2':2,'V1.3':0,'V2.1':0,'V2.2':0,'V2.3':-2,'V3.1':1,'V3.2':0,'V3.3':0,'V4.1':0,'V4.2':0,'V4.3':1,'V5.1':1,'V5.2':1,'V5.3':0,'V6.1':2,'V6.2':0,'V6.3':0,'V7.1':2,'V7.2':-1,'V7.3':-1 },
}

// ─── Hard filters + doel-aanpassingen ────────────────────────────────────────

export const MEDIAN_PRICES: Record<string, number> = {
  'costa-del-sol': 450_000, 'costa-blanca-noord': 350_000, 'costa-blanca-sur': 200_000,
  'costa-calida': 160_000, 'costa-tropical': 220_000, 'costa-de-valencia': 310_000,
  'costa-del-azahar': 150_000, 'costa-dorada': 240_000, 'costa-brava': 350_000,
  'costa-de-la-luz': 250_000, 'costa-de-almeria': 170_000, 'balearen': 500_000,
  'canarische-eilanden': 340_000,
}

export type TypeKey = 'appartement' | 'villa' | 'finca' | 'townhouse' | 'penthouse'
export type Availability = 'ja' | 'beperkt' | 'nee'

export const TYPE_AVAILABILITY: Record<string, Record<TypeKey, Availability>> = {
  'costa-del-sol':       { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'ja' },
  'costa-blanca-noord':  { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'ja' },
  'costa-blanca-sur':    { appartement:'ja', villa:'ja', finca:'nee',     townhouse:'ja', penthouse:'ja' },
  'costa-calida':        { appartement:'ja', villa:'ja', finca:'beperkt', townhouse:'ja', penthouse:'beperkt' },
  'costa-tropical':      { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'beperkt' },
  'costa-de-valencia':   { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'ja' },
  'costa-del-azahar':    { appartement:'ja', villa:'ja', finca:'beperkt', townhouse:'ja', penthouse:'beperkt' },
  'costa-dorada':        { appartement:'ja', villa:'ja', finca:'beperkt', townhouse:'ja', penthouse:'ja' },
  'costa-brava':         { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'ja' },
  'costa-de-la-luz':     { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'beperkt' },
  'costa-de-almeria':    { appartement:'ja', villa:'ja', finca:'beperkt', townhouse:'ja', penthouse:'beperkt' },
  'balearen':            { appartement:'ja', villa:'ja', finca:'ja',      townhouse:'ja', penthouse:'ja' },
  'canarische-eilanden': { appartement:'ja', villa:'ja', finca:'nee',     townhouse:'ja', penthouse:'ja' },
}

export type Doel = 'tweede-huis' | 'permanent' | 'investering'

export const DOEL_WEIGHT_ADJUSTMENTS: Record<Doel, Partial<Record<DimensionId, number>>> = {
  // Vanaf Fase 7: investeerder-bank vervangt de bonus-weging — eigen matrix
  // doet het inhoudelijke werk.
  'investering':  {},
  'permanent':    { gemeenschap: +1, bereikbaarheid: -1 },
  'tweede-huis':  {},
}

export const UI_TYPE_MAP: Record<string, TypeKey> = {
  appartement: 'appartement',
  woning: 'villa',
}
