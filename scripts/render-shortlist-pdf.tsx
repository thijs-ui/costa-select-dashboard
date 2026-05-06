/* eslint-disable */
// Lokale render van de shortlist-PDF voor visuele iteratie zonder Vercel.
// Run: npx tsx scripts/render-shortlist-pdf.tsx
// Output: scripts/out.pdf

import * as fs from 'fs'
import * as path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { ShortlistPDF } from '../app/api/woninglijst/pdf/route'

const items = [
  {
    title: 'Casa independiente in Marbella',
    url: 'https://idealista.com/inmueble/123',
    price: 1780000,
    location: 'Marbella',
    bedrooms: 4,
    bathrooms: 4,
    size_m2: 280,
    thumbnail: null,
    source: 'idealista',
    notities: 'Perfecte ligging — klant wil graag bezichtigen volgende week.',
    is_favorite: true,
  },
  {
    title: 'Casa independiente in calle Francisco Zurbarán, 11',
    url: 'https://idealista.com/inmueble/456',
    price: 595000,
    location: 'Jávea/Xàbia',
    bedrooms: 3,
    bathrooms: 2,
    size_m2: 156,
    thumbnail: null,
    source: 'idealista',
    notities: '',
    is_favorite: false,
  },
  {
    title: 'Casa independiente',
    url: 'https://idealista.com/inmueble/789',
    price: 575000,
    location: 'Jávea/Xàbia',
    bedrooms: 3,
    bathrooms: 2,
    size_m2: 141,
    thumbnail: null,
    source: 'idealista',
    notities: '',
    is_favorite: true,
  },
  {
    title: 'Piso en Arrabal del Altos Rodeo',
    url: 'https://idealista.com/inmueble/abc',
    price: 595000,
    location: 'Marbella',
    bedrooms: 2,
    bathrooms: 2,
    size_m2: 92,
    thumbnail: null,
    source: 'idealista',
    notities: '',
    is_favorite: false,
  },
  {
    title: 'Casa independiente en avenida Generalife',
    url: 'https://idealista.com/inmueble/def',
    price: 2650000,
    location: 'Marbella',
    bedrooms: 4,
    bathrooms: 4,
    size_m2: 418,
    thumbnail: null,
    source: 'idealista',
    notities: '',
    is_favorite: false,
  },
]

async function main() {
  const buffer = await renderToBuffer(
    React.createElement(ShortlistPDF, {
      klantNaam: 'Pieter Piet',
      items: items as any,
    }),
  )
  const out = path.join(__dirname, 'out.pdf')
  fs.writeFileSync(out, Buffer.from(buffer))
  console.log('Written:', out, '(' + buffer.length + ' bytes)')
}

main().catch(e => { console.error(e); process.exit(1) })
