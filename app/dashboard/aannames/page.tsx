'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AaHero, AaSectionCard, AaInlineTable, AaCellInput, AaCellSelect,
  AaIcon, AaConfirm, AaToast, AaAvatar,
  useDirtyTracker,
} from '@/components/aannames/parts'

// ============================================================
// Types
// ============================================================
interface UserRow {
  id: string
  email: string
  naam: string | null
  role: string
}

interface TeamRow {
  id: string
  dbId: string | null
  naam: string
  actief: boolean
  rol: string
  area_manager_id: string | null
}

interface PdMapRow {
  id: string
  cs_veld: string
  cs_label: string
  pd_key: string
  pd_type: string
}

interface RegioRow {
  id: string
  region: string
  itp_percentage: number
  ajd_percentage: number
  iva_percentage: number
  notary_percentage: number
  registro_percentage: number
  lawyer_percentage: number
  lawyer_minimum: number
}

interface CatRow {
  id: string
  dbId: string | null
  naam: string
  volgorde: number
  actief: boolean
}

interface PostRow {
  id: string
  dbId: string | null
  categorie_id: string
  naam: string
  volgorde: number
  actief: boolean
}

interface AdvSettings {
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

const defaultAdv: AdvSettings = {
  minimum_fee: 6000,
  makelaar_commissie_pct: 0.4,
  partner_commissie_pct: 0.2,
  commissie_per_type: { resale: 0.02, nieuwbouw: 0.04, invest: 0.03, renovatie: 0.05 },
  regios: [], deal_types: [], bronnen: [], afspraak_types: [], todo_labels: [],
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

const PD_DEFAULTS: Record<string, { label: string; type: string }> = {
  datum_passering: { label: 'Datum passering', type: 'date' },
  regio: { label: 'Regio', type: 'enum' },
  type_deal: { label: 'Type deal', type: 'enum' },
  bron: { label: 'Bron', type: 'enum' },
}
const PD_TYPE_OPTIONS = ['currency', 'number', 'date', 'enum', 'user', 'text']

type Toast = { kind: 'ok' | 'error'; msg: string }
type Confirm = { title: string; message: string; confirmLabel?: string; onConfirm: () => void } | null
type Saver = { hasDirty: boolean; saving: boolean; savedAt: number | null; save: () => Promise<void> }

// ============================================================
// Page
// ============================================================
export default function AannamensPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)

  // Data state
  const [users, setUsers] = useState<UserRow[]>([])
  const [team, setTeam] = useState<TeamRow[]>([])
  const [pdRows, setPdRows] = useState<PdMapRow[]>([])
  const [regios, setRegios] = useState<RegioRow[]>([])
  const [cats, setCats] = useState<CatRow[]>([])
  const [posten, setPosten] = useState<PostRow[]>([])
  const [adv, setAdv] = useState<AdvSettings>(defaultAdv)

  // Saver registry — state so reads during render are safe
  const [savers, setSavers] = useState<Record<string, Saver>>({})
  const registerSaver = useCallback((id: string, saver: Saver) => {
    setSavers(prev => ({ ...prev, [id]: saver }))
  }, [])

