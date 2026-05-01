'use client'

import { useState, useMemo } from 'react'
import type { Product, ProductVariant } from '@/lib/types'
import { ProductDetailClient } from './ProductDetailClient'

const CATEGORY_SUBTITLES: Record<string, string> = {
  iphone: 'Изысканные технологии в каждой детали.',
  ipad: 'Совершенство технологий и изысканный дизайн.',
  macbook: 'Невероятная производительность.',
  airpods: 'Инновационный звук.',
  'apple-watch': 'Стиль и технологии на вашем запястье.',
  playstation: 'Игровые консоли нового поколения.',
  accessories: 'Аксессуары для вашей техники.',
  used: 'Проверенная техника с гарантией.',
}

const INCH_RE = /\d{1,2}(?:\.\d)?\s*["″"''ʺ]/

function extractScreenSize(name: string): string | null {
  const m = name.match(/(\d{1,2}(?:\.\d)?)\s*["″"''ʺ]/)
  return m ? m[1] + '"' : null
}

function stripScreenSize(name: string): string {
  return name.replace(/\s*\d{1,2}(?:\.\d)?\s*["″"''ʺ]\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

function mergeByScreenSize(products: Product[]): Product[] {
  const groups = new Map<string, Product[]>()

  for (const p of products) {
    const model = p.model || p.name
    const key = INCH_RE.test(model) ? stripScreenSize(model) : model
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const result: Product[] = []
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push(group[0])
      continue
    }

    const base: Product = { ...group[0] }
    base.model = stripScreenSize(base.model || base.name)

    const allVariants: ProductVariant[] = []
    for (const p of group) {
      const sz = extractScreenSize(p.model || p.name)
      const pvs = p.variants || []
      if (pvs.length > 0) {
        for (const v of pvs) {
          allVariants.push({ ...v, screenSize: v.screenSize || sz || undefined })
        }
      } else {
        allVariants.push({
          price: p.price,
          status: p.status,
          isAvailable: p.isAvailable,
          memory: p.memory,
          screenSize: sz || undefined,
          images: p.images,
        })
      }
    }

    base.variants = allVariants
    base.colorImages = group.flatMap((p) => p.colorImages || [])
    base.price = Math.min(...allVariants.map((v) => v.price))
    result.push(base)
  }

  return result
}

type Props = {
  categoryName: string
  categorySlug: string
  products: Product[]
  phone: string
  telegramUsername?: string
  initialModelSlug?: string
}

export function CategoryCatalogClient({ categoryName, categorySlug, products, phone, telegramUsername, initialModelSlug }: Props) {
  const merged = useMemo(() => mergeByScreenSize(products), [products])

  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (initialModelSlug) {
      const idxDirect = merged.findIndex((p) => p.slug === initialModelSlug)
      if (idxDirect >= 0) return idxDirect
      const idxOriginal = products.findIndex((p) => p.slug === initialModelSlug)
      if (idxOriginal >= 0) {
        const origModel = products[idxOriginal].model || products[idxOriginal].name
        const base = INCH_RE.test(origModel) ? stripScreenSize(origModel) : origModel
        const idxMerged = merged.findIndex((p) => (p.model || p.name) === base)
        if (idxMerged >= 0) return idxMerged
      }
    }
    return 0
  })

  const selectedProduct = merged[selectedIndex] || null

  if (!merged.length) {
    return <div className="empty-state">Товары не найдены. Напишите в Telegram, и сотрудник проверит наличие.</div>
  }

  return (
    <div className="catalog-category">
      <nav className="breadcrumbs" aria-label="Навигация">
        <a href="/">Главная</a>
        <span className="breadcrumbs-sep">›</span>
        <a href="/catalog">Каталог</a>
        <span className="breadcrumbs-sep">›</span>
        <span>{categoryName}</span>
      </nav>

      <h1 className="catalog-category-title">{categoryName}</h1>
      {CATEGORY_SUBTITLES[categorySlug] && (
        <p className="catalog-category-subtitle">{CATEGORY_SUBTITLES[categorySlug]}</p>
      )}

      {merged.length > 1 && (
        <div className="model-tabs">
          {merged.map((product, idx) => (
            <button
              key={product.id}
              type="button"
              className={`model-tab${idx === selectedIndex ? ' model-tab--active' : ''}`}
              onClick={() => setSelectedIndex(idx)}
            >
              {product.model || product.name}
            </button>
          ))}
        </div>
      )}

      <div className="catalog-product-card">
        <div className="product-detail">
          <ProductDetailClient
            key={`${selectedProduct.id}-${selectedIndex}`}
            product={selectedProduct}
            phone={phone}
            telegramUsername={telegramUsername}
          />
        </div>
      </div>
    </div>
  )
}
