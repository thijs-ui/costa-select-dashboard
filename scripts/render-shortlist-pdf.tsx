// @ts-nocheck
/* eslint-disable */
// Lokale render van de shortlist-PDF voor visuele iteratie zonder Vercel.
// Run: npx tsx scripts/render-shortlist-pdf.tsx
// Output: scripts/out.pdf

import * as fs from 'fs'
import * as path from 'path'
import { renderToBuffer } from '@react-pdf/renderer'
import * as React from 'react'
import { ShortlistPDF } from '../app/api/woninglijst/pdf/route'

// 14 items om de exacte user-scenario te reproduceren waar cards 4 en 12
// over 2 pagina's gesplitst werden. Lange titles ingeforceerd.
const items = Array.from({ length: 14 }, (_, i) => {
  const longTitles = [
    'Casa independiente in Marbella',
    'Casa independiente',
    'Casa independiente en calle Francisco Zurbarán, 11',
    'Casa independiente',
    'Casa independiente',
    'Casa independiente',
    'Piso en Arrabal del Altos Rodeo',
    'Casa independiente en avenida Generalife',
    'Casa independiente en Diseminado Poligono 26',
    'Piso',
    'Piso en Urbanización La Reserva s/n',
    'Piso en avenida Aguamarina',
    'Piso en calle del Green',
    'Casa independiente',
  ]
  return {
    title: longTitles[i],
    url: `https://idealista.com/inmueble/${i}`,
    price: [1780000, 1695000, 595000, 575000, 583500, 595000, 595000, 2650000, 2895000, 245000, 299000, 300000, 279000, 1795000][i],
    location: ['Marbella','Marbella','Jávea/Xàbia','Jávea/Xàbia','Jávea/Xàbia','Jávea/Xàbia','Marbella','Marbella','Marbella','Estepona','Marbella','Benalmádena','Estepona','Marbella'][i],
    bedrooms: [4,4,3,3,3,3,2,4,4,2,2,2,2,4][i],
    bathrooms: [4,4,2,2,2,2,2,4,4,2,2,1,2,3][i],
    size_m2: [280,240,156,141,234,210,92,418,294,79,115,80,98,248][i],
    plot_m2: null,
    thumbnail: null,
    source: 'idealista',
    notities:
      i === 0
        ? 'Perfecte ligging op loopafstand van het strand. Klant wil graag bezichtigen volgende week en heeft al budgettoezegging van de bank gekregen voor dit prijssegment. De golfvereniging om de hoek is bovendien een grote plus.'
        : i === 1
        ? 'Recent gerenoveerd, kwalitatief sterk afgewerkt. Eigenaar is gemotiveerd. Onderhandelingsruimte vermoed ik op ~5%.'
        : i === 7
        ? 'Top-3 match op basis van de voorkeuren — modern, ruim, en een privé zwembad. Notitie: er is een kleine zaak met de buren over een muur die we vóór bezichtiging willen uitvragen bij de makelaar.'
        : '',
    is_favorite: i === 0 || i === 1 || i === 7,
  }
})

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
