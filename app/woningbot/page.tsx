'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Bath,
  Bed,
  Building,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  ExternalLink,
  Filter,
  Home,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  MessageSquare,
  Plus,
  Send,
  Square,
  Sparkles,
  Trash2,
  Trees,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ───────── Types ─────────
interface Property {
  id: string
  title: string
  price: number | null
  location: string
  bedrooms: number | null
  bathrooms: number | null
  size_m2: number | null
  url: string
  thumbnail: string | null
  source: string
  motivation: string
  score: number | null
  reasons_for?: string[]
  reasons_against?: string[]
  highlights?: string[]
  also_on?: string[]
}

interface ChatStats {
  total_found: number
  after_filter: number
  selected: number
}

interface ChatMessage {
  id?: string
  role: 'user' | 'bot'
  content: string
  properties?: Property[]
  stats?: ChatStats
}

interface SavedChat {
  id: string
  session_id: string
  title: string
  messages: ChatMessage[]
  updated_at: string
}

interface Customer {
  id: string
  klant_naam: string
  item_count?: number
}

type SuggestionIcon = 'building' | 'home' | 'sparkles' | 'penthouse' | 'finca' | 'townhouse'

interface Suggestion {
  text: string
  icon: SuggestionIcon
  topic?: boolean
}

// Voorbeelden zijn de eerste sturing voor consultants: ze laten zien welke
// dimensies zinvol zijn om in een prompt op te nemen (regio of stad,
// type woning, slaapkamers, budget-range, must-haves zoals zwembad of
// zeezicht). Gespreid over types en regio's zodat consultants zien dat
// het concept werkt voor instap, mid-segment én premium.
const SUGGESTIONS: Suggestion[] = [
  { text: 'Appartement Costa del Sol, 2 slpk, max 300k', icon: 'building' },
  { text: 'Villa Marbella, 4 slpk, zwembad, 1M+', icon: 'home' },
  { text: 'Nieuwbouw Costa Blanca Noord, 2 slpk, zeezicht', icon: 'sparkles' },
  { text: 'Penthouse Estepona, 3 slpk, ruim terras, 500–700k', icon: 'penthouse' },
  { text: 'Finca Mijas, 3 slpk, perceel 2000m²+, privacy', icon: 'finca' },
  { text: 'Townhouse Jávea, 3 slpk, communaal zwembad, max 500k', icon: 'townhouse' },
]

// ───────── Utils ─────────
function formatPrice(n: number | null): string {
  if (n == null) return 'Prijs op aanvraag'
  return '€ ' + new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 1) return 'Zojuist'
  if (m < 60) return `${m}m geleden`
  if (h < 24) return `${h}u geleden`
  if (d === 1) return 'Gisteren'
  if (d < 7) return `${d}d geleden`
  return `${Math.floor(d / 7)}w geleden`
}

function chatTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'Nieuwe chat'
  return firstUser.content.length > 50 ? firstUser.content.slice(0, 50) + '…' : firstUser.content
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SuggestionIconEl({ name, size = 14 }: { name: SuggestionIcon; size?: number }) {
  const props = { size, strokeWidth: 1.8 }
  if (name === 'building') return <Building2 {...props} />
  if (name === 'home') return <Home {...props} />
  if (name === 'sparkles') return <Sparkles {...props} />
  if (name === 'penthouse') return <Building {...props} />
  if (name === 'finca') return <Trees {...props} />
  return <Home {...props} />
}

