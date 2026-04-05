// ─── Costa Kompas Data ──────────────────────────────────────────────────────
// All regions, questions, categories, and filter definitions in one file.

export type Position = 'E' | 'N' | 'O'
export type Profile = 'tweede-huis' | 'permanent' | 'investering'
export type FilterType = 'appartement' | 'woning' | 'beide'

export interface Region {
  id: string
  name: string
  short: string
  province: string
  minAppartement: number
  minWoning: number
  vliegveldMinuten: number
  winterKlimaat: boolean
  verhuurMogelijk: boolean
  verhuurNote: string
  verhuurWaarschuwing?: string
  description: string
  rendementsType?: string
  emoji: string
}

export interface Question {
  id: string
  cat: string
  stelling: string
  pos: Position[]
  condition?: { filter: string; value: string }
}

export interface Category {
  id: string
  label: string
  scope: 'eigengebruik' | 'tweede-huis' | 'permanent' | 'investering'
}

// ─── 14 Regions (index order matters for scoring) ───────────────────────────

export const REGIONS: Region[] = [
  {
    id: 'costa-brava',
    name: 'Costa Brava',
    short: 'CBra',
    province: 'Girona',
    minAppartement: 200000,
    minWoning: 450000,
    vliegveldMinuten: 60,
    winterKlimaat: false,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Ruige kust, authentieke dorpen en prachtige natuur aan de Catalaanse kust.',
    emoji: '🏔️',
  },
  {
    id: 'costa-dorada',
    name: 'Costa Dorada',
    short: 'CDor',
    province: 'Tarragona',
    minAppartement: 100000,
    minWoning: 225000,
    vliegveldMinuten: 30,
    winterKlimaat: false,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Gouden stranden, Romeinse geschiedenis en wijngebieden.',
    emoji: '🏖️',
  },
  {
    id: 'costa-de-valencia',
    name: 'Costa de Valencia',
    short: 'CVal',
    province: 'Valencia provincie',
    minAppartement: 110000,
    minWoning: 215000,
    vliegveldMinuten: 45,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Betaalbaar wonen met het beste klimaat van het Spaanse vasteland.',
    emoji: '🍊',
  },
  {
    id: 'valencia-stad',
    name: 'Valencia Stad',
    short: 'VLC',
    province: 'Valencia stad',
    minAppartement: 200000,
    minWoning: 375000,
    vliegveldMinuten: 15,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Bruisende stad met cultuur, strand en een bloeiende expat-community.',
    emoji: '🏙️',
  },
  {
    id: 'cb-noord',
    name: 'Costa Blanca Noord',
    short: 'CBN',
    province: 'Alicante noord',
    minAppartement: 220000,
    minWoning: 475000,
    vliegveldMinuten: 60,
    winterKlimaat: false,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Exclusieve kust met spectaculaire uitzichten en internationale sfeer.',
    emoji: '⛵',
  },
  {
    id: 'cb-zuid',
    name: 'Costa Blanca Zuid',
    short: 'CBZ',
    province: 'Alicante zuid',
    minAppartement: 110000,
    minWoning: 210000,
    vliegveldMinuten: 30,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Zonnigste regio met betaalbaar vastgoed en grote Nederlandse gemeenschap.',
    emoji: '☀️',
  },
  {
    id: 'costa-calida',
    name: 'Costa Calida',
    short: 'CCal',
    province: 'Murcia',
    minAppartement: 110000,
    minWoning: 190000,
    vliegveldMinuten: 45,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Warme kust met de Mar Menor en authentiek Spaans leven.',
    emoji: '🌊',
  },
  {
    id: 'costa-del-sol',
    name: 'Costa del Sol',
    short: 'CdS',
    province: 'Malaga',
    minAppartement: 250000,
    minWoning: 500000,
    vliegveldMinuten: 30,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'De meest internationale kust met uitstekende voorzieningen en infrastructuur.',
    emoji: '🌴',
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    short: 'Bar',
    province: 'Barcelona',
    minAppartement: 375000,
    minWoning: 750000,
    vliegveldMinuten: 20,
    winterKlimaat: false,
    verhuurMogelijk: false,
    verhuurNote: 'Verhuur NIET mogelijk (moratorium)',
    description: 'Wereldstad met cultuur, architectuur en Mediterraans leven.',
    emoji: '🎭',
  },
  {
    id: 'madrid',
    name: 'Madrid',
    short: 'Mad',
    province: 'Madrid',
    minAppartement: 300000,
    minWoning: 575000,
    vliegveldMinuten: 20,
    winterKlimaat: false,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Hoofdstad met rijke cultuur, nachtleven en een sterke huurmarkt.',
    emoji: '👑',
  },
  {
    id: 'balearen',
    name: 'Balearen',
    short: 'Bal',
    province: 'Mallorca / Menorca / Ibiza',
    minAppartement: 425000,
    minWoning: 850000,
    vliegveldMinuten: 20,
    winterKlimaat: false,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur mogelijk (strikt quotum)',
    verhuurWaarschuwing: 'Let op: strikt vergunningenstelsel. Informeer vooraf.',
    description: 'Paradijselijke eilanden met exclusief vastgoed en seizoensgebonden verhuur.',
    emoji: '🏝️',
  },
  {
    id: 'canarische-eilanden',
    name: 'Canarische Eilanden',
    short: 'Can',
    province: 'Tenerife / Gran Canaria / Lanzarote',
    minAppartement: 175000,
    minWoning: 325000,
    vliegveldMinuten: 20,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Eeuwige lente met vulkanische natuur en toeristische verhuurmarkt.',
    emoji: '🌋',
  },
  {
    id: 'costa-tropical',
    name: 'Costa Tropical',
    short: 'CTro',
    province: 'Granada',
    minAppartement: 110000,
    minWoning: 210000,
    vliegveldMinuten: 60,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Subtropisch microklimaat tussen bergen en zee, vlak bij Granada.',
    emoji: '🥑',
  },
  {
    id: 'costa-de-la-luz',
    name: 'Costa de la Luz',
    short: 'CdL',
    province: 'Cadiz',
    minAppartement: 135000,
    minWoning: 270000,
    vliegveldMinuten: 90,
    winterKlimaat: true,
    verhuurMogelijk: true,
    verhuurNote: 'Verhuur toegestaan',
    description: 'Ongerepte Atlantische kust met surfen, natuur en authentiek Andalusisch leven.',
    emoji: '🏄',
  },
]

