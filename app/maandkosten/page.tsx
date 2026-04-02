'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { formatEuro, MAANDEN } from '@/lib/calculations'
import { Plus, Check, Repeat2, X } from 'lucide-react'
import { useEntity, Entity } from '@/lib/entity'
import EntitySwitch from '@/components/entity-switch'

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
  vaste_last_bedrag: number | null
}

interface Maandkost {
  kosten_post_id: string
  maand: number
  bedrag: number
}

// Cell staat bij opslaan
type CellStatus = 'idle' | 'saving' | 'saved'

export default function MaandkostenPage() {
  const jaar = new Date().getFullYear()
  const { entity, setEntity } = useEntity()
  const [categorieen, setCategorieen] = useState<Categorie[]>([])
  const [posten, setPosten] = useState<Post[]>([])
  const [kosten, setKosten] = useState<Record<string, Record<number, number>>>({}) // postId → maand → bedrag
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({})
  const [loading, setLoading] = useState(true)
  const [newPostName, setNewPostName] = useState<Record<string, string>>({})
  const [newCatName, setNewCatName] = useState('')
  const [editingVasteLast, setEditingVasteLast] = useState<string | null>(null)
  const [vasteLastInput, setVasteLastInput] = useState('')
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll() }, [entity])

  async function loadAll() {
    setLoading(true)
    const [catRes, postRes, kostRes] = await Promise.all([
      supabase.from('kosten_categorieen').select('*').eq('actief', true).order('volgorde'),
      supabase.from('kosten_posten').select('*').eq('actief', true).order('volgorde'),
      supabase.from('maandkosten').select('kosten_post_id, maand, bedrag').eq('jaar', jaar).eq('entiteit', entity),
    ])

    setCategorieen(catRes.data ?? [])
    setPosten(postRes.data ?? [])

    const map: Record<string, Record<number, number>> = {}
    ;(kostRes.data ?? []).forEach((k: Maandkost) => {
      if (!map[k.kosten_post_id]) map[k.kosten_post_id] = {}
      map[k.kosten_post_id][k.maand] = k.bedrag
    })

    // Auto-fill lege maanden voor vaste lasten
    const vastePosts = (postRes.data ?? []).filter((p: Post) => p.vaste_last_bedrag)
    for (const post of vastePosts) {
      const updates: object[] = []
      for (let maand = 1; maand <= 12; maand++) {
        if (!map[post.id]?.[maand]) {
          updates.push({ kosten_post_id: post.id, jaar, maand, bedrag: post.vaste_last_bedrag, entiteit: entity })
          if (!map[post.id]) map[post.id] = {}
          map[post.id][maand] = post.vaste_last_bedrag
        }
      }
      if (updates.length > 0) {
        await supabase.from('maandkosten').upsert(updates, { onConflict: 'kosten_post_id,jaar,maand,entiteit' })
      }
    }

    setKosten(map)
    setLoading(false)
  }

  function switchEntity(e: Entity) {
    setLoading(true)
    setEntity(e)
  }

  function getBedrag(postId: string, maand: number): number {
    return kosten[postId]?.[maand] ?? 0
  }

  function getRijTotaal(postId: string): number {
    return MAANDEN.reduce((s, _, i) => s + getBedrag(postId, i + 1), 0)
  }

  function getCatTotaal(catId: string, maand?: number): number {
    const catPosten = posten.filter((p) => p.categorie_id === catId)
    if (maand !== undefined) {
      return catPosten.reduce((s, p) => s + getBedrag(p.id, maand), 0)
    }
    return catPosten.reduce((s, p) => s + getRijTotaal(p.id), 0)
  }

  function getTotaal(maand?: number): number {
    return categorieen.reduce((s, c) => s + getCatTotaal(c.id, maand), 0)
  }

  function handleCellChange(postId: string, maand: number, value: string) {
    const bedrag = parseFloat(value.replace(',', '.')) || 0
    setKosten((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [maand]: bedrag },
    }))

    const key = `${postId}-${maand}`
    setCellStatus((prev) => ({ ...prev, [key]: 'saving' }))
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(() => saveCell(postId, maand, bedrag, key, entity), 800)
  }

  async function saveCell(postId: string, maand: number, bedrag: number, key: string, ent: Entity) {
    await supabase.from('maandkosten').upsert(
      { kosten_post_id: postId, jaar, maand, bedrag, entiteit: ent },
      { onConflict: 'kosten_post_id,jaar,maand,entiteit' }
    )
    setCellStatus((prev) => ({ ...prev, [key]: 'saved' }))
    setTimeout(() => setCellStatus((prev) => ({ ...prev, [key]: 'idle' })), 1500)
  }

  async function saveVasteLast(postId: string, bedrag: number | null) {
    await supabase.from('kosten_posten').update({ vaste_last_bedrag: bedrag }).eq('id', postId)
    setPosten(prev => prev.map(p => p.id === postId ? { ...p, vaste_last_bedrag: bedrag } : p))
    setEditingVasteLast(null)
  }

  function openVasteLast(post: Post) {
    setEditingVasteLast(post.id)
    setVasteLastInput(post.vaste_last_bedrag ? String(post.vaste_last_bedrag) : '')
  }

  async function addPost(catId: string) {
    const naam = newPostName[catId]?.trim()
    if (!naam) return
    const volgorde = posten.filter((p) => p.categorie_id === catId).length + 1
    const { data } = await supabase.from('kosten_posten').insert({ categorie_id: catId, naam, volgorde }).select().single()
    if (data) {
      setPosten((prev) => [...prev, data])
      setNewPostName((prev) => ({ ...prev, [catId]: '' }))
    }
  }

  async function addCategorie() {
    const naam = newCatName.trim()
    if (!naam) return
    const volgorde = categorieen.length + 1
    const { data } = await supabase.from('kosten_categorieen').insert({ naam, volgorde }).select().single()
    if (data) {
      setCategorieen((prev) => [...prev, data])
      setNewCatName('')
    }
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Maandkosten</h1>
          <p className="text-xs text-slate-400 mt-0.5">Klik op een cel om te bewerken — wordt automatisch opgeslagen</p>
        </div>
        <div className="flex items-center gap-4">
          <EntitySwitch value={entity} onChange={switchEntity} />
          <div className="text-sm text-slate-500">
            Jaar: <span className="font-semibold text-slate-900">{jaar}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium w-48 sticky left-0 bg-slate-50">
                  Kostenpost
                </th>
                {MAANDEN.map((m) => (
                  <th key={m} className="text-right px-2 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium w-20">
                    {m}
                  </th>
                ))}
                <th className="text-right px-3 py-2 text-xs uppercase tracking-wide text-slate-500 font-medium w-24">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody>
              {categorieen.map((cat) => {
                const catPosten = posten.filter((p) => p.categorie_id === cat.id)
                return (
                  <>
                    {/* Categorie header rij */}
                    <tr key={`cat-${cat.id}`} className="bg-slate-50 border-t border-slate-200">
                      <td className="px-3 py-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide sticky left-0 bg-slate-50">
                        {cat.naam}
                      </td>
                      {MAANDEN.map((_, i) => (
                        <td key={i} className="px-2 py-1.5 text-right text-xs text-slate-400">
                          {getCatTotaal(cat.id, i + 1) > 0 ? formatEuro(getCatTotaal(cat.id, i + 1)) : ''}
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-right text-xs font-semibold text-slate-600">
                        {getCatTotaal(cat.id) > 0 ? formatEuro(getCatTotaal(cat.id)) : '—'}
                      </td>
                    </tr>

                    {/* Posten */}
                    {catPosten.map((post) => (
                      <tr key={post.id} className="border-t border-slate-50 hover:bg-slate-50/50 group">
                        <td className="px-3 py-1 text-slate-600 sticky left-0 bg-white group-hover:bg-slate-50/50 pl-5">
                          <div className="flex items-center gap-1.5">
                            <span>{post.naam}</span>
                            {editingVasteLast === post.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  autoFocus
                                  type="number"
                                  value={vasteLastInput}
                                  onChange={e => setVasteLastInput(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveVasteLast(post.id, parseFloat(vasteLastInput) || null)
                                    if (e.key === 'Escape') setEditingVasteLast(null)
                                  }}
                                  placeholder="Bedrag"
                                  className="w-24 border border-slate-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-400"
                                />
                                <button onClick={() => saveVasteLast(post.id, parseFloat(vasteLastInput) || null)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">OK</button>
                                {post.vaste_last_bedrag && (
                                  <button onClick={() => saveVasteLast(post.id, null)}
                                    className="text-xs text-red-400 hover:text-red-600">Verwijderen</button>
                                )}
                                <button onClick={() => setEditingVasteLast(null)}>
                                  <X size={11} className="text-slate-400" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openVasteLast(post)}
                                title="Vaste last instellen"
                                className={`opacity-0 group-hover:opacity-100 transition-opacity ${post.vaste_last_bedrag ? '!opacity-100 text-blue-500' : 'text-slate-300 hover:text-slate-500'}`}
                              >
                                <Repeat2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                        {MAANDEN.map((_, i) => {
                          const maand = i + 1
                          const key = `${post.id}-${maand}`
                          const status = cellStatus[key] || 'idle'
                          const val = getBedrag(post.id, maand)
                          return (
                            <td key={i} className="px-1 py-0.5">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  defaultValue={val || ''}
                                  key={`${entity}-${post.id}-${maand}`}
                                  onBlur={(e) => handleCellChange(post.id, maand, e.target.value)}
                                  onChange={(e) => handleCellChange(post.id, maand, e.target.value)}
                                  className="w-full text-right px-2 py-1 text-sm rounded border border-transparent
                                    hover:border-slate-200 focus:border-slate-400 focus:outline-none
                                    bg-transparent focus:bg-white"
                                  placeholder="0"
                                />
                                {status === 'saved' && (
                                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-green-500 pointer-events-none">
                                    <Check size={10} />
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-3 py-1 text-right font-medium text-slate-700 whitespace-nowrap">
                          {getRijTotaal(post.id) > 0 ? formatEuro(getRijTotaal(post.id)) : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Nieuwe post toevoegen */}
                    <tr key={`new-${cat.id}`} className="border-t border-slate-50">
                      <td className="px-3 py-1 pl-5" colSpan={14}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="+ Nieuwe kostenpost"
                            value={newPostName[cat.id] || ''}
                            onChange={(e) => setNewPostName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addPost(cat.id)}
                            className="text-xs text-slate-400 placeholder:text-slate-300 border-none outline-none bg-transparent w-48"
                          />
                          {newPostName[cat.id] && (
                            <button onClick={() => addPost(cat.id)}
                              className="text-xs text-blue-500 hover:text-blue-700">
                              Toevoegen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
                )
              })}

              {/* Totaalrij */}
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <td className="px-3 py-2 text-slate-700 sticky left-0 bg-slate-50">Totaal</td>
                {MAANDEN.map((_, i) => (
                  <td key={i} className="px-2 py-2 text-right text-slate-700 whitespace-nowrap">
                    {getTotaal(i + 1) > 0 ? formatEuro(getTotaal(i + 1)) : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-slate-900 whitespace-nowrap">
                  {formatEuro(getTotaal())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Nieuwe categorie */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          placeholder="Nieuwe categorie toevoegen..."
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategorie()}
          className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400 w-64"
        />
        <button
          onClick={addCategorie}
          className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
        >
          <Plus size={14} /> Categorie toevoegen
        </button>
      </div>
    </div>
  )
}
