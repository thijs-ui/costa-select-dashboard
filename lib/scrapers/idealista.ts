import { ApifyClient } from 'apify-client'

export interface IdealistaProperty {
  adres: string
  regio: string
  type: string
  vraagprijs: number
  oppervlakte: number
  slaapkamers: number
  badkamers: number
  omschrijving: string
  fotos: string[]
  url: string
}

/**
 * Extract the numeric property code from an Idealista URL.
 * E.g. "https://www.idealista.com/inmueble/105931498/" → "105931498"
 */
function extractPropertyCode(url: string): string {
  const match = url.match(/\/inmueble\/(\d+)/)
    || url.match(/\/(\d{6,12})(?:\/|$)/)
  if (!match) {
    throw new Error('Kan geen property code vinden in de Idealista URL')
  }
  return match[1]
}

/**
 * Scrape a single Idealista listing via the igolaizola/idealista-scraper Apify actor.
 * The actor returns data in { propertyCode, _details: { ... } } format.
 */
export async function scrapeIdealista(url: string): Promise<IdealistaProperty> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    throw new Error('APIFY_API_TOKEN is niet geconfigureerd')
  }

  const actorId = process.env.APIFY_IDEALISTA_ACTOR_ID || 'igolaizola/idealista-scraper'
  const propertyCode = extractPropertyCode(url)
  const client = new ApifyClient({ token })

  const run = await client.actor(actorId).call(
    {
      operation: 'sale',
      country: 'es',
      propertyCodes: [propertyCode],
      fetchDetails: true,
      fetchStats: false,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    },
    { waitSecs: 120 },
  )

  if (run.status !== 'SUCCEEDED') {
    throw new Error(`Apify actor run mislukt: status=${run.status}`)
  }

  const { items } = await client.dataset(run.defaultDatasetId).listItems()

  if (!items || items.length === 0) {
    throw new Error('Geen resultaten van Apify actor voor deze woning')
  }

  // The igolaizola actor puts all detail data under _details
  const raw = items[0] as Record<string, unknown>
  const details = (raw._details || raw) as Record<string, unknown>

  // Extract photos from _details.multimedia.images
  const fotos: string[] = []
  const multimedia = details.multimedia as Record<string, unknown> | undefined
  if (multimedia?.images && Array.isArray(multimedia.images)) {
    for (const img of multimedia.images) {
      const imgObj = img as Record<string, unknown>
      if (typeof imgObj.url === 'string') {
        fotos.push(imgObj.url)
      }
    }
  }

  // Address from suggestedTexts.title or ubication.title
  const suggestedTexts = details.suggestedTexts as Record<string, string> | undefined
  const ubication = details.ubication as Record<string, unknown> | undefined
  const adres = suggestedTexts?.title
    || (ubication?.title as string)
    || url

  // Location — try multiple sources to find a Costa Select regio match
  let regio = ''
  const locationSources = [
    (ubication?.title as string || '').split(',').pop()?.trim(),
    (details.promotion as Record<string, string> | undefined)?.province,
    (details.promotion as Record<string, string> | undefined)?.name,
    details.country === 'es' ? (ubication?.title as string) : '',
    typeof details.propertyComment === 'string' ? details.propertyComment.substring(0, 500) : '',
    adres,
  ]
  for (const source of locationSources) {
    if (!source) continue
    const mapped = mapToCostaSelectRegio(source)
    if (mapped !== source && mapped !== '') {
      regio = mapped
      break
    }
  }

  // Property type from extendedPropertyType, homeType, or detailedType
  const detailedType = details.detailedType as Record<string, string> | undefined
  const typeRaw = (details.extendedPropertyType as string)
    || (details.homeType as string)
    || detailedType?.typology
    || 'woning'
  const type = mapPropertyType(typeRaw)

  // Rooms and bathrooms from moreCharacteristics
  const chars = details.moreCharacteristics as Record<string, unknown> | undefined
  const slaapkamers = Number(chars?.roomNumber || 0)
  const badkamers = Number(chars?.bathNumber || 0)
  const oppervlakte = Number(chars?.constructedArea || chars?.usableArea || details.size || 0)

  // Description
  const omschrijving = typeof details.propertyComment === 'string'
    ? details.propertyComment
    : ''

  // Price
  const priceInfo = details.priceInfo as Record<string, unknown> | undefined
  const vraagprijs = Number(priceInfo?.amount || details.price || 0)

  // URL
  const detailUrl = typeof details.detailWebLink === 'string'
    ? details.detailWebLink.split('?')[0]
    : url

  return {
    adres,
    regio,
    type,
    vraagprijs,
    oppervlakte,
    slaapkamers,
    badkamers,
    omschrijving,
    fotos,
    url: detailUrl,
  }
}

