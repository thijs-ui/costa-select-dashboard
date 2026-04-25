'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  McCatNav, McGenerateBand, McHero, McOutput, McPanel, McPlatformCards,
  McPromptArea, McToast, McToggles,
  type McVersion,
} from './parts'
import {
  MC_CATEGORIES, MC_LANGUAGES, MC_LENGTHS,
  type McCategory, type McIconName, type McLanguage, type McLength, type McRewriteTarget,
} from '@/lib/marketing-config'

function nowLabel() {
  return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function rid() {
  return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function ContentGenerator({ category }: { category: McCategory }) {
  const [platformId, setPlatformId] = useState(category.platforms[0].id)
  const [language, setLanguage] = useState<McLanguage['id']>('nl')
  const [length, setLength] = useState<McLength['id']>('middel')
  const [prompt, setPrompt] = useState('')
  const [extra, setExtra] = useState('')

  const [versions, setVersions] = useState<McVersion[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRewriting, setIsRewriting] = useState(false)
  const [autoTitle, setAutoTitle] = useState('')

  const [toast, setToast] = useState<{ visible: boolean; message: string; icon: McIconName }>({
    visible: false, message: '', icon: 'check-circle',
  })
  const [copyState, setCopyState] = useState<'idle' | 'success'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'success'>('idle')

  useEffect(() => {
    setPlatformId(category.platforms[0].id)
    setVersions([])
    setActiveIdx(0)
    setPrompt('')
    setExtra('')
    setLength('middel')
    setAutoTitle('')
  }, [category.id, category.platforms])

  const platform = useMemo(
    () => category.platforms.find(p => p.id === platformId) || category.platforms[0],
    [category.platforms, platformId],
  )

  const showToast = useCallback((message: string, icon: McIconName = 'check-circle') => {
    setToast({ visible: true, message, icon })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 1900)
  }, [])

  const pushVersion = useCallback((text: string, opts: Partial<McVersion> = {}) => {
    setVersions(prev => {
      const v: McVersion = {
        id: rid(),
        text,
        platformLabel: opts.platformLabel || platform.label,
        language: opts.language || language,
        lengthLabel: category.showLengthSelector ? (opts.lengthLabel || length) : null,
        maxChars: opts.maxChars !== undefined ? opts.maxChars : (platform.maxChars ?? null),
        favorite: false,
        timeLabel: nowLabel(),
      }
      const next = [...prev, v]
      while (next.length > 3) next.shift()
      setActiveIdx(next.length - 1)
      return next
    })
  }, [platform, language, length, category])

  const canGenerate = prompt.trim().length > 4 && !isGenerating

  const generate = useCallback(async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.apiCategory,
          subcategory: platform.apiSubcategory,
          language,
          prompt: prompt.trim(),
          extra_context: extra.trim() || undefined,
          content_type_instructions: platform.promptInstructions,
          ...(category.showLengthSelector ? { length } : {}),
        }),
      })
      if (res.ok) {
        const { content, title } = await res.json()
        if (title) setAutoTitle(title)
        pushVersion(content)
      } else {
        showToast('Genereren mislukt', 'rotate')
      }
    } catch {
      showToast('Genereren mislukt', 'rotate')
    } finally {
      setIsGenerating(false)
    }
  }, [canGenerate, category, platform, language, length, prompt, extra, pushVersion, showToast])

  const onEditText = useCallback((idx: number, newText: string) => {
    setVersions(prev => prev.map((v, i) => (i === idx ? { ...v, text: newText } : v)))
  }, [])

  const onCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
    setCopyState('success')
    showToast('Tekst gekopieerd naar klembord', 'copy')
    setTimeout(() => setCopyState('idle'), 1700)
  }, [showToast])

  const onSave = useCallback(async (idx: number, favorite = false) => {
    const v = versions[idx]
    if (!v) return
    const title = autoTitle || prompt.trim().slice(0, 80) || 'Zonder titel'
    try {
      const res = await fetch('/api/marketing/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.apiCategory,
          subcategory: platform.apiSubcategory,
          language: v.language,
          title,
          prompt_used: prompt,
          content: v.text,
          is_favorite: favorite,
        }),
      })
      if (!res.ok) throw new Error('save failed')
      setSaveState('success')
      showToast('Opgeslagen in bibliotheek', 'save')
      setTimeout(() => setSaveState('idle'), 1700)
    } catch {
      showToast('Opslaan mislukt', 'save')
    }
  }, [versions, autoTitle, prompt, category, platform, showToast])

  const onToggleFav = useCallback((idx: number) => {
    const v = versions[idx]
    if (!v) return
    setVersions(prev => prev.map((vv, i) => (i === idx ? { ...vv, favorite: !vv.favorite } : vv)))
    if (!v.favorite) {
      void onSave(idx, true)
    } else {
      showToast('Favoriet uit', 'star')
    }
  }, [versions, onSave, showToast])

  const onRewrite = useCallback(async (idx: number, target: McRewriteTarget) => {
    const src = versions[idx]
    if (!src) return
    setIsRewriting(true)
    try {
      const res = await fetch('/api/marketing/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: src.text,
          sourcePlatform: platform.apiSubcategory,
          targetPlatform: target.id,
        }),
      })
      if (res.ok) {
        const { content } = await res.json()
        pushVersion(content, {
          platformLabel: target.label,
          language: src.language,
          maxChars: null,
        })
        showToast(`Herschreven voor ${target.label}`, 'wand-rewrite')
      } else {
        showToast('Herschrijven mislukt', 'wand-rewrite')
      }
    } catch {
      showToast('Herschrijven mislukt', 'wand-rewrite')
    } finally {
      setIsRewriting(false)
    }
  }, [versions, platform, pushVersion, showToast])

  return (
    <div className="mc-page">
      <div className="mc-shell">
        <McCatNav categories={MC_CATEGORIES} activeId={category.id} />
        <McHero category={category} />

        <div className="mc-grid">
          <div className="mc-col-input">
            <McPanel step={1} title="Kies platform" meta={`${category.platforms.length} opties`}>
              <McPlatformCards
                platforms={category.platforms}
                value={platformId}
                onChange={setPlatformId}
              />
            </McPanel>

            <McPanel step={2} title={category.showLengthSelector ? 'Taal & lengte' : 'Taal'}>
              <McToggles
                language={language} onLanguage={setLanguage}
                length={length} onLength={setLength}
                showLength={category.showLengthSelector}
              />
            </McPanel>

            <McPanel step={3} title="Briefing">
              <McPromptArea
                prompt={prompt} onPrompt={setPrompt}
                extra={extra} onExtra={setExtra}
                placeholder={category.promptPlaceholder}
              />
            </McPanel>

            <McGenerateBand
              platform={platform}
              language={language}
              length={length}
              showLength={category.showLengthSelector}
              onGenerate={generate}
              isLoading={isGenerating}
              canGenerate={canGenerate}
            />
          </div>

          <div className="mc-col-output">
            <McOutput
              versions={versions}
              activeIdx={activeIdx}
              onPickVersion={setActiveIdx}
              onEditText={onEditText}
              isGenerating={isGenerating}
              generatingPlatformLabel={platform.label}
              onCopy={onCopy}
              onRegenerate={generate}
              onSave={(i) => onSave(i, false)}
              onToggleFav={onToggleFav}
              onRewrite={onRewrite}
              isRewriting={isRewriting}
              copyState={copyState}
              saveState={saveState}
            />
          </div>
        </div>

        <McToast message={toast.message} visible={toast.visible} icon={toast.icon} />
      </div>
    </div>
  )
}

// Re-export for usage convenience.
export { MC_LANGUAGES, MC_LENGTHS }
