import type { Metadata } from 'next'
import Link from 'next/link'

import { getBrandCatalogNavigation, getGroupNavData, getProducts, getProductsByProductGroup, readCatalogParams } from '@/lib/cms'
import { CatalogGroupCard } from '@/components/CatalogGroupCard'
import { CategoryCatalogClient } from '@/components/CategoryCatalogClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Каталог техники',
  description: 'Актуальный каталог ФОХСТОР: iPhone, iPad, MacBook, AirPods, Apple Watch, PlayStation и аксессуары.',
  alternates: {
    canonical: '/catalog',
  },
  openGraph: {
    title: 'Каталог техники ФОХСТОР',
    description: 'Проверяйте цены и наличие техники Apple в Самаре.',
  },
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams
  const filters = readCatalogParams(query)
  const groupSlug = filters.productGroup
  if (groupSlug) {
    const [{ group, products }, groupNavigation] = await Promise.all([
      getProductsByProductGroup(groupSlug, filters),
      getGroupNavData(),
    ])
    const { default: GroupCatalogPage } = await import('@/components/GroupCatalogPage')
    return <GroupCatalogPage group={group!} products={products} brands={groupNavigation.find((item) => item.slug === groupSlug)?.brands} />
  }
  if (filters.brand || filters.line || filters.query) {
    const products = await getProducts({ filters })
    const title = filters.line || filters.brand || 'Каталог'
    return <section className="page-section"><div className="container"><CategoryCatalogClient categoryName={title} categorySlug="other" products={products} phone="+7 (917) 954-64-64" /></div></section>
  }
  const brandNavigation = await getBrandCatalogNavigation()
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
          {brandNavigation.map((group) => (
            <CatalogGroupCard key={group.key} slug={group.key} label={group.title} href={group.href} coverImage={group.coverImage || null} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