// ─── Categories ─────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  { id: 'KN', label: 'Klimaat & Natuur', scope: 'eigengebruik' },
  { id: 'BR', label: 'Bereikbaarheid', scope: 'eigengebruik' },
  { id: 'GM', label: 'Gemeenschap', scope: 'eigengebruik' },
  { id: 'BK', label: 'Budget & Kosten', scope: 'eigengebruik' },
  { id: 'VA', label: 'Vastgoed & Aanbod', scope: 'eigengebruik' },
  { id: 'TH', label: 'Verhuur & Gebruik', scope: 'tweede-huis' },
  { id: 'PW', label: 'Leven & Voorzieningen', scope: 'permanent' },
  { id: 'SIG', label: 'Levensstijl & Passie', scope: 'eigengebruik' },
  { id: 'MA', label: 'Markt & Liquiditeit', scope: 'investering' },
  { id: 'RN', label: 'Huurrendement', scope: 'investering' },
  { id: 'KG', label: 'Kapitaalgroei', scope: 'investering' },
  { id: 'FL', label: 'Flippen & Renovatie', scope: 'investering' },
  { id: 'BH', label: 'Beheer & Kosten', scope: 'investering' },
]

export function getCategoriesForProfile(profile: Profile): Category[] {
  const sig = CATEGORIES.filter((c) => c.id === 'SIG')
  if (profile === 'investering') {
    return [
      ...CATEGORIES.filter((c) => c.scope === 'investering'),
      ...sig,
    ]
  }
  const eigengebruik = CATEGORIES.filter((c) => c.scope === 'eigengebruik')
  if (profile === 'tweede-huis') {
    return [...eigengebruik, ...CATEGORIES.filter((c) => c.scope === 'tweede-huis')]
  }
  if (profile === 'permanent') {
    return [...eigengebruik, ...CATEGORIES.filter((c) => c.scope === 'permanent')]
  }
  return eigengebruik
}

// ─── Questions ──────────────────────────────────────────────────────────────

