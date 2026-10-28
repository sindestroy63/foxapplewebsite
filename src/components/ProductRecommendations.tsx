'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ImageWithFallback } from '@/components/ImageWithFallback'
import { formatPrice, statusLabel, statusTone } from '@/lib/format'
import { isPlayStation5Console, type RecommendedProduct } from '@/lib/product-recommendations'
import type { Product } from '@/lib/types'

export function ProductRecommendations({ product }: { product: Product }) {
  const eligible = isPlayStation5Console(product)
  const [result, setResult] = useState<{ id: string; items: RecommendedProduct[] } | null>(null)
  const id = String(product.id)

  useEffect(() => {
    if (!eligible) return
    const controller = new AbortController()
    fetch(`/api/product-recommendations?productId=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load recommendations')
        return response.json() as Promise<RecommendedProduct[]>
      })
      .then((items) => setResult({ id, items }))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setResult({ id, items: [] })
      })
    return () => controller.abort()
  }, [id, eligible])

  if (!eligible || result?.id !== id || !result.items.length) return null

  return (
    <section className="product-recommendations" aria-label="Рекомендуем к покупке">
      <h2>Рекомендуем к покупке</h2>
      <div className="product-recommendations__list" tabIndex={0} aria-label="Аксессуары для PlayStation 5">
        {result.items.map((item) => (
          <article className="recommendation-card" key={item.id}>
            <Link href={item.href} className="recommendation-card__image" aria-label={item.name}>
              {item.image && <ImageWithFallback src={item.image} alt={item.imageAlt} loading="lazy" />}
            </Link>
            <Link href={item.href} className="recommendation-card__name">{item.name}</Link>
            <strong>{formatPrice(item.price)}</strong>
            <span className={`status ${statusTone(item.status)}`}>{statusLabel(item.status)}</span>
            <Link href={item.href} className="button small">Выбрать</Link>
          </article>
        ))}
      </div>
    </section>
  )
}
