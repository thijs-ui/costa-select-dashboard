import { NextResponse } from 'next/server'
import { createBotsClient } from '@/lib/supabase-bots'
import { logSecurity } from '@/lib/logger'

export const maxDuration = 300 // 5 minuten

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!

interface AmenityConfig { key: string; type: string; radius: number }

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

async function findNearest(lat: number, lng: number, type: string, radius: number) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GMAPS_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null
  const place = data.results[0]
  const km = Math.round(haversineKm(lat, lng, place.geometry.location.lat, place.geometry.location.lng) * 10) / 10
  return { distance_km: km, distance_min: estimateMinutes(km) }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function GET(request: Request) {
  // Vercel Cron stuurt `Authorization: Bearer ${CRON_SECRET}`. Fail-closed:
  // als CRON_SECRET niet is gezet, wordt de route volledig geblokkeerd.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logSecurity({ action: 'auth_failure', path: '/api/nieuwbouw/amenities/cron', reason: 'invalid_cron_secret' })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createBotsClient()
  const BATCH_SIZE = 30 // Groter dan de handmatige batch (30 × 10 cats = 300 calls, ruim binnen 5 min)

  const { data: projects } = await supabase
    .from('listings')
    .select('id, latitude, longitude')
    .is('amenities_fetched_at', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('is_active', true)
    .limit(BATCH_SIZE)

  if (!projects?.length) {
    return NextResponse.json({ message: 'No projects to process', processed: 0 })
  }

  let processed = 0
  for (const project of projects) {
    const amenities: Record<string, { distance_km: number; distance_min: number } | null> = {}
    for (const cat of CATEGORIES) {
      try {
        amenities[cat.key] = await findNearest(project.latitude, project.longitude, cat.type, cat.radius)
      } catch {
        amenities[cat.key] = null
      }
      await sleep(100)
    }
    await supabase.from('listings').update({
      nearby_amenities: amenities,
      amenities_fetched_at: new Date().toISOString(),
    }).eq('id', project.id)
    processed++
  }

  console.log(`[AMENITIES CRON] Processed ${processed} projects`)
  return NextResponse.json({ processed })
}
