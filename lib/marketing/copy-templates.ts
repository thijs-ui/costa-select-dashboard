// Templated copy-velden — geen Claude nodig. Headline + creative-velden
// zijn deterministisch op basis van listing-data.

const MAX_HEADLINE_CHARS = 40

function formatPrice(price: number): string {
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(price)
}

/**
 * FB Headline met fallback voor lange stadsnamen.
 * Probeert achtereenvolgens:
 *   1. "🏠 Nieuwbouw {stad}: vanaf €{prijs}"
 *   2. "🏠 {stad}: vanaf €{prijs}"
 *   3. "🏠 {stad}: vanaf €{prijs}k"
 */
export function generateFbHeadline(city: string, price: number): string {
  const priceFormatted = formatPrice(price)
  const candidates = [
    `🏠 Nieuwbouw ${city}: vanaf €${priceFormatted}`,
    `🏠 ${city}: vanaf €${priceFormatted}`,
    `🏠 ${city}: vanaf €${Math.round(price / 1000)}k`,
  ]
  // Emoji telt visueel als ~2 chars in FB UI maar als 2 string chars in JS
  // (UTF-16 surrogate pair). String-lengte hier is voldoende voor de
  // praktische limiet; mocht 't te ruim blijken: vervang door grapheme-split.
  return candidates.find(c => c.length <= MAX_HEADLINE_CHARS) ?? candidates[2]
}

export function generateCreativeProjectName(projectName: string): string {
  return projectName.toUpperCase()
}

/**
 * Prijs-string voor de visual. Format vast:
 *   "PRIJZEN VANAF €367.000"
 * Hoofdletters omdat de template-typografie dat verwacht.
 */
export function generateCreativePrice(price: number): string {
  return `PRIJZEN VANAF €${formatPrice(price)}`
}

/**
 * Stad/locatie voor de visual — altijd uppercase.
 */
export function generateCreativeLocation(city: string): string {
  return city.toUpperCase()
}