const SHARED_EIGENGEBRUIK: Question[] = [
  { id: 'KN1', cat: 'KN', stelling: 'Ik wil het hele jaar door een aangenaam, mild klimaat zonder extreme hitte.', pos: ['E','N','N','N','N','E','E','E','N','N','N','E','N','N'] },
  { id: 'KN2', cat: 'KN', stelling: 'Ik geef de voorkeur aan een droog, woestijnachtig landschap boven groene heuvels.', pos: ['O','O','N','N','O','N','E','E','O','O','N','E','E','N'] },
  { id: 'KN3', cat: 'KN', stelling: 'Ik wil dicht bij de bergen wonen voor wandelen en natuur.', pos: ['E','N','E','N','N','O','E','O','O','O','N','N','E','E'] },
  { id: 'KN4', cat: 'KN', stelling: 'Een bruisend stadsleven met cultuur en uitgaansleven is belangrijk voor mij.', pos: ['N','N','N','N','N','O','N','E','E','E','O','E','E','N'] },
  { id: 'BR1', cat: 'BR', stelling: 'Ik wil binnen 30 minuten op een internationale luchthaven zijn.', pos: ['N','E','E','E','N','E','E','E','E','E','E','E','N','O'] },
  { id: 'BR2', cat: 'BR', stelling: 'Regelmatige directe vluchten naar Nederland/België zijn essentieel.', pos: ['N','E','E','E','E','E','E','E','E','E','E','E','N','O'] },
  { id: 'BR3', cat: 'BR', stelling: 'Ik wil goede snelwegverbindingen en openbaar vervoer in de regio.', pos: ['N','N','E','E','N','N','N','E','E','E','O','O','O','N'] },
  { id: 'GM1', cat: 'GM', stelling: 'Een grote Nederlandse/Belgische gemeenschap in de buurt is belangrijk.', pos: ['O','O','O','N','E','E','E','E','N','O','N','N','O','O'] },
  { id: 'GM2', cat: 'GM', stelling: 'Ik zoek een authentiek Spaans leven, niet een expat-bubbel.', pos: ['E','N','E','E','O','O','N','N','E','E','N','N','E','E'] },
  { id: 'GM3', cat: 'GM', stelling: 'Internationale scholen en faciliteiten voor gezinnen zijn belangrijk.', pos: ['N','O','O','E','O','O','O','E','E','E','N','N','O','O'] },
  { id: 'BK1', cat: 'BK', stelling: 'Ik zoek de laagst mogelijke instapprijs voor vastgoed.', pos: ['O','E','E','N','O','E','E','O','O','O','O','N','E','E'] },
  { id: 'BK2', cat: 'BK', stelling: 'Lage maandelijkse kosten (gemeentebelasting, VvE, energie) zijn cruciaal.', pos: ['O','N','E','E','N','E','E','N','O','N','O','N','E','E'] },
  { id: 'BK3', cat: 'BK', stelling: 'Ik ben bereid meer te betalen voor kwaliteit en locatie.', pos: ['E','O','O','N','E','O','O','E','E','E','E','N','O','O'] },
  { id: 'VA1', cat: 'VA', stelling: 'Ik wil keuze hebben uit zowel appartementen als villa\'s.', pos: ['E','N','N','O','E','E','N','E','O','O','E','E','E','E'], condition: { filter: 'type', value: 'beide' } },
  { id: 'VA2', cat: 'VA', stelling: 'Een groot en divers aanbod van woningen is belangrijk voor mij.', pos: ['E','E','E','E','E','N','E','N','N','N','E','N','E','E'] },
]

const TWEEDE_HUIS_EXTRA: Question[] = [
  { id: 'TH1', cat: 'TH', stelling: 'Ik wil mijn woning verhuren als ik er zelf niet ben.', pos: ['N','N','E','N','E','E','E','E','O','O','N','E','N','N'] },
  { id: 'TH2', cat: 'TH', stelling: 'Een hoog toeristisch verhuurrendement is belangrijker dan eigen gebruik.', pos: ['N','N','N','N','N','N','N','E','O','N','E','E','O','O'] },
  { id: 'TH3', cat: 'TH', stelling: 'Ik wil het hele jaar door kunnen genieten van een aangenaam klimaat.', pos: ['O','O','N','N','O','N','E','E','O','O','N','E','E','N'] },
  { id: 'TH4', cat: 'TH', stelling: 'Goede verhuurinfrastructuur (beheerders, platforms) is belangrijk.', pos: ['N','N','N','E','E','E','N','E','E','E','E','E','O','O'] },
  { id: 'TH5', cat: 'TH', stelling: 'Ik wil dat de woning makkelijk bereikbaar is voor gasten.', pos: ['E','E','E','E','E','E','E','E','E','N','E','N','E','E'] },
]

