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

  // ── Algemene CSI/spelers-bronnen ──────────────────────────────
  {
    id: 'brainsre',
    name: 'Brainsre.news',
    url: 'https://brainsre.news/feed/',
    type: 'rss',
    categories: ['spelers', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'ejeprime',
    name: 'EjePrime',
    url: 'https://www.ejeprime.com/rss',
    type: 'rss',
    categories: ['spelers', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'family_capital',
    name: 'Family Capital',
    url: 'https://www.famcap.com/feed/',
    type: 'rss',
    categories: ['spelers'],
    language: 'en',
    verify: true,
  },
  {
    id: 'spears',
    name: "Spear's Magazine",
    url: 'https://www.spearswms.com/feed/',
    type: 'rss',
    categories: ['spelers'],
    language: 'en',
    verify: true,
  },
  {
    id: 'funds_society',
    name: 'Funds Society Iberia',
    url: 'https://www.fundssociety.com/es/rss',
    type: 'rss',
    categories: ['spelers', 'fiscaal_es'],
    language: 'es',
    verify: true,
  },
  {
    id: 'iberian_lawyer',
    name: 'Iberian Lawyer',
    url: 'https://iberianlawyer.com/feed/',
    type: 'rss',
    categories: ['juridisch_es', 'spelers'],
    language: 'en',
    verify: true,
  },
  {
    id: 'elconfidencial_empresas',
    name: 'El Confidencial — Empresas',
    url: 'https://rss.elconfidencial.com/empresas/',
    type: 'rss',
    categories: ['spelers', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'expansion_empresas',
    name: 'Expansión — Empresas',
    url: 'https://e00-expansion.uecdn.es/rss/empresas.xml',
    type: 'rss',
    categories: ['spelers', 'marktdata'],
    language: 'es',
    verify: true,
  },
  {
    id: 'invest_in_spain',
    name: 'Invest in Spain (ICEX)',
    url: 'https://www.investinspain.org/en/news',
    type: 'apify',
    categories: ['spelers', 'juridisch_es'],
    language: 'en',
    disabled: true,
    notes: 'Apify scraper later',
  },
  {
    id: 'fdi_intelligence',
    name: 'FDi Intelligence',
    url: 'https://www.fdiintelligence.com/feed',
    type: 'rss',
    categories: ['spelers'],
    language: 'en',
    verify: true,
  },
  {
    id: 'pere',
    name: 'PERE',
    url: 'https://www.perenews.com/feed/',
    type: 'rss',
    categories: ['spelers'],
    language: 'en',
    verify: true,
  },
  {
    id: 'mansion_global',
    name: 'Mansion Global',
    url: 'https://www.mansionglobal.com/feeds/rss',
    type: 'rss',
    categories: ['spelers', 'marktdata'],
    language: 'en',
    verify: true,
  },

  // ── Murcia-specifieke bronnen ─────────────────────────────────
  {
    id: 'la_verdad',
    name: 'La Verdad (Murcia)',
    url: 'https://www.laverdad.es/rss/2.0/portada/',
    type: 'rss',
    categories: ['regio'],
    language: 'es',
    verify: true,
  },
  {
    id: 'la_opinion_murcia',
    name: 'La Opinión de Murcia',
    url: 'https://www.laopiniondemurcia.es/rss/',
    type: 'rss',
    categories: ['regio'],
    language: 'es',
    verify: true,
  },
  {
    id: 'murcia_today',
    name: 'Murcia Today',
    url: 'https://murciatoday.com/feed',
    type: 'rss',
    categories: ['regio'],
    language: 'en',
    verify: true,
  },

  // ── Valencia-specifieke bronnen ───────────────────────────────
  {
    id: 'levante_emv',
    name: 'Levante-EMV',
    url: 'https://www.levante-emv.com/rss/',
    type: 'rss',
    categories: ['regio'],
    language: 'es',
    verify: true,
  },
  {
    id: 'las_provincias',
    name: 'Las Provincias',
    url: 'https://www.lasprovincias.es/rss/2.0/portada/',
    type: 'rss',
    categories: ['regio'],
    language: 'es',
    verify: true,
  },
  {
    id: 'valencia_plaza',
    name: 'Valencia Plaza',
    url: 'https://valenciaplaza.com/feed',
    type: 'rss',
    categories: ['regio', 'spelers'],
    language: 'es',
    verify: true,
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

// ============================================================
// SLACK ROUTING
// ============================================================

// Bestemmingskanalen voor de wekelijkse briefing. invest en marketing_ideeen
// zijn second-tier kanalen — items belanden daar via audience_invest=true
// resp. de newsletter-flow, niet als directe slack_channel-classificatie.
export type SlackChannel =
  | 'algemeen'
  | 'spanje'
  | 'valencia'
  | 'costa_blanca_noord'
  | 'costa_blanca_zuid'
  | 'costa_brava'
  | 'costa_calida'
  | 'costa_del_sol'
  | 'costa_dorada'
  | 'invest'
  | 'marketing_ideeen';

// De waarden die de classifier mag toekennen (geen invest/marketing — die
// zijn cross-cutting). Wordt door classifier-Zod-schema gebruikt.
export const PRIMARY_SLACK_CHANNELS: readonly SlackChannel[] = [
  'algemeen',
  'spanje',
  'valencia',
  'costa_blanca_noord',
  'costa_blanca_zuid',
  'costa_brava',
  'costa_calida',
  'costa_del_sol',
  'costa_dorada',
] as const;

export const SLACK_WEBHOOK_ENV: Record<SlackChannel, string> = {
  algemeen: 'SLACK_WEBHOOK_ALGEMEEN',
  spanje: 'SLACK_WEBHOOK_SPANJE',
  valencia: 'SLACK_WEBHOOK_VALENCIA',
  costa_blanca_noord: 'SLACK_WEBHOOK_COSTA_BLANCA_NOORD',
  costa_blanca_zuid: 'SLACK_WEBHOOK_COSTA_BLANCA_ZUID',
  costa_brava: 'SLACK_WEBHOOK_COSTA_BRAVA',
  costa_calida: 'SLACK_WEBHOOK_COSTA_CALIDA',
  costa_del_sol: 'SLACK_WEBHOOK_COSTA_DEL_SOL',
  costa_dorada: 'SLACK_WEBHOOK_COSTA_DORADA',
  invest: 'SLACK_WEBHOOK_INVEST',
  marketing_ideeen: 'SLACK_WEBHOOK_MARKETING_IDEEEN',
};

export const SLACK_CHANNEL_LABELS: Record<SlackChannel, string> = {
  algemeen: 'Algemeen',
  spanje: 'Spanje',
  valencia: 'Valencia',
  costa_blanca_noord: 'Costa Blanca Noord',
  costa_blanca_zuid: 'Costa Blanca Zuid',
  costa_brava: 'Costa Brava',
  costa_calida: 'Costa Cálida',
  costa_del_sol: 'Costa del Sol',
  costa_dorada: 'Costa Dorada',
  invest: 'CSI Invest',
  marketing_ideeen: 'Marketing Ideeën',
};

// Plaatsnamen-mapping voor slack-routing. NB: Gandía staat EXPLICIET onder
// costa_blanca_noord (niet valencia) op uitdrukkelijk verzoek. Castellón en
// plaatsen daarbinnen (Peñíscola, Benicàssim, Oropesa) horen NIET in valencia
// — die routeren naar 'spanje' via classifier-prompt logica.
export const REGION_PLACES: Record<
  Exclude<SlackChannel, 'algemeen' | 'spanje' | 'invest' | 'marketing_ideeen'>,
  string[]
> = {
  costa_del_sol: [
    'Marbella', 'Estepona', 'Sotogrande', 'Mijas', 'Benalmádena',
    'Fuengirola', 'Torremolinos', 'Málaga', 'Nerja', 'Frigiliana',
    'Torrox', 'Cómpeta', 'Casares', 'Manilva', 'Ronda',
  ],
  costa_blanca_noord: [
    'Dénia', 'Denia', 'Jávea', 'Javea', 'Xàbia', 'Moraira', 'Teulada',
    'Calpe', 'Calp', 'Altea', 'Albir', 'La Nucía', 'Polop',
    'Finestrat', 'Benissa', 'Benidorm', 'Villajoyosa', 'Gandía', 'Gandia',
  ],
  costa_blanca_zuid: [
    'Alicante', 'Elche', 'Santa Pola', 'Torrevieja', 'Orihuela',
    'Orihuela Costa', 'Guardamar', 'Pilar de la Horadada',
    'La Zenia', 'Cabo Roig', 'Punta Prima', 'Campoamor',
  ],
  costa_brava: [
    'Girona', 'Lloret de Mar', 'Tossa de Mar', 'Sant Feliu de Guíxols',
    'Palamós', 'Begur', 'Pals', 'Cadaqués', 'Roses',
    'Empuriabrava', "Platja d'Aro", "L'Estartit", 'Blanes',
  ],
  costa_calida: [
    'Murcia', 'Cartagena', 'Mar Menor', 'La Manga',
    'San Pedro del Pinatar', 'Los Alcázares', 'San Javier',
    'Santiago de la Ribera', 'Águilas', 'Mazarrón',
    'Puerto de Mazarrón', 'Lorca', 'Calblanque', 'Cabo de Palos',
  ],
  costa_dorada: [
    'Tarragona', 'Salou', 'Cambrils', 'Sitges', 'Vilanova i la Geltrú',
    'Castelldefels', 'Calafell', 'Torredembarra', 'El Vendrell',
  ],
  valencia: [
    'Valencia', 'València', "L'Eliana", 'Paterna', 'Bétera',
    'Alboraia', 'Alboraya', 'Burjassot', 'Cullera', 'Sueca',
    'Sagunto', 'Sagunt', 'Puçol', 'Comunitat Valenciana',
  ],
};
