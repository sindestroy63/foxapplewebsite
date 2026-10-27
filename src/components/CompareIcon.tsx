'use client'

import Link from 'next/link'

import { CompareGlyph } from '@/components/CompareGlyph'
import { useCompare } from '@/contexts/CompareContext'

export function CompareIcon() {
  const { count } = useCompare()

  return (
    <Link href="/compare" className="cart-icon-link compare-icon-link" aria-label={`Сравнение, ${count} товаров`} title="Сравнение товаров">
      <CompareGlyph />
      {count > 0 && <span className="cart-icon-badge">{count}</span>}
    </Link>
  )
}