  const flashToast = useCallback((kind: 'ok' | 'error', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 2400)
  }, [])

  // ---------- Initial load ----------
  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, teamRes, catRes, postRes] = await Promise.allSettled([
          supabase.from('settings').select('key, value'),
          supabase.from('makelaars').select('id, naam, actief, rol, area_manager_id').order('naam'),
          supabase.from('kosten_categorieen').select('id, naam, volgorde, actief').order('volgorde'),
          supabase.from('kosten_posten').select('id, categorie_id, naam, volgorde, actief').order('volgorde'),
        ])
        const settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value.data ?? []) : []
        const teamData = teamRes.status === 'fulfilled' ? (teamRes.value.data ?? []) : []
        const catData = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : []
        const postData = postRes.status === 'fulfilled' ? (postRes.value.data ?? []) : []

        // Settings → adv + pipedrive mapping
        const map: Record<string, unknown> = {}
        ;(settingsData ?? []).forEach((row: { key: string; value: unknown }) => { map[row.key] = row.value })

        setAdv({
          minimum_fee: Number(map.minimum_fee) || defaultAdv.minimum_fee,
          makelaar_commissie_pct: Number(map.makelaar_commissie_pct) || defaultAdv.makelaar_commissie_pct,
          partner_commissie_pct: Number(map.partner_commissie_pct) || defaultAdv.partner_commissie_pct,
          commissie_per_type: (map.commissie_per_type as Record<string, number>) || defaultAdv.commissie_per_type,
          regios: (map.regios as string[]) || [],
          deal_types: (map.deal_types as string[]) || [],
          bronnen: (map.bronnen as string[]) || [],
          afspraak_types: (map.afspraak_types as string[]) || [],
          todo_labels: (map.todo_labels as string[]) || [],
          targets: (map.targets as AdvSettings['targets']) || defaultAdv.targets,
          pipedrive_sync_interval: Number(map.pipedrive_sync_interval) || defaultAdv.pipedrive_sync_interval,
          pipedrive_activiteit_namen: (map.pipedrive_activiteit_namen as string[]) || [],
          renovation_cosmetic_per_m2: Number(map.renovation_cosmetic_per_m2) || defaultAdv.renovation_cosmetic_per_m2,
          renovation_partial_per_m2: Number(map.renovation_partial_per_m2) || defaultAdv.renovation_partial_per_m2,
          renovation_full_per_m2: Number(map.renovation_full_per_m2) || defaultAdv.renovation_full_per_m2,
          renovation_luxury_per_m2: Number(map.renovation_luxury_per_m2) || defaultAdv.renovation_luxury_per_m2,
          renovation_contingency_pct: Number(map.renovation_contingency_pct) || defaultAdv.renovation_contingency_pct,
          renovation_architect_fee: Number(map.renovation_architect_fee) || defaultAdv.renovation_architect_fee,
          renovation_terrace_per_m2: Number(map.renovation_terrace_per_m2) || defaultAdv.renovation_terrace_per_m2,
          renovation_garden_per_m2: Number(map.renovation_garden_per_m2) || defaultAdv.renovation_garden_per_m2,
          renovation_pool_per_m2: Number(map.renovation_pool_per_m2) || defaultAdv.renovation_pool_per_m2,
        })

        // Pipedrive mapping
        const richArr = map.pipedrive_field_mappings as PdMapRow[] | undefined
        if (richArr && Array.isArray(richArr) && richArr.length > 0) {
          setPdRows(richArr.map(r => ({ ...r, id: r.id || r.cs_veld || `pd-${Math.random().toString(36).slice(2, 8)}` })))
        } else {
          const legacy = (map.pipedrive_deal_field_mapping as Record<string, string>) || {}
          const baseKeys = Object.keys(PD_DEFAULTS)
          const allKeys = Array.from(new Set([...baseKeys, ...Object.keys(legacy)]))
          setPdRows(allKeys.map(k => ({
            id: k,
            cs_veld: k,
            cs_label: PD_DEFAULTS[k]?.label || k,
            pd_key: legacy[k] || '',
            pd_type: PD_DEFAULTS[k]?.type || 'text',
          })))
        }

        // Team
        type DbTeam = { id: string; naam: string; actief: boolean; rol: string | null; area_manager_id: string | null }
        setTeam((teamData as DbTeam[]).map(m => ({
          id: m.id,
          dbId: m.id,
          naam: m.naam,
          actief: m.actief,
          rol: m.rol || 'consultant',
          area_manager_id: m.area_manager_id,
        })))

        // Categorieën / posten
        type DbCat = { id: string; naam: string; volgorde: number; actief: boolean }
        type DbPost = { id: string; categorie_id: string; naam: string; volgorde: number; actief: boolean }
        setCats((catData as DbCat[]).map(c => ({
          id: c.id, dbId: c.id, naam: c.naam, volgorde: c.volgorde, actief: c.actief,
        })))
        setPosten((postData as DbPost[]).map(p => ({
          id: p.id, dbId: p.id, categorie_id: p.categorie_id, naam: p.naam, volgorde: p.volgorde, actief: p.actief,
        })))

        // Async fetches
        const [regRes, usersRes] = await Promise.allSettled([
          fetch('/api/regional-settings').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/users').then(r => r.ok ? r.json() : { users: [] }).catch(() => ({ users: [] })),
        ])
        const regData = regRes.status === 'fulfilled' ? (regRes.value ?? []) : []
        const usersData = usersRes.status === 'fulfilled' ? (usersRes.value ?? { users: [] }) : { users: [] }
        setRegios((regData as RegioRow[]).map(r => ({ ...r, id: r.id || r.region })))
        setUsers((usersData.users ?? []) as UserRow[])
      } catch (err) {
        console.error('[load] failed:', err)
        flashToast('error', 'Laden mislukt')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [flashToast])

  // ---------- Global "Alles opslaan" ----------
  const [savingAll, setSavingAll] = useState(false)
  const dirtySectionCount = Object.values(savers).filter(s => s.hasDirty).length
  const saveAll = useCallback(async () => {
    setSavingAll(true)
    const dirty = Object.values(savers).filter(s => s.hasDirty)
    let ok = 0
    for (const s of dirty) {
      try {
        await s.save()
        ok++
      } catch (err) {
        console.error('Save failed:', err)
      }
    }
    setSavingAll(false)
    if (ok === dirty.length && dirty.length > 0) flashToast('ok', 'Alles opgeslagen')
    else if (ok < dirty.length) flashToast('error', `${dirty.length - ok} secties faalden`)
  }, [savers, flashToast])

  if (loading) {
    return (
      <div className="aa-page">
        <div className="aa-shell">
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--aa-fg-muted, #6b7c80)' }}>
            Laden…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="aa-page">
      <div className="aa-shell">
        <AaHero
          dirtyCount={dirtySectionCount}
          savingAll={savingAll}
          onSaveAll={saveAll}
        />

        <UsersSection
          rows={users}
          setRows={setUsers}
          register={registerSaver}
          flashToast={flashToast}
          setConfirm={setConfirm}
        />

        <TeamSection
          rows={team}
          setRows={setTeam}
          register={registerSaver}
          flashToast={flashToast}
          setConfirm={setConfirm}
        />

        <PipedriveSection
          rows={pdRows}
          setRows={setPdRows}
          register={registerSaver}
          flashToast={flashToast}
          setConfirm={setConfirm}
        />

        <RegioSection
          rows={regios}
          setRows={setRegios}
          register={registerSaver}
          flashToast={flashToast}
        />

        <CatsSection
          rows={cats}
          setRows={setCats}
          posten={posten}
          setPosten={setPosten}
          register={registerSaver}
          flashToast={flashToast}
          setConfirm={setConfirm}
        />

        <PostenSection
          rows={posten}
          setRows={setPosten}
          cats={cats}
          register={registerSaver}
          flashToast={flashToast}
          setConfirm={setConfirm}
        />

        <GeavanceerdSection
          adv={adv}
          setAdv={setAdv}
          register={registerSaver}
          flashToast={flashToast}
        />

        <div style={{ height: 80 }} />
      </div>

      {toast && <AaToast kind={toast.kind}>{toast.msg}</AaToast>}
      {confirm && (
        <AaConfirm
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// 01 — Gebruikers
// ============================================================
function UsersSection({
  rows, setRows, register, flashToast, setConfirm,
}: {
  rows: UserRow[]
  setRows: (r: UserRow[] | ((prev: UserRow[]) => UserRow[])) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
  setConfirm: (c: Confirm) => void
}) {
  const dt = useDirtyTracker<UserRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [newUser, setNewUser] = useState({ email: '', naam: '', role: 'consultant' })
  const [inviteErr, setInviteErr] = useState('')
  const [inviting, setInviting] = useState(false)

  // Sync incoming rows on first load
  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    let failed = 0
    for (const u of dt.rows) {
      try {
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: u.id, naam: u.naam, role: u.role }),
        })
        if (!res.ok) failed++
      } catch { failed++ }
    }
    setSaving(false)
    if (failed === 0) {
      dt.markClean()
      setSavedAt(Date.now())
      setRows(dt.rows)
      flashToast('ok', 'Gebruikers opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } else {
      flashToast('error', `${failed} gebruiker(s) faalden`)
    }
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('users', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  function handleDelete(id: string, email: string) {
    setConfirm({
      title: 'Gebruiker verwijderen?',
      message: `${email} wordt volledig verwijderd. Deze actie kan niet ongedaan gemaakt worden.`,
      onConfirm: async () => {
        const res = await fetch('/api/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: id }),
        })
        if (res.ok) {
          dt.setRows(prev => prev.filter(u => u.id !== id))
          setRows(prev => prev.filter(u => u.id !== id))
          flashToast('ok', 'Gebruiker verwijderd')
        } else {
          flashToast('error', 'Verwijderen mislukt')
        }
      },
    })
  }

  async function invite() {
    setInviteErr('')
    if (!newUser.email.trim()) { setInviteErr('Email is verplicht'); return }
    setInviting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteErr(data.error ?? 'Fout bij aanmaken')
      } else {
        setNewUser({ email: '', naam: '', role: 'consultant' })
        const listRes = await fetch('/api/users')
        if (listRes.ok) {
          const listData = await listRes.json()
          setRows(listData.users ?? [])
          dt.reset(listData.users ?? [])
        }
        flashToast('ok', 'Gebruiker uitgenodigd')
      }
    } catch {
      setInviteErr('Netwerkfout')
    }
    setInviting(false)
  }

  return (
    <AaSectionCard
      num={1}
      eyebrow="Toegang"
      title="Gebruikers"
      meta={<>Beheer accounts, namen en rollen — <b>{dt.rows.length}</b> gebruikers</>}
      accent="deepsea"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
      saveLabel="Opslaan"
    >
      <AaInlineTable<UserRow>
        columns={[
          { label: 'Naam', width: '24%' },
          { label: 'Email', width: '38%' },
          { label: 'Rol', width: '24%' },
          { label: '', align: 'act' },
        ]}
        rows={dt.rows}
        dirtyIds={dt.dirtyIds}
        renderRow={u => (
          <>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AaAvatar name={u.naam || u.email} />
                <AaCellInput
                  value={u.naam ?? ''}
                  onChange={v => dt.updateRow(u.id, { naam: String(v) || null })}
                  placeholder="Voornaam"
                />
              </div>
            </td>
            <td><span className="aa-pill aa-pill--mono" title={u.email}>{u.email}</span></td>
            <td>
              <AaCellSelect
                value={u.role}
                options={[
                  { value: 'consultant', label: 'Consultant' },
                  { value: 'admin', label: 'Admin' },
                ]}
                onChange={v => dt.updateRow(u.id, { role: v })}
              />
            </td>
            <td className="act">
              <button
                className="aa-btn aa-btn--icon danger"
                onClick={() => handleDelete(u.id, u.email)}
                type="button"
                aria-label={`Verwijder ${u.email}`}
              >
                <AaIcon name="trash" size={13} />
              </button>
            </td>
          </>
        )}
      />

      <div style={{
        marginTop: 22, paddingTop: 18,
        borderTop: '1px solid var(--aa-border, rgba(15,42,53,0.08))',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--aa-fg-muted, #6b7c80)', marginBottom: 12,
        }}>
          Nieuwe gebruiker uitnodigen
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: 10, alignItems: 'center' }}>
          <AaCellInput value={newUser.email} onChange={v => { setNewUser({ ...newUser, email: String(v) }); setInviteErr('') }} placeholder="email@costaselect.com" />
          <AaCellInput value={newUser.naam} onChange={v => setNewUser({ ...newUser, naam: String(v) })} placeholder="Voornaam" />
          <AaCellSelect
            value={newUser.role}
            options={[
              { value: 'consultant', label: 'Consultant' },
              { value: 'admin', label: 'Admin' },
            ]}
            onChange={v => setNewUser({ ...newUser, role: v })}
          />
          <button
            className="aa-btn aa-btn--primary aa-btn--sm"
            onClick={invite}
            disabled={inviting}
            type="button"
          >
            <AaIcon name="plus" size={12} strokeWidth={2.4} />
            {inviting ? 'Bezig…' : 'Uitnodigen'}
          </button>
        </div>
        {inviteErr && <p style={{ color: '#b54237', fontSize: 12, margin: '8px 0 0' }}>{inviteErr}</p>}
        <p style={{ color: 'var(--aa-fg-muted, #6b7c80)', fontSize: 12, margin: '8px 0 0' }}>
          De gebruiker krijgt een tijdelijk wachtwoord en moet dit resetten bij de eerste login.
        </p>
      </div>
    </AaSectionCard>
  )
}

