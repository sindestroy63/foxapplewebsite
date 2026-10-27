'use client'

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { COMPARE_STORAGE_KEY, parseCompareEntries, toggleCompareEntry, type CompareEntry, type CompareToggleResult } from '@/lib/compare'

type CompareContextValue = {
  ids: string[]
  group: string | null
  ready: boolean
  count: number
  has: (id: string | number) => boolean
  toggle: (id: string | number, group: string) => CompareToggleResult
  remove: (id: string | number) => void
  clear: () => void
  retain: (ids: string[]) => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

function readStoredEntries(): CompareEntry[] {
  try {
    return parseCompareEntries(JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<CompareEntry[]>([])
  const [ready, setReady] = useState(false)
  const latest = useRef<CompareEntry[]>([])

  const commit = useCallback((next: CompareEntry[]) => {
    latest.current = next
    setEntries(next)
    try {
      window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    const initial = readStoredEntries()
    latest.current = initial
    setEntries(initial)
    setReady(true)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== COMPARE_STORAGE_KEY) return
      const next = readStoredEntries()
      latest.current = next
      setEntries(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback(
    (raw: string | number, group: string): CompareToggleResult => {
      const { entries: next, result } = toggleCompareEntry(latest.current, { id: String(raw), group })
      if (next !== latest.current) commit(next)
      return result
    },
    [commit],
  )

  const remove = useCallback(
    (raw: string | number) => {
      const id = String(raw)
      commit(latest.current.filter((entry) => entry.id !== id))
    },
    [commit],
  )

  const clear = useCallback(() => commit([]), [commit])

  const retain = useCallback(
    (ids: string[]) => commit(latest.current.filter((entry) => ids.includes(entry.id))),
    [commit],
  )

  const ids = useMemo(() => entries.map((entry) => entry.id), [entries])
  const group = entries.length > 0 ? entries[0].group : null

  const has = useCallback((raw: string | number) => ids.includes(String(raw)), [ids])

  const value = useMemo<CompareContextValue>(
    () => ({ ids, group, ready, count: ids.length, has, toggle, remove, clear, retain }),
    [ids, group, ready, has, toggle, remove, clear, retain],
  )

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext)
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider')
  }
  return context
}
