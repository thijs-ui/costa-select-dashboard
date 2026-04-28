'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, Repeat2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import { type Entity, useEntity } from '@/lib/entity'
import {
  FinEntitySwitch,
  FinHeader,
  FinSection,
} from '@/components/financieel/parts'

interface Categorie {
  id: string
  naam: string
  volgorde: number
}

interface Post {
  id: string
  categorie_id: string
  naam: string
  volgorde: number
  vaste_lasten: Record<string, number> | null
}

interface Maandkost {
  kosten_post_id: string
  maand: number
  bedrag: number
}

type CellStatus = 'idle' | 'saving' | 'saved'

export default function MaandkostenPage() {
  const jaar = new Date().getFullYear()
  const { entity, setEntity } = useEntity()

  // Voor data-load/save: 'beide' is geen geldige entiteit voor kosten-rijen.
  // We blokkeren editing in dat geval en gebruiken 'overig' als fallback voor
  // het uiteindelijke supabase-veld als de gebruiker tóch zou opslaan.
  const editEntity: Exclude<Entity, 'beide'> = entity === 'beide' ? 'overig' : entity
  const isLocked = entity === 'beide'

  const [categorieen, setCategorieen] = useState<Categorie[]>([])
  const [posten, setPosten] = useState<Post[]>([])
  const [kosten, setKosten] = useState<Record<string, Record<number, number>>>({})
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({})
  const [loading, setLoading] = useState(true)
  const [newPostName, setNewPostName] = useState<Record<string, string>>({})
  const [newCatName, setNewCatName] = useState('')
  const [editingVasteLast, setEditingVasteLast] = useState<string | null>(null)
  const [vasteLastInput, setVasteLastInput] = useState('')
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (isLocked) {
      setLoading(false)
      setKosten({})
      return
    }
    let cancelled = false
    async function run() {
      try {
        const [catRes, postRes, kostRes] = await Promise.allSettled([
          supabase
            .from('kosten_categorieen')
            .select('*')
            .eq('actief', true)
            .order('volgorde'),
          supabase.from('kosten_posten').select('*').eq('actief', true).order('volgorde'),
          supabase
            .from('maandkosten')
            .select('kosten_post_id, maand, bedrag')
            .eq('jaar', jaar)
            .eq('entiteit', editEntity),
        ])
        if (cancelled) return
        const catData = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : []
        const postData = postRes.status === 'fulfilled' ? (postRes.value.data ?? []) : []
        const kostData = kostRes.status === 'fulfilled' ? (kostRes.value.data ?? []) : []
        setCategorieen(catData as Categorie[])
        setPosten(postData as Post[])

        const map: Record<string, Record<number, number>> = {}
        ;(kostData as Maandkost[]).forEach(k => {
          if (!map[k.kosten_post_id]) map[k.kosten_post_id] = {}
          map[k.kosten_post_id][k.maand] = k.bedrag
        })

        // Auto-fill lege maanden voor vaste lasten
        const vastePosts = (postData as Post[]).filter(
          p => p.vaste_lasten?.[editEntity]
        )
        for (const post of vastePosts) {
          const bedrag = post.vaste_lasten![editEntity]
          const updates: object[] = []
          for (let maand = 1; maand <= 12; maand++) {
            if (!map[post.id]?.[maand]) {
              updates.push({
                kosten_post_id: post.id,
                jaar,
                maand,
                bedrag,
                entiteit: editEntity,
              })
              if (!map[post.id]) map[post.id] = {}
              map[post.id][maand] = bedrag
            }
          }
          if (updates.length > 0) {
            await supabase
              .from('maandkosten')
              .upsert(updates, { onConflict: 'kosten_post_id,jaar,maand,entiteit' })
          }
        }

        setKosten(map)
      } catch (e) {
        console.error('[run] failed:', e)
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    void run()
    return () => {
      cancelled = true
    }
  }, [editEntity, isLocked, jaar])

  function getBedrag(postId: string, maand: number): number {
    return kosten[postId]?.[maand] ?? 0
  }

  function getRijTotaal(postId: string): number {
    return MAANDEN.reduce((s, _, i) => s + getBedrag(postId, i + 1), 0)
  }

  function getCatTotaal(catId: string, maand?: number): number {
    const catPosten = posten.filter(p => p.categorie_id === catId)
    if (maand !== undefined) {
      return catPosten.reduce((s, p) => s + getBedrag(p.id, maand), 0)
    }
    return catPosten.reduce((s, p) => s + getRijTotaal(p.id), 0)
  }

  function getTotaal(maand?: number): number {
    return categorieen.reduce((s, c) => s + getCatTotaal(c.id, maand), 0)
  }

  function handleCellChange(postId: string, maand: number, value: string) {
    if (isLocked) return
    const bedrag = parseFloat(value.replace(',', '.')) || 0
    setKosten(prev => ({
      ...prev,
      [postId]: { ...prev[postId], [maand]: bedrag },
    }))
    const key = `${postId}-${maand}`
    setCellStatus(prev => ({ ...prev, [key]: 'saving' }))
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(
      () => void saveCell(postId, maand, bedrag, key),
      800
    )
  }

  async function saveCell(postId: string, maand: number, bedrag: number, key: string) {
    await supabase.from('maandkosten').upsert(
      { kosten_post_id: postId, jaar, maand, bedrag, entiteit: editEntity },
      { onConflict: 'kosten_post_id,jaar,maand,entiteit' }
    )
    setCellStatus(prev => ({ ...prev, [key]: 'saved' }))
    setTimeout(
      () => setCellStatus(prev => ({ ...prev, [key]: 'idle' })),
      1500
    )
  }

  async function saveVasteLast(postId: string, bedrag: number | null) {
    if (isLocked) return
    const post = posten.find(p => p.id === postId)
    const huidig = post?.vaste_lasten ?? {}
    const nieuw =
      bedrag === null
        ? Object.fromEntries(Object.entries(huidig).filter(([k]) => k !== editEntity))
        : { ...huidig, [editEntity]: bedrag }
    await supabase.from('kosten_posten').update({ vaste_lasten: nieuw }).eq('id', postId)
    if (bedrag === null) {
      await supabase
        .from('maandkosten')
        .delete()
        .eq('kosten_post_id', postId)
        .eq('jaar', jaar)
        .eq('entiteit', editEntity)
      setKosten(prev => {
        const next = { ...prev }
        delete next[postId]
        return next
      })
    }
    setPosten(prev =>
      prev.map(p => (p.id === postId ? { ...p, vaste_lasten: nieuw } : p))
    )
    setEditingVasteLast(null)
  }

  function openVasteLast(post: Post) {
    setEditingVasteLast(post.id)
    const bedrag = post.vaste_lasten?.[editEntity]
    setVasteLastInput(bedrag ? String(bedrag) : '')
  }

  async function addPost(catId: string) {
    if (isLocked) return
    const naam = newPostName[catId]?.trim()
    if (!naam) return
    const volgorde = posten.filter(p => p.categorie_id === catId).length + 1
    const { data } = await supabase
      .from('kosten_posten')
      .insert({ categorie_id: catId, naam, volgorde })
      .select()
      .single()
    if (data) {
      setPosten(prev => [...prev, data as Post])
      setNewPostName(prev => ({ ...prev, [catId]: '' }))
    }
  }

  async function addCategorie() {
    if (isLocked) return
    const naam = newCatName.trim()
    if (!naam) return
    const volgorde = categorieen.length + 1
    const { data } = await supabase
      .from('kosten_categorieen')
      .insert({ naam, volgorde })
      .select()
      .single()
    if (data) {
      setCategorieen(prev => [...prev, data as Categorie])
      setNewCatName('')
    }
  }

  const sortedCats = useMemo(
    () => [...categorieen].sort((a, b) => a.volgorde - b.volgorde),
    [categorieen]
  )

  return (
    <div className="fin-page">
      <div className="fin-shell">
        <FinHeader
          title="Maandkosten"
          subtitle="Klik op een cel om te bewerken — wordt automatisch opgeslagen."
        >
          <FinEntitySwitch value={entity} onChange={setEntity} />
          <span className="fin-year-pill">
            Jaar <strong>{jaar}</strong>
          </span>
        </FinHeader>

        {isLocked && (
          <div className="fin-banner">
            <strong>Beide entiteiten geselecteerd.</strong> Maandkosten worden per entiteit
            geboekt — kies <em>CS</em> of <em>CSV</em> om kosten te zien en te bewerken.
          </div>
        )}

        {loading ? (
          <div className="fin-loading">Laden…</div>
        ) : (
          !isLocked && (
            <>
              <div className="fin-pl-table-wrap">
                <table className="fin-pl-table fin-spreadsheet">
                  <thead>
                    <tr>
                      <th className="sticky">Kostenpost</th>
                      {MAANDEN.map(m => (
                        <th key={m} className="num">
                          {m}
                        </th>
                      ))}
                      <th className="num total">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCats.map(cat => {
                      const catPosten = posten
                        .filter(p => p.categorie_id === cat.id)
                        .sort((a, b) => a.volgorde - b.volgorde)
                      return (
                        <CatGroup
                          key={cat.id}
                          cat={cat}
                          posten={catPosten}
                          editEntity={editEntity}
                          getBedrag={getBedrag}
                          getRijTotaal={getRijTotaal}
                          getCatTotaal={getCatTotaal}
                          handleCellChange={handleCellChange}
                          cellStatus={cellStatus}
                          editingVasteLast={editingVasteLast}
                          openVasteLast={openVasteLast}
                          saveVasteLast={saveVasteLast}
                          setEditingVasteLast={setEditingVasteLast}
                          vasteLastInput={vasteLastInput}
                          setVasteLastInput={setVasteLastInput}
                          newPostName={newPostName[cat.id] ?? ''}
                          setNewPostName={(v: string) =>
                            setNewPostName(prev => ({ ...prev, [cat.id]: v }))
                          }
                          addPost={() => void addPost(cat.id)}
                        />
                      )
                    })}

                    {/* Totaalrij */}
                    <tr className="fin-spread-totaal">
                      <td className="sticky">Totaal</td>
                      {MAANDEN.map((_, i) => (
                        <td key={i} className="num">
                          {getTotaal(i + 1) > 0 ? formatEuro(getTotaal(i + 1)) : '—'}
                        </td>
                      ))}
                      <td className="num total">{formatEuro(getTotaal())}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <FinSection title="Nieuwe categorie">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    className="fin-input"
                    placeholder="Categorie-naam"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void addCategorie()
                    }}
                    style={{ maxWidth: 280 }}
                  />
                  <button
                    type="button"
                    className="fin-btn"
                    onClick={() => void addCategorie()}
                    disabled={!newCatName.trim()}
                  >
                    <Plus /> Categorie toevoegen
                  </button>
                </div>
              </FinSection>

              <div style={{ height: 60 }} />
            </>
          )
        )}
      </div>
    </div>
  )
}

