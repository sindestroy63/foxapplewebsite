'use client'

import { useEffect, useRef, useState } from 'react'

import { CompareGlyph } from '@/components/CompareGlyph'
import { useCompare } from '@/contexts/CompareContext'
import { COMPARE_LIMIT } from '@/lib/compare'

export function CompareToggle({ productId, productName }: { productId: string | number; productName: string }) {
  const { has, toggle, ready } = useCompare()
  const [full, setFull] = useState(false)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const active = ready && has(productId)
  const label = active ? 'Убрать из сравнения' : 'Добавить в сравнение'

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (toggle(productId) === 'full') {
      setFull(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFull(false), 2600)
    }
  }

  return (
    <button
      type="button"
      className={`compare-toggle${active ? ' compare-toggle--active' : ''}`}
      aria-pressed={active}
      aria-label={`${label}: ${productName}`}
      title={label}
      onClick={onClick}
    >
      <CompareGlyph size={18} />
      {full && (
        <span className="compare-toggle__hint" role="status">
          В сравнении уже {COMPARE_LIMIT} товара
        </span>
      )}
    </button>
  )
}
