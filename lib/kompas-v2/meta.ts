// Meta-data voor Costa Kompas v2 — niet in de scoring-engine.
// Gescheiden van data.ts zodat de engine-contract ongestoord blijft.

export interface Specialist {
  name: string
  role: string
  phone: string
  whatsapp: string
}

// Regio-beschrijvingen (volledige tekst — in uitklap onder iedere regio)
export const REGION_DESC: Record<string, string> = {
  'costa-del-sol':
    'Internationale kustmetropool met grote expat-gemeenschap, uitstekende bereikbaarheid en het meest volwassen vastgoedaanbod van Spanje.',
  'costa-blanca-noord':
    'Groene heuvels, authentieke dorpen en stevige Nederlandse en Belgische aanwezigheid rond Jávea, Dénia en Moraira.',
  'costa-blanca-sur':
    'Direct rendement en goed bereikbaar via Alicante. Nieuwbouw-driven, praktisch, en betaalbaarder dan het noorden.',
  'costa-calida':
    'Ruim vastgoed voor je geld, rustige dorpen, en goede golf-infrastructuur rond La Manga en Mar Menor.',
  'costa-tropical':
    'Subtropisch microklimaat tussen Sierra Nevada en zee. Lokaal, rustig en beduidend minder internationaal.',
  'costa-de-valencia':
    'Derde stad van Spanje als hub — cultuur, AVE-treinverbinding, strand binnen handbereik.',
  'costa-del-azahar':
    'Ongepolijst, lokaal Spaans, en vriendelijk voor ruime budgetten. Minder toeristisch dan de buren.',
  'costa-dorada':
    'Barcelona-as met goede treinverbindingen, toeristische verhuurpotentie en een mix van stad en kust.',
  'costa-brava':
    'Karaktervol, groen, artistiek. Fijn voor wie kiest voor sfeer en vastgoed met geschiedenis.',
  'costa-de-la-luz':
    'Atlantische kust — ongerept, surf, witte dorpjes. Verder van huis, dichter bij de oorspronkelijke sfeer.',
  'costa-de-almeria':
    'Droog, cinematisch landschap en rustig. Voor wie ruimte en leegte zoekt boven drukte.',
  'balearen':
    'Prestige, premium aanbod en levensstijl. Schaarser vastgoed, hogere instap, sterke verhuurmarkt.',
  'canarische-eilanden':
    'Eeuwige lente, korte vluchten nauwelijks. Voor wie klimaat boven nabijheid tot Nederland zet.',
}

// Korte "belofte" — gebruikt in hero onder de regionaam
export const REGION_PROMISE: Record<string, string> = {
  'costa-del-sol':
    'Zon, internationaal leven en een vastgoedmarkt die blijft ademen.',
  'costa-blanca-noord':
    'Groene kust, authentieke dorpen, een tweede thuis onder Nederlanders en Belgen.',
  'costa-blanca-sur':
    'Direct resultaat: nieuw vastgoed, goede prijs en Alicante om de hoek.',
  'costa-calida':
    'Ruimte en rust voor je geld, met de zee altijd dichtbij.',
  'costa-tropical':
    'Een microklimaat dat bijna overal in Europa ongeëvenaard is.',
  'costa-de-valencia':
    'Stad, strand en AVE-snelheid in één pakket.',
  'costa-del-azahar':
    'Onontdekt, Spaans, en vriendelijk voor ambitieuze budgetten.',
  'costa-dorada':
    'Barcelona binnen handbereik, toerisme dat werkt voor verhuur.',
  'costa-brava':
    'Karakter, kunst en kliffen — voor wie sfeer koopt, niet vierkante meters.',
  'costa-de-la-luz':
    'De Atlantische kant van Spanje. Ongerept en bijzonder.',
  'costa-de-almeria':
    'Cinematisch landschap en leegte. Voor wie ruimte belangrijker vindt dan levendigheid.',
  'balearen':
    'Het premium segment. Schaars, prestigieus en altijd in trek.',
  'canarische-eilanden':
    'Eeuwige lente, het hele jaar door.',
}

// Specialist-coverage — alleen ingevuld voor regio's die Costa Select actief bedient.
// Placeholder data; vervang door echte naam/telefoon/whatsapp vanuit CRM.
export const REGION_SPECIALIST: Record<string, Specialist | undefined> = {
  'costa-del-sol': {
    name: 'Eva Martínez',
    role: 'Costa del Sol-specialist',
    phone: '+31 20 123 45 01',
    whatsapp: '+34 600 000 001',
  },
  'costa-blanca-noord': {
    name: 'Bart de Vries',
    role: 'Costa Blanca Noord-specialist',
    phone: '+31 20 123 45 02',
    whatsapp: '+34 600 000 002',
  },
  'costa-blanca-sur': {
    name: 'Isabel Ruiz',
    role: 'Costa Blanca Sur-specialist',
    phone: '+31 20 123 45 03',
    whatsapp: '+34 600 000 003',
  },
  'costa-de-valencia': {
    name: 'Mark Hendriks',
    role: 'Costa de Valencia-specialist',
    phone: '+31 20 123 45 04',
    whatsapp: '+34 600 000 004',
  },
  'costa-dorada': {
    name: 'Nora Claesen',
    role: 'Costa Dorada-specialist',
    phone: '+31 20 123 45 05',
    whatsapp: '+34 600 000 005',
  },
  'costa-brava': {
    name: 'Jaume Puig',
    role: 'Costa Brava-specialist',
    phone: '+31 20 123 45 06',
    whatsapp: '+34 600 000 006',
  },
}

// Extra metadata voor dimensies (blurb in WeightsStep) — data.ts blijft schoon.
export const DIMENSION_BLURBS: Record<string, string> = {
  klimaat: 'Zon, seizoenen, landschap',
  bereikbaarheid: 'Vluchten en reistijd',
  gemeenschap: 'Sfeer en buren',
  budget: 'Prijs per vierkante meter',
  vastgoed: 'Type en staat van woningen',
  levensstijl: 'Wat je buitenshuis doet',
  verhuur: 'Hoe je het huis gebruikt',
}
