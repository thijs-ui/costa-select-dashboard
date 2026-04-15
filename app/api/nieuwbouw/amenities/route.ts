import { NextResponse } from 'next/server'
import { createBotsClient } from '@/lib/supabase-bots'

export const maxDuration = 120

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!

interface AmenityConfig {
  key: string
  type: string
  radius: number
}

const CATEGORIES: AmenityConfig[] = [
  { key: 'strand', type: 'beach', radius: 10000 },
  { key: 'supermarkt', type: 'supermarket', radius: 5000 },
  { key: 'restaurant', type: 'restaurant', radius: 5000 },
  { key: 'bar', type: 'bar', radius: 5000 },
  { key: 'luchthaven', type: 'airport', radius: 50000 },
  { key: 'treinstation', type: 'train_station', radius: 50000 },
  { key: 'ziekenhuis', type: 'hospital', radius: 50000 },
  { key: 'school', type: 'school', radius: 5000 },
  { key: 'apotheek', type: 'pharmacy', radius: 5000 },
  { key: 'golfbaan', type: 'golf_course', radius: 50000 },
]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function estimateMinutes(km: number): number {
  if (km < 2) return Math.ceil(km * 3)
  if (km < 20) return Math.ceil(km * 2)
  return Math.ceil(km * 1.2)
}

async function findNearest(lat: number, lng: number, type: string, radius: number): Promise<{ distance_km: number; distance_min: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GMAPS_KEY}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' || !data.results?.length) return null

  const place = data.results[0]
  const placeLat = place.geometry.location.lat
  const placeLng = place.geometry.location.lng
  const km = Math.round(haversineKm(lat, lng, placeLat, placeLng) * 10) / 10

  return { distance_km: km, distance_min: estimateMinutes(km) }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST() {
  const supabase = createBotsClient()

  // Haal projecten zonder amenities op
  const { data: projects, error } = await supabase
    .from('listings')
    .select('id, latitude, longitude')
    .is('amenities_fetched_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('is_active', true)
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!projects?.length) return NextResponse.json({ processed: 0, remaining: 0 })

  // Tel remaining
  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .is('amenities_fetched_at', null)
    .not('latitude', 'is', null)
    .eq('is_active', true)

  let processed = 0

  for (const project of projects) {
    const amenities: Record<string, { distance_km: number; distance_min: number } | null> = {}

    for (const cat of CATEGORIES) {
      try {
        amenities[cat.key] = await findNearest(project.latitude, project.longitude, cat.type, cat.radius)
      } catch {
        amenities[cat.key] = null
      }
      await sleep(100) // Rate limiting
    }

    await supabase.from('listings').update({
      nearby_amenities: amenities,
      amenities_fetched_at: new Date().toISOString(),
    }).eq('id', project.id)

    processed++
  }

  return NextResponse.json({ processed, remaining: (count ?? 0) - processed })
}
