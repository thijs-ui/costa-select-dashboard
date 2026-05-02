/**
 * Costa Select — Wekelijkse Nieuws-Pipeline
 * Bronnen, keywords en filters voor de maandag-ochtend briefing.
 */

// ============================================================
// TYPES
// ============================================================

export type Category =
  | 'juridisch_es'
  | 'fiscaal_es'
  | 'fiscaal_nl'
  | 'regio'
  | 'marktdata'
  | 'spelers';

export type SourceType = 'rss' | 'apify' | 'web';
export type Language = 'es' | 'nl' | 'en';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  categories: Category[];
  language: Language;
  apifyActorId?: string;
  verify?: boolean;
  notes?: string;
  disabled?: boolean;
}

// ============================================================
// BRONNEN
// ============================================================

export const SOURCES: NewsSource[] = [
  {
    id: 'boe',
    name: 'Boletín Oficial del Estado',
    url: 'https://www.boe.es/rss/boe.php',
    type: 'rss',
    categories: ['juridisch_es', 'fiscaal_es'],
    language: 'es',
    verify: true,
  },
  {
    id: 'boja',
    // 's51' = "Disposiciones generales" — wettelijke publicaties Andalucía.
    // De oude /eboja/rss.xml gaf 404; dit is de officiële feed-URL uit de
    // BOJA FAQ pagina (juntadeandalucia.es/eboja/preguntas-frecuentes/faq4).
    name: 'Boletín Oficial de la Junta de Andalucía',
    url: 'https://www.juntadeandalucia.es/boja/distribucion/s51.xml',
    type: 'rss',
    categories: ['juridisch_es', 'regio'],
    language: 'es',
    verify: true,
  },
  {
    id: 'dogv',
    // TODO: URL niet gevonden — DOGV's oude /rss/dogv.xml gaf parse-error
    // (malformed XML), en op dogv.gva.es hebben we geen werkende vervanger
    // kunnen vinden. Site biedt 'Alertes i subscripcions' maar dat lijkt
    // login-vereist. Mogelijk Apify-scraping nodig in latere fase.
    name: 'Diari Oficial Generalitat Valenciana',
    url: 'https://dogv.gva.es/rss/dogv.xml',
    type: 'rss',
    categories: ['juridisch_es', 'regio'],
    language: 'es',
    verify: true,
    disabled: true,
  },
  {
    id: 'boib',
    name: 'Butlletí Oficial Illes Balears',
    url: 'https://www.caib.es/eboibfront/rss',
    type: 'apify',
    categories: ['juridisch_es', 'regio'],
    language: 'es',
    verify: true,
    notes: 'Mogelijk geen RSS — Apify scraper als fallback',
  },
  {
    id: 'idealista_news',
    name: 'Idealista News',
    url: 'https://www.idealista.com/news/feed',
    type: 'rss',
    categories: ['marktdata', 'spelers'],
    language: 'es',
    verify: true,
  },
  {
    id: 'elconfidencial_vivienda',
    name: 'El Confidencial — Vivienda',
    url: 'https://rss.elconfidencial.com/vivienda/',
    type: 'rss',
    categories: ['marktdata', 'spelers', 'fiscaal_es'],
    language: 'es',
    verify: true,
  },
  {
    id: 'cincodias',
    name: 'Cinco Días',
    url: 'https://cincodias.elpais.com/rss/cincodias/portada.xml',
    type: 'rss',
    categories: ['fiscaal_es', 'spelers', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'diariosur',
    name: 'Diario Sur — Economía',
    url: 'https://www.diariosur.es/rss/2.0/?section=economia',
    type: 'rss',
    categories: ['regio', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'olivepress',
    name: 'The Olive Press',
    url: 'https://www.theolivepress.es/feed/',
    type: 'rss',
    categories: ['regio', 'juridisch_es'],
    language: 'en',
  },
  {
    id: 'surinenglish',
    name: 'Sur in English',
    url: 'https://www.surinenglish.com/rss/2.0/portada',
    type: 'rss',
    categories: ['regio'],
    language: 'en',
    verify: true,
  },
  {
    id: 'spanish_property_insight',
    name: 'Spanish Property Insight',
    url: 'https://www.spanishpropertyinsight.com/feed/',
    type: 'rss',
    categories: ['juridisch_es', 'fiscaal_es', 'marktdata'],
    language: 'en',
  },
  {
    id: 'rijksoverheid_financien',
    // Rijksoverheid heeft RSS verplaatst naar feeds.rijksoverheid.nl-subdomein.
    // Per-ministerie pad: /ministeries/<ministerie>/nieuws.rss.
    name: 'Rijksoverheid — Financiën',
    url: 'https://feeds.rijksoverheid.nl/ministeries/ministerie-van-financien/nieuws.rss',
    type: 'rss',
    categories: ['fiscaal_nl'],
    language: 'nl',
    verify: true,
  },
  {
    id: 'belastingdienst_actueel',
    name: 'Belastingdienst — Actueel',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/home/nieuws',
    type: 'apify',
    categories: ['fiscaal_nl'],
    language: 'nl',
    notes: 'Geen RSS — Apify scraper nodig',
  },
];

// ============================================================
// KEYWORDS PER CATEGORIE
// ============================================================

export const KEYWORDS: Record<Category, string[]> = {
  juridisch_es: [
    'licencia turística', 'vivienda turística', 'decreto vivienda',
    'LISTA', 'LOTUP', 'PGOU', 'modificación urbanística',
    'DAFO', 'SAFO', 'cédula de habitabilidad', 'LOE',
    'garantía bancaria', 'Ley de Vivienda', 'ley vivienda',
    'okupación', 'okupas', 'expediente urbanístico',
    'fuera de ordenación', 'suelo rústico', 'suelo urbanizable',
  ],
  fiscaal_es: [
    'ITP', 'impuesto transmisiones patrimoniales', 'AJD',
    'actos jurídicos documentados', 'IVA inmobiliario', 'IRNR',
    'no residentes', 'renta imputada', 'impuesto patrimonio',
    'impuesto solidaridad', 'gran fortuna', 'Beckham',
    'plusvalía municipal', 'IBI', 'modelo 210', 'modelo 720',
  ],
  fiscaal_nl: [
    'Box 3', 'box 3', 'werkelijk rendement', 'vermogen buitenland',
    'progressievoorbehoud', 'Spaans vastgoed',
    'tweede woning buitenland', 'schenkbelasting buitenland',
    'erfbelasting buitenland', 'hypotheekrenteaftrek',
    'vermogensbelasting',
  ],
  regio: [
    'Marbella', 'Estepona', 'Sotogrande', 'Mijas',
    'Benalmádena', 'Fuengirola', 'Málaga', 'Nerja',
    'Frigiliana', 'Torrox', 'Cómpeta', 'Casares',
    'Manilva', 'Ronda',
    'Javea', 'Jávea', 'Denia', 'Moraira', 'Altea',
    'Calpe', 'Benissa', 'Alicante', 'Valencia',
    'Mallorca', 'Ibiza', 'Menorca', 'Formentera',
    'AVE', 'AP-7', 'A-7', 'aeropuerto Málaga',
    'Terminal 4', 'metro Málaga',
    'urbanización', 'promoción', 'flagship resort',
    'Four Seasons', 'Mandarin Oriental', 'Six Senses',
    'W Hotel', 'Rosewood', 'Aman', 'Soho House',
  ],
  marktdata: [
    'Tinsa', 'IMIE', 'Sociedad de Tasación',
    'precio vivienda', 'mercado inmobiliario',
    'Idealista', 'Fotocasa', 'INE vivienda',
    'compraventa viviendas', 'extranjeros vivienda',
    'inversión extranjera', 'BCE', 'ECB', 'euríbor',
    'tipos hipotecarios',
  ],
  spelers: [
    'AEDAS', 'Metrovacesa', 'Insur', 'Taylor Wimpey',
    'Neinor', 'Aedas Homes', 'Vía Célere',
    'Blackstone', 'Cerberus', 'Azora', 'KKR',
    'Engel & Völkers', 'Lucas Fox', 'Knight Frank',
    'Savills', "Sotheby's", "Christie's",
  ],
};

// ============================================================
// PRE-FILTER
// ============================================================

export const PRE_FILTER_KEYWORDS: string[] = [
  ...KEYWORDS.juridisch_es,
  ...KEYWORDS.fiscaal_es,
  ...KEYWORDS.fiscaal_nl,
  ...KEYWORDS.regio,
  ...KEYWORDS.marktdata,
  ...KEYWORDS.spelers,
].map((kw) => kw.toLowerCase());

export function preFilter(text: string): {
  passes: boolean;
  matchedKeywords: string[];
} {
  const lower = text.toLowerCase();
  const matched = PRE_FILTER_KEYWORDS.filter((kw) => lower.includes(kw));
  return {
    passes: matched.length > 0,
    matchedKeywords: matched,
  };
}

// ============================================================
// PIPELINE CONFIG
// ============================================================

export const PIPELINE_CONFIG = {
  lookbackDays: 7,
  summarizeUrgencyThreshold: 4,
  maxItemsPerCategorySlack: 5,
  models: {
    classify: 'claude-haiku-4-5-20251001',
    summarize: 'claude-sonnet-4-6',
    newsletter: 'claude-sonnet-4-6',
  },
  slackChannel: '#cs-news',
  cronSchedule: '0 6 * * 1',
};

// ============================================================
// CATEGORIE LABELS
// ============================================================

export const CATEGORY_LABELS: Record<Category, { emoji: string; label: string }> = {
  juridisch_es: { emoji: '⚖️', label: 'Juridisch Spanje' },
  fiscaal_es: { emoji: '🇪🇸', label: 'Fiscaal Spanje' },
  fiscaal_nl: { emoji: '🇳🇱', label: 'Fiscaal Nederland' },
  regio: { emoji: '📍', label: 'Regio & Ontwikkelingen' },
  marktdata: { emoji: '📊', label: 'Marktdata' },
  spelers: { emoji: '🏢', label: 'Spelers & Concurrentie' },
};
