'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEntity } from '@/lib/entity'
import {
  FinEntitySwitch,
  FinHeader,
  FinKpi,
  FinKpiGrid,
  FinSection,
} from '@/components/financieel/parts'

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

function getKwartaal(datum: string): string {
  const m = new Date(datum).getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

function currentKwartaal(): string {
  const m = new Date().getMonth() + 1
  if (m <= 3) return 'Q1'
  if (m <= 6) return 'Q2'
  if (m <= 9) return 'Q3'
  return 'Q4'
}

export default function BonnenPage() {
  const { entity, setEntity } = useEntity()
  const isLocked = entity === 'beide'
  const editEntity = entity === 'beide' ? 'overig' : entity

  const [bonnen, setBonnen] = useState<Bon[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filterKwartaal, setFilterKwartaal] = useState<string>('alle')
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedKwartaal, setSelectedKwartaal] = useState<string>(currentKwartaal())
  const [uploadProgress, setUploadProgress] = useState<{ name: string; done: boolean }[]>([])
  const [pendingFiles, setPendingFiles] = useState<{ file: File; naam: string; kwartaal: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jaar = new Date().getFullYear()

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data } = await supabase.from('bonnen').select('*').order('datum', { ascending: false })
      if (cancelled) return
      setBonnen((data ?? []) as Bon[])
      setLoading(false)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const allowed = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '') && f.size <= 10 * 1024 * 1024
    })
    if (allowed.length === 0) {
      alert('Alleen PDF, JPG en PNG tot 10 MB toegestaan')
      return
    }
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
        const { error: uploadError } = await supabase.storage
          .from('bonnen')
          .upload(pad, file)
        if (uploadError) throw uploadError
        await supabase.from('bonnen').insert({
          datum: kwartaalToDatum(kwartaal),
          bedrag: 0,
          omschrijving: null,
          bestandsnaam: naam,
          bestandspad: pad,
          bestandstype: ext ?? null,
          bestandsgrootte: file.size,
          entiteit: editEntity,
        })
        setUploadProgress(prev => prev.map((p, j) => (j === i ? { ...p, done: true } : p)))
      } catch {
        // skip failed file
      }
    }

    const { data } = await supabase.from('bonnen').select('*').order('datum', { ascending: false })
    setBonnen((data ?? []) as Bon[])
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
      a.href = url
      a.download = `bonnen-${selectedKwartaal}-${jaar}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export mislukt: ' + (e as Error).message)
    }
    setExportLoading(false)
  }

  const entityBonnen = useMemo(
    () => bonnen.filter(b => (b.entiteit ?? 'overig') === editEntity),
    [bonnen, editEntity]
  )
  const gefilterd = useMemo(
    () =>
      entityBonnen.filter(
        b => filterKwartaal === 'alle' || getKwartaal(b.datum) === filterKwartaal
      ),
    [entityBonnen, filterKwartaal]
  )
  const kwartaalStats = useMemo(
    () =>
      KWARTALEN.map(q => ({
        kwartaal: q,
        aantal: entityBonnen.filter(b => getKwartaal(b.datum) === q).length,
      })),
    [entityBonnen]
  )
  const totaalGrootte = useMemo(
    () => entityBonnen.reduce((s, b) => s + (b.bestandsgrootte ?? 0), 0),
    [entityBonnen]
  )

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Bonnen & facturen"
          subtitle="Upload bonnen per kwartaal, exporteer als ZIP voor je accountant."
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
        </FinHeader>

        {isLocked && (
          <div className="fin-banner">
            <strong>Beide entiteiten geselecteerd.</strong> Bonnen worden per entiteit geboekt.
            Kies <em>CS</em> of <em>CSV</em> om bonnen te bekijken of te uploaden.
          </div>
        )}

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          !isLocked && (
            <>
              <FinKpiGrid>
                {kwartaalStats.map(q => (
                  <FinKpi
                    key={q.kwartaal}
                    label={`${q.kwartaal} ${jaar}`}
                    value={q.aantal}
                    sub={`${q.aantal === 1 ? 'bestand' : 'bestanden'}`}
                    tone={q.kwartaal === currentKwartaal() ? 'accent' : 'default'}
                  />
                ))}
              </FinKpiGrid>

              {/* Export bar */}
              <FinSection
                title="ZIP-export"
                meta={`${kwartaalStats.find(q => q.kwartaal === selectedKwartaal)?.aantal ?? 0} bestanden`}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="fin-select"
                    value={selectedKwartaal}
                    onChange={e => setSelectedKwartaal(e.target.value)}
                    style={{ width: 'auto', minWidth: 130 }}
                  >
                    {KWARTALEN.map(q => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="fin-btn primary"
                    onClick={() => void exportZip()}
                    disabled={exportLoading}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Download />
                    {exportLoading ? 'Exporteren…' : 'Download ZIP'}
                  </button>
                </div>
              </FinSection>

              {/* Upload zone */}
              <div
                className={`fin-dropzone ${dragOver ? 'dragover' : ''} ${
                  uploading || pendingFiles.length > 0 ? 'is-busy' : ''
                }`}
                onDragOver={e => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOver(false)
                  handleFiles(e.dataTransfer.files)
                }}
                onClick={() => !uploading && pendingFiles.length === 0 && fileInputRef.current?.click()}
              >
                {uploadProgress.length > 0 ? (
                  <div className="fin-upload-progress">
                    {uploadProgress.map((p, i) => (
                      <div key={i} className="fin-upload-row">
                        {p.done ? (
                          <Check size={14} style={{ color: 'var(--positive)' }} />
                        ) : (
                          <span className="fin-upload-spinner" />
                        )}
                        <span style={{ color: p.done ? 'var(--fg-muted)' : 'var(--fg)' }}>
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="fin-dropzone-icon" />
                    <p className="fin-dropzone-title">
                      Sleep bestanden hierheen of <span>klik om te uploaden</span>
                    </p>
                    <p className="fin-dropzone-sub">
                      PDF, JPG, PNG — max 10 MB per bestand — meerdere tegelijk mogelijk
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className="fin-dropzone-input"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              {/* Review pending uploads */}
              {pendingFiles.length > 0 && !uploading && (
                <FinSection
                  title={`${pendingFiles.length} bestand${pendingFiles.length === 1 ? '' : 'en'} klaar`}
                  meta={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="fin-link"
                        onClick={() => setPendingFiles([])}
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        className="fin-btn primary"
                        onClick={() => void confirmUpload()}
                      >
                        <Upload /> Uploaden
                      </button>
                    </div>
                  }
                >
                  <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                    <table className="fin-table">
                      <thead>
                        <tr>
                          <th>Bestandsnaam</th>
                          <th style={{ width: 130 }}>Kwartaal</th>
                          <th style={{ width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingFiles.map((p, i) => (
                          <tr key={i}>
                            <td>
                              <input
                                className="fin-input"
                                value={p.naam}
                                onChange={e =>
                                  setPendingFiles(prev =>
                                    prev.map((f, j) =>
                                      j === i ? { ...f, naam: e.target.value } : f
                                    )
                                  )
                                }
                              />
                            </td>
                            <td>
                              <select
                                className="fin-select"
                                value={p.kwartaal}
                                onChange={e =>
                                  setPendingFiles(prev =>
                                    prev.map((f, j) =>
                                      j === i ? { ...f, kwartaal: e.target.value } : f
                                    )
                                  )
                                }
                              >
                                {KWARTALEN.map(q => (
                                  <option key={q} value={q}>
                                    {q} {jaar}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="fin-row-action danger"
                                onClick={() =>
                                  setPendingFiles(prev => prev.filter((_, j) => j !== i))
                                }
                                aria-label="Verwijderen"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </FinSection>
              )}

              {/* Bestandenlijst */}
              <FinSection
                title={`Bestanden (${gefilterd.length})`}
                meta={
                  totaalGrootte > 0
                    ? `${(totaalGrootte / 1024 / 1024).toFixed(1)} MB totaal`
                    : ''
                }
              >
                <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <select
                    className="fin-select"
                    value={filterKwartaal}
                    onChange={e => setFilterKwartaal(e.target.value)}
                    style={{ width: 'auto', minWidth: 160 }}
                  >
                    <option value="alle">Alle kwartalen</option>
                    {KWARTALEN.map(q => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                {gefilterd.length === 0 ? (
                  <p
                    style={{
                      textAlign: 'center',
                      padding: '32px 0',
                      color: 'var(--fg-subtle)',
                      fontSize: 13,
                    }}
                  >
                    Geen bonnen gevonden.
                  </p>
                ) : (
                  <div className="fin-table-wrap" style={{ borderRadius: 10 }}>
                    <table className="fin-table">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}></th>
                          <th>Bestand</th>
                          <th>Datum</th>
                          <th>Grootte</th>
                          <th style={{ width: 80 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {gefilterd.map(bon => {
                          const isImg = ['jpg', 'jpeg', 'png'].includes(bon.bestandstype ?? '')
                          const kb = bon.bestandsgrootte
                            ? Math.round(bon.bestandsgrootte / 1024)
                            : null
                          return (
                            <tr key={bon.id}>
                              <td className="muted">
                                {isImg ? <ImageIcon size={14} /> : <FileText size={14} />}
                              </td>
                              <td
                                style={{
                                  maxWidth: 320,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: 600,
                                }}
                              >
                                {bon.bestandsnaam}
                              </td>
                              <td className="muted">
                                {new Date(bon.datum).toLocaleDateString('nl-NL')}
                              </td>
                              <td className="muted">{kb ? `${kb} KB` : '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  <button
                                    type="button"
                                    className="fin-row-action"
                                    onClick={() => void openBon(bon)}
                                    aria-label="Openen"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="fin-row-action danger"
                                    onClick={() => void deleteBon(bon)}
                                    aria-label="Verwijderen"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </FinSection>

              <div style={{ height: 60 }} />
            </>
          )
        )}
      </div>
    </div>
  )
}
