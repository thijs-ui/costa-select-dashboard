'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LS_KEYS,
  type Bookmarks,
  type LastActivity,
  type NotesMap,
  type WatchedMap,
} from './data'

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode */
  }
}

export function useTrainingState() {
  const [watchedMap, setWatchedMap] = useState<WatchedMap>({})
  const [bookmarks, setBookmarks] = useState<Bookmarks>({})
  const [notesMap, setNotesMap] = useState<NotesMap>({})
  const [skipped, setSkipped] = useState<boolean>(false)
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWatchedMap(loadJSON<WatchedMap>(LS_KEYS.watched, {}))
    setBookmarks(loadJSON<Bookmarks>(LS_KEYS.bookmarks, {}))
    setNotesMap(loadJSON<NotesMap>(LS_KEYS.notes, {}))
    setSkipped(loadJSON<boolean>(LS_KEYS.skipped, false))
    setLastActivity(loadJSON<LastActivity | null>(LS_KEYS.lastActivity, null))
    setHydrated(true)
  }, [])

  useEffect(() => { if (hydrated) saveJSON(LS_KEYS.watched, watchedMap) }, [watchedMap, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS_KEYS.bookmarks, bookmarks) }, [bookmarks, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS_KEYS.notes, notesMap) }, [notesMap, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS_KEYS.skipped, skipped) }, [skipped, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS_KEYS.lastActivity, lastActivity) }, [lastActivity, hydrated])

  const toggleWatched = useCallback((id: string, durationSeconds?: number) => {
    setWatchedMap(prev => {
      const cur = prev[id]
      const next = { ...prev }
      if (cur?.watched) {
        next[id] = { ...cur, watched: false }
      } else {
        next[id] = {
          watched: true,
          progress: durationSeconds ?? cur?.progress ?? 0,
          ts: new Date().toISOString().slice(0, 10),
        }
      }
      return next
    })
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const setNotesFor = useCallback((videoId: string, text: string) => {
    setNotesMap(prev => ({ ...prev, [videoId]: text }))
  }, [])

  const recordActivity = useCallback((entry: LastActivity) => {
    setLastActivity(entry)
  }, [])

  const skipOnboarding = useCallback(() => setSkipped(true), [])
  const unskipOnboarding = useCallback(() => setSkipped(false), [])

  return {
    hydrated,
    watchedMap,
    bookmarks,
    notesMap,
    skipped,
    lastActivity,
    toggleWatched,
    toggleBookmark,
    setNotesFor,
    recordActivity,
    skipOnboarding,
    unskipOnboarding,
  }
}