const PERMANENT_EXTRA: Question[] = [
  { id: 'PW1', cat: 'PW', stelling: 'Goede gezondheidszorg in de buurt is essentieel.', pos: ['N','N','E','E','E','E','N','E','E','E','E','E','O','N'] },
  { id: 'PW2', cat: 'PW', stelling: 'Ik wil toegang tot internationale winkels en restaurants.', pos: ['O','O','N','E','E','N','O','E','E','E','N','E','O','O'] },
  { id: 'PW3', cat: 'PW', stelling: 'Een bloeiend cultureel leven (musea, theater, evenementen) is belangrijk.', pos: ['N','O','N','E','N','N','O','E','E','E','N','N','O','O'] },
  { id: 'PW4', cat: 'PW', stelling: 'Ik wil makkelijk Nederlandstalige dienstverleners kunnen vinden.', pos: ['O','O','N','E','N','N','N','E','E','E','N','E','N','N'] },
  { id: 'PW5', cat: 'PW', stelling: 'Goede sportfaciliteiten (golf, padel, fitness) zijn belangrijk.', pos: ['N','N','N','E','E','N','N','E','E','E','E','E','N','N'] },
]

const INVESTERING_QUESTIONS: Question[] = [
  { id: 'MA1', cat: 'MA', stelling: 'Ik zoek een regio met een volwassen, liquide vastgoedmarkt.', pos: ['E','E','E','E','E','E','N','E','E','E','E','E','N','O'] },
  { id: 'MA2', cat: 'MA', stelling: 'Ik geef de voorkeur aan opkomende markten met groeipotentieel.', pos: ['N','E','E','E','N','N','E','N','O','N','O','E','E','E'] },
  { id: 'MA3', cat: 'MA', stelling: 'Een sterke lokale huurvraag (niet alleen toerisme) is belangrijk.', pos: ['N','N','E','N','E','E','E','E','O','E','O','E','E','E'] },
  { id: 'MA4', cat: 'MA', stelling: 'Ik wil investeren in een regio met exclusief, schaars aanbod.', pos: ['E','N','N','N','E','N','N','E','N','N','E','N','N','N'] },
  { id: 'RN1', cat: 'RN', stelling: 'Maximaal bruto huurrendement is mijn belangrijkste criterium.', pos: ['N','N','N','N','E','N','N','E','O','N','E','E','O','O'] },
  { id: 'RN2', cat: 'RN', stelling: 'Ik zoek stabiele, lange-termijn huurinkomsten (niet seizoensgebonden).', pos: ['O','O','N','E','N','N','N','E','E','E','O','E','N','N'] },
  { id: 'RN3', cat: 'RN', stelling: 'Ik wil een mix van korte en lange termijn verhuur mogelijk maken.', pos: ['N','N','E','E','N','N','N','E','E','E','N','E','N','N'] },
  { id: 'RN4', cat: 'RN', stelling: 'Toeristische verhuur met hoge piekseizoenprijzen spreekt me aan.', pos: ['E','N','E','N','E','E','E','E','O','N','E','E','N','N'] },
  { id: 'RN5', cat: 'RN', stelling: 'Een lage instapprijs voor maximaal rendement op investering is belangrijk.', pos: ['N','E','E','E','E','E','E','E','E','E','E','E','N','O'] },
  { id: 'KG1', cat: 'KG', stelling: 'Ik verwacht sterke waardestijging in de komende 5-10 jaar.', pos: ['N','N','E','E','E','N','E','E','E','E','E','E','E','E'] },
  { id: 'KG2', cat: 'KG', stelling: 'Historisch bewezen waardestijging is belangrijker dan potentieel.', pos: ['E','N','E','E','E','N','E','E','E','E','E','N','E','N'] },
  { id: 'FL1', cat: 'FL', stelling: 'Ik wil een woning kopen om te renoveren en met winst te verkopen.', pos: ['E','E','E','E','N','N','E','N','O','N','N','N','E','E'] },
  { id: 'FL2', cat: 'FL', stelling: 'Beschikbaarheid van betrouwbare aannemers is cruciaal voor mijn investering.', pos: ['N','E','E','N','N','E','E','N','O','N','O','N','E','E'] },
  { id: 'BH1', cat: 'BH', stelling: 'Professioneel vastgoedbeheer op afstand moet beschikbaar zijn.', pos: ['N','N','N','E','E','E','N','E','E','E','E','E','O','O'] },
  { id: 'BH2', cat: 'BH', stelling: 'Lage beheerkosten en onderhoudskosten zijn belangrijk.', pos: ['N','N','N','E','E','E','N','E','E','E','E','E','O','O'] },
]

