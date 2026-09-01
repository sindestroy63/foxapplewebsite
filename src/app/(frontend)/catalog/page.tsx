import type { Metadata } from 'next'
import Link from 'next/link'

import { getCatalogRootGroups, getGroupNavData, getProductsByProductGroup, readCatalogParams } from '@/lib/cms'
import { CatalogGroupCard } from '@/components/CatalogGroupCard'

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
  const groupSlug = readCatalogParams(query).productGroup
  if (groupSlug) {
    const [{ group, products }, groupNavigation] = await Promise.all([
      getProductsByProductGroup(groupSlug, readCatalogParams(query)),
      getGroupNavData(),
    ])
    const { default: GroupCatalogPage } = await import('@/components/GroupCatalogPage')
    return <GroupCatalogPage group={group!} products={products} brands={groupNavigation.find((item) => item.slug === groupSlug)?.brands} />
  }
  const rootGroups = await getCatalogRootGroups()
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
          {rootGroups.map((group) => (
            <CatalogGroupCard key={group.slug} slug={group.slug} label={group.label} coverImage={group.coverImage} href={group.slug === 'trade-in' ? '/trade-in/catalog' : undefined} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
