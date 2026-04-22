// ============================================================================
// Costa Kompas v2 — Investeerder-bank (Fase 7, TS port)
//
// Parallelle 21-vragenbank + 13×21 score-matrix voor profile = 'investering'.
// Gesyncd met standalone: costa-kompas/src/data/kompas-v2-investor.js.
// ============================================================================

import type { Question, Dimension } from './data'

export const INVESTOR_DIMENSIONS: Dimension[] = [
  { id: 'rendement' as never,     name: 'Rendement' },
  { id: 'waardestijging' as never, name: 'Waardestijging' },
  { id: 'kapitaal' as never,      name: 'Budget & Instapprijs' },
  { id: 'strategie' as never,     name: 'Strategie' },
  { id: 'risico' as never,        name: 'Risico & Liquiditeit' },
  { id: 'regelgeving' as never,   name: 'Regelgeving & Vergunningen' },
  { id: 'lifestyle' as never,     name: 'Regio & Lifestyle' },
]

export const INVESTOR_QUESTIONS: Question[] = [
  { id: 'IV1.1', dimension: 'rendement' as never, rank: 1, text: 'Welk type rendement zoek je?', options: [
    { id: 'A', label: 'Hoog rendement met kort-verhuur (toeristisch, per week)' },
    { id: 'B', label: 'Stabiel middelmatig rendement met lang-verhuur (maanden tot jaren)' },
    { id: 'C', label: 'Minder rendement, focus op waardegroei' },
  ]},
  { id: 'IV1.2', dimension: 'rendement' as never, rank: 2, text: 'Hoeveel weken per jaar wil je de woning verhuren?', options: [
    { id: 'A', label: 'Meer dan 35 weken (jaarrond)' },
    { id: 'B', label: 'Tussen 15 en 30 weken' },
    { id: 'C', label: 'Minder dan 15 weken (kort seizoen)' },
  ]},
  { id: 'IV1.3', dimension: 'rendement' as never, rank: 3, text: 'Welke huurders zoek je?', options: [
    { id: 'A', label: 'Toeristen (hoge weekprijzen)' },
    { id: 'B', label: 'Expats en winterresidenten (maandelijkse huur)' },
    { id: 'C', label: 'Lokale huurders (stabiele jaarhuur)' },
  ]},
  { id: 'IV2.1', dimension: 'waardestijging' as never, rank: 1, text: 'Hoe kijk je naar waardegroei?', options: [
    { id: 'A', label: 'Koop in opkomende regio, wacht op waardesprong' },
    { id: 'B', label: 'Gevestigde regio met stabiele groei' },
    { id: 'C', label: 'Waardestijging is bijzaak, rendement is belangrijker' },
  ]},
  { id: 'IV2.2', dimension: 'waardestijging' as never, rank: 2, text: 'Hoe lang wil je de woning houden?', options: [
    { id: 'A', label: '3 tot 5 jaar, dan verkopen voor winst' },
    { id: 'B', label: '5 tot 15 jaar, middellange termijn' },
    { id: 'C', label: '15 jaar of langer, of nalaten' },
  ]},
  { id: 'IV2.3', dimension: 'waardestijging' as never, rank: 3, text: 'Wat stuurt jouw investeringskeuzes meer?', options: [
    { id: 'A', label: 'Harde cijfers (prijs-trends, transactievolume, yield)' },
    { id: 'B', label: 'Een mix van data en gevoel voor de plek' },
    { id: 'C', label: 'Vooral gevoel en persoonlijke ervaring' },
  ]},
  { id: 'IV3.1', dimension: 'kapitaal' as never, rank: 1, text: 'Welk instapbudget per woning?', options: [
    { id: 'A', label: 'Tot €300.000 (instapsegment)' },
    { id: 'B', label: 'Tussen €300.000 en €700.000 (middensegment)' },
    { id: 'C', label: 'Meer dan €700.000 (premium of luxe)' },
  ]},
  { id: 'IV3.2', dimension: 'kapitaal' as never, rank: 2, text: 'Hoe ga je financieren?', options: [
    { id: 'A', label: 'Volledig cash (100% eigen vermogen)' },
    { id: 'B', label: 'Gedeeltelijk hypotheek (50-70% eigen inbreng)' },
    { id: 'C', label: 'Maximale hypotheek voor leverage' },
  ]},
  { id: 'IV3.3', dimension: 'kapitaal' as never, rank: 3, text: 'Wat is belangrijker voor je?', options: [
    { id: 'A', label: 'Meerdere woningen voor hetzelfde budget (spreiding)' },
    { id: 'B', label: 'Balans tussen kwaliteit en aantal' },
    { id: 'C', label: 'Eén topobject op een prime locatie' },
  ]},
  { id: 'IV4.1', dimension: 'strategie' as never, rank: 1, text: 'Welke investeringsstrategie past bij jou?', options: [
    { id: 'A', label: 'Buy-to-let (kopen, verhuren, langdurig houden)' },
    { id: 'B', label: 'Buy-to-sell (kopen, opknappen, verkopen)' },
    { id: 'C', label: 'Value-add (kopen, verbeteren, rendement optimaliseren)' },
  ]},
  { id: 'IV4.2', dimension: 'strategie' as never, rank: 2, text: 'Hoe betrokken wil je zijn bij het dagelijks beheer?', options: [
    { id: 'A', label: 'Volledig hands-off (alles uitbesteed aan beheerder)' },
    { id: 'B', label: 'Licht betrokken (strategische beslissingen, geen dagelijks werk)' },
    { id: 'C', label: 'Actief beheer (zelf of met lokale partner, dicht op de bal)' },
  ]},
  { id: 'IV4.3', dimension: 'strategie' as never, rank: 3, text: 'Hoe kijk je naar de staat van de woning?', options: [
    { id: 'A', label: 'Nieuwbouw of direct klaar voor verhuur' },
    { id: 'B', label: 'Bestaand met lichte opfrisbeurt' },
    { id: 'C', label: 'Fixer-upper met flinke renovatie, maximale value-add' },
  ]},
  { id: 'IV5.1', dimension: 'risico' as never, rank: 1, text: 'Wat is jouw risicoprofiel?', options: [
    { id: 'A', label: 'Laag risico, geaccepteerd rendement' },
    { id: 'B', label: 'Gemiddeld risico, gemiddeld rendement' },
    { id: 'C', label: 'Hoog risico, hoog rendement' },
  ]},
  { id: 'IV5.2', dimension: 'risico' as never, rank: 2, text: 'Hoe belangrijk is snelle doorverkoopbaarheid?', options: [
    { id: 'A', label: 'Cruciaal — ik wil binnen 3 maanden kunnen verkopen' },
    { id: 'B', label: 'Belangrijk maar geen haast' },
    { id: 'C', label: 'Niet belangrijk — langjarig bezit' },
  ]},
  { id: 'IV5.3', dimension: 'risico' as never, rank: 3, text: 'Welke marktdynamiek zoek je?', options: [
    { id: 'A', label: 'Stabiele, voorspelbare markt' },
    { id: 'B', label: 'Groeimarkt met momentum' },
    { id: 'C', label: 'Opportunistische nichemarkt' },
  ]},
  { id: 'IV6.1', dimension: 'regelgeving' as never, rank: 1, text: 'Hoe belangrijk is vergunning-zekerheid voor toeristische verhuur?', options: [
    { id: 'A', label: 'Heel belangrijk — ik wil nu en op lange termijn kunnen verhuren' },
    { id: 'B', label: 'Belangrijk, maar ik accepteer enige regulering' },
    { id: 'C', label: 'Minder belangrijk — mijn strategie leunt niet op toeristische verhuur' },
  ]},
  { id: 'IV6.2', dimension: 'regelgeving' as never, rank: 2, text: 'Wat voor regelgevingsklimaat past bij jou?', options: [
    { id: 'A', label: 'Liberaal en pro-verhuur (bijvoorbeeld Andalucía)' },
    { id: 'B', label: 'Gematigd met duidelijke regels (bijvoorbeeld Valencia, Murcia)' },
    { id: 'C', label: 'Streng en restrictief (bijvoorbeeld Catalonië, Balearen)' },
  ]},
  { id: 'IV6.3', dimension: 'regelgeving' as never, rank: 3, text: 'Hoe belangrijk is fiscale vriendelijkheid van de regio?', options: [
    { id: 'A', label: 'Heel belangrijk — laag ITP, lage IRNR' },
    { id: 'B', label: 'Belangrijk maar niet doorslaggevend' },
    { id: 'C', label: 'Niet doorslaggevend — rendement komt eerst' },
  ]},
  { id: 'IV7.1', dimension: 'lifestyle' as never, rank: 1, text: 'Moet je de regio zelf ook leuk vinden?', options: [
    { id: 'A', label: 'Ja, ik gebruik de woning af en toe zelf' },
    { id: 'B', label: "Een beetje, ik bezoek 'm incidenteel" },
    { id: 'C', label: 'Nee, puur investering — ik hoef er niet te komen' },
  ]},
  { id: 'IV7.2', dimension: 'lifestyle' as never, rank: 2, text: 'Welk type omgeving trekt jou aan voor jouw portefeuille?', options: [
    { id: 'A', label: 'Bruisende kustplaatsen met veel toerisme' },
    { id: 'B', label: 'Gevestigde steden met internationale community' },
    { id: 'C', label: 'Nichemarkten met specifieke aantrekkingskracht' },
  ]},
  { id: 'IV7.3', dimension: 'lifestyle' as never, rank: 3, text: 'Wat weegt zwaarder?', options: [
    { id: 'A', label: 'Snel te bereiken vanuit Nederland' },
    { id: 'B', label: 'Mooie locatie, reistijd is secundair' },
    { id: 'C', label: 'De deal zelf bepaalt alles, locatie is bijzaak' },
  ]},
]

