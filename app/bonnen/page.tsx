'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro } from '@/lib/calculations'
import { Upload, FileText, Image, Download, X, Eye } from 'lucide-react'
import { useEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'

interface Categorie { id: string; naam: string }
interface Post { id: string; categorie_id: string; naam: string }
interface Bon {
  id: string
  datum: string
  bedrag: number
  btw_bedrag: number | null
  omschrijving: string | null
  categorie_id: string | null
  kosten_post_id: string | null
  bestandsnaam: string
  bestandspad: string
  bestandstype: string | null
  bestandsgrootte: number | null
  entiteit: string | null
}

const KWARTALEN = ['Q1', 'Q2', 'Q3', 'Q4'] as const
const kwartaalMaanden: Record<string, number[]> = { Q1: [1,2,3], Q2: [4,5,6], Q3: [7,8,9], Q4: [10,11,12] }

export default function BonnenPage() {
  const { entity, setEntity } = useEntity()
  const [bonnen, setBonnen] = useState<Bon[]>([])
  const [categorieen, setCategorieen] = useState<Categorie[]>([])
  const [posten, setPosten] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedKwartaal, setSelectedKwartaal] = useState<string>('Q1')
  const [filterKwartaal, setFilterKwartaal] = useState<string>('alle')
  const [filterCategorie, setFilterCategorie] = useState<string>('')
  const [exportLoading, setExportLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Label form per upload
  const [labelForm, setLabelForm] = useState<{
    file: File; url: string;
    datum: string; bedrag: string; btw: string;
    omschrijving: string; categorie_id: string; post_id: string
  } | null>(null)

  const jaar = new Date().getFullYear()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [bRes, cRes, pRes] = await Promise.all([
      supabase.from('bonnen').select('*').order('datum', { ascending: false }),
      supabase.from('kosten_categorieen').select('id, naam').eq('actief', true).order('volgorde'),
      supabase.from('kosten_posten').select('id, categorie_id, naam').eq('actief', true).order('volgorde'),
    ])
    setBonnen((bRes.data ?? []) as Bon[])
    setCategorieen((cRes.data ?? []) as Categorie[])
    setPosten((pRes.data ?? []) as Post[])
    setLoading(false)
  }

  function getKwartaal(datum: string): string {
    const maand = new Date(datum).getMonth() + 1
    if (maand <= 3) return 'Q1'
    if (maand <= 6) return 'Q2'
    if (maand <= 9) return 'Q3'
    return 'Q4'
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 10 * 1024 * 1024) { alert('Bestand is groter dan 10 MB'); return }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      alert('Alleen PDF, JPG en PNG toegestaan'); return
    }
    const url = URL.createObjectURL(file)
    setLabelForm({
      file, url,
      datum: new Date().toISOString().split('T')[0],
      bedrag: '', btw: '', omschrijving: '',
      categorie_id: '', post_id: '',
    })
  }

  async function saveBon() {
    if (!labelForm || !labelForm.bedrag) return
    setUploading(true)
    try {
      const ext = labelForm.file.name.split('.').pop()?.toLowerCase()
      const pad = `${jaar}/${Date.now()}-${labelForm.file.name}`
      const { error: uploadError } = await supabase.storage.from('bonnen').upload(pad, labelForm.file)
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from('bonnen').insert({
        datum: labelForm.datum,
        bedrag: parseFloat(labelForm.bedrag.replace(',', '.')),
        btw_bedrag: labelForm.btw ? parseFloat(labelForm.btw.replace(',', '.')) : null,
        omschrijving: labelForm.omschrijving || null,
        categorie_id: labelForm.categorie_id || null,
        kosten_post_id: labelForm.post_id || null,
        bestandsnaam: labelForm.file.name,
        bestandspad: pad,
        bestandstype: ext ?? null,
        bestandsgrootte: labelForm.file.size,
        entiteit: entity,
      })
      if (dbError) throw dbError

      URL.revokeObjectURL(labelForm.url)
      setLabelForm(null)
      await loadAll()
    } catch (e) {
      alert('Upload mislukt: ' + (e as Error).message)
    }
    setUploading(false)
  }

  async function openBon(bon: Bon) {
    const { data } = await supabase.storage.from('bonnen').createSignedUrl(bon.bestandspad, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteBon(bon: Bon) {
    if (!confirm(`${bon.bestandsnaam} verwijderen?`)) return
    await supabase.storage.from('bonnen').remove([bon.bestandspad])
    await supabase.from('bonnen').delete().eq('id', bon.id)
    setBonnen((prev) => prev.filter((b) => b.id !== bon.id))
  }

  async function exportZip() {
    setExportLoading(true)
    try {
      const res = await fetch(`/api/bonnen/export?kwartaal=${selectedKwartaal}&jaar=${jaar}`)
      if (!res.ok) throw new Error('Export mislukt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bonnen-${selectedKwartaal}-${jaar}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export mislukt: ' + (e as Error).message)
    }
    setExportLoading(false)
  }

  const entityBonnen = bonnen.filter((b) => (b.entiteit ?? 'overig') === entity)

  const gefilterd = entityBonnen.filter((b) => {
    if (filterKwartaal !== 'alle' && getKwartaal(b.datum) !== filterKwartaal) return false
    if (filterCategorie && b.categorie_id !== filterCategorie) return false
    return true
  })

  const kwartaalStats = KWARTALEN.map((q) => ({
    kwartaal: q,
    aantal: entityBonnen.filter((b) => getKwartaal(b.datum) === q).length,
    bedrag: entityBonnen.filter((b) => getKwartaal(b.datum) === q).reduce((s, b) => s + Number(b.bedrag), 0),
  }))

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Bonnen & facturen</h1>
        <EntitySwitch value={entity} onChange={setEntity} />
      </div>

      {/* Kwartaal samenvatting */}
      <div className="grid grid-cols-4 gap-4">
        {kwartaalStats.map((q) => (
          <div key={q.kwartaal} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1">{q.kwartaal} {jaar}</div>
            <div className="text-xl font-semibold text-slate-900">{q.aantal} bestanden</div>
            <div className="text-xs text-slate-400 mt-1">{formatEuro(q.bedrag)}</div>
          </div>
        ))}
      </div>

      {/* Export bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
        <span className="text-sm text-slate-600 font-medium">ZIP export:</span>
        <select value={selectedKwartaal} onChange={(e) => setSelectedKwartaal(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400">
          {KWARTALEN.map((q) => <option key={q}>{q}</option>)}
        </select>
        <span className="text-xs text-slate-400">
          {kwartaalStats.find((q) => q.kwartaal === selectedKwartaal)?.aantal ?? 0} bestanden
        </span>
        <button onClick={exportZip} disabled={exportLoading}
          className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm hover:bg-slate-700 disabled:opacity-50 ml-auto">
          <Download size={14} />
          {exportLoading ? 'Exporteren...' : 'Download ZIP'}
        </button>
      </div>

      {/* Upload zone */}
      {!labelForm && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Upload size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600">Sleep een bestand hierheen of <span className="text-blue-500">klik om te uploaden</span></p>
          <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — max 10 MB</p>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
        </div>
      )}

      {/* Label formulier na upload */}
      {labelForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Bon labelen: {labelForm.file.name}</h2>
            <button onClick={() => { URL.revokeObjectURL(labelForm.url); setLabelForm(null) }}
              className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Datum bon *">
              <input type="date" value={labelForm.datum}
                onChange={(e) => setLabelForm({ ...labelForm, datum: e.target.value })}
                className={inp} />
            </Field>
            <Field label="Bedrag (€) *">
              <input type="text" placeholder="0,00" value={labelForm.bedrag}
                onChange={(e) => setLabelForm({ ...labelForm, bedrag: e.target.value })}
                className={inp} />
            </Field>
            <Field label="BTW bedrag (€)">
              <input type="text" placeholder="0,00" value={labelForm.btw}
                onChange={(e) => setLabelForm({ ...labelForm, btw: e.target.value })}
                className={inp} />
            </Field>
            <Field label="Omschrijving">
              <input type="text" value={labelForm.omschrijving}
                onChange={(e) => setLabelForm({ ...labelForm, omschrijving: e.target.value })}
                className={inp} />
            </Field>
            <Field label="Categorie">
              <select value={labelForm.categorie_id}
                onChange={(e) => setLabelForm({ ...labelForm, categorie_id: e.target.value, post_id: '' })}
                className={inp}>
                <option value="">Kies categorie</option>
                {categorieen.map((c) => <option key={c.id} value={c.id}>{c.naam}</option>)}
              </select>
            </Field>
            <Field label="Kostenpost">
              <select value={labelForm.post_id}
                onChange={(e) => setLabelForm({ ...labelForm, post_id: e.target.value })}
                className={inp}>
                <option value="">Kies kostenpost</option>
                {posten
                  .filter((p) => !labelForm.categorie_id || p.categorie_id === labelForm.categorie_id)
                  .map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={saveBon} disabled={uploading || !labelForm.bedrag}
              className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              {uploading ? 'Uploaden...' : 'Opslaan'}
            </button>
            <button onClick={() => { URL.revokeObjectURL(labelForm.url); setLabelForm(null) }}
              className="px-4 py-2 rounded-md text-sm text-slate-500 border border-slate-200 hover:bg-slate-50">
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select value={filterKwartaal} onChange={(e) => setFilterKwartaal(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none">
          <option value="alle">Alle kwartalen</option>
          {KWARTALEN.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
        <select value={filterCategorie} onChange={(e) => setFilterCategorie(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none">
          <option value="">Alle categorieën</option>
          {categorieen.map((c) => <option key={c.id} value={c.id}>{c.naam}</option>)}
        </select>
        <span className="text-xs text-slate-400">{gefilterd.length} bestanden</span>
      </div>

      {/* Bestandenlijst */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {gefilterd.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">Geen bonnen gevonden</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['', 'Bestand', 'Datum', 'Bedrag', 'BTW', 'Categorie', 'Kostenpost', ''].map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefilterd.map((bon) => {
                const cat = categorieen.find((c) => c.id === bon.categorie_id)
                const post = posten.find((p) => p.id === bon.kosten_post_id)
                const isImg = ['jpg', 'jpeg', 'png'].includes(bon.bestandstype ?? '')
                return (
                  <tr key={bon.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                    <td className="px-3 py-2">
                      {isImg
                        ? <Image size={14} className="text-slate-400" />
                        : <FileText size={14} className="text-slate-400" />}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate font-medium">{bon.bestandsnaam}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(bon.datum).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{formatEuro(bon.bedrag)}</td>
                    <td className="px-3 py-2 text-slate-500">{bon.btw_bedrag ? formatEuro(bon.btw_bedrag) : '—'}</td>
                    <td className="px-3 py-2">
                      {cat && <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">{cat.naam}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{post?.naam ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openBon(bon)} className="text-slate-400 hover:text-blue-500">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => deleteBon(bon)} className="text-slate-400 hover:text-red-500">
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
