'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Image, Download, X, Eye, Check } from 'lucide-react'
import { useEntity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'

interface Bon {
  id: string
  datum: string
  bedrag: number
  omschrijving: string | null
  bestandsnaam: string
  bestandspad: string
  bestandstype: string | null
  bestandsgrootte: number | null
  entiteit: string | null
}

const KWARTALEN = ['Q1', 'Q2', 'Q3', 'Q4'] as const

export default function BonnenPage() {
  const { entity, setEntity } = useEntity()
  const [bonnen, setBonnen] = useState<Bon[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filterKwartaal, setFilterKwartaal] = useState<string>('alle')
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedKwartaal, setSelectedKwartaal] = useState<string>('Q1')
  const [uploadProgress, setUploadProgress] = useState<{ name: string; done: boolean }[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ file: File; naam: string; kwartaal: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jaar = new Date().getFullYear()

  function currentKwartaal(): string {
    const m = new Date().getMonth() + 1
    if (m <= 3) return 'Q1'
    if (m <= 6) return 'Q2'
    if (m <= 9) return 'Q3'
    return 'Q4'
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data } = await supabase.from('bonnen').select('*').order('datum', { ascending: false })
    setBonnen((data ?? []) as Bon[])
    setLoading(false)
  }

  function getKwartaal(datum: string): string {
    const m = new Date(datum).getMonth() + 1
    if (m <= 3) return 'Q1'
    if (m <= 6) return 'Q2'
    if (m <= 9) return 'Q3'
    return 'Q4'
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const allowed = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '') && f.size <= 10 * 1024 * 1024
    })
    if (allowed.length === 0) { alert('Alleen PDF, JPG en PNG tot 10 MB toegestaan'); return }

    const kw = currentKwartaal()
    setPendingFiles(allowed.map(f => ({ file: f, naam: f.name, kwartaal: kw })))
  }

  function kwartaalToDatum(kwartaal: string): string {
    const midMonth: Record<string, string> = { Q1: '02', Q2: '05', Q3: '08', Q4: '11' }
    return `${jaar}-${midMonth[kwartaal] || '01'}-15`
  }

  async function confirmUpload() {
    if (pendingFiles.length === 0) return
    setUploading(true)
    setUploadProgress(pendingFiles.map(p => ({ name: p.naam, done: false })))

    for (let i = 0; i < pendingFiles.length; i++) {
      const { file, naam, kwartaal } = pendingFiles[i]
      const ext = file.name.split('.').pop()?.toLowerCase()
      const pad = `${jaar}/${Date.now()}-${naam}`
      try {
        const { error: uploadError } = await supabase.storage.from('bonnen').upload(pad, file)
        if (uploadError) throw uploadError
        await supabase.from('bonnen').insert({
          datum: kwartaalToDatum(kwartaal),
          bedrag: 0,
          omschrijving: null,
          bestandsnaam: naam,
          bestandspad: pad,
          bestandstype: ext ?? null,
          bestandsgrootte: file.size,
          entiteit: entity,
        })
        setUploadProgress(prev => prev.map((p, j) => j === i ? { ...p, done: true } : p))
      } catch {
        // skip failed file, continue with rest
      }
    }

    await loadAll()
    setUploading(false)
    setPendingFiles([])
    setTimeout(() => setUploadProgress([]), 2000)
  }

  async function openBon(bon: Bon) {
    const { data } = await supabase.storage.from('bonnen').createSignedUrl(bon.bestandspad, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function deleteBon(bon: Bon) {
    if (!confirm(`${bon.bestandsnaam} verwijderen?`)) return
    await supabase.storage.from('bonnen').remove([bon.bestandspad])
    await supabase.from('bonnen').delete().eq('id', bon.id)
    setBonnen(prev => prev.filter(b => b.id !== bon.id))
  }

  async function exportZip() {
    setExportLoading(true)
    try {
      const res = await fetch(`/api/bonnen/export?kwartaal=${selectedKwartaal}&jaar=${jaar}`)
      if (!res.ok) throw new Error('Export mislukt')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `bonnen-${selectedKwartaal}-${jaar}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Export mislukt: ' + (e as Error).message) }
    setExportLoading(false)
  }

  const entityBonnen = bonnen.filter(b => (b.entiteit ?? 'overig') === entity)
  const gefilterd = entityBonnen.filter(b => filterKwartaal === 'alle' || getKwartaal(b.datum) === filterKwartaal)

  const kwartaalStats = KWARTALEN.map(q => ({
    kwartaal: q,
    aantal: entityBonnen.filter(b => getKwartaal(b.datum) === q).length,
  }))

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div className="px-8 py-8 w-full space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-slate-900">Bonnen & facturen</h1>
        <EntitySwitch value={entity} onChange={setEntity} />
      </div>

      {/* Kwartaal samenvatting */}
      <div className="grid grid-cols-4 gap-4">
        {kwartaalStats.map(q => (
          <div key={q.kwartaal} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-1">{q.kwartaal} {jaar}</div>
            <div className="text-xl font-semibold text-slate-900">{q.aantal} bestanden</div>
          </div>
        ))}
      </div>

      {/* Export bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4">
        <span className="text-sm text-slate-600 font-medium">ZIP export:</span>
        <select value={selectedKwartaal} onChange={e => setSelectedKwartaal(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none">
          {KWARTALEN.map(q => <option key={q}>{q}</option>)}
        </select>
        <span className="text-xs text-slate-400">{kwartaalStats.find(q => q.kwartaal === selectedKwartaal)?.aantal ?? 0} bestanden</span>
        <button onClick={exportZip} disabled={exportLoading}
          className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm hover:bg-slate-700 disabled:opacity-50 ml-auto">
          <Download size={14} />
          {exportLoading ? 'Exporteren...' : 'Download ZIP'}
        </button>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && !pendingFiles.length && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : uploading ? 'border-slate-200 bg-slate-50' : pendingFiles.length ? 'border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
        }`}
      >
        {uploadProgress.length > 0 ? (
          <div className="space-y-1.5 max-w-sm mx-auto">
            {uploadProgress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {p.done
                  ? <Check size={14} className="text-green-500 shrink-0" />
                  : <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />}
                <span className={`truncate ${p.done ? 'text-slate-500' : 'text-slate-700'}`}>{p.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-600">Sleep bestanden hierheen of <span className="text-blue-500">klik om te uploaden</span></p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — max 10 MB per bestand — meerdere tegelijk mogelijk</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Review pending uploads */}
      {pendingFiles.length > 0 && !uploading && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{pendingFiles.length} bestand{pendingFiles.length !== 1 ? 'en' : ''} klaar om te uploaden</h3>
            <div className="flex gap-2">
              <button onClick={() => setPendingFiles([])} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Annuleren</button>
              <button onClick={confirmUpload} className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm hover:bg-slate-700 cursor-pointer">
                <Upload size={14} /> Uploaden
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-2 py-1.5 text-xs uppercase tracking-wide text-slate-500 font-medium">Bestandsnaam</th>
                <th className="text-left px-2 py-1.5 text-xs uppercase tracking-wide text-slate-500 font-medium w-28">Kwartaal</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pendingFiles.map((p, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="px-2 py-1.5">
                    <input
                      value={p.naam}
                      onChange={e => setPendingFiles(prev => prev.map((f, j) => j === i ? { ...f, naam: e.target.value } : f))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={p.kwartaal}
                      onChange={e => setPendingFiles(prev => prev.map((f, j) => j === i ? { ...f, kwartaal: e.target.value } : f))}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none"
                    >
                      {KWARTALEN.map(q => <option key={q} value={q}>{q} {jaar}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-slate-300 hover:text-red-400 cursor-pointer"
                    ><X size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={filterKwartaal} onChange={e => setFilterKwartaal(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none">
          <option value="alle">Alle kwartalen</option>
          {KWARTALEN.map(q => <option key={q} value={q}>{q}</option>)}
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
                {['', 'Bestand', 'Datum', 'Grootte', ''].map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gefilterd.map(bon => {
                const isImg = ['jpg', 'jpeg', 'png'].includes(bon.bestandstype ?? '')
                const kb = bon.bestandsgrootte ? Math.round(bon.bestandsgrootte / 1024) : null
                return (
                  <tr key={bon.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                    <td className="px-3 py-2">
                      {isImg ? <Image size={14} className="text-slate-400" /> : <FileText size={14} className="text-slate-400" />}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-[280px] truncate font-medium">{bon.bestandsnaam}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{new Date(bon.datum).toLocaleDateString('nl-NL')}</td>
                    <td className="px-3 py-2 text-slate-400 text-xs">{kb ? `${kb} KB` : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openBon(bon)} className="text-slate-400 hover:text-blue-500"><Eye size={13} /></button>
                        <button onClick={() => deleteBon(bon)} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
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