// ───────── Page ─────────
export default function WoningbotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // AbortController voor de actieve chat-fetch zodat de gebruiker een
  // lopende zoekvraag kan onderbreken (de externe service blijft doorlopen
  // maar de UI stopt het wachten en kan een nieuwe vraag starten).
  const abortRef = useRef<AbortController | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<SavedChat[]>([])
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [saving, setSaving] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isRefining = sessionId !== null

  // Load history
  const loadHistory = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/woningbot/history?user_id=${user.id}`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setHistory(data)
    } catch {
      /* ignore */
    }
  }, [user])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-scroll on new messages / loading state
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, loading])

  async function saveChat(msgs: ChatMessage[], sid: string | null, cid: string | null) {
    if (!user || msgs.length === 0) return
    try {
      const res = await fetch('/api/woningbot/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          session_id: sid,
          title: chatTitle(msgs),
          messages: msgs,
          chat_id: cid,
        }),
      })
      const data = await res.json()
      if (!cid && data.id) setChatId(data.id)
      await loadHistory()
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const value = input.trim()
    if (!value || loading) return

    const userMsg: ChatMessage = { role: 'user', content: value }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    // Nieuwe controller voor deze request — als de user op stop klikt
    // wordt deze ge-aborteerd en valt de catch in.
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/woningbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, sessionId }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)

      let content: string
      if (data.response) {
        content = data.response
      } else if (res.status === 429) {
        content = 'Even rustig — je hebt te veel zoekopdrachten gedaan. Wacht een minuutje en probeer opnieuw.'
      } else if (data.error && !res.ok) {
        content = `De woningbot kon je vraag niet verwerken: ${data.error}. Probeer eenvoudiger te formuleren, bv. "appartement Marbella 600k 3 slaapkamers".`
      } else if (!res.ok) {
        content = 'Er ging iets mis op de server. Probeer eenvoudiger te formuleren, bv. "appartement Marbella 600k 3 slaapkamers" (gebruik geen € of M).'
      } else {
        content = 'Geen antwoord ontvangen. Probeer je zoekopdracht te herformuleren.'
      }

      const botMsg: ChatMessage = {
        role: 'bot',
        content,
        properties: data.properties,
        stats: data.stats,
      }
      const updated = [...next, botMsg]
      setMessages(updated)
      setLoading(false)
      saveChat(updated, data.sessionId || sessionId, chatId).catch(() => {})
    } catch (err) {
      // Door user gestopt: geen foutmelding tonen, gewoon loading
      // afsluiten zodat de input weer klaar staat voor een nieuwe vraag.
      const aborted =
        (err as Error)?.name === 'AbortError' ||
        controller.signal.aborted
      if (aborted) {
        setLoading(false)
      } else {
        const updated = [
          ...next,
          {
            role: 'bot' as const,
            content: 'Er ging iets mis met de verbinding naar de woningbot. Probeer het opnieuw.',
          },
        ]
        setMessages(updated)
        setLoading(false)
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      inputRef.current?.focus()
    }
  }

  function stopRequest() {
    abortRef.current?.abort()
  }

  function startNewChat() {
    setSessionId(null)
    setChatId(null)
    setMessages([])
    setSelectedProps(new Set())
    setPickerOpen(false)
    setHistoryOpen(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function loadChat(chat: SavedChat) {
    setMessages(chat.messages)
    setSessionId(chat.session_id || null)
    setChatId(chat.id)
    setSelectedProps(new Set())
    setHistoryOpen(false)
  }

  async function deleteChat(id: string) {
    if (!user) return
    await fetch('/api/woningbot/history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_id: user.id }),
    })
    if (chatId === id) startNewChat()
    loadHistory()
  }

  function toggleProperty(id: string) {
    setSelectedProps(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function openPicker() {
    try {
      const res = await fetch('/api/woninglijst', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setCustomers(data)
      }
    } catch {
      /* ignore */
    }
    setPickerOpen(true)
  }

  async function addToShortlist(customerId: string) {
    setSaving(true)
    const allProps = messages.flatMap(m => m.properties || [])
    const items = allProps
      .filter(p => selectedProps.has(p.id))
      .map(p => ({
        title: p.title,
        url: p.url,
        price: p.price,
        location: p.location,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        size_m2: p.size_m2,
        thumbnail: p.thumbnail,
        source: p.source,
      }))
    try {
      await fetch(`/api/woninglijst/${customerId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      setSelectedProps(new Set())
      setPickerOpen(false)
    } catch {
      /* ignore */
    }
    setSaving(false)
  }

  async function createAndAddToShortlist(name: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/woninglijst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ klant_naam: name.trim() }),
      })
      if (!res.ok) {
        setSaving(false)
        return
      }
      const created = await res.json()
      if (!created?.id) {
        setSaving(false)
        return
      }
      setCustomers(prev => [{ id: created.id, klant_naam: created.klant_naam, item_count: 0 }, ...prev])
      setSaving(false)
      await addToShortlist(created.id)
    } catch {
      setSaving(false)
    }
  }

  function pickSuggestion(text: string) {
    setInput(text)
    inputRef.current?.focus()
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col bg-marble" style={{ height: '100vh' }}>
      {/* ── Header ─────────────────────────────── */}
      <div
        className="flex items-start justify-between bg-marble"
        style={{ padding: '24px 32px 18px', borderBottom: '1px solid rgba(0,75,70,0.12)' }}
      >
        <div>
          <div
            className="font-body font-bold uppercase text-sun-dark"
            style={{ fontSize: 10, letterSpacing: '0.18em' }}
          >
            Costa Select · AI Search
          </div>
          <h1
            className="font-heading font-bold text-deepsea mt-1.5"
            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.01em' }}
          >
            Woningbot.
          </h1>
          <p
            className="font-body font-normal mt-1.5"
            style={{ fontSize: 13, color: '#7A8C8B' }}
          >
            Zoek en vergelijk woningen met AI.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className={`inline-flex items-center gap-2 rounded-[10px] font-body font-semibold transition-all cursor-pointer ${
              historyOpen
                ? 'bg-deepsea text-marble'
                : 'bg-white text-deepsea hover:bg-deepsea-lighter'
            }`}
            style={{
              padding: '9px 14px',
              fontSize: 12,
              border: historyOpen ? '1px solid transparent' : '1px solid rgba(0,75,70,0.24)',
            }}
          >
            <Clock size={14} strokeWidth={1.8} />
            <span>Geschiedenis</span>
            {history.length > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full font-bold"
                style={{
                  minWidth: 20,
                  height: 18,
                  padding: '0 6px',
                  fontSize: 10,
                  background: historyOpen ? '#F5AF40' : '#FEF6E4',
                  color: '#004B46',
                }}
              >
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={startNewChat}
            className="inline-flex items-center gap-2 rounded-[10px] font-body font-semibold bg-deepsea text-marble hover:bg-deepsea-light transition-colors cursor-pointer"
            style={{ padding: '9px 14px', fontSize: 12 }}
          >
            <Plus size={14} strokeWidth={2} />
            <span>Nieuwe chat</span>
          </button>
        </div>
      </div>

      {/* ── History panel ─────────────────────── */}
      {historyOpen && (
        <div
          className="wb-anim-panel bg-white overflow-y-auto"
          style={{
            maxHeight: 260,
            borderBottom: '1px solid rgba(0,75,70,0.12)',
            padding: '14px 32px 18px',
          }}
        >
          <div
            className="font-body font-bold uppercase mb-2"
            style={{ fontSize: 10, letterSpacing: '0.18em', color: '#7A8C8B' }}
          >
            Eerdere zoekopdrachten
          </div>
          {history.length === 0 ? (
            <div
              className="text-center font-body"
              style={{ padding: '28px 20px', fontSize: 13, color: '#7A8C8B' }}
            >
              Nog geen eerdere chats.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {history.map(item => {
                const isActive = item.id === chatId
                return (
                  <div
                    key={item.id}
                    onClick={() => loadChat(item)}
                    className="group flex items-center gap-3 cursor-pointer transition-colors"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isActive ? '#E6F0EF' : 'transparent',
                      border: isActive ? '1px solid rgba(0,75,70,0.18)' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isActive ? '#004B46' : '#FEF6E4',
                        color: isActive ? '#FFFAEF' : '#D4921A',
                      }}
                    >
                      <MessageSquare size={14} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-body font-semibold text-deepsea truncate"
                        style={{ fontSize: 13 }}
                      >
                        {item.title || chatTitle(item.messages)}
                      </div>
                      <div
                        className="font-body flex items-center gap-1.5"
                        style={{ fontSize: 11, color: '#7A8C8B' }}
                      >
                        <span>{relativeTime(item.updated_at)}</span>
                        <span
                          className="inline-block rounded-full"
                          style={{ width: 3, height: 3, background: '#7A8C8B' }}
                        />
                        <span>{item.messages?.length ?? 0} berichten</span>
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteChat(item.id)
                      }}
                      title="Verwijderen"
                      className="shrink-0 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      style={{
                        width: 28,
                        height: 28,
                        background: 'rgba(224,82,82,0.12)',
                        color: '#c24040',
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Chat area ─────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: '28px 32px 24px' }}
      >
        <div className="mx-auto flex flex-col" style={{ maxWidth: 920, gap: 20 }}>
          {!hasMessages && (
            <EmptyState onPickSuggestion={pickSuggestion} />
          )}

          {messages.map((msg, i) => (
            <MessageRow
              key={msg.id ?? i}
              msg={msg}
              selected={selectedProps}
              onToggle={toggleProperty}
            />
          ))}

          {loading && <LoadingBubble />}
        </div>
      </div>

      {/* ── Shortlist selection bar ──────────── */}
      {selectedProps.size > 0 && (
        <div
          className="wb-anim-bar relative flex items-center justify-between bg-deepsea text-marble"
          style={{ padding: '14px 32px', borderTop: '1px solid #072A24' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center rounded-full font-heading font-bold text-deepsea"
              style={{ width: 28, height: 28, background: '#F5AF40', fontSize: 14 }}
            >
              {selectedProps.size}
            </span>
            <span className="font-body" style={{ fontSize: 13 }}>
              <b>{selectedProps.size}</b>{' '}
              {selectedProps.size === 1 ? 'woning' : 'woningen'} geselecteerd
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedProps(new Set())}
              className="inline-flex items-center gap-1.5 rounded-[10px] font-body font-bold uppercase transition-colors cursor-pointer"
              style={{
                padding: '9px 16px',
                fontSize: 12,
                letterSpacing: '0.06em',
                border: '1.5px solid rgba(255,250,239,0.3)',
                color: '#FFFAEF',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,250,239,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={13} strokeWidth={2} /> Deselecteren
            </button>
            <button
              onClick={openPicker}
              className="inline-flex items-center gap-1.5 rounded-[10px] font-body font-bold uppercase text-deepsea transition-colors cursor-pointer"
              style={{
                padding: '9px 16px',
                fontSize: 12,
                letterSpacing: '0.06em',
                background: '#F5AF40',
                border: '1.5px solid #F5AF40',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#D4921A'
                e.currentTarget.style.borderColor = '#D4921A'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F5AF40'
                e.currentTarget.style.borderColor = '#F5AF40'
              }}
            >
              <ClipboardList size={13} strokeWidth={2} /> Toevoegen aan shortlist
            </button>
          </div>

          {/* Picker */}
          {pickerOpen && (
            <ShortlistPicker
              customers={customers}
              saving={saving}
              onPick={addToShortlist}
              onCreateAndPick={createAndAddToShortlist}
              onCancel={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}

      {/* ── Input form ───────────────────────── */}
      <div
        className="bg-marble"
        style={{ padding: '14px 32px 22px', borderTop: '1px solid rgba(0,75,70,0.12)' }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex items-center gap-2.5 bg-white transition-shadow focus-within:shadow-[0_0_0_3px_rgba(0,75,70,0.08)]"
          style={{
            maxWidth: 920,
            borderRadius: 14,
            border: '1.5px solid rgba(0,75,70,0.12)',
            padding: '6px 6px 6px 16px',
            boxShadow: '0 1px 2px rgba(7,42,36,0.04), 0 1px 3px rgba(7,42,36,0.06)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            placeholder={isRefining ? 'Verfijn je zoekopdracht…' : 'Beschrijf wat je zoekt…'}
            className="flex-1 font-body bg-transparent outline-none disabled:opacity-50"
            style={{ fontSize: 14.5, color: '#004B46' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex items-center justify-center rounded-[10px] text-marble transition-colors cursor-pointer disabled:cursor-not-allowed"
            style={{
              width: 40,
              height: 40,
              background: !input.trim() || loading ? 'rgba(0,75,70,0.18)' : '#004B46',
            }}
            onMouseEnter={e => {
              if (input.trim() && !loading) e.currentTarget.style.background = '#0A6B63'
            }}
            onMouseLeave={e => {
              if (input.trim() && !loading) e.currentTarget.style.background = '#004B46'
            }}
          >
            <Send size={16} strokeWidth={2} />
          </button>
          {loading && (
            <button
              type="button"
              onClick={stopRequest}
              aria-label="Zoekopdracht stoppen"
              className="flex items-center justify-center rounded-[10px] text-marble transition-colors cursor-pointer"
              style={{ width: 40, height: 40, background: '#C24040', marginLeft: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#A82F2F')}
              onMouseLeave={e => (e.currentTarget.style.background = '#C24040')}
              title="Zoekopdracht stoppen"
            >
              <Square size={14} strokeWidth={0} fill="currentColor" />
            </button>
          )}
        </form>
        <div
          className="mx-auto flex items-center justify-between mt-2.5 font-body"
          style={{ maxWidth: 920, fontSize: 11, color: '#7A8C8B' }}
        >
          <span>
            {isRefining
              ? 'Volgvraag — sessie wordt onthouden voor context'
              : 'Typ in natuurlijke taal; AI vertaalt naar filters'}
          </span>
          <span>
            Verstuur met{' '}
            <kbd
              className="inline-block font-body font-semibold"
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#E6F0EF',
                border: '1px solid rgba(0,75,70,0.12)',
                color: '#004B46',
              }}
            >
              Enter
            </kbd>
          </span>
        </div>
      </div>
    </div>
  )
}

// ───────── Empty state ─────────
function EmptyState({ onPickSuggestion }: { onPickSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center" style={{ paddingTop: 20 }}>
      <div
        className="relative flex items-center justify-center bg-deepsea text-marble"
        style={{
          width: 76,
          height: 76,
          borderRadius: 18,
          boxShadow: '0 10px 28px rgba(7,42,36,0.18)',
        }}
      >
        <MessageSquare size={34} strokeWidth={1.6} />
        <span
          className="absolute flex items-center justify-center bg-sun"
          style={{ width: 22, height: 22, borderRadius: 999, top: -8, right: -8 }}
        >
          <Sparkles size={12} strokeWidth={2} color="#004B46" />
        </span>
      </div>

      <h2
        className="font-heading font-bold text-deepsea"
        style={{
          fontSize: 40,
          lineHeight: 1,
          letterSpacing: '-0.015em',
          marginTop: 22,
          marginBottom: 14,
        }}
      >
        Wat zoek je?
      </h2>

      <p
        className="font-body font-normal"
        style={{ fontSize: 15, color: '#5F7472', maxWidth: 540, lineHeight: 1.5 }}
      >
        Beschrijf wat je zoekt, bijvoorbeeld:{' '}
        <em
          className="not-italic"
          style={{
            background: '#FEF6E4',
            color: '#004B46',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          Villa in Estepona, budget 500k–800k, 3 slaapkamers, zwembad, zeezicht.
        </em>
      </p>

      <div
        className="flex items-center gap-2.5 font-body font-bold uppercase text-sun-dark"
        style={{ fontSize: 10, letterSpacing: '0.22em', margin: '28px 0 14px' }}
      >
        <span style={{ display: 'inline-block', width: 18, height: 1, background: '#D4921A' }} />
        Voorbeelden
        <span style={{ display: 'inline-block', width: 18, height: 1, background: '#D4921A' }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 w-full" style={{ maxWidth: 620, gap: 10 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s.text}
            onClick={() => onPickSuggestion(s.text)}
            className="group flex items-center gap-3 bg-white text-left transition-all cursor-pointer hover:-translate-y-px"
            style={{
              padding: '12px 16px 12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0,75,70,0.12)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#004B46')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)')}
          >
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: s.topic ? '#E6F0EF' : '#E6F0EF',
                color: s.topic ? '#D4921A' : '#004B46',
              }}
            >
              <SuggestionIconEl name={s.icon} />
            </span>
            <span
              className="flex-1 font-body font-medium text-deepsea"
              style={{ fontSize: 13, lineHeight: 1.3 }}
            >
              {s.text}
            </span>
            <span
              className="shrink-0 text-deepsea opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              style={{ fontSize: 0 }}
            >
              <ArrowRight size={14} strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ───────── Message row (user / bot with stats & grid) ─────────
function MessageRow({
  msg,
  selected,
  onToggle,
}: {
  msg: ChatMessage
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const isUser = msg.role === 'user'
  return (
    <div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ maxWidth: '85%', marginLeft: isUser ? 'auto' : 0, marginRight: isUser ? 0 : 'auto' }}
    >
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: isUser ? '#FFE5BD' : '#004B46',
          color: isUser ? '#004B46' : '#FFFAEF',
        }}
      >
        {isUser ? (
          <UserIcon size={15} strokeWidth={1.8} />
        ) : (
          <Sparkles size={15} strokeWidth={1.8} />
        )}
      </div>
      <div className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
        <div
          className="font-body whitespace-pre-wrap"
          style={{
            background: isUser ? '#004B46' : '#FFFFFF',
            color: isUser ? '#FFFAEF' : '#004B46',
            border: isUser ? 'none' : '1px solid rgba(0,75,70,0.12)',
            padding: '14px 16px',
            borderRadius: 14,
            borderTopRightRadius: isUser ? 4 : 14,
            borderTopLeftRadius: isUser ? 14 : 4,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {msg.content}
        </div>

        {!isUser && msg.stats && <StatsRow stats={msg.stats} />}

        {!isUser && msg.properties && msg.properties.length > 0 && (
          <PropertyGrid
            properties={msg.properties}
            selected={selected}
            onToggle={onToggle}
          />
        )}
      </div>
    </div>
  )
}

// ───────── Loading bubble ─────────
function LoadingBubble() {
  return (
    <div className="flex items-start gap-3" style={{ maxWidth: '85%' }}>
      <div
        className="shrink-0 flex items-center justify-center bg-deepsea text-marble"
        style={{ width: 32, height: 32, borderRadius: 10 }}
      >
        <Sparkles size={15} strokeWidth={1.8} />
      </div>
      <div
        className="flex items-center gap-3 bg-white"
        style={{
          border: '1px solid rgba(0,75,70,0.12)',
          padding: '14px 16px',
          borderRadius: 14,
          borderTopLeftRadius: 4,
        }}
      >
        <span
          className="wb-spinner inline-block"
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            border: '2px solid #E6F0EF',
            borderTopColor: '#004B46',
          }}
        />
        <span className="font-body" style={{ fontSize: 13, color: '#5F7472' }}>
          Zoeken kan 30–60 seconden duren…
        </span>
        <span className="flex items-center gap-1">
          <span
            className="wb-dot inline-block"
            style={{ width: 5, height: 5, borderRadius: 999, background: '#7A8C8B' }}
          />
          <span
            className="wb-dot inline-block"
            style={{ width: 5, height: 5, borderRadius: 999, background: '#7A8C8B' }}
          />
          <span
            className="wb-dot inline-block"
            style={{ width: 5, height: 5, borderRadius: 999, background: '#7A8C8B' }}
          />
        </span>
      </div>
    </div>
  )
}

// ───────── Stats row ─────────
function StatBadge({
  icon,
  num,
  label,
  accent,
}: {
  icon: React.ReactNode
  num: number
  label: string
  accent?: boolean
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-body font-semibold"
      style={{
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 11,
        background: accent ? '#FEF6E4' : '#FFFFFF',
        color: accent ? '#D4921A' : '#5F7472',
        border: accent ? '1px solid rgba(212,146,26,0.25)' : '1px solid rgba(0,75,70,0.12)',
      }}
    >
      {icon}
      <span
        className="font-heading font-bold"
        style={{ fontSize: 12, color: accent ? '#D4921A' : '#004B46' }}
      >
        {num.toLocaleString('nl-NL')}
      </span>
      {label}
    </span>
  )
}

function StatsRow({ stats }: { stats: ChatStats }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatBadge icon={<Database size={11} strokeWidth={2} />} num={stats.total_found} label="gevonden" />
      <StatBadge icon={<Filter size={11} strokeWidth={2} />} num={stats.after_filter} label="na filter" />
      <StatBadge
        icon={<CheckCircle2 size={11} strokeWidth={2} />}
        num={stats.selected}
        label="geselecteerd"
        accent
      />
    </div>
  )
}

// ───────── Property grid + card ─────────
function PropertyGrid({
  properties,
  selected,
  onToggle,
}: {
  properties: Property[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: 14,
      }}
    >
      {properties.map((p, i) => (
        <PropertyCard
          key={p.id}
          prop={p}
          rank={i}
          selected={selected.has(p.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

function PropertyCard({
  prop,
  rank,
  selected,
  onToggle,
}: {
  prop: Property
  rank: number
  selected: boolean
  onToggle: (id: string) => void
}) {
  const topScore = rank === 0 && prop.score != null && prop.score >= 90
  return (
    <div
      className="group flex flex-col bg-white overflow-hidden transition-all"
      style={{
        borderRadius: 14,
        border: selected ? '1px solid #F5AF40' : '1px solid rgba(0,75,70,0.12)',
        boxShadow: selected
          ? '0 0 0 2px rgba(245,175,64,0.25), 0 4px 12px rgba(7,42,36,0.08)'
          : '0 1px 2px rgba(7,42,36,0.04)',
      }}
      onMouseEnter={e => {
        if (!selected) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(7,42,36,0.08)'
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.2)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(7,42,36,0.04)'
          e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)'
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        {prop.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prop.thumbnail}
            alt={prop.title}
            className="w-full h-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #E6F0EF 0%, #FFE5BD 100%)',
              opacity: 0.9,
            }}
          >
            <ImageIcon size={34} strokeWidth={1.5} color="#5F7472" style={{ opacity: 0.7 }} />
          </div>
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggle(prop.id)}
          aria-label={selected ? 'Deselecteren' : 'Selecteren'}
          title={selected ? 'Deselecteren' : 'Selecteren'}
          className="absolute flex items-center justify-center cursor-pointer transition-all"
          style={{
            top: 10,
            left: 10,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: selected ? '#F5AF40' : 'rgba(255,250,239,0.95)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: selected ? '1.5px solid #F5AF40' : '1.5px solid rgba(0,75,70,0.25)',
            color: selected ? '#004B46' : 'transparent',
          }}
        >
          {selected && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Match badge */}
        {prop.score != null && (
          <div
            className="absolute inline-flex items-center gap-1 font-body font-bold uppercase"
            style={{
              top: 10,
              right: 10,
              fontSize: 10,
              padding: '4px 9px',
              borderRadius: 999,
              background: topScore ? '#F5AF40' : 'rgba(7,42,36,0.75)',
              color: topScore ? '#004B46' : '#FFFAEF',
              backdropFilter: topScore ? 'none' : 'blur(8px)',
              WebkitBackdropFilter: topScore ? 'none' : 'blur(8px)',
              letterSpacing: '0.04em',
            }}
          >
            <Sparkles size={10} strokeWidth={2} />
            Match {prop.score}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col" style={{ padding: '14px 16px', gap: 8 }}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-heading font-bold text-deepsea truncate"
            style={{ fontSize: 16, lineHeight: 1.15, letterSpacing: '-0.005em' }}
          >
            {prop.title}
          </h3>
          <a
            href={prop.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in nieuwe tab"
            onClick={e => e.stopPropagation()}
            className="shrink-0 flex items-center justify-center transition-colors cursor-pointer"
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border: '1px solid rgba(0,75,70,0.12)',
              color: '#5F7472',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#004B46'
              e.currentTarget.style.color = '#FFFAEF'
              e.currentTarget.style.borderColor = '#004B46'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#5F7472'
              e.currentTarget.style.borderColor = 'rgba(0,75,70,0.12)'
            }}
          >
            <ExternalLink size={13} strokeWidth={1.8} />
          </a>
        </div>

        <div
          className="flex items-center gap-1 font-body"
          style={{ fontSize: 12, color: '#7A8C8B' }}
        >
          <MapPin size={12} strokeWidth={1.8} />
          {prop.location}
        </div>

        <div
          className="font-heading font-bold text-deepsea"
          style={{
            fontSize: prop.price == null ? 14 : 20,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            color: prop.price == null ? '#7A8C8B' : '#004B46',
            fontWeight: prop.price == null ? 400 : 700,
          }}
        >
          {formatPrice(prop.price)}
        </div>

        <div
          className="flex items-center font-body"
          style={{ gap: 14, fontSize: 12, color: '#5F7472' }}
        >
          {prop.bedrooms != null && (
            <span className="inline-flex items-center gap-1">
              <Bed size={12} strokeWidth={1.8} />
              <b style={{ fontWeight: 600, color: '#004B46' }}>{prop.bedrooms}</b>
            </span>
          )}
          {prop.bathrooms != null && (
            <span className="inline-flex items-center gap-1">
              <Bath size={12} strokeWidth={1.8} />
              <b style={{ fontWeight: 600, color: '#004B46' }}>{prop.bathrooms}</b>
            </span>
          )}
          {prop.size_m2 != null && (
            <span className="inline-flex items-center gap-1">
              <Maximize2 size={12} strokeWidth={1.8} />
              <b style={{ fontWeight: 600, color: '#004B46' }}>{prop.size_m2}</b> m²
            </span>
          )}
          {prop.source && (
            <span
              className="ml-auto font-body font-semibold uppercase"
              style={{ fontSize: 10, letterSpacing: '0.1em', opacity: 0.6 }}
            >
              {prop.source}
            </span>
          )}
        </div>

        {prop.motivation && (
          <div
            className="flex items-start gap-2"
            style={{
              marginTop: 2,
              paddingTop: 12,
              borderTop: '1px solid rgba(0,75,70,0.12)',
            }}
          >
            <span
              className="shrink-0 flex items-center justify-center bg-sun-subtle text-sun-dark"
              style={{ width: 18, height: 18, borderRadius: 6, marginTop: 1 }}
            >
              <Sparkles size={11} strokeWidth={2} />
            </span>
            <p
              className="font-body"
              style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5F7472' }}
            >
              {prop.motivation}
            </p>
          </div>
        )}

        {/* Sprint 1: structured reasons */}
        {(prop.reasons_for?.length || prop.reasons_against?.length) ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: prop.reasons_against?.length ? '1fr 1fr' : '1fr',
              gap: 12,
              marginTop: 4,
              paddingTop: 12,
              borderTop: '1px solid rgba(0,75,70,0.08)',
            }}
          >
            {!!prop.reasons_for?.length && (
              <div>
                <div
                  className="font-body"
                  style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#076B5C', marginBottom: 6,
                  }}
                >
                  Sterke punten
                </div>
                <ul style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
                  {prop.reasons_for.map((r, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 12, lineHeight: 1.5, color: '#5F7472',
                        marginBottom: 3,
                      }}
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!prop.reasons_against?.length && (
              <div>
                <div
                  className="font-body"
                  style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#b03434', marginBottom: 6,
                  }}
                >
                  Aandachtspunten
                </div>
                <ul style={{ margin: 0, paddingLeft: 14, listStyle: 'disc' }}>
                  {prop.reasons_against.map((r, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 12, lineHeight: 1.5, color: '#5F7472',
                        marginBottom: 3,
                      }}
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {/* Cross-portal — als woning ook op andere portals staat. Dedupe +
            humanize: upstream levert soms ['idealista', 'idealista', ...,
            'supabase', 'supabase'] uit een grote dedup-cluster; we tonen 'm
            één keer per bron met leesbare naam. */}
        {(() => {
          const SOURCE_LABELS: Record<string, string> = {
            idealista: 'Idealista',
            supabase: 'Costa Select',
            costaselect: 'Costa Select',
            'costa-select': 'Costa Select',
            thinkspain: 'ThinkSpain',
            fotocasa: 'Fotocasa',
          }
          const unique = Array.from(
            new Set((prop.also_on ?? []).filter(Boolean).map(s => s.toLowerCase()))
          )
            .map(s => SOURCE_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1))
          if (unique.length === 0) return null
          return (
            <div
              style={{
                fontSize: 11, color: '#7A8C8B',
                marginTop: 8, paddingTop: 8,
                borderTop: '1px dashed rgba(0,75,70,0.10)',
              }}
            >
              Ook gevonden op: <strong>{unique.join(', ')}</strong>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ───────── Shortlist picker ─────────
function ShortlistPicker({
  customers,
  saving,
  onPick,
  onCreateAndPick,
  onCancel,
}: {
  customers: Customer[]
  saving: boolean
  onPick: (id: string) => void
  onCreateAndPick: (name: string) => Promise<void>
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'list' | 'new'>(customers.length === 0 ? 'new' : 'list')
  const [newName, setNewName] = useState('')

  function submitNew() {
    if (!newName.trim() || saving) return
    onCreateAndPick(newName.trim())
  }

  return (
    <div
      className="wb-anim-picker absolute bg-white overflow-hidden"
      style={{
        right: 32,
        bottom: 'calc(100% + 10px)',
        width: 360,
        borderRadius: 14,
        border: '1px solid rgba(0,75,70,0.24)',
        boxShadow: '0 12px 32px rgba(7,42,36,0.12)',
      }}
    >
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,75,70,0.12)' }}>
        <div
          className="font-body font-bold uppercase text-sun-dark"
          style={{ fontSize: 10, letterSpacing: '0.18em' }}
        >
          Stap 2 van 2
        </div>
        <h4
          className="font-heading font-bold text-deepsea mt-1"
          style={{ fontSize: 16, letterSpacing: '-0.005em' }}
        >
          {mode === 'new' ? 'Nieuwe klant aanmaken.' : 'Kies een klant.'}
        </h4>
      </div>

      {mode === 'new' ? (
        <div style={{ padding: '14px 16px 6px' }}>
          <label
            className="font-body font-bold uppercase text-sun-dark"
            style={{ fontSize: 10, letterSpacing: '0.18em', display: 'block', marginBottom: 6 }}
          >
            Naam van de klant
          </label>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitNew()
              if (e.key === 'Escape') {
                if (customers.length > 0) {
                  setMode('list')
                  setNewName('')
                } else {
                  onCancel()
                }
              }
            }}
            placeholder="bv. Familie Janssen"
            disabled={saving}
            className="font-body w-full outline-none"
            style={{
              padding: '9px 12px',
              fontSize: 13,
              border: '1.5px solid rgba(0,75,70,0.16)',
              borderRadius: 8,
              color: '#004B46',
            }}
          />
          {customers.length > 0 && (
            <button
              onClick={() => {
                setMode('list')
                setNewName('')
              }}
              disabled={saving}
              className="font-body cursor-pointer transition-colors"
              style={{
                marginTop: 8,
                padding: '4px 0',
                fontSize: 11,
                color: '#5F7472',
                background: 'transparent',
                border: 'none',
              }}
            >
              ← Toch een bestaande klant kiezen
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: 280, padding: 6 }}>
          <button
            disabled={saving}
            onClick={() => setMode('new')}
            className="w-full flex items-center gap-3 text-left transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-50"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: 'transparent',
            }}
            onMouseEnter={e => {
              if (!saving) e.currentTarget.style.background = '#FEF6E4'
            }}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              className="shrink-0 flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: '#FEF6E4',
                color: '#D4921A',
              }}
            >
              <UserPlus size={15} strokeWidth={2} />
            </span>
            <span className="flex-1 min-w-0">
              <div
                className="font-body font-semibold text-deepsea"
                style={{ fontSize: 13 }}
              >
                Nieuwe klant aanmaken
              </div>
              <div className="font-body" style={{ fontSize: 11, color: '#7A8C8B' }}>
                Direct toevoegen aan nieuwe shortlist
              </div>
            </span>
            <ChevronRight size={14} strokeWidth={1.8} color="#7A8C8B" className="shrink-0" />
          </button>
          <div style={{ height: 1, background: 'rgba(0,75,70,0.08)', margin: '4px 8px' }} />
          {customers.map(c => (
            <button
              key={c.id}
              disabled={saving}
              onClick={() => onPick(c.id)}
              className="w-full flex items-center gap-3 text-left transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-50"
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'transparent',
              }}
              onMouseEnter={e => {
                if (!saving) e.currentTarget.style.background = '#E6F0EF'
              }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                className="shrink-0 flex items-center justify-center font-body font-bold text-deepsea"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: '#FFE5BD',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                }}
              >
                {initials(c.klant_naam)}
              </span>
              <span className="flex-1 min-w-0">
                <div
                  className="font-body font-semibold text-deepsea truncate"
                  style={{ fontSize: 13 }}
                >
                  {c.klant_naam}
                </div>
                {typeof c.item_count === 'number' && (
                  <div className="font-body" style={{ fontSize: 11, color: '#7A8C8B' }}>
                    {c.item_count} op shortlist
                  </div>
                )}
              </span>
              <ChevronRight size={14} strokeWidth={1.8} color="#7A8C8B" className="shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div
        className="flex justify-end items-center gap-2"
        style={{ padding: '10px 16px', borderTop: '1px solid rgba(0,75,70,0.12)' }}
      >
        <button
          onClick={onCancel}
          disabled={saving}
          className="font-body transition-colors cursor-pointer"
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 12,
            color: '#5F7472',
            background: 'transparent',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E6F0EF')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Annuleren
        </button>
        {mode === 'new' && (
          <button
            onClick={submitNew}
            disabled={saving || !newName.trim()}
            className="inline-flex items-center gap-1.5 font-body font-bold uppercase text-deepsea cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              letterSpacing: '0.06em',
              background: '#F5AF40',
              border: '1.5px solid #F5AF40',
            }}
            onMouseEnter={e => {
              if (!saving && newName.trim()) {
                e.currentTarget.style.background = '#D4921A'
                e.currentTarget.style.borderColor = '#D4921A'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F5AF40'
              e.currentTarget.style.borderColor = '#F5AF40'
            }}
          >
            <Plus size={12} strokeWidth={2.2} /> Aanmaken & toevoegen
          </button>
        )}
      </div>
    </div>
  )
}
