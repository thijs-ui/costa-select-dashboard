import * as cheerio from 'cheerio'

export interface ScrapedProperty {
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

const CDN_DOMAIN = 'media02.ogonline.nl'

/**
 * Scrape property data and images from a CostaSelect.com listing page.
 * URL pattern: https://www.costaselect.com/nl/koop/{city}/{id}
 */
export async function scrapeCostaSelect(url: string): Promise<ScrapedProperty> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CostaSelectDashboard/1.0)',
      'Accept': 'text/html',
    },
  })

  if (!res.ok) {
    throw new Error(`CostaSelect fetch failed: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // Extract all property images from the CDN
  const fotos: string[] = []
  const seen = new Set<string>()

  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || ''
    if (src.includes(CDN_DOMAIN) && !seen.has(src)) {
      seen.add(src)
      fotos.push(src)
    }
  })

  // Also check source/picture elements and background images
  $('source').each((_, el) => {
    const srcset = $(el).attr('srcset') || ''
    srcset.split(',').forEach(s => {
      const imgUrl = s.trim().split(/\s+/)[0]
      if (imgUrl.includes(CDN_DOMAIN) && !seen.has(imgUrl)) {
        seen.add(imgUrl)
        fotos.push(imgUrl)
      }
    })
  })

  // Extract property details from meta tags and page content
  const title = $('meta[property="og:title"]').attr('content')
    || $('h1').first().text().trim()
    || ''

  const description = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || ''

  // Try to extract price - look for common patterns
  let vraagprijs = 0
  const priceText = $('body').text()
  const priceMatch = priceText.match(/€\s*([\d.,]+)/)
    || priceText.match(/([\d.]+)\s*€/)
  if (priceMatch) {
    vraagprijs = parseInt(priceMatch[1].replace(/\./g, '').replace(',', ''), 10) || 0
  }

  // Extract specs from dt/dd pairs (CostaSelect uses <dt>Aantal slaapkamers</dt><dd>5</dd>)
  let slaapkamers = 0
  let badkamers = 0
  let oppervlakte = 0

  $('dt').each((_, el) => {
    const label = $(el).text().toLowerCase().trim()
    const value = $(el).next('dd').text().trim()
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    if (label.includes('slaapkamer') || label.includes('bedroom')) slaapkamers = num
    if (label.includes('badkamer') || label.includes('bathroom')) badkamers = num
  })

  // Fallback: regex on body text
  const bodyText = $('body').text()

  if (!slaapkamers) {
    const bedMatch = bodyText.match(/(\d+)\s*(?:slaapkamer|bedroom|dormitorio)/i)
    if (bedMatch) slaapkamers = parseInt(bedMatch[1], 10)
  }

  if (!badkamers) {
    const bathMatch = bodyText.match(/(\d+)\s*(?:badkamer|bathroom|baño)/i)
    if (bathMatch) badkamers = parseInt(bathMatch[1], 10)
  }

  const surfaceMatch = bodyText.match(/(\d+)\s*m[²2]/)
  if (surfaceMatch) oppervlakte = parseInt(surfaceMatch[1], 10)

  // Determine type from title/description
  let type = 'woning'
  const lowerTitle = (title + ' ' + description).toLowerCase()
  if (lowerTitle.includes('villa')) type = 'villa'
  else if (lowerTitle.includes('appartement') || lowerTitle.includes('apartment')) type = 'appartement'
  else if (lowerTitle.includes('nieuwbouw') || lowerTitle.includes('new build')) type = 'nieuwbouw'
  else if (lowerTitle.includes('penthouse')) type = 'appartement'
  else if (lowerTitle.includes('townhouse') || lowerTitle.includes('rijtjeshuis')) type = 'woning'

  // Extract regio from URL path or content
  let regio = ''
  const urlParts = new URL(url).pathname.split('/')
  const city = urlParts[3] || '' // /nl/koop/{city}/{id}
  if (city) {
    regio = city.charAt(0).toUpperCase() + city.slice(1)
  }

  return {
    adres: title,
    regio,
    type,
    vraagprijs,
    oppervlakte,
    slaapkamers,
    badkamers,
    omschrijving: description,
    fotos,
    url,
  }
}

/**
 * Check if a URL is a CostaSelect property listing
 */
export function isCostaSelectUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname.includes('costaselect.com')
  } catch {
    return false
  }
}