function mapPropertyType(raw: string): string {
  const lower = (raw || '').toLowerCase()
  if (lower.includes('flat') || lower.includes('apartment') || lower.includes('piso') || lower.includes('apartamento') || lower.includes('penthouse')) return 'appartement'
  if (lower.includes('villa') || lower.includes('chalet') || lower.includes('detachedhouse')) return 'villa'
  if (lower.includes('new') || lower.includes('nieuwbouw') || lower.includes('obra nueva')) return 'nieuwbouw'
  if (lower.includes('house') || lower.includes('casa') || lower.includes('town') || lower.includes('adosado') || lower.includes('semidetached')) return 'woning'
  if (lower.includes('duplex')) return 'appartement'
  if (lower.includes('studio')) return 'appartement'
  return 'woning'
}

function mapToCostaSelectRegio(location: string): string {
  if (!location) return ''

  const mapping: [RegExp, string][] = [
    [/costa\s*brava|girona|gerona|lloret|tossa|roses|blanes|begur/i, 'Costa Brava'],
    [/costa\s*dorada|tarragona|salou|cambrils|sitges/i, 'Costa Dorada'],
    [/costa\s*de\s*valencia|sagunto|gandia|oliva/i, 'Costa de Valencia'],
    [/val[eè]ncia/i, 'Valencia stad'],
    [/costa\s*blanca\s*(?:noord|norte|north)|altea|calpe|j[aá]vea|moraira|benidorm|d[eé]nia/i, 'Costa Blanca Noord'],
    [/costa\s*blanca\s*(?:zuid|sur|south)|alicante|torrevieja|orihuela|guardamar|santa\s*pola/i, 'Costa Blanca Zuid'],
    [/costa\s*c[aá]lida|murcia|cartagena|mazarr[oó]n|mar\s*menor|la\s*manga/i, 'Costa Cálida'],
    [/costa\s*del\s*sol|m[aá]laga|marbella|estepona|fuengirola|benalm[aá]dena|torremolinos|nerja|mijas|manilva|casares|benahavis/i, 'Costa del Sol'],
    [/madrid/i, 'Madrid'],
    [/barcelona/i, 'Barcelona'],
    [/costa\s*tropical|almu[ñn][eé]car|salobreña|motril/i, 'Costa Tropical'],
    [/costa\s*de\s*la\s*luz|c[aá]diz|huelva|tarifa|conil/i, 'Costa de la Luz'],
    [/baleares|mallorca|menorca|ibiza|formentera|palma/i, 'Balearen'],
    [/canarias|tenerife|gran\s*canaria|lanzarote|fuerteventura/i, 'Canarische Eilanden'],
  ]

  for (const [pattern, regio] of mapping) {
    if (pattern.test(location)) return regio
  }

  return location
}

/**
 * Check if a URL is an Idealista property listing
 */
export function isIdealistaUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.includes('idealista.com')
      || u.hostname.includes('idealista.pt')
      || u.hostname.includes('idealista.it')
  } catch {
    return false
  }
}
