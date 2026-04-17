import { getServerUser } from '@/lib/server-auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth/permissions'
import { getUserRole } from '@/lib/auth/roles'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY

// ─── Google Maps helpers ──────────────────────────────────────────────

interface LatLng { lat: number; lng: number }

async function geocode(address: string): Promise<LatLng | null> {
  if (!GMAPS_KEY) return null
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GMAPS_KEY}`
  )
  const data = await res.json()
  if (data.status === 'OK' && data.results?.[0]) {
    const loc = data.results[0].geometry.location
    return { lat: loc.lat, lng: loc.lng }
  }
  return null
}

interface DistanceElement { duration_minutes: number; distance_km: number }

async function getDistanceMatrix(
  origins: string[],
  destinations: string[]
): Promise<DistanceElement[][] | null> {
  if (!GMAPS_KEY) return null
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins.map(o => encodeURIComponent(o)).join('|')}&destinations=${destinations.map(d => encodeURIComponent(d)).join('|')}&mode=driving&language=nl&key=${GMAPS_KEY}`
  )
  const data = await res.json()
  if (data.status !== 'OK') return null

  return data.rows.map((row: { elements: Array<{ status: string; duration: { value: number }; distance: { value: number } }> }) =>
    row.elements.map(el => ({
      duration_minutes: el.status === 'OK' ? Math.round(el.duration.value / 60) : 0,
      distance_km: el.status === 'OK' ? Math.round(el.distance.value / 1000 * 10) / 10 : 0,
    }))
  )
}

// ─── Claude system prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `Je bent een routeplanner voor vastgoedbezichtigingen in Spanje. Je ontvangt een lijst woningen met adressen, coördinaten en de ECHTE reistijden tussen alle punten (berekend via Google Maps). Je taak is om de optimale route te bepalen.

Regels:
- Minimaliseer de totale rijtijd
- Houd rekening met de gewenste lunchtijd en lunchpauze-duur
- Plan de lunch in op het meest logische moment (niet midden in een bezichtiging, bij voorkeur dicht bij een stad/dorp)
- Houd rekening met de geschatte duur per bezichtiging
- Het vertrekpunt is gegeven, het eindpunt is vrij (de dag eindigt bij de laatste bezichtiging)
- Gebruik de meegeleverde reistijden uit de distance matrix — dit zijn echte rijtijden, niet schattingen
- Geef per stop de geschatte aankomsttijd, vertrektijd en reistijd naar de volgende stop

Antwoord ALLEEN in JSON format.`

const FALLBACK_SYSTEM_PROMPT = `Je bent een routeplanner voor vastgoedbezichtigingen in Spanje. Je ontvangt een lijst woningen met adressen. Je taak is om de optimale route te bepalen.

Regels:
- Minimaliseer de totale rijtijd door geografisch dicht bij elkaar liggende woningen achter elkaar te plannen
- Houd rekening met de gewenste lunchtijd en lunchpauze-duur
- Plan de lunch in op het meest logische moment
- Houd rekening met de geschatte duur per bezichtiging
- Het vertrekpunt is gegeven, het eindpunt is vrij
- Schat de reistijd in op basis van je kennis van Spanje (60-80 km/u kustweg, 100-120 snelweg)
- Geef per stop de geschatte aankomsttijd, vertrektijd en reistijd naar de volgende stop