// Signature questions: SIG-1 to SIG-14, one per region
function makeSignatureQuestions(): Question[] {
  const stellingen = [
    'Een ruige, ongerepte kustlijn met verborgen baaien trekt me aan.',
    'Ik droom van gouden stranden met familieplezier en cultuurhistorie.',
    'Betaalbaar wonen aan de kust met een authentiek Spaans karakter spreekt me aan.',
    'Ik wil het beste van stad en strand combineren in een bruisende metropool.',
    'Exclusieve villa\'s met panoramisch zeezicht zijn mijn ideaalbeeld.',
    'Ik zoek een warme, sociale omgeving met veel Nederlandstaligen om me heen.',
    'De combinatie van twee zeeën en een ontspannen Spaans leven trekt me.',
    'Een kosmopolitische kust met luxe voorzieningen en internationaal publiek past bij mij.',
    'Wereldcultuur, architectuur en Mediterraans stadsleven maken me enthousiast.',
    'De energie van een grote Europese hoofdstad met historie en nachtleven spreekt me aan.',
    'Eilandleven met turquoise water en een relaxte sfeer is mijn droom.',
    'Eeuwige lente, vulkanische natuur en een ontspannen eilandleven trekken me.',
    'Een verborgen parel tussen bergen en zee met subtropisch fruit spreekt me aan.',
    'Ongerepte Atlantische stranden, surfen en authentiek Andalusisch leven zijn mijn passie.',
  ]

  return stellingen.map((stelling, i) => ({
    id: `SIG-${i + 1}`,
    cat: 'SIG',
    stelling,
    pos: REGIONS.map((_, j) => (i === j ? 'E' : 'N')) as Position[],
  }))
}

export const SIGNATURE_QUESTIONS = makeSignatureQuestions()

export function getQuestionsForProfile(profile: Profile, filterType?: FilterType): Question[] {
  if (profile === 'investering') {
    return [...INVESTERING_QUESTIONS, ...SIGNATURE_QUESTIONS]
  }

  let shared = [...SHARED_EIGENGEBRUIK]
  if (filterType !== 'beide') {
    shared = shared.filter((q) => !q.condition)
  }

  if (profile === 'tweede-huis') {
    return [...shared, ...TWEEDE_HUIS_EXTRA, ...SIGNATURE_QUESTIONS]
  }
  if (profile === 'permanent') {
    return [...shared, ...PERMANENT_EXTRA, ...SIGNATURE_QUESTIONS]
  }
  return [...shared, ...SIGNATURE_QUESTIONS]
}

// ─── Hard Filter Definitions ────────────────────────────────────────────────

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  id: string
  label: string
  question: string
  options: FilterOption[]
  hideFor?: Profile[]
}

