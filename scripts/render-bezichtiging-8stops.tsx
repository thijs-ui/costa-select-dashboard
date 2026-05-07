// @ts-nocheck
/* eslint-disable */
// Lokaal: 8-stops trip met lunch tussen stop 4 en 5 → 2-pagina itinerary.
// Run: npx tsx scripts/render-bezichtiging-8stops.tsx
// Output: scripts/out-bezichtiging-8stops.pdf

import * as fs from 'fs'
import * as path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { BezichtigingPDF } from '../app/api/bezichtigingen/pdf/route'

const trip = {
  id: 't1',
  client_name: 'Jan Janssen',
  client_email: 'jan@example.com',
  client_phone: '+31612345678',
  trip_date: '2026-05-07',
  start_time: '09:00',
  start_address: 'Club Hotel Marbella, Av. de Lola Flores, Marbella',
  lunch_time: '12:30',
  lunch_duration_minutes: 60,
  notes: '',
  status: 'gepland',
}

const stops = Array.from({ length: 8 }, (_, i) => ({
  id: `s${i + 1}`,
  trip_id: 't1',
  sort_order: i + 1,
  address: [
    'Urbanización Nueva Alcántara, Calle Río Guadalmina 8, San Pedro de Alcántara',
    'Calle de Ribera 22, Puerto Banús, Marbella',
    'Calle Jacinto Benavente 15, Marbella',
    'Avenida del Carmen 30, Estepona',
    'Carretera de Cádiz 153, Estepona',
    'Paseo Marítimo Rey de España 82, Fuengirola',
    'Calle Coín 5, Mijas Pueblo',
    'Calle Marbella 12, Benalmádena',
  ][i],
  property_title: 'Woning',
  listing_url: '',
  price: null,
  viewing_duration_minutes: 30,
  contact_name: '',
  contact_phone: '',
  notes: '',
}))

const route = {
  stops: [
    { stop_id: 's1', sort_order: 1, estimated_arrival: '10:30', estimated_departure: '11:00', travel_time_to_next_minutes: 4 },
    { stop_id: 's2', sort_order: 2, estimated_arrival: '09:30', estimated_departure: '10:00', travel_time_to_next_minutes: 10 },
    { stop_id: 's3', sort_order: 3, estimated_arrival: '13:30', estimated_departure: '14:00', travel_time_to_next_minutes: 25 },
    { stop_id: 's4', sort_order: 4, estimated_arrival: '12:30', estimated_departure: '13:00', travel_time_to_next_minutes: 25 },
    { stop_id: 's5', sort_order: 5, estimated_arrival: '11:30', estimated_departure: '12:00', travel_time_to_next_minutes: 13 },
    { stop_id: 's6', sort_order: 6, estimated_arrival: '14:30', estimated_departure: '15:00', travel_time_to_next_minutes: 18 },
    { stop_id: 's7', sort_order: 7, estimated_arrival: '15:30', estimated_departure: '16:00', travel_time_to_next_minutes: 23 },
    { stop_id: 's8', sort_order: 8, estimated_arrival: '16:30', estimated_departure: '17:00', travel_time_to_next_minutes: 0 },
  ],
  lunch: { after_stop_order: 4, start_time: '13:00', end_time: '14:00' },
  total_driving_minutes: 118,
  estimated_end_time: '17:00',
  route_summary:
    'Route volgt geografische logica van west naar oost: eerst Puerto Banús/San Pedro/Estepona gebied, dan lunch in Estepona, vervolgens terug via Marbella naar Fuengirola/Mijas/Benalmádena. Minimaliseert totale rijtijd door clustering van nabijgelegen stops.',
}

async function main() {
  const buf = await renderToBuffer(
    React.createElement(BezichtigingPDF, {
      trip: trip as any,
      stops: stops as any,
      route: route as any,
    }),
  )
  const out = path.join(__dirname, 'out-bezichtiging-8stops.pdf')
  fs.writeFileSync(out, Buffer.from(buf))
  console.log('Written:', out, '(' + buf.length + ' bytes)')
}

main().catch(e => { console.error(e); process.exit(1) })
