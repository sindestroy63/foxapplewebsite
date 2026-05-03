import type { Metadata } from 'next'
import Link from 'next/link'

import { getCategories } from '@/lib/cms'
import { getMediaUrl } from '@/lib/media'
import type { Media } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Каталог техники',
  description: 'Актуальный каталог FOX APPLE: iPhone, iPad, MacBook, AirPods, Apple Watch, PlayStation и аксессуары.',
  openGraph: {
    title: 'Каталог техники FOX APPLE',
    description: 'Проверяйте цены и наличие техники Apple в Самаре.',
  },
}

export default async function CatalogPage() {
  const categories = await getCategories()

  return (
    <section className="page-section">
      <div className="container catalog-categories-page">
        <nav className="breadcrumbs" aria-label="Навигация">
          <a href="/">Главная</a>
          <span className="breadcrumbs-sep">›</span>
          <span>Каталог</span>
        </nav>

        <h1 className="catalog-category-title">Каталог техники</h1>
        <p className="catalog-category-subtitle">Выберите категорию, чтобы подобрать модель и конфигурацию.</p>

        <div className="catalog-cat-grid">
          {categories.map((category) => {
            const cover = category.coverImage && typeof category.coverImage === 'object' && 'id' in category.coverImage
              ? category.coverImage as Media
              : null
            const coverUrl = cover ? getMediaUrl(cover, 'card') : null
            return (
              <Link
                className="catalog-cat-card"
                href={`/catalog/${category.slug}`}
                key={category.id}
              >
                {coverUrl && (
                  <div className="catalog-cat-card-img">
                    <img src={coverUrl} alt={category.name} />
                  </div>
                )}
                <span className="catalog-cat-card-name">{category.name}</span>
                <span className="catalog-cat-card-arrow">&rarr;</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
