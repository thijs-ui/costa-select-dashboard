'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react'

interface Settings {
  minimum_fee: number
  makelaar_commissie_pct: number
  partner_commissie_pct: number
  commissie_per_type: Record<string, number>
  regios: string[]
  deal_types: string[]
  bronnen: string[]
  afspraak_types: string[]
  todo_labels: string[]
  targets: { deals_2026: number; netto_omzet_2026: number }
  pipedrive_sync_interval: number
  pipedrive_activiteit_namen: string[]
  renovation_cosmetic_per_m2: number
  renovation_partial_per_m2: number
  renovation_full_per_m2: number
  renovation_luxury_per_m2: number
  renovation_contingency_pct: number
  renovation_architect_fee: number
  renovation_terrace_per_m2: number
  renovation_garden_per_m2: number
  renovation_pool_per_m2: number
}

interface UserRow {
  id: string
  email: string
  naam: string | null
  role: string
  isNew?: boolean
}

interface MakelaarRow {
  id: string | null
  naam: string
  actief: boolean
  rol: string
  area_manager_id: string | null
}

interface CategorieRow {
  id: string | null
  naam: string
  volgorde: number
  actief: boolean
}

interface PostRow {
  id: string | null
  categorie_id: string
  naam: string
  volgorde: number
  actief: boolean
}

const defaultSettings: Settings = {
  minimum_fee: 6000,
  makelaar_commissie_pct: 0.4,
  partner_commissie_pct: 0.2,
  commissie_per_type: { resale: 0.02, nieuwbouw: 0.04, invest: 0.03, renovatie: 0.05 },
  regios: [],
  deal_types: [],
  bronnen: [],
  afspraak_types: [],
  todo_labels: [],
  targets: { deals_2026: 20, netto_omzet_2026: 200000 },
  pipedrive_sync_interval: 15,
  pipedrive_activiteit_namen: [],
  renovation_cosmetic_per_m2: 300,
  renovation_partial_per_m2: 600,
  renovation_full_per_m2: 1000,
  renovation_luxury_per_m2: 1500,
  renovation_contingency_pct: 15,
  renovation_architect_fee: 3000,
  renovation_terrace_per_m2: 150,
  renovation_garden_per_m2: 80,
  renovation_pool_per_m2: 400,
}

