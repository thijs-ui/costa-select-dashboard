import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Je bent een routeplanner voor vastgoedbezichtigingen in Spanje. Je ontvangt een lijst woningen met adressen en bezichtigingstijden. Je taak is om de optimale route te bepalen.

Regels:
- Minimaliseer de totale rijtijd door geografisch dicht bij elkaar liggende woningen achter elkaar te plannen
- Houd rekening met de gewenste lunchtijd en lunchpauze-duur
- Plan de lunch in op het meest logische moment (niet midden in een bezichtiging)
- Houd rekening met de geschatte duur per bezichtiging
- Het vertrekpunt is gegeven, het eindpunt is vrij (de dag eindigt bij de laatste bezichtiging)
- Schat de reistijd in tussen adressen op basis van je kennis van Spanje (typische afstanden, snelheid 60-80 km/u op kustweg, 100-120 op snelweg)
- Geef per stop de geschatte aankomsttijd, vertrektijd en reistijd naar de volgende stop

Antwoord ALLEEN in JSON format.`

export async function POST(request: Request) {
  const body = await request.json()
  const { trip_id, start_address, start_time, lunch_time, lunch_duration_minutes, stops } = body

  if (!stops || stops.length < 2) {
    return NextResponse.json({ error: 'Minimaal 2 stops nodig' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Plan de optimale route voor deze bezichtigingsdag:

VERTREKPUNT: ${start_address || 'Eerste stop'}
STARTTIJD: ${start_time || '09:00'}
GEWENSTE LUNCHTIJD: ${lunch_time || '13:00'}
LUNCHPAUZE DUUR: ${lunch_duration_minutes || 60} minuten

STOPS:
${stops.map((s: { id: string; address: string; viewing_duration_minutes: number }, i: number) =>
  `${i + 1}. ID: ${s.id} | Adres: ${s.address} | Bezichtigingsduur: ${s.viewing_duration_minutes} minuten`
).join('\n')}

Bepaal de optimale volgorde en tijdplanning. Schat de reistijden tussen adressen.

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

Geef ALLEEN de JSON terug.`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kon geen route genereren' }, { status: 500 })
    }

    const routeData = JSON.parse(jsonMatch[0])

    // Sla route_data op in de trip
    const supabase = createServiceClient()
    await supabase.from('viewing_trips').update({ route_data: routeData }).eq('id', trip_id)

    // Update individuele stops
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
