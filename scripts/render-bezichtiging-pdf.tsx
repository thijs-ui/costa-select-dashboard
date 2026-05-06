// @ts-nocheck
/* eslint-disable */
// Lokale render van de bezichtigingen-PDF voor visuele iteratie zonder Vercel.
// Run: npx tsx scripts/render-bezichtiging-pdf.tsx
// Output: scripts/out-bezichtiging.pdf
//
// Mock-data parallel aan handoff/bz-data.js (Familie De Vries, 4 stops).

import * as fs from 'fs'
import * as path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { BezichtigingPDF } from '../app/api/bezichtigingen/pdf/route'

const trip = {
  id: 't1',
  client_name: 'Familie De Vries',
  client_email: 'devries@gmail.com',
  client_phone: '+31612345678',
  trip_date: '2026-05-02',
  start_time: '09:00',
  start_address: 'Club Hotel Marbella, Av. de Lola Flores, Marbella',
  lunch_time: '13:00',
  lunch_duration_minutes: 60,
  notes: '',
  status: 'gepland',
}

const stops = [
  {
    id: 's1', trip_id: 't1', sort_order: 1,
    address: 'Calle del Sol 14, Estepona',
    property_title: 'Villa Mirador',
    listing_url: 'https://www.costaselect.com/woning/villa-mirador',
    price: 795000,
    viewing_duration_minutes: 30,
    contact_name: 'Carlos Ruiz',
    contact_phone: '+34611223344',
    notes: 'Verkoper spreekt Engels, geeft rondleiding persoonlijk.',
  },
  {
    id: 's2', trip_id: 't1', sort_order: 2,
    address: 'Urb. Los Flamingos 7, Benahavís',
    property_title: 'Residencia Horizonte',
    listing_url: 'https://www.costaselect.com/woning/residencia-horizonte',
    price: 685000,
    viewing_duration_minutes: 35,
    contact_name: 'María López',
    contact_phone: '+34622334455',
    notes: '',
  },
  {
    id: 's3', trip_id: 't1', sort_order: 3,
    address: 'Camino de la Cruz 3, Marbella',
    property_title: 'Casa del Pino',
    listing_url: 'https://www.idealista.com/inmueble/casa-del-pino',
    price: 720000,
    viewing_duration_minutes: 30,
    contact_name: 'Ana Fernández',
    contact_phone: '+34633445566',
    notes: '',
  },
  {
    id: 's4', trip_id: 't1', sort_order: 4,
    address: 'Finca Los Almendros, Mijas',
    property_title: 'Finca Los Almendros',
    listing_url: 'https://www.costaselect.com/woning/finca-los-almendros',
    price: 925000,
    viewing_duration_minutes: 40,
    contact_name: 'Jorge Sánchez',
    contact_phone: '+34644556677',
    notes: 'Klant heeft al interesse getoond per telefoon.',
  },
]

const route = {
  stops: [
    { stop_id: 's1', sort_order: 1, estimated_arrival: '09:18', estimated_departure: '09:48', travel_time_to_next_minutes: 22 },
    { stop_id: 's2', sort_order: 2, estimated_arrival: '10:10', estimated_departure: '10:45', travel_time_to_next_minutes: 15 },
    { stop_id: 's3', sort_order: 3, estimated_arrival: '11:00', estimated_departure: '11:30', travel_time_to_next_minutes: 28 },
    { stop_id: 's4', sort_order: 4, estimated_arrival: '14:38', estimated_departure: '15:18', travel_time_to_next_minutes: 0 },
  ],
  lunch: { after_stop_order: 3, start_time: '13:00', end_time: '14:00' },
  total_driving_minutes: 83,
  estimated_end_time: '15:18',
  route_summary:
    'Route start vanuit Marbella en loopt kloksgewijs via Estepona naar Benahavís en terug. Lunch ingepland na Casa del Pino om 13:00, zodat de langste rit (naar Mijas, 28 min) na de pauze valt wanneer de klant fris is.',
}

async function main() {
  const buffer = await renderToBuffer(
    React.createElement(BezichtigingPDF, {
      trip: trip as any,
      stops: stops as any,
      route: route as any,
    }),
  )
  const out = path.join(__dirname, 'out-bezichtiging.pdf')
  fs.writeFileSync(out, Buffer.from(buffer))
  console.log('Written:', out, '(' + buffer.length + ' bytes)')
}

main().catch(e => { console.error(e); process.exit(1) })