export default function AannamensPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [makelaars, setMakelaars] = useState<MakelaarRow[]>([])
  const [categorieen, setCategorieen] = useState<CategorieRow[]>([])
  const [posten, setPosten] = useState<PostRow[]>([])
  const [appUsers, setAppUsers] = useState<UserRow[]>([])
  const [newUser, setNewUser] = useState({ email: '', naam: '', role: 'consultant' })
  const [savingUsers, setSavingUsers] = useState(false)
  const [savedUsers, setSavedUsers] = useState(false)
  const [userError, setUserError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [regionalSettings, setRegionalSettings] = useState<any[]>([])
  const [savingRegional, setSavingRegional] = useState(false)
  const [savedRegional, setSavedRegional] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingMakelaars, setSavingMakelaars] = useState(false)
  const [savedMakelaars, setSavedMakelaars] = useState(false)
  const [savingKosten, setSavingKosten] = useState(false)
  const [savedKosten, setSavedKosten] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pipedriveFields, setPipedriveFields] = useState<Array<{ key: string; name: string }>>([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({
    datum_passering: '', regio: '', type_deal: '', bron: ''
  })
  const [savingMapping, setSavingMapping] = useState(false)
  const [savedMapping, setSavedMapping] = useState(false)

  useEffect(() => {
    async function load() {
      const [settingsRes, makelaarsRes, catRes, postRes] = await Promise.all([
        supabase.from('settings').select('key, value'),
        supabase.from('makelaars').select('id, naam, actief, rol, area_manager_id').order('naam'),
        supabase.from('kosten_categorieen').select('id, naam, volgorde, actief').order('volgorde'),
        supabase.from('kosten_posten').select('id, categorie_id, naam, volgorde, actief').order('volgorde'),
      ])

      if (settingsRes.data && settingsRes.data.length > 0) {
        const map: Record<string, unknown> = {}
        ;(settingsRes.data as { key: string; value: unknown }[]).forEach((row) => { map[row.key] = row.value })
        setSettings({
          minimum_fee: Number(map.minimum_fee) || 6000,
          makelaar_commissie_pct: Number(map.makelaar_commissie_pct) || 0.4,
          partner_commissie_pct: Number(map.partner_commissie_pct) || 0.2,
          commissie_per_type: (map.commissie_per_type as Record<string, number>) || {},
          regios: (map.regios as string[]) || [],
          deal_types: (map.deal_types as string[]) || [],
          bronnen: (map.bronnen as string[]) || [],
          afspraak_types: (map.afspraak_types as string[]) || [],
          todo_labels: (map.todo_labels as string[]) || [],
          targets: (map.targets as { deals_2026: number; netto_omzet_2026: number }) || defaultSettings.targets,
          pipedrive_sync_interval: Number(map.pipedrive_sync_interval) || 15,
          pipedrive_activiteit_namen: (map.pipedrive_activiteit_namen as string[]) || [],
          renovation_cosmetic_per_m2: Number(map.renovation_cosmetic_per_m2) || 300,
          renovation_partial_per_m2: Number(map.renovation_partial_per_m2) || 600,
          renovation_full_per_m2: Number(map.renovation_full_per_m2) || 1000,
          renovation_luxury_per_m2: Number(map.renovation_luxury_per_m2) || 1500,
          renovation_contingency_pct: Number(map.renovation_contingency_pct) || 15,
          renovation_architect_fee: Number(map.renovation_architect_fee) || 3000,
          renovation_terrace_per_m2: Number(map.renovation_terrace_per_m2) || 150,
          renovation_garden_per_m2: Number(map.renovation_garden_per_m2) || 80,
          renovation_pool_per_m2: Number(map.renovation_pool_per_m2) || 400,
        })
        // Load field mapping
        if (map.pipedrive_deal_field_mapping) {
          setFieldMapping(map.pipedrive_deal_field_mapping as Record<string, string>)
        }
      }

      if (makelaarsRes.data) {
        setMakelaars((makelaarsRes.data as MakelaarRow[]).map(m => ({
          ...m, rol: m.rol || 'consultant', area_manager_id: m.area_manager_id || null,
        })))
      }
      if (catRes.data) setCategorieen(catRes.data as CategorieRow[])
      if (postRes.data) setPosten(postRes.data as PostRow[])

      // Haal regionale settings op
      try {
        const regRes = await fetch('/api/regional-settings')
        if (regRes.ok) setRegionalSettings(await regRes.json())
      } catch { /* ignore */ }

      // Haal gebruikers op via API
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const data = await res.json()
          setAppUsers(data.users ?? [])
        }
      } catch { /* ignore */ }

      setLoading(false)
    }
    load()
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function saveSetting(key: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('settings') as any).upsert({ key, value }, { onConflict: 'key' })
  }

  async function saveAll() {
    setSaving(true)
    await Promise.all([
      saveSetting('minimum_fee', settings.minimum_fee),
      saveSetting('makelaar_commissie_pct', settings.makelaar_commissie_pct),
      saveSetting('partner_commissie_pct', settings.partner_commissie_pct),
      saveSetting('commissie_per_type', settings.commissie_per_type),
      saveSetting('regios', settings.regios),
      saveSetting('deal_types', settings.deal_types),
      saveSetting('bronnen', settings.bronnen),
      saveSetting('afspraak_types', settings.afspraak_types),
      saveSetting('todo_labels', settings.todo_labels),
      saveSetting('targets', settings.targets),
      saveSetting('pipedrive_sync_interval', settings.pipedrive_sync_interval),
      saveSetting('pipedrive_activiteit_namen', settings.pipedrive_activiteit_namen),
      saveSetting('renovation_cosmetic_per_m2', settings.renovation_cosmetic_per_m2),
      saveSetting('renovation_partial_per_m2', settings.renovation_partial_per_m2),
      saveSetting('renovation_full_per_m2', settings.renovation_full_per_m2),
      saveSetting('renovation_luxury_per_m2', settings.renovation_luxury_per_m2),
      saveSetting('renovation_contingency_pct', settings.renovation_contingency_pct),
      saveSetting('renovation_architect_fee', settings.renovation_architect_fee),
      saveSetting('renovation_terrace_per_m2', settings.renovation_terrace_per_m2),
      saveSetting('renovation_garden_per_m2', settings.renovation_garden_per_m2),
      saveSetting('renovation_pool_per_m2', settings.renovation_pool_per_m2),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveMakelaars() {
    setSavingMakelaars(true)
    for (const m of makelaars) {
      if (!m.naam.trim()) continue
      if (m.id) {
        await supabase.from('makelaars').update({
          naam: m.naam,
          actief: m.actief,
          rol: m.rol,
          area_manager_id: m.area_manager_id || null,
        }).eq('id', m.id)
      } else {
        const { data } = await supabase.from('makelaars').insert({
          naam: m.naam,
          actief: m.actief,
          rol: m.rol,
          area_manager_id: m.area_manager_id || null,
        }).select().single()
        if (data) {
          setMakelaars(prev => prev.map(r => r.naam === m.naam && !r.id ? { ...r, id: (data as MakelaarRow).id } : r))
        }
      }
    }
    setSavingMakelaars(false)
    setSavedMakelaars(true)
    setTimeout(() => setSavedMakelaars(false), 2000)
  }

  async function deleteMakelaar(id: string | null, naam: string) {
    if (!id) {
      setMakelaars(prev => prev.filter(m => !(m.id === null && m.naam === naam)))
      return
    }
    if (!confirm(`${naam} verwijderen?`)) return
    await supabase.from('makelaars').delete().eq('id', id)
    setMakelaars(prev => prev.filter(m => m.id !== id))
  }

  function updateMakelaar(idx: number, field: keyof MakelaarRow, value: unknown) {
    setMakelaars(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  async function saveKosten() {
    setSavingKosten(true)
    // Categorieën
    for (const c of categorieen) {
      if (!c.naam.trim()) continue
      if (c.id) {
        await supabase.from('kosten_categorieen').update({ naam: c.naam, volgorde: c.volgorde, actief: c.actief }).eq('id', c.id)
      } else {
        const { data } = await supabase.from('kosten_categorieen').insert({ naam: c.naam, volgorde: c.volgorde, actief: c.actief }).select().single()
        if (data) setCategorieen(prev => prev.map(r => r.id === null && r.naam === c.naam ? { ...r, id: (data as CategorieRow).id } : r))
      }
    }
    // Kostenposten
    for (const p of posten) {
      if (!p.naam.trim() || !p.categorie_id) continue
      if (p.id) {
        await supabase.from('kosten_posten').update({ naam: p.naam, categorie_id: p.categorie_id, volgorde: p.volgorde, actief: p.actief }).eq('id', p.id)
      } else {
        const { data } = await supabase.from('kosten_posten').insert({ naam: p.naam, categorie_id: p.categorie_id, volgorde: p.volgorde, actief: p.actief }).select().single()
        if (data) setPosten(prev => prev.map(r => r.id === null && r.naam === p.naam ? { ...r, id: (data as PostRow).id } : r))
      }
    }
    setSavingKosten(false)
    setSavedKosten(true)
    setTimeout(() => setSavedKosten(false), 2000)
  }

  async function deleteCategorie(id: string | null, naam: string) {
    if (!id) { setCategorieen(prev => prev.filter(c => !(c.id === null && c.naam === naam))); return }
    if (!confirm(`Categorie "${naam}" verwijderen? Bijbehorende kostenposten worden ook verwijderd.`)) return
    await supabase.from('kosten_posten').delete().eq('categorie_id', id)
    await supabase.from('kosten_categorieen').delete().eq('id', id)
    setCategorieen(prev => prev.filter(c => c.id !== id))
    setPosten(prev => prev.filter(p => p.categorie_id !== id))
  }

  async function deletePost(id: string | null, naam: string) {
    if (!id) { setPosten(prev => prev.filter(p => !(p.id === null && p.naam === naam))); return }
    if (!confirm(`Kostenpost "${naam}" verwijderen?`)) return
    await supabase.from('kosten_posten').delete().eq('id', id)
    setPosten(prev => prev.filter(p => p.id !== id))
  }

  function updateList(key: keyof Settings, index: number, value: string) {
    const list = [...(settings[key] as string[])]
    list[index] = value
    setSettings({ ...settings, [key]: list })
  }

  function addToList(key: keyof Settings) {
    setSettings({ ...settings, [key]: [...(settings[key] as string[]), ''] })
  }

  function removeFromList(key: keyof Settings, index: number) {
    const list = (settings[key] as string[]).filter((_, i) => i !== index)
    setSettings({ ...settings, [key]: list })
  }

  async function loadPipedriveFields() {
    setLoadingFields(true)
    try {
      const res = await fetch('/api/pipedrive/fields')
      if (!res.ok) throw new Error('Velden ophalen mislukt')
      const json = await res.json()
      const fields = (json.fields ?? []) as Array<{ key: string; name: string; field_type: string }>
      // Filter to only custom fields and relevant system fields
      setPipedriveFields(fields.map(f => ({ key: f.key, name: f.name })))
    } catch {
      alert('Pipedrive velden konden niet worden opgehaald. Controleer je API token.')
    }
    setLoadingFields(false)
  }

  async function saveFieldMapping() {
    setSavingMapping(true)
    await saveSetting('pipedrive_deal_field_mapping', fieldMapping)
    setSavingMapping(false)
    setSavedMapping(true)
    setTimeout(() => setSavedMapping(false), 2000)
  }

  async function saveRegionalSettings() {
    setSavingRegional(true)
    for (const r of regionalSettings) {
      await fetch('/api/regional-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
    }
    setSavingRegional(false)
    setSavedRegional(true)
    setTimeout(() => setSavedRegional(false), 2000)
  }

  async function saveUsers() {
    setSavingUsers(true)
    for (const u of appUsers) {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id, naam: u.naam, role: u.role }),
      })
    }
    setSavingUsers(false)
    setSavedUsers(true)
    setTimeout(() => setSavedUsers(false), 2000)
  }

  async function inviteUser() {
    setUserError('')
    if (!newUser.email.trim()) { setUserError('Email is verplicht'); return }
    setSavingUsers(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })
    const data = await res.json()
    if (!res.ok) {
      setUserError(data.error ?? 'Fout bij aanmaken')
    } else {
      setNewUser({ email: '', naam: '', role: 'consultant' })
      // Herlaad users
      const listRes = await fetch('/api/users')
      if (listRes.ok) {
        const listData = await listRes.json()
        setAppUsers(listData.users ?? [])
      }
    }
    setSavingUsers(false)
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Gebruiker "${email}" verwijderen? Dit verwijdert het account volledig.`)) return
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) {
      setAppUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">Laden...</div>

  const areaManagers = makelaars.filter(m => m.rol === 'area_manager' && m.id)

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Aannames</h1>
        <button onClick={saveAll} disabled={saving}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
          <Save size={14} />
          {saving ? 'Opslaan...' : saved ? 'Opgeslagen!' : 'Alles opslaan'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Gebruikers */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Gebruikers</h2>
              <p className="text-xs text-slate-400 mt-0.5">Beheer accounts, namen en rollen</p>
            </div>
            <button onClick={saveUsers} disabled={savingUsers}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <Save size={12} />
              {savingUsers ? 'Opslaan...' : savedUsers ? 'Opgeslagen!' : 'Gebruikers opslaan'}
            </button>
          </div>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-slate-100">
                {['Email', 'Naam', 'Rol', ''].map(h => (
                  <th key={h} className="text-left pb-2 text-xs text-slate-400 font-medium pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appUsers.map((u, i) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <span className="text-sm text-slate-600">{u.email}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" value={u.naam ?? ''} placeholder="Voornaam"
                      onChange={e => setAppUsers(prev => prev.map((r, ri) => ri === i ? { ...r, naam: e.target.value || null } : r))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400" />
                  </td>
                  <td className="py-2 pr-3">
                    <select value={u.role}
                      onChange={e => setAppUsers(prev => prev.map((r, ri) => ri === i ? { ...r, role: e.target.value } : r))}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400">
                      <option value="consultant">Consultant</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <button onClick={() => deleteUser(u.id, u.email)}
                      className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Nieuwe gebruiker uitnodigen */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Nieuwe gebruiker</div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <input type="email" value={newUser.email} placeholder="Email *"
                  onChange={e => { setNewUser({ ...newUser, email: e.target.value }); setUserError('') }}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <input type="text" value={newUser.naam} placeholder="Voornaam"
                  onChange={e => setNewUser({ ...newUser, naam: e.target.value })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
              </div>
              <div>
                <select value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-slate-400">
                  <option value="consultant">Consultant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <button onClick={inviteUser} disabled={savingUsers}
                  className="flex items-center gap-1 text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-50">
                  <Plus size={14} /> Toevoegen
                </button>
              </div>
            </div>
            {userError && <p className="text-xs text-red-500 mt-2">{userError}</p>}
            <p className="text-xs text-slate-400 mt-2">De gebruiker krijgt een tijdelijk wachtwoord. Zij moeten dit resetten bij eerste login.</p>
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Team</h2>
            <button onClick={saveMakelaars} disabled={savingMakelaars}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <Save size={12} />
              {savingMakelaars ? 'Opslaan...' : savedMakelaars ? 'Opgeslagen!' : 'Team opslaan'}
            </button>
          </div>
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-slate-100">
                {['Naam', 'Actief', 'Rol', 'Area manager', ''].map(h => (
                  <th key={h} className="text-left pb-2 text-xs text-slate-400 font-medium pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {makelaars.map((m, i) => (
                <tr key={m.id ?? `new-${i}`} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <input type="text" value={m.naam}
                      onChange={e => updateMakelaar(i, 'naam', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={m.actief}
                      onChange={e => updateMakelaar(i, 'actief', e.target.checked)}
                      className="rounded border-slate-300" />
                  </td>
                  <td className="py-2 pr-3">
                    <select value={m.rol}
                      onChange={e => updateMakelaar(i, 'rol', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400">
                      <option value="consultant">Consultant</option>
                      <option value="area_manager">Area manager</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    {m.rol === 'consultant' ? (
                      <select value={m.area_manager_id ?? ''}
                        onChange={e => updateMakelaar(i, 'area_manager_id', e.target.value || null)}
                        className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400">
                        <option value="">Geen</option>
                        {areaManagers.map(am => (
                          <option key={am.id} value={am.id!}>{am.naam}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <button onClick={() => deleteMakelaar(m.id, m.naam)}
                      className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setMakelaars(prev => [...prev, { id: null, naam: '', actief: true, rol: 'consultant', area_manager_id: null }])}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <Plus size={14} /> Toevoegen
          </button>
        </div>

        {/* Commissie-instellingen */}
        <Section title="Commissie-instellingen">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Minimum fee (€)">
              <input type="number" value={settings.minimum_fee}
                onChange={(e) => setSettings({ ...settings, minimum_fee: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Standaard consultant %">
              <input type="number" step="1"
                value={(settings.makelaar_commissie_pct * 100).toFixed(0)}
                onChange={(e) => setSettings({ ...settings, makelaar_commissie_pct: Number(e.target.value) / 100 })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Standaard partner %">
              <input type="number" step="1"
                value={(settings.partner_commissie_pct * 100).toFixed(0)}
                onChange={(e) => setSettings({ ...settings, partner_commissie_pct: Number(e.target.value) / 100 })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
          </div>
        </Section>

        {/* Targets */}
        <Section title="Targets 2026">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Doel aantal deals">
              <input type="number" value={settings.targets.deals_2026}
                onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, deals_2026: Number(e.target.value) } })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Doel netto omzet (€)">
              <input type="number" value={settings.targets.netto_omzet_2026}
                onChange={(e) => setSettings({ ...settings, targets: { ...settings.targets, netto_omzet_2026: Number(e.target.value) } })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
          </div>
        </Section>

        {/* Lijsten */}
        {([
          { key: 'regios' as const, label: "Regio's" },
          { key: 'deal_types' as const, label: 'Deal types' },
          { key: 'bronnen' as const, label: 'Bronnen' },
          { key: 'afspraak_types' as const, label: 'Afspraak types' },
          { key: 'todo_labels' as const, label: 'To-do labels' },
          { key: 'pipedrive_activiteit_namen' as const, label: 'Pipedrive activiteitsnamen (auto-import)' },
        ]).map(({ key, label }) => (
          <Section key={key} title={label}>
            <div className="space-y-2">
              {(settings[key] as string[]).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={item}
                    onChange={(e) => updateList(key, i, e.target.value)}
                    className="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
                  <button onClick={() => removeFromList(key, i)} className="p-1.5 text-slate-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => addToList(key)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mt-1">
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </Section>
        ))}

        {/* Pipedrive sync */}
        <Section title="Pipedrive sync interval">
          <Field label="Interval (minuten)">
            <select value={settings.pipedrive_sync_interval}
              onChange={(e) => setSettings({ ...settings, pipedrive_sync_interval: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400">
              {[5, 10, 15, 30, 60].map((v) => <option key={v} value={v}>{v} minuten</option>)}
            </select>
          </Field>
        </Section>

        {/* Pipedrive veldenmapping */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Pipedrive veldenmapping</h2>
              <p className="text-xs text-slate-400 mt-0.5">Koppel Pipedrive custom velden aan dashboard velden</p>
            </div>
            <button onClick={loadPipedriveFields} disabled={loadingFields}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw size={12} className={loadingFields ? 'animate-spin' : ''} />
              {loadingFields ? 'Laden...' : 'Velden laden'}
            </button>
          </div>
          {pipedriveFields.length === 0 && (
            <p className="text-xs text-slate-400 mb-4">Klik op &apos;Velden laden&apos; om Pipedrive velden op te halen.</p>
          )}
          <div className="space-y-3">
            {([
              { key: 'datum_passering', label: 'Datum passering (notarisdatum)' },
              { key: 'regio', label: 'Regio' },
              { key: 'type_deal', label: 'Type deal' },
              { key: 'bron', label: 'Bron' },
            ] as Array<{ key: keyof typeof fieldMapping; label: string }>).map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-4 items-center">
                <label className="text-sm text-slate-600">{label}</label>
                <select
                  value={fieldMapping[key] ?? ''}
                  onChange={e => setFieldMapping(prev => ({ ...prev, [key]: e.target.value }))}
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400">
                  <option value="">— niet koppelen —</option>
                  {pipedriveFields.map(f => (
                    <option key={f.key} value={f.key}>{f.name} ({f.key})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={saveFieldMapping} disabled={savingMapping}
              className="flex items-center gap-2 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-50">
              <Save size={12} />
              {savingMapping ? 'Opslaan...' : savedMapping ? 'Opgeslagen!' : 'Mapping opslaan'}
            </button>
          </div>
        </div>

        {/* Renovatiekosten defaults */}
        <Section title="Renovatiekosten (defaults voor calculator)">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Cosmetisch (€/m²)">
              <input type="number" value={settings.renovation_cosmetic_per_m2}
                onChange={e => setSettings({ ...settings, renovation_cosmetic_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Gedeeltelijk (€/m²)">
              <input type="number" value={settings.renovation_partial_per_m2}
                onChange={e => setSettings({ ...settings, renovation_partial_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Volledig (€/m²)">
              <input type="number" value={settings.renovation_full_per_m2}
                onChange={e => setSettings({ ...settings, renovation_full_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Luxe (€/m²)">
              <input type="number" value={settings.renovation_luxury_per_m2}
                onChange={e => setSettings({ ...settings, renovation_luxury_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Onvoorzien (%)">
              <input type="number" value={settings.renovation_contingency_pct}
                onChange={e => setSettings({ ...settings, renovation_contingency_pct: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Architect / vergunningen (€)">
              <input type="number" value={settings.renovation_architect_fee}
                onChange={e => setSettings({ ...settings, renovation_architect_fee: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Terras (€/m²)">
              <input type="number" value={settings.renovation_terrace_per_m2}
                onChange={e => setSettings({ ...settings, renovation_terrace_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Tuin (€/m²)">
              <input type="number" value={settings.renovation_garden_per_m2}
                onChange={e => setSettings({ ...settings, renovation_garden_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
            <Field label="Zwembad (€/m²)">
              <input type="number" value={settings.renovation_pool_per_m2}
                onChange={e => setSettings({ ...settings, renovation_pool_per_m2: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400" />
            </Field>
          </div>
        </Section>

        {/* Regionale kosten koper */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Regionale kosten koper</h2>
              <p className="text-xs text-slate-400 mt-0.5">Belastingtarieven en kosten per regio</p>
            </div>
            <button onClick={saveRegionalSettings} disabled={savingRegional}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <Save size={12} />
              {savingRegional ? 'Opslaan...' : savedRegional ? 'Opgeslagen!' : 'Regio-settings opslaan'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Regio', 'ITP %', 'AJD %', 'IVA %', 'Notaris %', 'Registro %', 'Advocaat %', 'Adv. min €'].map(h => (
                    <th key={h} className="text-left pb-2 text-xs text-slate-400 font-medium pr-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionalSettings.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2 font-medium text-slate-700 text-xs whitespace-nowrap">{r.region}</td>
                    {(['itp_percentage', 'ajd_percentage', 'iva_percentage', 'notary_percentage', 'registro_percentage', 'lawyer_percentage'] as const).map(field => (
                      <td key={field} className="py-2 pr-2">
                        <input type="number" step="0.1" value={r[field] ?? 0}
                          onChange={e => setRegionalSettings(prev => prev.map((s, si) => si === i ? { ...s, [field]: Number(e.target.value) } : s))}
                          className="w-16 border border-slate-200 rounded px-1.5 py-0.5 text-xs tabular-nums focus:outline-none focus:border-slate-400" />
                      </td>
                    ))}
                    <td className="py-2 pr-2">
                      <input type="number" value={r.lawyer_minimum ?? 1500}
                        onChange={e => setRegionalSettings(prev => prev.map((s, si) => si === i ? { ...s, lawyer_minimum: Number(e.target.value) } : s))}
                        className="w-20 border border-slate-200 rounded px-1.5 py-0.5 text-xs tabular-nums focus:outline-none focus:border-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kostencategorieën */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Kostencategorieën</h2>
            <button onClick={saveKosten} disabled={savingKosten}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <Save size={12} />
              {savingKosten ? 'Opslaan...' : savedKosten ? 'Opgeslagen!' : 'Kosten opslaan'}
            </button>
          </div>
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3">Naam</th>
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3 w-16">Volgorde</th>
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3 w-14">Actief</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {categorieen.map((c, i) => (
                <tr key={c.id ?? `new-cat-${i}`} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <input type="text" value={c.naam}
                      onChange={e => setCategorieen(prev => prev.map((r, ri) => ri === i ? { ...r, naam: e.target.value } : r))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" value={c.volgorde}
                      onChange={e => setCategorieen(prev => prev.map((r, ri) => ri === i ? { ...r, volgorde: Number(e.target.value) } : r))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={c.actief}
                      onChange={e => setCategorieen(prev => prev.map((r, ri) => ri === i ? { ...r, actief: e.target.checked } : r))}
                      className="rounded border-slate-300" />
                  </td>
                  <td className="py-2">
                    <button onClick={() => deleteCategorie(c.id, c.naam)}
                      className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setCategorieen(prev => [...prev, { id: null, naam: '', volgorde: prev.length + 1, actief: true }])}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <Plus size={14} /> Toevoegen
          </button>
        </div>

        {/* Kostenposten */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Kostenposten</h2>
            <button onClick={saveKosten} disabled={savingKosten}
              className="flex items-center gap-2 text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 disabled:opacity-50">
              <Save size={12} />
              {savingKosten ? 'Opslaan...' : savedKosten ? 'Opgeslagen!' : 'Kosten opslaan'}
            </button>
          </div>
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3 w-40">Categorie</th>
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3">Naam</th>
                <th className="text-left pb-2 text-xs text-slate-400 font-medium pr-3 w-14">Actief</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {posten.map((p, i) => (
                <tr key={p.id ?? `new-post-${i}`} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <select value={p.categorie_id}
                      onChange={e => setPosten(prev => prev.map((r, ri) => ri === i ? { ...r, categorie_id: e.target.value } : r))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400">
                      <option value="">— kies —</option>
                      {categorieen.filter(c => c.id).map(c => (
                        <option key={c.id!} value={c.id!}>{c.naam}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" value={p.naam}
                      onChange={e => setPosten(prev => prev.map((r, ri) => ri === i ? { ...r, naam: e.target.value } : r))}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-400" />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={p.actief}
                      onChange={e => setPosten(prev => prev.map((r, ri) => ri === i ? { ...r, actief: e.target.checked } : r))}
                      className="rounded border-slate-300" />
                  </td>
                  <td className="py-2">
                    <button onClick={() => deletePost(p.id, p.naam)}
                      className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setPosten(prev => [...prev, { id: null, categorie_id: categorieen.find(c => c.id)?.id ?? '', naam: '', volgorde: prev.length + 1, actief: true }])}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <Plus size={14} /> Toevoegen
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