Antwoord ALLEEN in JSON format.`

// ─── Main handler ─────────────────────────────────────────────────────

interface StopInput {
  id: string
  address: string
  viewing_duration_minutes: number
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { trip_id, start_address, start_time, lunch_time, lunch_duration_minutes, stops } = body as {
    trip_id: string
    start_address: string
    start_time: string
    lunch_time: string
    lunch_duration_minutes: number
    stops: StopInput[]
  }

  if (!stops || stops.length < 2) {
    return NextResponse.json({ error: 'Minimaal 2 stops nodig' }, { status: 400 })
  }

  // Ownership check op de trip
  const ownershipClient = createServiceClient()
  const { data: trip } = await ownershipClient
    .from('viewing_trips')
    .select('created_by')
    .eq('id', trip_id)
    .single()

  const role = await getUserRole(auth.id)
  if (trip?.created_by !== auth.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // ─── Stap 1: Geocoding ────────────────────────────────
    const allAddresses = [start_address || stops[0].address, ...stops.map(s => s.address)]
    const coords: (LatLng | null)[] = []

    if (GMAPS_KEY) {
      for (const addr of allAddresses) {
        coords.push(await geocode(addr))
      }
    }

    const hasCoords = coords.length > 0 && coords.every(c => c !== null)

    // Cache coördinaten in viewing_stops
    if (hasCoords) {
      const supabase = createServiceClient()
      for (let i = 0; i < stops.length; i++) {
        const coord = coords[i + 1] // +1 want index 0 is vertrekpunt
        if (coord) {
          await supabase.from('viewing_stops').update({ lat: coord.lat, lng: coord.lng }).eq('id', stops[i].id)
        }
      }
    }

    // ─── Stap 2: Distance Matrix ──────────────────────────
    let distanceMatrixText = ''

    if (GMAPS_KEY && hasCoords) {
      const matrix = await getDistanceMatrix(allAddresses, allAddresses)
      if (matrix) {
        const labels = ['Vertrekpunt', ...stops.map((s, i) => `Stop ${i + 1} (${s.address.substring(0, 40)})`)]
        const lines: string[] = []
        for (let i = 0; i < matrix.length; i++) {
          for (let j = 0; j < matrix[i].length; j++) {
            if (i !== j && matrix[i][j].duration_minutes > 0) {
              lines.push(`${labels[i]} → ${labels[j]}: ${matrix[i][j].duration_minutes} min (${matrix[i][j].distance_km} km)`)
            }
          }
        }
        distanceMatrixText = lines.join('\n')
      }
    }

    const hasRealDistances = distanceMatrixText.length > 0

    // ─── Stap 3: Claude route-optimalisatie ───────────────
    const coordsInfo = hasCoords
      ? stops.map((s, i) => {
          const c = coords[i + 1]
          return c ? `Coördinaten: ${c.lat}, ${c.lng}` : ''
        })
      : []

    const userPrompt = `Plan de optimale route voor deze bezichtigingsdag:

VERTREKPUNT: ${start_address || 'Eerste stop'}${hasCoords && coords[0] ? ` (${coords[0].lat}, ${coords[0].lng})` : ''}
STARTTIJD: ${start_time || '09:00'}
GEWENSTE LUNCHTIJD: ${lunch_time || '13:00'}
LUNCHPAUZE DUUR: ${lunch_duration_minutes || 60} minuten

STOPS:
${stops.map((s, i) =>
  `${i + 1}. ID: ${s.id} | Adres: ${s.address}${coordsInfo[i] ? ` | ${coordsInfo[i]}` : ''} | Bezichtigingsduur: ${s.viewing_duration_minutes} minuten`
).join('\n')}

${hasRealDistances ? `REISTIJDEN (via Google Maps, echte rijtijden):\n${distanceMatrixText}` : 'Geen exacte reistijden beschikbaar. Schat de reistijden op basis van de adressen.'}

Bepaal de optimale volgorde en tijdplanning.

Geef terug als JSON:
{
  "stops": [
    {
      "stop_id": "uuid van de stop",
      "sort_order": 1,
      "estimated_arrival": "09:15",
      "estimated_departure": "09:45",
      "travel_time_to_next_minutes": 20
    }
  ],
  "lunch": {
    "after_stop_order": 3,
    "start_time": "13:00",
    "end_time": "14:00"
  },
  "total_driving_minutes": 87,
  "estimated_end_time": "15:37",
  "route_summary": "Korte uitleg van de route-logica in 1-2 zinnen"
}

Geef ALLEEN de JSON terug.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: hasRealDistances ? SYSTEM_PROMPT : FALLBACK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon geen route genereren' }, { status: 500 })
    }

    const routeData = JSON.parse(jsonMatch[0])

    // ─── Stap 4: Opslaan ──────────────────────────────────
    const supabase = createServiceClient()
    await supabase.from('viewing_trips').update({ route_data: routeData }).eq('id', trip_id)

    for (const rs of routeData.stops) {
      await supabase.from('viewing_stops').update({
        sort_order: rs.sort_order,
        estimated_arrival: rs.estimated_arrival,
        travel_time_minutes: rs.travel_time_to_next_minutes,
      }).eq('id', rs.stop_id)
    }

    return NextResponse.json(routeData)
  } catch (err) {
    console.error('Route optimization failed:', err)
    return NextResponse.json({ error: 'Route optimalisatie mislukt' }, { status: 500 })
  }
}
