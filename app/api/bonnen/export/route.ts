import { getServerUser } from '@/lib/server-auth'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'

const kwartaalMaanden: Record<string, number[]> = {
  Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12],
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kwartaal = searchParams.get('kwartaal') ?? 'Q1'
  const jaar = parseInt(searchParams.get('jaar') ?? String(new Date().getFullYear()))

  const maanden = kwartaalMaanden[kwartaal] ?? [1, 2, 3]
  const supabase = createServiceClient()

  // Gebruik de eerste dag van het kwartaal en eerste dag van het volgende kwartaal
  // om te voorkomen dat ongeldige datums (bijv. 31 juni) een SQL-fout geven
  const vanDatum = `${jaar}-${String(maanden[0]).padStart(2, '0')}-01`
  const volgendeMaand = maanden[2] === 12 ? 1 : maanden[2] + 1
  const volgendJaar = maanden[2] === 12 ? jaar + 1 : jaar
  const totDatum = `${volgendJaar}-${String(volgendeMaand).padStart(2, '0')}-01`

  // Haal bonnen op voor dit kwartaal
  const { data: bonnen } = await supabase
    .from('bonnen')
    .select('*, kosten_categorieen(naam), kosten_posten(naam)')
    .gte('datum', vanDatum)
    .lt('datum', totDatum)
    .order('datum')

  if (!bonnen || bonnen.length === 0) {
    return new NextResponse('Geen bonnen gevonden', { status: 404 })
  }

  const zip = new JSZip()

  // Download elk bestand en voeg toe aan ZIP
  await Promise.all(
    bonnen.map(async (bon) => {
      const { data } = await supabase.storage.from('bonnen').download(bon.bestandspad)
      if (data) {
        const arrayBuffer = await data.arrayBuffer()
        zip.file(bon.bestandsnaam, arrayBuffer)
      }
    })
  )

  // Excel overzicht
  const excelData = bonnen.map((bon) => ({
    Datum: new Date(bon.datum).toLocaleDateString('nl-NL'),
    Bedrag: bon.bedrag,
    BTW: bon.btw_bedrag ?? '',
    Omschrijving: bon.omschrijving ?? '',
    Categorie: (bon.kosten_categorieen as { naam: string } | null)?.naam ?? '',
    Kostenpost: (bon.kosten_posten as { naam: string } | null)?.naam ?? '',
    Bestandsnaam: bon.bestandsnaam,
  }))

  const ws = XLSX.utils.json_to_sheet(excelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Bonnen ${kwartaal} ${jaar}`)
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  zip.file(`overzicht-${kwartaal}-${jaar}.xlsx`, excelBuffer)

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new NextResponse(zipBuffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="bonnen-${kwartaal}-${jaar}.zip"`,
    },
  })
}