interface CatGroupProps {
  cat: Categorie
  posten: Post[]
  editEntity: Exclude<Entity, 'beide'>
  getBedrag: (postId: string, maand: number) => number
  getRijTotaal: (postId: string) => number
  getCatTotaal: (catId: string, maand?: number) => number
  handleCellChange: (postId: string, maand: number, value: string) => void
  cellStatus: Record<string, CellStatus>
  editingVasteLast: string | null
  openVasteLast: (post: Post) => void
  saveVasteLast: (postId: string, bedrag: number | null) => void | Promise<void>
  setEditingVasteLast: (id: string | null) => void
  vasteLastInput: string
  setVasteLastInput: (v: string) => void
  newPostName: string
  setNewPostName: (v: string) => void
  addPost: () => void
}

function CatGroup({
  cat,
  posten,
  editEntity,
  getBedrag,
  getRijTotaal,
  getCatTotaal,
  handleCellChange,
  cellStatus,
  editingVasteLast,
  openVasteLast,
  saveVasteLast,
  setEditingVasteLast,
  vasteLastInput,
  setVasteLastInput,
  newPostName,
  setNewPostName,
  addPost,
}: CatGroupProps) {
  return (
    <>
      <tr className="fin-spread-cat">
        <td className="sticky">{cat.naam}</td>
        {MAANDEN.map((_, i) => (
          <td key={i} className="num">
            {getCatTotaal(cat.id, i + 1) > 0
              ? formatEuro(getCatTotaal(cat.id, i + 1))
              : ''}
          </td>
        ))}
        <td className="num total">
          {getCatTotaal(cat.id) > 0 ? formatEuro(getCatTotaal(cat.id)) : '—'}
        </td>
      </tr>

      {posten.map(post => (
        <tr key={post.id} className="fin-spread-post">
          <td className="sticky">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingLeft: 12,
              }}
            >
              <span>{post.naam}</span>
              {editingVasteLast === post.id ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginLeft: 4,
                  }}
                >
                  <input
                    autoFocus
                    type="number"
                    value={vasteLastInput}
                    onChange={e => setVasteLastInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        void saveVasteLast(
                          post.id,
                          parseFloat(vasteLastInput) || null
                        )
                      }
                      if (e.key === 'Escape') setEditingVasteLast(null)
                    }}
                    placeholder="Bedrag"
                    style={{
                      width: 80,
                      padding: '2px 6px',
                      fontSize: 11,
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      void saveVasteLast(post.id, parseFloat(vasteLastInput) || null)
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--deepsea)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    OK
                  </button>
                  {post.vaste_lasten?.[editEntity] && (
                    <button
                      type="button"
                      onClick={() => void saveVasteLast(post.id, null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--negative-text)',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Verwijderen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingVasteLast(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--fg-subtle)',
                      display: 'inline-flex',
                    }}
                    aria-label="Sluiten"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openVasteLast(post)}
                  title="Vaste last instellen"
                  className={`fin-vaste-btn ${
                    post.vaste_lasten?.[editEntity] ? 'is-set' : ''
                  }`}
                >
                  <Repeat2 size={12} />
                </button>
              )}
            </div>
          </td>
          {MAANDEN.map((_, i) => {
            const maand = i + 1
            const key = `${post.id}-${maand}`
            const status = cellStatus[key] ?? 'idle'
            const val = getBedrag(post.id, maand)
            return (
              <td key={i} className="num fin-spread-cell">
                <input
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={val || ''}
                  key={`${editEntity}-${post.id}-${maand}`}
                  onBlur={e => handleCellChange(post.id, maand, e.target.value)}
                  onChange={e => handleCellChange(post.id, maand, e.target.value)}
                  className="fin-cell-input"
                  placeholder="0"
                />
                {status === 'saved' && (
                  <span className="fin-cell-saved">
                    <Check size={10} />
                  </span>
                )}
              </td>
            )
          })}
          <td className="num total">
            {getRijTotaal(post.id) > 0 ? formatEuro(getRijTotaal(post.id)) : '—'}
          </td>
        </tr>
      ))}

      {/* Add-post-rij per categorie */}
      <tr className="fin-spread-add">
        <td className="sticky" colSpan={14}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 12,
            }}
          >
            <input
              type="text"
              placeholder="+ Nieuwe kostenpost"
              value={newPostName}
              onChange={e => setNewPostName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addPost()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                flex: 1,
                maxWidth: 220,
              }}
            />
            {newPostName && (
              <button
                type="button"
                onClick={addPost}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--deepsea)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Toevoegen
              </button>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}
