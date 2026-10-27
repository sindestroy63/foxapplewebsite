'use client'

import { useEffect, useRef, useState } from 'react'

import { CompareGlyph } from '@/components/CompareGlyph'
import { useCompare } from '@/contexts/CompareContext'
import { COMPARE_LIMIT } from '@/lib/compare'
import { getCatalogGroup, productGroupSlug } from '@/lib/catalog-groups'

type Props = {
  productId: string | number
  productName: string
  productGroup?: string | null
}

export function CompareToggle({ productId, productName, productGroup }: Props) {
  const { has, toggle, ready, group: listGroup } = useCompare()
  const [hint, setHint] = useState<string | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const active = ready && has(productId)
  const label = active ? 'Убрать из сравнения' : 'Добавить в сравнение'

  const showHint = (message: string) => {
    setHint(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setHint(null), 3200)
  }

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const result = toggle(productId, productGroupSlug(productGroup) || 'other')
    if (result === 'full') {
      showHint(`В сравнении уже ${COMPARE_LIMIT} товара`)
    } else if (result === 'group') {
      const current = listGroup ? getCatalogGroup(listGroup)?.label : null
      showHint(current ? `Сравнивать можно товары одной категории: «${current}»` : 'Сравнивать можно товары одной категории')
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
      {hint && (
        <span className="compare-toggle__hint" role="status">
          {hint}
        </span>
      )}
    </button>
  )
}
