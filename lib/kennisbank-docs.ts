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
  // Aankoopproces
  { slug: 'CS-001-het-aankoopproces', code: 'CS-001', title: 'Het aankoopproces', category: 'Aankoopproces' },
  { slug: 'CS-006-onderhandelen', code: 'CS-006', title: 'Onderhandelen', category: 'Aankoopproces' },
  { slug: 'CS-007-de-verkopende-makelaar', code: 'CS-007', title: 'De verkopende makelaar', category: 'Aankoopproces' },
  { slug: 'CS-008-aankoopmakelaar', code: 'CS-008', title: 'De aankoopmakelaar', category: 'Aankoopproces' },
  { slug: 'CS-029-koopproces-vanuit-nl', code: 'CS-029', title: 'Het koopproces vanuit Nederland', category: 'Aankoopproces' },
  { slug: 'CS-032-psychologie-koper', code: 'CS-032', title: 'Psychologie van de koper', category: 'Aankoopproces' },
  { slug: 'CS-035-verkoopproces', code: 'CS-035', title: 'Het verkoopproces', category: 'Aankoopproces' },
  { slug: 'CS-049-zoekopdracht-bezichtiging', code: 'CS-049', title: 'Zoekopdracht naar bezichtiging', category: 'Aankoopproces' },

  // Juridisch & Fiscaal
  { slug: 'CS-002-juridische-valkuilen', code: 'CS-002', title: 'Juridische valkuilen', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-003-belastingen-bij-aankoop', code: 'CS-003', title: 'Belastingen bij aankoop', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-004-belastingen-na-aankoop', code: 'CS-004', title: 'Belastingen na aankoop — Spanje', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-005-financiering', code: 'CS-005', title: 'Financiering', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-027-erfbelasting', code: 'CS-027', title: 'Erfbelasting & testament', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-028-belasting-nl-spanje', code: 'CS-028', title: 'Belasting NL & Spanje', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-030-valkuilen-scams', code: 'CS-030', title: 'Valkuilen & scams', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-031-juridische-begeleiding', code: 'CS-031', title: 'Juridische begeleiding', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-039-verzekeringen', code: 'CS-039', title: 'Verzekeringen', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-044-box3-spanje-2026', code: 'CS-044', title: 'Box 3 — Spanje 2026', category: 'Juridisch & Fiscaal' },

  // Regio's
  { slug: 'CS-012-costa-brava', code: 'CS-012', title: 'Costa Brava', category: "Regio's" },
  { slug: 'CS-013-costa-dorada', code: 'CS-013', title: 'Costa Dorada', category: "Regio's" },
  { slug: 'CS-014-costa-de-valencia', code: 'CS-014', title: 'Costa de Valencia', category: "Regio's" },
  { slug: 'CS-015-valencia-stad', code: 'CS-015', title: 'Valencia & omgeving', category: "Regio's" },
  { slug: 'CS-016-costa-blanca-noord', code: 'CS-016', title: 'Costa Blanca Noord', category: "Regio's" },
  { slug: 'CS-017-costa-blanca-zuid', code: 'CS-017', title: 'Costa Blanca Zuid', category: "Regio's" },
  { slug: 'CS-018-costa-calida', code: 'CS-018', title: 'Costa Calida', category: "Regio's" },
  { slug: 'CS-019-costa-del-sol', code: 'CS-019', title: 'Costa del Sol', category: "Regio's" },
  { slug: 'CS-020-madrid', code: 'CS-020', title: 'Madrid & omgeving', category: "Regio's" },
  { slug: 'CS-021-barcelona', code: 'CS-021', title: 'Barcelona & omgeving', category: "Regio's" },
  { slug: 'CS-022-malaga-sevilla-granada', code: 'CS-022', title: 'Malaga, Sevilla & Granada', category: "Regio's" },
  { slug: 'CS-023-costa-tropical', code: 'CS-023', title: 'Costa Tropical', category: "Regio's" },
  { slug: 'CS-024-costa-de-la-luz', code: 'CS-024', title: 'Costa de la Luz', category: "Regio's" },
  { slug: 'CS-025-balearen', code: 'CS-025', title: 'Balearen', category: "Regio's" },
  { slug: 'CS-026-canarische-eilanden', code: 'CS-026', title: 'Canarische Eilanden', category: "Regio's" },

  // Vastgoed & Markt
  { slug: 'CS-009-nieuwbouw', code: 'CS-009', title: 'Nieuwbouw', category: 'Vastgoed & Markt' },
  { slug: 'CS-010-bestaande-bouw', code: 'CS-010', title: 'Bestaande bouw', category: 'Vastgoed & Markt' },
  { slug: 'CS-033-vastgoedmarkt', code: 'CS-033', title: 'De Spaanse vastgoedmarkt', category: 'Vastgoed & Markt' },
  { slug: 'CS-034-bouw-renovatie', code: 'CS-034', title: 'Bouw & renovatie', category: 'Vastgoed & Markt' },
  { slug: 'CS-040-vve', code: 'CS-040', title: 'VvE — rechten, plichten en problemen', category: 'Vastgoed & Markt' },
  { slug: 'CS-042-actuele-marktdata', code: 'CS-042', title: 'Actuele marktdata', category: 'Vastgoed & Markt' },

  // Investeren
  { slug: 'CS-011A-verhuur', code: 'CS-011A', title: 'Verhuur — eigen gebruik & toeristische verhuur', category: 'Investeren' },
  { slug: 'CS-011B-investeren', code: 'CS-011B', title: 'Investeren in Spaans vastgoed', category: 'Investeren' },
  { slug: 'CS-041-flippen', code: 'CS-041', title: 'Flippen', category: 'Investeren' },
  { slug: 'CS-045-csi-fiscale-voordelen', code: 'CS-045', title: 'CSI — Fiscale voordelen', category: 'Investeren' },
  { slug: 'CS-046-vastgoed-2026-strategieen', code: 'CS-046', title: 'Vastgoed 2026 — Strategieën', category: 'Investeren' },
  { slug: 'CS-047-csi-personas', code: 'CS-047', title: 'CSI Personas', category: 'Investeren' },

  // Emigreren & Wonen
  { slug: 'CS-036-emigreren-praktisch', code: 'CS-036', title: 'Emigreren — het praktische proces', category: 'Emigreren & Wonen' },
  { slug: 'CS-037-emigreren-vs-tweede-woning', code: 'CS-037', title: 'Emigreren vs. tweede woning', category: 'Emigreren & Wonen' },
  { slug: 'CS-038-na-de-aankoop', code: 'CS-038', title: 'Na de aankoop', category: 'Emigreren & Wonen' },

  // Intern & Tools
  { slug: 'CS-039-partnernetwerk', code: 'CS-039P', title: 'Partnernetwerk', category: 'Intern & Tools' },
  { slug: 'CS-048-opvolgsysteem', code: 'CS-048', title: 'Opvolgsysteem', category: 'Intern & Tools' },
  { slug: 'CS-050-pipedrive-handleiding', code: 'CS-050', title: 'Pipedrive handleiding', category: 'Intern & Tools' },
  { slug: 'CS-051-slack-handleiding', code: 'CS-051', title: 'Slack handleiding', category: 'Intern & Tools' },
  { slug: 'CS-044-box3-spaanse-vastgoedbelasting', code: 'CS-044', title: 'Box 3 en Spaanse vastgoedbelasting', category: 'Juridisch & Fiscaal' },
  { slug: 'CS-MKT-001-email-voorbeelden', code: 'CS-MKT-001', title: 'Email voorbeelden', category: 'Marketing', tags: ['mkt-email', 'mkt-nieuwsbrief', 'mkt-followup'] },
  { slug: 'CS-MKT-002-linkedin-posts', code: 'CS-MKT-002', title: 'LinkedIn organic posts', category: 'Marketing', tags: ['mkt-linkedin'] },
  { slug: 'CS-MKT-003-instagram-captions', code: 'CS-MKT-003', title: 'Instagram captions', category: 'Marketing', tags: ['mkt-instagram'] },
  { slug: 'CS-MKT-004-facebook-ads-nieuwbouw', code: 'CS-MKT-004', title: 'Facebook Ads nieuwbouw', category: 'Marketing', tags: ['mkt-meta-ads', 'mkt-facebook-ads'] },
  { slug: 'CS-MKT-005-linkedin-ads', code: 'CS-MKT-005', title: 'LinkedIn Ads investeerders', category: 'Marketing', tags: ['mkt-linkedin-ads'] },
  { slug: 'CS-MKT-006-whitepaper-longform', code: 'CS-MKT-006', title: 'Whitepaper / longform', category: 'Marketing', tags: ['mkt-blog', 'mkt-longform'] },
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