// ============================================================
// 02 — Team
// ============================================================
function TeamSection({
  rows, setRows, register, flashToast, setConfirm,
}: {
  rows: TeamRow[]
  setRows: (r: TeamRow[] | ((prev: TeamRow[]) => TeamRow[])) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
  setConfirm: (c: Confirm) => void
}) {
  const dt = useDirtyTracker<TeamRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const areaManagers = dt.rows.filter(m => m.rol === 'area_manager' && m.dbId)

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    let failed = 0
    const next: TeamRow[] = []
    for (const m of dt.rows) {
      if (!m.naam.trim()) { next.push(m); continue }
      try {
        if (m.dbId) {
          const { error } = await supabase
            .from('makelaars')
            .update({ naam: m.naam, actief: m.actief, rol: m.rol, area_manager_id: m.area_manager_id || null })
            .eq('id', m.dbId)
          if (error) failed++
          next.push(m)
        } else {
          const { data, error } = await supabase
            .from('makelaars')
            .insert({ naam: m.naam, actief: m.actief, rol: m.rol, area_manager_id: m.area_manager_id || null })
            .select()
            .single()
          if (error || !data) { failed++; next.push(m) }
          else next.push({ ...m, dbId: (data as { id: string }).id, id: (data as { id: string }).id })
        }
      } catch { failed++; next.push(m) }
    }
    setSaving(false)
    if (failed === 0) {
      dt.reset(next)
      setRows(next)
      setSavedAt(Date.now())
      flashToast('ok', 'Team opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } else {
      flashToast('error', `${failed} rij(en) faalden`)
    }
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('team', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  function handleDelete(row: TeamRow) {
    if (!row.dbId) {
      dt.removeRow(row.id)
      return
    }
    setConfirm({
      title: 'Teamlid verwijderen?',
      message: `${row.naam || 'Dit teamlid'} wordt verwijderd uit het team.`,
      onConfirm: async () => {
        const { error } = await supabase.from('makelaars').delete().eq('id', row.dbId!)
        if (error) {
          flashToast('error', 'Verwijderen mislukt')
        } else {
          dt.removeRow(row.id)
          setRows(prev => prev.filter(r => r.dbId !== row.dbId))
          flashToast('ok', 'Teamlid verwijderd')
        }
      },
    })
  }

  function add() {
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 9)
    dt.addRow({ id: tmp, dbId: null, naam: '', actief: true, rol: 'consultant', area_manager_id: null })
  }

  return (
    <AaSectionCard
      num={2}
      eyebrow="Mensen"
      title="Team & area-managers"
      meta={<>Consultants en area-managers — <b>{dt.rows.length}</b> rijen</>}
      accent="sea"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      <AaInlineTable<TeamRow>
        columns={[
          { label: 'Naam', width: '32%' },
          { label: 'Rol', width: '20%' },
          { label: 'Area manager', width: '28%' },
          { label: 'Actief', width: '12%', align: 'act' },
          { label: '', align: 'act' },
        ]}
        rows={dt.rows}
        dirtyIds={dt.dirtyIds}
        onAdd={add}
        addLabel="+ Teamlid toevoegen"
        emptyText="Nog geen teamleden."
        emptyCta="+ Teamlid toevoegen"
        renderRow={m => (
          <>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AaAvatar name={m.naam} />
                <AaCellInput
                  value={m.naam}
                  onChange={v => dt.updateRow(m.id, { naam: String(v) })}
                  placeholder="Voornaam achternaam"
                />
              </div>
            </td>
            <td>
              <AaCellSelect
                value={m.rol}
                options={[
                  { value: 'consultant', label: 'Consultant' },
                  { value: 'area_manager', label: 'Area manager' },
                ]}
                onChange={v => dt.updateRow(m.id, { rol: v, area_manager_id: v === 'area_manager' ? null : m.area_manager_id })}
              />
            </td>
            <td>
              {m.rol === 'area_manager' ? (
                <span style={{ color: 'var(--aa-fg-muted, #6b7c80)', fontSize: 12 }}>—</span>
              ) : (
                <AaCellSelect
                  value={m.area_manager_id ?? ''}
                  options={[
                    { value: '', label: 'Geen' },
                    ...areaManagers.map(am => ({ value: am.dbId!, label: am.naam || '—' })),
                  ]}
                  onChange={v => dt.updateRow(m.id, { area_manager_id: v || null })}
                />
              )}
            </td>
            <td className="act">
              <input
                type="checkbox"
                checked={m.actief}
                onChange={e => dt.updateRow(m.id, { actief: e.target.checked })}
                style={{ accentColor: 'var(--aa-deepsea)' }}
              />
            </td>
            <td className="act">
              <button
                className="aa-btn aa-btn--icon danger"
                onClick={() => handleDelete(m)}
                type="button"
                aria-label="Verwijderen"
              >
                <AaIcon name="trash" size={13} />
              </button>
            </td>
          </>
        )}
      />
    </AaSectionCard>
  )
}

// ============================================================
// 03 — Pipedrive veldenmapping
// ============================================================
function PipedriveSection({
  rows, setRows, register, flashToast, setConfirm,
}: {
  rows: PdMapRow[]
  setRows: (r: PdMapRow[] | ((prev: PdMapRow[]) => PdMapRow[])) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
  setConfirm: (c: Confirm) => void
}) {
  const dt = useDirtyTracker<PdMapRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [loadingFields, setLoadingFields] = useState(false)
  const [pdAvailable, setPdAvailable] = useState<Array<{ key: string; name: string }>>([])

  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    const fullArr = dt.rows
    const legacyMap: Record<string, string> = {}
    fullArr.forEach(r => { if (r.cs_veld) legacyMap[r.cs_veld] = r.pd_key })
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sup = supabase.from('settings') as any
      await Promise.all([
        sup.upsert({ key: 'pipedrive_field_mappings', value: fullArr }, { onConflict: 'key' }),
        sup.upsert({ key: 'pipedrive_deal_field_mapping', value: legacyMap }, { onConflict: 'key' }),
      ])
      dt.markClean()
      setRows(fullArr)
      setSavedAt(Date.now())
      flashToast('ok', 'Mapping opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } catch (err) {
      console.error(err)
      flashToast('error', 'Opslaan mislukt')
    }
    setSaving(false)
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('pipedrive', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  async function loadFields() {
    setLoadingFields(true)
    try {
      const res = await fetch('/api/pipedrive/fields')
      if (!res.ok) throw new Error('fail')
      const json = await res.json()
      setPdAvailable((json.fields ?? []).map((f: { key: string; name: string }) => ({ key: f.key, name: f.name })))
      flashToast('ok', `${(json.fields ?? []).length} velden geladen`)
    } catch {
      flashToast('error', 'Pipedrive velden niet geladen')
    }
    setLoadingFields(false)
  }

  function add() {
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 9)
    dt.addRow({ id: tmp, cs_veld: '', cs_label: '', pd_key: '', pd_type: 'text' })
  }

  function handleDelete(row: PdMapRow) {
    setConfirm({
      title: 'Mapping verwijderen?',
      message: `Veld "${row.cs_label || row.cs_veld}" wordt verwijderd uit de mapping.`,
      onConfirm: () => dt.removeRow(row.id),
    })
  }

  return (
    <AaSectionCard
      num={3}
      eyebrow="Integratie"
      title="Pipedrive veldenmapping"
      meta={
        <>
          <button
            className="aa-btn aa-btn--ghost aa-btn--sm"
            onClick={loadFields}
            disabled={loadingFields}
            type="button"
            style={{ marginRight: 8 }}
          >
            {loadingFields ? 'Laden…' : 'Velden laden'}
          </button>
          {pdAvailable.length > 0 && <><b>{pdAvailable.length}</b> velden in Pipedrive</>}
        </>
      }
      accent="sun"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      <AaInlineTable<PdMapRow>
        columns={[
          { label: 'Costa-Select veld', width: '22%' },
          { label: 'Label', width: '24%' },
          { label: 'Pipedrive key', width: '30%' },
          { label: 'Type', width: '18%' },
          { label: '', align: 'act' },
        ]}
        rows={dt.rows}
        dirtyIds={dt.dirtyIds}
        onAdd={add}
        addLabel="+ Mapping toevoegen"
        emptyText="Nog geen Pipedrive-mapping."
        emptyCta="+ Mapping toevoegen"
        renderRow={r => (
          <>
            <td>
              <AaCellInput
                value={r.cs_veld}
                onChange={v => dt.updateRow(r.id, { cs_veld: String(v) })}
                placeholder="bv. regio"
                mono
              />
            </td>
            <td>
              <AaCellInput
                value={r.cs_label}
                onChange={v => dt.updateRow(r.id, { cs_label: String(v) })}
                placeholder="bv. Regio"
              />
            </td>
            <td>
              {pdAvailable.length > 0 ? (
                <AaCellSelect
                  value={r.pd_key}
                  options={[
                    { value: '', label: '— niet koppelen —' },
                    ...pdAvailable.map(f => ({ value: f.key, label: `${f.name} (${f.key})` })),
                  ]}
                  onChange={v => dt.updateRow(r.id, { pd_key: v })}
                />
              ) : (
                <AaCellInput
                  value={r.pd_key}
                  onChange={v => dt.updateRow(r.id, { pd_key: String(v) })}
                  placeholder="custom-field-key"
                  mono
                />
              )}
            </td>
            <td>
              <AaCellSelect
                value={r.pd_type}
                options={PD_TYPE_OPTIONS}
                onChange={v => dt.updateRow(r.id, { pd_type: v })}
              />
            </td>
            <td className="act">
              <button
                className="aa-btn aa-btn--icon danger"
                onClick={() => handleDelete(r)}
                type="button"
                aria-label="Verwijderen"
              >
                <AaIcon name="trash" size={13} />
              </button>
            </td>
          </>
        )}
      />
    </AaSectionCard>
  )
}

// ============================================================
// 04 — Regionale kosten koper
// ============================================================
function RegioSection({
  rows, setRows, register, flashToast,
}: {
  rows: RegioRow[]
  setRows: (r: RegioRow[] | ((prev: RegioRow[]) => RegioRow[])) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
}) {
  const dt = useDirtyTracker<RegioRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    let failed = 0
    for (const r of dt.rows) {
      try {
        const res = await fetch('/api/regional-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r),
        })
        if (!res.ok) failed++
      } catch { failed++ }
    }
    setSaving(false)
    if (failed === 0) {
      dt.markClean()
      setRows(dt.rows)
      setSavedAt(Date.now())
      flashToast('ok', 'Regio-instellingen opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } else {
      flashToast('error', `${failed} regio('s) faalden`)
    }
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('regio', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  return (
    <AaSectionCard
      num={4}
      eyebrow="Belastingen"
      title="Regionale kosten koper"
      meta={<>Belastingtarieven en kosten — <b>{dt.rows.length}</b> regio&apos;s</>}
      accent="sand"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      <AaInlineTable<RegioRow>
        columns={[
          { label: 'Regio', width: '20%' },
          { label: 'ITP', width: '10%', align: 'num' },
          { label: 'AJD', width: '10%', align: 'num' },
          { label: 'IVA', width: '10%', align: 'num' },
          { label: 'Notaris', width: '10%', align: 'num' },
          { label: 'Registro', width: '10%', align: 'num' },
          { label: 'Advocaat', width: '10%', align: 'num' },
          { label: 'Adv. min', width: '15%', align: 'num' },
        ]}
        rows={dt.rows}
        dirtyIds={dt.dirtyIds}
        renderRow={r => (
          <>
            <td><span className="aa-pill aa-pill--sand">{r.region}</span></td>
            {(['itp_percentage', 'ajd_percentage', 'iva_percentage', 'notary_percentage', 'registro_percentage', 'lawyer_percentage'] as const).map(field => (
              <td key={field} className="num">
                <AaCellInput
                  value={r[field] ?? 0}
                  onChange={v => dt.updateRow(r.id, { [field]: Number(v) || 0 } as Partial<RegioRow>)}
                  type="number"
                  suffix="%"
                />
              </td>
            ))}
            <td className="num">
              <AaCellInput
                value={r.lawyer_minimum ?? 0}
                onChange={v => dt.updateRow(r.id, { lawyer_minimum: Number(v) || 0 })}
                type="number"
                prefix="€"
              />
            </td>
          </>
        )}
      />
    </AaSectionCard>
  )
}

// ============================================================
// 05 — Kostencategorieën
// ============================================================
function CatsSection({
  rows, setRows, posten, setPosten, register, flashToast, setConfirm,
}: {
  rows: CatRow[]
  setRows: (r: CatRow[] | ((prev: CatRow[]) => CatRow[])) => void
  posten: PostRow[]
  setPosten: (r: PostRow[] | ((prev: PostRow[]) => PostRow[])) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
  setConfirm: (c: Confirm) => void
}) {
  const dt = useDirtyTracker<CatRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    const next: CatRow[] = []
    let failed = 0
    for (const c of dt.rows) {
      if (!c.naam.trim()) { next.push(c); continue }
      try {
        if (c.dbId) {
          const { error } = await supabase
            .from('kosten_categorieen')
            .update({ naam: c.naam, volgorde: c.volgorde, actief: c.actief })
            .eq('id', c.dbId)
          if (error) failed++
          next.push(c)
        } else {
          const { data, error } = await supabase
            .from('kosten_categorieen')
            .insert({ naam: c.naam, volgorde: c.volgorde, actief: c.actief })
            .select()
            .single()
          if (error || !data) { failed++; next.push(c) }
          else next.push({ ...c, dbId: (data as { id: string }).id, id: (data as { id: string }).id })
        }
      } catch { failed++; next.push(c) }
    }
    setSaving(false)
    if (failed === 0) {
      dt.reset(next)
      setRows(next)
      setSavedAt(Date.now())
      flashToast('ok', 'Categorieën opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } else {
      flashToast('error', `${failed} rij(en) faalden`)
    }
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('cats', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  function handleDelete(row: CatRow) {
    if (!row.dbId) {
      dt.removeRow(row.id)
      return
    }
    const linkedPosten = posten.filter(p => p.categorie_id === row.dbId)
    setConfirm({
      title: 'Categorie verwijderen?',
      message: linkedPosten.length > 0
        ? `"${row.naam}" en ${linkedPosten.length} bijbehorende kostenpost(en) worden verwijderd.`
        : `Categorie "${row.naam}" wordt verwijderd.`,
      onConfirm: async () => {
        if (linkedPosten.length > 0) {
          await supabase.from('kosten_posten').delete().eq('categorie_id', row.dbId!)
          setPosten(prev => prev.filter(p => p.categorie_id !== row.dbId))
        }
        const { error } = await supabase.from('kosten_categorieen').delete().eq('id', row.dbId!)
        if (error) {
          flashToast('error', 'Verwijderen mislukt')
        } else {
          dt.removeRow(row.id)
          setRows(prev => prev.filter(c => c.dbId !== row.dbId))
          flashToast('ok', 'Categorie verwijderd')
        }
      },
    })
  }

  function add() {
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 9)
    const next = (dt.rows.reduce((m, c) => Math.max(m, c.volgorde), 0) || 0) + 1
    dt.addRow({ id: tmp, dbId: null, naam: '', volgorde: next, actief: true })
  }

  return (
    <AaSectionCard
      num={5}
      eyebrow="Operationeel"
      title="Kostencategorieën"
      meta={<><b>{dt.rows.length}</b> categorieën</>}
      accent="deepsea"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      <AaInlineTable<CatRow>
        columns={[
          { label: 'Naam', width: '60%' },
          { label: 'Volgorde', width: '15%', align: 'num' },
          { label: 'Actief', width: '15%', align: 'act' },
          { label: '', align: 'act' },
        ]}
        rows={dt.rows}
        dirtyIds={dt.dirtyIds}
        onAdd={add}
        addLabel="+ Categorie toevoegen"
        emptyText="Nog geen categorieën."
        emptyCta="+ Categorie toevoegen"
        renderRow={c => (
          <>
            <td>
              <AaCellInput
                value={c.naam}
                onChange={v => dt.updateRow(c.id, { naam: String(v) })}
                placeholder="bv. Marketing"
              />
            </td>
            <td className="num">
              <AaCellInput
                value={c.volgorde}
                onChange={v => dt.updateRow(c.id, { volgorde: Number(v) || 0 })}
                type="number"
              />
            </td>
            <td className="act">
              <input
                type="checkbox"
                checked={c.actief}
                onChange={e => dt.updateRow(c.id, { actief: e.target.checked })}
                style={{ accentColor: 'var(--aa-deepsea)' }}
              />
            </td>
            <td className="act">
              <button
                className="aa-btn aa-btn--icon danger"
                onClick={() => handleDelete(c)}
                type="button"
                aria-label="Verwijderen"
              >
                <AaIcon name="trash" size={13} />
              </button>
            </td>
          </>
        )}
      />
    </AaSectionCard>
  )
}

// ============================================================
// 06 — Kostenposten
// ============================================================
function PostenSection({
  rows, setRows, cats, register, flashToast, setConfirm,
}: {
  rows: PostRow[]
  setRows: (r: PostRow[] | ((prev: PostRow[]) => PostRow[])) => void
  cats: CatRow[]
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
  setConfirm: (c: Confirm) => void
}) {
  const dt = useDirtyTracker<PostRow>(rows)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    dt.reset(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length === 0 ? 0 : 1])

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    const next: PostRow[] = []
    let failed = 0
    for (const p of dt.rows) {
      if (!p.naam.trim() || !p.categorie_id) { next.push(p); continue }
      try {
        if (p.dbId) {
          const { error } = await supabase
            .from('kosten_posten')
            .update({ naam: p.naam, categorie_id: p.categorie_id, volgorde: p.volgorde, actief: p.actief })
            .eq('id', p.dbId)
          if (error) failed++
          next.push(p)
        } else {
          const { data, error } = await supabase
            .from('kosten_posten')
            .insert({ naam: p.naam, categorie_id: p.categorie_id, volgorde: p.volgorde, actief: p.actief })
            .select()
            .single()
          if (error || !data) { failed++; next.push(p) }
          else next.push({ ...p, dbId: (data as { id: string }).id, id: (data as { id: string }).id })
        }
      } catch { failed++; next.push(p) }
    }
    setSaving(false)
    if (failed === 0) {
      dt.reset(next)
      setRows(next)
      setSavedAt(Date.now())
      flashToast('ok', 'Kostenposten opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } else {
      flashToast('error', `${failed} rij(en) faalden`)
    }
  }, [dt, flashToast, setRows])

  useEffect(() => {
    register('posten', { hasDirty: dt.hasDirty, saving, savedAt, save })
  }, [register, dt.hasDirty, saving, savedAt, save])

  function handleDelete(row: PostRow) {
    if (!row.dbId) {
      dt.removeRow(row.id)
      return
    }
    setConfirm({
      title: 'Kostenpost verwijderen?',
      message: `"${row.naam}" wordt verwijderd.`,
      onConfirm: async () => {
        const { error } = await supabase.from('kosten_posten').delete().eq('id', row.dbId!)
        if (error) {
          flashToast('error', 'Verwijderen mislukt')
        } else {
          dt.removeRow(row.id)
          setRows(prev => prev.filter(p => p.dbId !== row.dbId))
          flashToast('ok', 'Kostenpost verwijderd')
        }
      },
    })
  }

  function add() {
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 9)
    const firstCat = cats.find(c => c.dbId)?.dbId ?? ''
    const next = (dt.rows.reduce((m, p) => Math.max(m, p.volgorde), 0) || 0) + 1
    dt.addRow({ id: tmp, dbId: null, categorie_id: firstCat, naam: '', volgorde: next, actief: true })
  }

  const catOptions = cats.filter(c => c.dbId).map(c => ({ value: c.dbId!, label: c.naam }))

  return (
    <AaSectionCard
      num={6}
      eyebrow="Operationeel"
      title="Kostenposten"
      meta={<><b>{dt.rows.length}</b> posten</>}
      accent="sea"
      dirty={dt.hasDirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      {catOptions.length === 0 ? (
        <div className="aa-empty">
          <div className="aa-empty-icon"><AaIcon name="warn" size={20} strokeWidth={1.6} /></div>
          <p>Voeg eerst een <strong>kostencategorie</strong> toe voordat je posten kunt aanmaken.</p>
        </div>
      ) : (
        <AaInlineTable<PostRow>
          columns={[
            { label: 'Categorie', width: '26%' },
            { label: 'Naam', width: '46%' },
            { label: 'Volgorde', width: '12%', align: 'num' },
            { label: 'Actief', width: '8%', align: 'act' },
            { label: '', align: 'act' },
          ]}
          rows={dt.rows}
          dirtyIds={dt.dirtyIds}
          onAdd={add}
          addLabel="+ Kostenpost toevoegen"
          emptyText="Nog geen kostenposten."
          emptyCta="+ Kostenpost toevoegen"
          renderRow={p => (
            <>
              <td>
                <AaCellSelect
                  value={p.categorie_id}
                  options={[{ value: '', label: '— kies categorie —' }, ...catOptions]}
                  onChange={v => dt.updateRow(p.id, { categorie_id: v })}
                />
              </td>
              <td>
                <AaCellInput
                  value={p.naam}
                  onChange={v => dt.updateRow(p.id, { naam: String(v) })}
                  placeholder="bv. Google Ads"
                />
              </td>
              <td className="num">
                <AaCellInput
                  value={p.volgorde}
                  onChange={v => dt.updateRow(p.id, { volgorde: Number(v) || 0 })}
                  type="number"
                />
              </td>
              <td className="act">
                <input
                  type="checkbox"
                  checked={p.actief}
                  onChange={e => dt.updateRow(p.id, { actief: e.target.checked })}
                  style={{ accentColor: 'var(--aa-deepsea)' }}
                />
              </td>
              <td className="act">
                <button
                  className="aa-btn aa-btn--icon danger"
                  onClick={() => handleDelete(p)}
                  type="button"
                  aria-label="Verwijderen"
                >
                  <AaIcon name="trash" size={13} />
                </button>
              </td>
            </>
          )}
        />
      )}
    </AaSectionCard>
  )
}

// ============================================================
// 07 — Geavanceerd (commissies, targets, lijsten, sync, renovatie)
// ============================================================
function GeavanceerdSection({
  adv, setAdv, register, flashToast,
}: {
  adv: AdvSettings
  setAdv: (a: AdvSettings | ((prev: AdvSettings) => AdvSettings)) => void
  register: (id: string, s: Saver) => void
  flashToast: (k: 'ok' | 'error', m: string) => void
}) {
  const [local, setLocal] = useState<AdvSettings>(adv)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLocal(adv); setDirty(false) }, [adv])

  function patch<K extends keyof AdvSettings>(key: K, value: AdvSettings[K]) {
    setLocal(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  function patchList(key: 'regios' | 'deal_types' | 'bronnen' | 'afspraak_types' | 'todo_labels' | 'pipedrive_activiteit_namen', idx: number, value: string) {
    setLocal(prev => {
      const list = [...prev[key]]
      list[idx] = value
      return { ...prev, [key]: list }
    })
    setDirty(true)
  }

  function addToList(key: 'regios' | 'deal_types' | 'bronnen' | 'afspraak_types' | 'todo_labels' | 'pipedrive_activiteit_namen') {
    setLocal(prev => ({ ...prev, [key]: [...prev[key], ''] }))
    setDirty(true)
  }

  function removeFromList(key: 'regios' | 'deal_types' | 'bronnen' | 'afspraak_types' | 'todo_labels' | 'pipedrive_activiteit_namen', idx: number) {
    setLocal(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }))
    setDirty(true)
  }

  const save = useCallback(async () => {
    setSaving(true)
    setSavedAt(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sup = supabase.from('settings') as any
      const entries: Array<[string, unknown]> = [
        ['minimum_fee', local.minimum_fee],
        ['makelaar_commissie_pct', local.makelaar_commissie_pct],
        ['partner_commissie_pct', local.partner_commissie_pct],
        ['commissie_per_type', local.commissie_per_type],
        ['regios', local.regios.filter(s => s.trim())],
        ['deal_types', local.deal_types.filter(s => s.trim())],
        ['bronnen', local.bronnen.filter(s => s.trim())],
        ['afspraak_types', local.afspraak_types.filter(s => s.trim())],
        ['todo_labels', local.todo_labels.filter(s => s.trim())],
        ['targets', local.targets],
        ['pipedrive_sync_interval', local.pipedrive_sync_interval],
        ['pipedrive_activiteit_namen', local.pipedrive_activiteit_namen.filter(s => s.trim())],
        ['renovation_cosmetic_per_m2', local.renovation_cosmetic_per_m2],
        ['renovation_partial_per_m2', local.renovation_partial_per_m2],
        ['renovation_full_per_m2', local.renovation_full_per_m2],
        ['renovation_luxury_per_m2', local.renovation_luxury_per_m2],
        ['renovation_contingency_pct', local.renovation_contingency_pct],
        ['renovation_architect_fee', local.renovation_architect_fee],
        ['renovation_terrace_per_m2', local.renovation_terrace_per_m2],
        ['renovation_garden_per_m2', local.renovation_garden_per_m2],
        ['renovation_pool_per_m2', local.renovation_pool_per_m2],
      ]
      await Promise.all(entries.map(([key, value]) => sup.upsert({ key, value }, { onConflict: 'key' })))
      setAdv(local)
      setDirty(false)
      setSavedAt(Date.now())
      flashToast('ok', 'Geavanceerd opgeslagen')
      setTimeout(() => setSavedAt(null), 2400)
    } catch (err) {
      console.error(err)
      flashToast('error', 'Opslaan mislukt')
    }
    setSaving(false)
  }, [local, setAdv, flashToast])

  useEffect(() => {
    register('adv', { hasDirty: dirty, saving, savedAt, save })
  }, [register, dirty, saving, savedAt, save])

  const lists: Array<{ key: 'regios' | 'deal_types' | 'bronnen' | 'afspraak_types' | 'todo_labels' | 'pipedrive_activiteit_namen'; label: string }> = [
    { key: 'regios', label: 'Regio\'s' },
    { key: 'deal_types', label: 'Deal types' },
    { key: 'bronnen', label: 'Bronnen' },
    { key: 'afspraak_types', label: 'Afspraak types' },
    { key: 'todo_labels', label: 'To-do labels' },
    { key: 'pipedrive_activiteit_namen', label: 'Pipedrive activiteitsnamen' },
  ]

  return (
    <AaSectionCard
      num={7}
      eyebrow="Geavanceerd"
      title="Commissies, targets, lijsten & renovatie"
      meta={<>Overige instellingen — alle wijzigingen werken meteen door</>}
      accent="sun"
      dirty={dirty}
      saving={saving}
      savedAt={savedAt}
      onSave={save}
    >
      {/* Commissies */}
      <SubBlock title="Commissies">
        <div style={gridCols(3)}>
          <FieldNum label="Minimum fee" prefix="€"
            value={local.minimum_fee}
            onChange={v => patch('minimum_fee', v)} />
          <FieldNum label="Standaard consultant" suffix="%"
            value={Math.round(local.makelaar_commissie_pct * 100)}
            onChange={v => patch('makelaar_commissie_pct', v / 100)} />
          <FieldNum label="Standaard partner" suffix="%"
            value={Math.round(local.partner_commissie_pct * 100)}
            onChange={v => patch('partner_commissie_pct', v / 100)} />
        </div>
      </SubBlock>

      {/* Targets */}
      <SubBlock title="Targets 2026">
        <div style={gridCols(2)}>
          <FieldNum label="Doel aantal deals"
            value={local.targets.deals_2026}
            onChange={v => patch('targets', { ...local.targets, deals_2026: v })} />
          <FieldNum label="Doel netto omzet" prefix="€"
            value={local.targets.netto_omzet_2026}
            onChange={v => patch('targets', { ...local.targets, netto_omzet_2026: v })} />
        </div>
      </SubBlock>

      {/* Sync */}
      <SubBlock title="Pipedrive sync">
        <div style={gridCols(3)}>
          <div>
            <FieldLabel>Interval (minuten)</FieldLabel>
            <AaCellSelect
              value={String(local.pipedrive_sync_interval)}
              options={[5, 10, 15, 30, 60].map(v => ({ value: String(v), label: `${v} minuten` }))}
              onChange={v => patch('pipedrive_sync_interval', Number(v))}
            />
          </div>
        </div>
      </SubBlock>

      {/* Lijsten */}
      <SubBlock title="Lijsten">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {lists.map(({ key, label }) => (
            <div key={key}>
              <FieldLabel>{label}</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {local[key].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AaCellInput
                      value={item}
                      onChange={v => patchList(key, i, String(v))}
                      placeholder={`${label.replace(/'s$/, '')} item`}
                    />
                    <button
                      className="aa-btn aa-btn--icon danger"
                      onClick={() => removeFromList(key, i)}
                      type="button"
                      aria-label="Verwijderen"
                    >
                      <AaIcon name="trash" size={12} />
                    </button>
                  </div>
                ))}
                <button
                  className="aa-add-btn"
                  onClick={() => addToList(key)}
                  type="button"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <AaIcon name="plus" size={12} strokeWidth={2.2} />
                  Toevoegen
                </button>
              </div>
            </div>
          ))}
        </div>
      </SubBlock>

      {/* Renovatie */}
      <SubBlock title="Renovatiekosten (calculator-defaults)">
        <div style={gridCols(3)}>
          <FieldNum label="Cosmetisch" suffix="€/m²" value={local.renovation_cosmetic_per_m2} onChange={v => patch('renovation_cosmetic_per_m2', v)} />
          <FieldNum label="Gedeeltelijk" suffix="€/m²" value={local.renovation_partial_per_m2} onChange={v => patch('renovation_partial_per_m2', v)} />
          <FieldNum label="Volledig" suffix="€/m²" value={local.renovation_full_per_m2} onChange={v => patch('renovation_full_per_m2', v)} />
          <FieldNum label="Luxe" suffix="€/m²" value={local.renovation_luxury_per_m2} onChange={v => patch('renovation_luxury_per_m2', v)} />
          <FieldNum label="Onvoorzien" suffix="%" value={local.renovation_contingency_pct} onChange={v => patch('renovation_contingency_pct', v)} />
          <FieldNum label="Architect / vergunningen" prefix="€" value={local.renovation_architect_fee} onChange={v => patch('renovation_architect_fee', v)} />
          <FieldNum label="Terras" suffix="€/m²" value={local.renovation_terrace_per_m2} onChange={v => patch('renovation_terrace_per_m2', v)} />
          <FieldNum label="Tuin" suffix="€/m²" value={local.renovation_garden_per_m2} onChange={v => patch('renovation_garden_per_m2', v)} />
          <FieldNum label="Zwembad" suffix="€/m²" value={local.renovation_pool_per_m2} onChange={v => patch('renovation_pool_per_m2', v)} />
        </div>
      </SubBlock>
    </AaSectionCard>
  )
}

// ============================================================
// Kleine helpers voor Geavanceerd
// ============================================================
function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--aa-fg-muted, #6b7c80)', marginBottom: 12,
        paddingBottom: 6, borderBottom: '1px solid var(--aa-border, rgba(15,42,53,0.08))',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 12, fontWeight: 500,
      color: 'var(--aa-fg-muted, #6b7c80)', marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function FieldNum({ label, value, onChange, prefix, suffix }: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <AaCellInput
        value={value}
        onChange={v => onChange(Number(v) || 0)}
        type="number"
        prefix={prefix}
        suffix={suffix}
      />
    </div>
  )
}

function gridCols(n: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
    gap: 14,
  }
}
