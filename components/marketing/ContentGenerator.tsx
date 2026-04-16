'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Loader2, Copy, RefreshCw, Star, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'

interface PlatformOption {
  key: string
  label: string
  instructions: string
  maxChars?: number
}

interface Props {
  category: string
  platforms: PlatformOption[]
  placeholder?: string
  extraFields?: React.ReactNode
  showLengthSelector?: boolean
}

export default function ContentGenerator({ category, platforms, placeholder, extraFields, showLengthSelector }: Props) {
  const { user } = useAuth()
  const supabase = createClient()

  const [platform, setPlatform] = useState(platforms[0]?.key ?? '')
  const [language, setLanguage] = useState<'nl' | 'en' | 'es'>('nl')
  const [lengthOpt, setLengthOpt] = useState<'kort' | 'middel' | 'lang'>('middel')
  const [prompt, setPrompt] = useState('')
  const [extraContext, setExtraContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [versions, setVersions] = useState<string[]>([])
  const [editIndex, setEditIndex] = useState(0)
  const [editContent, setEditContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const selectedPlatform = platforms.find(p => p.key === platform)

  async function generate() {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subcategory: platform,
          language,
          prompt: prompt.trim(),
          extra_context: extraContext.trim() || undefined,
          content_type_instructions: selectedPlatform?.instructions || '',
          ...(showLengthSelector ? { length: lengthOpt } : {}),
        }),
      })
      if (res.ok) {
        const { content } = await res.json()
        if (versions.length === 0) {
          setVersions([content])
          setEditContent(content)
          setEditIndex(0)
        } else if (versions.length < 3) {
          setVersions([...versions, content])
          setEditContent(content)
          setEditIndex(versions.length)
        } else {
          setVersions([...versions.slice(1), content])
          setEditContent(content)
          setEditIndex(2)
        }
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(editContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const [saveError, setSaveError] = useState('')

  async function saveToLibrary(favorite = false) {
    setSaveError('')
    const title = prompt.trim().substring(0, 80) || 'Zonder titel'
    try {
      const res = await fetch('/api/marketing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subcategory: platform,
          language,
          title,
          prompt_used: prompt,
          content: editContent,
          is_favorite: favorite,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Opslaan mislukt') }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Opslaan mislukt')
      setTimeout(() => setSaveError(''), 4000)
    }
  }

  const charCount = editContent.length
  const maxChars = selectedPlatform?.maxChars

  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {platforms.map(p => (
          <button key={p.key} onClick={() => setPlatform(p.key)}
            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
              platform === p.key ? 'border-[#004B46] bg-[#004B46]/5' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
            <span className={`text-sm font-semibold ${platform === p.key ? 'text-[#004B46]' : 'text-gray-700'}`}>{p.label}</span>
            {p.maxChars && <span className="text-[10px] text-gray-400 block">max {p.maxChars} tekens</span>}
          </button>
        ))}
      </div>

      {/* Taal + Lengte selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">Taal</div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {(['nl', 'en', 'es'] as const).map(l => (
              <button key={l} onClick={() => setLanguage(l)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  language === l ? 'bg-white text-[#004B46] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {showLengthSelector && platform !== 'google_ads' && (
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">Lengte</div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              {(['kort', 'middel', 'lang'] as const).map(l => (
                <button key={l} onClick={() => setLengthOpt(l)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer capitalize ${
                    lengthOpt === l ? 'bg-white text-[#004B46] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {extraFields}

      {/* Prompt invoer */}
      <div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          placeholder={placeholder || 'Waar moet de content over gaan?'}
          rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-none" />
      </div>

      <div>
        <textarea value={extraContext} onChange={e => setExtraContext(e.target.value)}
          placeholder="Extra instructies (optioneel)..."
          rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004B46] focus:ring-1 focus:ring-[#004B46]/20 resize-none text-gray-500" />
      </div>

      <button onClick={generate} disabled={generating || !prompt.trim()}
        className="bg-[#004B46] text-[#FFFAEF] font-semibold px-6 py-3 rounded-xl hover:bg-[#0A6B63] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm">
        {generating ? <><Loader2 size={16} className="animate-spin" /> Content wordt gegenereerd...</> : 'Genereer content'}
      </button>

      {/* Output */}
      {versions.length > 0 && (
        <div className="space-y-4">
          {/* Versie tabs */}
          {versions.length > 1 && (
            <div className="flex gap-1">
              {versions.map((_, i) => (
                <button key={i} onClick={() => { setEditIndex(i); setEditContent(versions[i]) }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    editIndex === i ? 'bg-[#004B46] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  Versie {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] bg-[#004B46]/10 text-[#004B46] px-2 py-0.5 rounded font-semibold">{language.toUpperCase()}</span>
              <span className={`text-[10px] tabular-nums ${maxChars && charCount > maxChars ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {charCount}{maxChars ? ` / ${maxChars}` : ''} tekens
              </span>
            </div>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              rows={12} className="w-full px-4 py-3 text-sm text-gray-800 leading-relaxed focus:outline-none resize-y border-none" />
          </div>

          {/* Acties */}
          <div className="flex items-center gap-2">
            <button onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#004B46] text-white text-sm font-medium rounded-xl hover:bg-[#0A6B63] cursor-pointer">
              {copied ? <><Check size={14} /> Gekopieerd!</> : <><Copy size={14} /> Kopiëren</>}
            </button>
            <button onClick={generate} disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer disabled:opacity-50">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Opnieuw genereren
            </button>
            <button onClick={() => saveToLibrary(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 cursor-pointer">
              {saved ? <><Check size={14} /> Opgeslagen!</> : 'Opslaan'}
            </button>
            <button onClick={() => saveToLibrary(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[#F5AF40] hover:text-[#E09B20] cursor-pointer">
              <Star size={16} fill="currentColor" />
            </button>
            {saveError && <span className="text-xs text-red-500 ml-2">{saveError}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
