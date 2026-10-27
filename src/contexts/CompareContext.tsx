'use client'

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { COMPARE_LIMIT, COMPARE_STORAGE_KEY, parseCompareIds } from '@/lib/compare'

type ToggleResult = 'added' | 'removed' | 'full'

type CompareContextValue = {
  ids: string[]
  ready: boolean
  count: number
  has: (id: string | number) => boolean
  toggle: (id: string | number) => ToggleResult
  remove: (id: string | number) => void
  clear: () => void
  replace: (ids: string[]) => void
}

const CompareContext = createContext<CompareContextValue | null>(null)

function readStoredIds(): string[] {
  try {
    return parseCompareIds(JSON.parse(window.localStorage.getItem(COMPARE_STORAGE_KEY) || '[]'))
  } catch {
    return []
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const latest = useRef<string[]>([])

  const commit = useCallback((next: string[]) => {
    latest.current = next
    setIds(next)
    try {
      window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    const initial = readStoredIds()
    latest.current = initial
    setIds(initial)
    setReady(true)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== COMPARE_STORAGE_KEY) return
      const next = readStoredIds()
      latest.current = next
      setIds(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback(
    (raw: string | number): ToggleResult => {
      const id = String(raw)
      const current = latest.current
      if (current.includes(id)) {
        commit(current.filter((entry) => entry !== id))
        return 'removed'
      }
      if (current.length >= COMPARE_LIMIT) return 'full'
      commit([...current, id])
      return 'added'
    },
    [commit],
  )

  const remove = useCallback(
    (raw: string | number) => {
      const id = String(raw)
      commit(latest.current.filter((entry) => entry !== id))
    },
    [commit],
  )

  const clear = useCallback(() => commit([]), [commit])

  const replace = useCallback((next: string[]) => commit(parseCompareIds(next)), [commit])

  const has = useCallback((raw: string | number) => ids.includes(String(raw)), [ids])

  const value = useMemo<CompareContextValue>(
    () => ({ ids, ready, count: ids.length, has, toggle, remove, clear, replace }),
    [ids, ready, has, toggle, remove, clear, replace],
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