export const INVESTOR_REGION_POSITIONS: Record<string, Record<string, number>> = {
  'costa-del-sol':       { 'IV1.1':1,'IV1.2':1,'IV1.3':1,'IV2.1':0,'IV2.2':0,'IV2.3':1,'IV3.1':-1,'IV3.2':0,'IV3.3':-1,'IV4.1':1,'IV4.2':0,'IV4.3':1,'IV5.1':1,'IV5.2':2,'IV5.3':0,'IV6.1':1,'IV6.2':2,'IV6.3':2,'IV7.1':1,'IV7.2':2,'IV7.3':1 },
  'costa-blanca-noord':  { 'IV1.1':0,'IV1.2':0,'IV1.3':0,'IV2.1':-1,'IV2.2':0,'IV2.3':0,'IV3.1':-1,'IV3.2':0,'IV3.3':0,'IV4.1':1,'IV4.2':0,'IV4.3':-1,'IV5.1':2,'IV5.2':1,'IV5.3':2,'IV6.1':1,'IV6.2':0,'IV6.3':1,'IV7.1':1,'IV7.2':0,'IV7.3':1 },
  'costa-blanca-sur':    { 'IV1.1':2,'IV1.2':1,'IV1.3':2,'IV2.1':0,'IV2.2':1,'IV2.3':1,'IV3.1':2,'IV3.2':1,'IV3.3':2,'IV4.1':2,'IV4.2':1,'IV4.3':2,'IV5.1':1,'IV5.2':2,'IV5.3':1,'IV6.1':1,'IV6.2':0,'IV6.3':1,'IV7.1':1,'IV7.2':2,'IV7.3':1 },
  'costa-calida':        { 'IV1.1':-1,'IV1.2':-1,'IV1.3':0,'IV2.1':2,'IV2.2':1,'IV2.3':2,'IV3.1':2,'IV3.2':1,'IV3.3':2,'IV4.1':1,'IV4.2':0,'IV4.3':0,'IV5.1':-1,'IV5.2':0,'IV5.3':-1,'IV6.1':2,'IV6.2':0,'IV6.3':2,'IV7.1':0,'IV7.2':0,'IV7.3':0 },
  'costa-tropical':      { 'IV1.1':-1,'IV1.2':-1,'IV1.3':-1,'IV2.1':2,'IV2.2':0,'IV2.3':0,'IV3.1':1,'IV3.2':0,'IV3.3':1,'IV4.1':0,'IV4.2':-1,'IV4.3':-1,'IV5.1':-1,'IV5.2':-1,'IV5.3':-2,'IV6.1':1,'IV6.2':2,'IV6.3':2,'IV7.1':0,'IV7.2':-1,'IV7.3':0 },
  'costa-de-valencia':   { 'IV1.1':-1,'IV1.2':-1,'IV1.3':-2,'IV2.1':0,'IV2.2':0,'IV2.3':1,'IV3.1':0,'IV3.2':0,'IV3.3':0,'IV4.1':1,'IV4.2':0,'IV4.3':0,'IV5.1':1,'IV5.2':1,'IV5.3':0,'IV6.1':0,'IV6.2':0,'IV6.3':0,'IV7.1':0,'IV7.2':1,'IV7.3':0 },
  'costa-del-azahar':    { 'IV1.1':0,'IV1.2':0,'IV1.3':0,'IV2.1':2,'IV2.2':1,'IV2.3':1,'IV3.1':2,'IV3.2':1,'IV3.3':2,'IV4.1':0,'IV4.2':0,'IV4.3':-1,'IV5.1':-1,'IV5.2':-1,'IV5.3':-1,'IV6.1':0,'IV6.2':0,'IV6.3':1,'IV7.1':-1,'IV7.2':-1,'IV7.3':0 },
  'costa-dorada':        { 'IV1.1':1,'IV1.2':1,'IV1.3':1,'IV2.1':0,'IV2.2':0,'IV2.3':0,'IV3.1':1,'IV3.2':1,'IV3.3':1,'IV4.1':1,'IV4.2':1,'IV4.3':1,'IV5.1':1,'IV5.2':1,'IV5.3':1,'IV6.1':-1,'IV6.2':-2,'IV6.3':-1,'IV7.1':1,'IV7.2':2,'IV7.3':1 },
  'costa-brava':         { 'IV1.1':1,'IV1.2':1,'IV1.3':1,'IV2.1':0,'IV2.2':-1,'IV2.3':0,'IV3.1':-1,'IV3.2':0,'IV3.3':-1,'IV4.1':0,'IV4.2':-1,'IV4.3':-1,'IV5.1':1,'IV5.2':0,'IV5.3':2,'IV6.1':-1,'IV6.2':-2,'IV6.3':-1,'IV7.1':1,'IV7.2':1,'IV7.3':0 },
  'costa-de-la-luz':     { 'IV1.1':1,'IV1.2':0,'IV1.3':1,'IV2.1':1,'IV2.2':0,'IV2.3':1,'IV3.1':1,'IV3.2':0,'IV3.3':0,'IV4.1':0,'IV4.2':-1,'IV4.3':0,'IV5.1':0,'IV5.2':0,'IV5.3':-1,'IV6.1':1,'IV6.2':2,'IV6.3':2,'IV7.1':0,'IV7.2':-1,'IV7.3':0 },
  'costa-de-almeria':    { 'IV1.1':-1,'IV1.2':0,'IV1.3':0,'IV2.1':2,'IV2.2':1,'IV2.3':2,'IV3.1':2,'IV3.2':1,'IV3.3':2,'IV4.1':-1,'IV4.2':-1,'IV4.3':-2,'IV5.1':-2,'IV5.2':-2,'IV5.3':-2,'IV6.1':1,'IV6.2':2,'IV6.3':2,'IV7.1':-1,'IV7.2':-1,'IV7.3':0 },
  'balearen':            { 'IV1.1':2,'IV1.2':1,'IV1.3':2,'IV2.1':-1,'IV2.2':-2,'IV2.3':-1,'IV3.1':-2,'IV3.2':-1,'IV3.3':-2,'IV4.1':1,'IV4.2':0,'IV4.3':0,'IV5.1':2,'IV5.2':2,'IV5.3':2,'IV6.1':-1,'IV6.2':-2,'IV6.3':-1,'IV7.1':0,'IV7.2':1,'IV7.3':0 },
  'canarische-eilanden': { 'IV1.1':2,'IV1.2':2,'IV1.3':2,'IV2.1':0,'IV2.2':-1,'IV2.3':0,'IV3.1':0,'IV3.2':0,'IV3.3':0,'IV4.1':2,'IV4.2':1,'IV4.3':1,'IV5.1':1,'IV5.2':2,'IV5.3':1,'IV6.1':-1,'IV6.2':-2,'IV6.3':0,'IV7.1':0,'IV7.2':2,'IV7.3':0 },
}
