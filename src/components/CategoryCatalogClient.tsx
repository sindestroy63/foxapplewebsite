'use client'

import { useState } from 'react'
import type { Product } from '@/lib/types'
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

type Props = {
  categoryName: string
  categorySlug: string
  products: Product[]
  phone: string
  telegramUsername?: string
}

export function CategoryCatalogClient({ categoryName, categorySlug, products, phone, telegramUsername }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedProduct = products[selectedIndex] || null

  if (!products.length) {
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

      {products.length > 1 && (
        <div className="model-tabs">
          {products.map((product, idx) => (
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
            key={selectedProduct.id}
            product={selectedProduct}
            phone={phone}
            telegramUsername={telegramUsername}
          />
        </div>
      </div>
    </div>
  )
}
