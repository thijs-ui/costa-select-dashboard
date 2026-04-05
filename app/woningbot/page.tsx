'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Loader2, ExternalLink, Bed, Bath, Maximize2, Plus, Clock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'

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
}

interface ChatMessage {
  role: 'user' | 'bot'
  content: string
  properties?: Property[]
  stats?: { total_found: number; after_filter: number; selected: number }
}

interface SavedChat {
  id: string
  session_id: string
  title: string
  messages: ChatMessage[]
  updated_at: string
}

function formatPrice(price: number | null): string {
  if (!price) return '—'
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price)
}

function chatTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'Nieuwe chat'
  const text = firstUser.content
  return text.length > 50 ? text.substring(0, 50) + '...' : text
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Zojuist'
  if (mins < 60) return `${mins}m geleden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Gisteren'
  return `${days}d geleden`
}

export default function WoningbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [savedChats, setSavedChats] = useState<SavedChat[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const supabase = createClient()

  // Load chat history
  const loadChats = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('web_chats')
      .select('id, session_id, title, messages, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30)
    if (data) setSavedChats(data)
  }, [user, supabase])

  useEffect(() => {
    loadChats()
  }, [loadChats])

  // Save chat to Supabase after each bot response
  async function saveChat(msgs: ChatMessage[], sid: string | null, cid: string | null) {
    if (!user || msgs.length === 0) return

    const title = chatTitle(msgs)

    if (cid) {
      await supabase
        .from('web_chats')
        .update({ messages: msgs, title, session_id: sid || '', updated_at: new Date().toISOString() })
        .eq('id', cid)
    } else {
      const { data } = await supabase
        .from('web_chats')
        .insert({ user_id: user.id, session_id: sid || '', title, messages: msgs })
        .select('id')
        .single()
      if (data) setChatId(data.id)
    }

    loadChats()
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/woningbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId }),
      })

      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)

      const botMessage: ChatMessage = {
        role: 'bot',
        content: data.response || 'Geen antwoord ontvangen.',
        properties: data.properties,
        stats: data.stats,
      }

      const updatedMessages = [...newMessages, botMessage]
      setMessages(updatedMessages)

      // Save to Supabase
      await saveChat(updatedMessages, data.sessionId || sessionId, chatId)
    } catch {
      const errorMessages = [...newMessages, {
        role: 'bot' as const,
        content: 'Er ging iets mis met de verbinding naar de woningbot. Probeer het opnieuw.',
      }]
      setMessages(errorMessages)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function startNewChat() {
    setSessionId(null)
    setChatId(null)
    setMessages([])
    setShowHistory(false)
    inputRef.current?.focus()
  }

  function loadChat(chat: SavedChat) {
    setMessages(chat.messages)
    setSessionId(chat.session_id)
    setChatId(chat.id)
    setShowHistory(false)
  }

  async function deleteChat(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await supabase.from('web_chats').delete().eq('id', id)
    if (chatId === id) startNewChat()
    loadChats()
  }

  return (
    <div className="flex flex-col px-8 py-8" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#004B46]">Woningbot</h1>
          <p className="text-sm text-gray-500 mt-1">Zoek en vergelijk woningen met AI</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{
              backgroundColor: showHistory ? '#004B46' : '#F5F5F5',
              color: showHistory ? '#FFFFFF' : '#7A8C8B',
            }}
          >
            <Clock size={12} />
            Geschiedenis
            {savedChats.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: showHistory ? 'rgba(255,255,255,0.2)' : '#E5E7EB',
                  color: showHistory ? '#FFFFFF' : '#7A8C8B',
                }}
              >
                {savedChats.length}
              </span>
            )}
          </button>
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ backgroundColor: '#0EAE96', color: '#FFFFFF' }}
          >
            <Plus size={12} />
            Nieuwe chat
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="mb-4 bg-white rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
          {savedChats.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs" style={{ color: '#7A8C8B' }}>Nog geen eerdere chats</p>
            </div>
          ) : (
            savedChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer group"
                style={{
                  borderBottom: '1px solid #F5F5F5',
                  backgroundColor: chatId === chat.id ? '#F9FAFB' : 'transparent',
                }}
              >
                <MessageSquare size={14} style={{ color: '#7A8C8B' }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#004B46' }}>
                    {chat.title}
                  </p>
                  <p className="text-[10px]" style={{ color: '#7A8C8B' }}>
                    {timeAgo(chat.updated_at)} · {chat.messages.length} berichten
                  </p>
                </div>
                <button
                  onClick={(e) => deleteChat(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all cursor-pointer"
                >
                  <Trash2 size={12} style={{ color: '#EF4444' }} />
                </button>
              </button>
            ))
          )}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && !showHistory && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare size={48} style={{ color: '#E5E7EB' }} className="mb-4" />
            <p className="text-sm font-medium mb-2" style={{ color: '#004B46' }}>
              Wat zoek je?
            </p>
            <p className="text-xs max-w-md" style={{ color: '#7A8C8B' }}>
              Beschrijf wat je zoekt, bijvoorbeeld: &quot;Villa in Estepona, budget 500k-800k, 3 slaapkamers, zwembad, zeezicht&quot;
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {[
                'Appartement Costa del Sol, 2 slpk, max 300k',
                'Villa Marbella, 4 slpk, zwembad, 1M+',
                'Nieuwbouw Costa Blanca, 2 slpk, zeezicht',
                'Prijzen Marbella',
                'Buurt Jávea',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                  className="text-xs px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: '#004B4608', color: '#004B46' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap"
                style={{
                  backgroundColor: msg.role === 'user' ? '#004B46' : '#FFFFFF',
                  color: msg.role === 'user' ? '#FFFFFF' : '#004B46',
                  border: msg.role === 'bot' ? '1px solid #F0F0F0' : 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}
              >
                {msg.content}
              </div>
            </div>

            {msg.stats && (
              <div className="flex gap-3 mt-2 ml-1">
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#F5F5F5', color: '#7A8C8B' }}>
                  {msg.stats.total_found} gevonden
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#F5F5F5', color: '#7A8C8B' }}>
                  {msg.stats.after_filter} na filter
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: '#0EAE9615', color: '#0EAE96' }}>
                  {msg.stats.selected} geselecteerd
                </span>
              </div>
            )}

            {msg.properties && msg.properties.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {msg.properties.map((prop, j) => (
                  <a
                    key={j}
                    href={prop.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    {prop.thumbnail && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={prop.thumbnail}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-medium truncate" style={{ color: '#004B46' }}>
                          {prop.title}
                        </h3>
                        <ExternalLink size={12} className="shrink-0 mt-0.5" style={{ color: '#7A8C8B' }} />
                      </div>
                      <p className="text-xs mb-2" style={{ color: '#7A8C8B' }}>{prop.location}</p>
                      <p className="text-sm font-semibold mb-2" style={{ color: '#0EAE96' }}>
                        {formatPrice(prop.price)}
                      </p>
                      <div className="flex gap-3 text-[11px]" style={{ color: '#7A8C8B' }}>
                        {prop.bedrooms && (
                          <span className="flex items-center gap-1"><Bed size={11} /> {prop.bedrooms}</span>
                        )}
                        {prop.bathrooms && (
                          <span className="flex items-center gap-1"><Bath size={11} /> {prop.bathrooms}</span>
                        )}
                        {prop.size_m2 && (
                          <span className="flex items-center gap-1"><Maximize2 size={11} /> {prop.size_m2}m²</span>
                        )}
                        <span className="ml-auto opacity-60">{prop.source}</span>
                      </div>
                      {prop.motivation && (
                        <p className="text-[11px] mt-2 pt-2" style={{ color: '#7A8C8B', borderTop: '1px solid #F0F0F0' }}>
                          {prop.motivation}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #F0F0F0', color: '#7A8C8B' }}
            >
              <Loader2 size={14} className="animate-spin" />
              Zoeken kan 30-60 seconden duren...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={sessionId ? 'Verfijn je zoekopdracht...' : 'Beschrijf wat je zoekt...'}
          disabled={loading}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-300 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body, sans-serif)' }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl text-white disabled:opacity-50 transition-colors cursor-pointer"
          style={{ backgroundColor: '#004B46' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