export const FILTERS: FilterDef[] = [
  {
    id: 'type',
    label: 'Type woning',
    question: 'Welk type woning zoekt uw klant?',
    options: [
      { value: 'appartement', label: 'Appartement' },
      { value: 'woning', label: 'Woning / Villa' },
      { value: 'beide', label: 'Beide' },
    ],
  },
  {
    id: 'budget',
    label: 'Budget',
    question: 'Wat is het maximale budget?',
    options: [
      { value: '250000', label: 'Tot \u20AC250.000' },
      { value: '500000', label: 'Tot \u20AC500.000' },
      { value: '1000000', label: 'Tot \u20AC1.000.000' },
      { value: '2000000', label: 'Tot \u20AC2.000.000' },
      { value: '9999999', label: 'Geen limiet' },
    ],
  },
  {
    id: 'verhuur',
    label: 'Verhuur',
    question: 'Is verhuurmogelijkheid belangrijk?',
    options: [
      { value: 'ja', label: 'Ja, verhuur is belangrijk' },
      { value: 'nee', label: 'Nee, alleen eigen gebruik' },
    ],
    hideFor: ['investering'],
  },
  {
    id: 'vliegveld',
    label: 'Vliegveld',
    question: 'Maximale reistijd naar een internationale luchthaven?',
    options: [
      { value: '30', label: 'Maximaal 30 minuten' },
      { value: '60', label: 'Maximaal 60 minuten' },
      { value: '90', label: 'Maximaal 90 minuten' },
      { value: '9999', label: 'Maakt niet uit' },
    ],
    hideFor: ['investering'],
  },
  {
    id: 'winter',
    label: 'Winterklimaat',
    question: 'Moet de regio ook in de winter aangenaam warm zijn?',
    options: [
      { value: 'ja', label: 'Ja, winter moet aangenaam zijn' },
      { value: 'nee', label: 'Nee, maakt niet uit' },
    ],
    hideFor: ['investering'],
  },
]

export function getFiltersForProfile(profile: Profile): FilterDef[] {
  return FILTERS.filter((f) => !f.hideFor?.includes(profile))
}

export function applyHardFilters(
  regions: Region[],
  profile: Profile,
  filterAnswers: Record<string, string>
): Region[] {
  return regions.filter((r) => {
    const type = filterAnswers.type as FilterType | undefined
    const budget = filterAnswers.budget ? parseInt(filterAnswers.budget) : 9999999

    if (type === 'appartement' && r.minAppartement > budget) return false
    if (type === 'woning' && r.minWoning > budget) return false
    if (type === 'beide' && Math.min(r.minAppartement, r.minWoning) > budget) return false
    if (!type && r.minAppartement > budget) return false

    // Verhuur filter (investering always needs verhuur)
    if (profile === 'investering' || filterAnswers.verhuur === 'ja') {
      if (!r.verhuurMogelijk) return false
    }

    // Vliegveld filter
    if (filterAnswers.vliegveld) {
      const maxMin = parseInt(filterAnswers.vliegveld)
      if (r.vliegveldMinuten > maxMin) return false
    }

    // Winter filter
    if (filterAnswers.winter === 'ja') {
      if (!r.winterKlimaat) return false
    }

    return true
  })
}

// ─── Region Contacts ──────────────────────────────────────────────────────

export const REGION_CONTACTS: Record<string, { naam: string; telefoon: string; whatsapp: string }> = {
  'costa-brava':         { naam: 'Specialist Costa Brava', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-dorada':        { naam: 'Specialist Costa Dorada', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-de-valencia':   { naam: 'Specialist Valencia', telefoon: '+31683707000', whatsapp: '31683707000' },
  'valencia-stad':       { naam: 'Specialist Valencia stad', telefoon: '+31683707000', whatsapp: '31683707000' },
  'cb-noord':            { naam: 'Specialist Costa Blanca Noord', telefoon: '+31683707000', whatsapp: '31683707000' },
  'cb-zuid':             { naam: 'Specialist Costa Blanca Zuid', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-calida':        { naam: 'Specialist Costa Cálida', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-del-sol':       { naam: 'Specialist Costa del Sol', telefoon: '+31683707000', whatsapp: '31683707000' },
  'barcelona':           { naam: 'Specialist Barcelona', telefoon: '+31683707000', whatsapp: '31683707000' },
  'madrid':              { naam: 'Specialist Madrid', telefoon: '+31683707000', whatsapp: '31683707000' },
  'balearen':            { naam: 'Specialist Balearen', telefoon: '+31683707000', whatsapp: '31683707000' },
  'canarische-eilanden': { naam: 'Specialist Canarische Eilanden', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-tropical':      { naam: 'Specialist Costa Tropical', telefoon: '+31683707000', whatsapp: '31683707000' },
  'costa-de-la-luz':     { naam: 'Specialist Costa de la Luz', telefoon: '+31683707000', whatsapp: '31683707000' },
}
