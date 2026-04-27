import type { Metadata } from 'next'

import { CatalogControls } from '@/components/CatalogControls'
import { ProductGrid } from '@/components/ProductGrid'
import { buildCatalogFacets, getCategories, getProducts, getSiteSettings, readCatalogParams } from '@/lib/cms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Каталог техники',
  description: 'Актуальный каталог FOX APPLE: iPhone, iPad, MacBook, AirPods, Apple Watch, PlayStation и аксессуары.',
  openGraph: {
    title: 'Каталог техники FOX APPLE',
    description: 'Проверяйте цены и наличие техники Apple в Самаре.',
  },
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = readCatalogParams(params)

  const [settings, categories, facetProducts, products] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProducts(),
    getProducts({ filters }),
  ])
  const facets = buildCatalogFacets(facetProducts)

  return (
    <section className="page-section">
      <div className="container page-head">
        <p className="eyebrow">Каталог</p>
        <h1>Актуальные цены FOX APPLE</h1>
        <p>Это витрина без корзины: уточните наличие, позвоните или забронируйте товар в Telegram.</p>
      </div>
      <div className="container">
        <CatalogControls
          categories={categories}
          color={filters.color}
          facets={facets}
          memory={filters.memory}
          query={filters.query}
          sim={filters.sim}
          sort={filters.sort}
        />
        <ProductGrid products={products} settings={settings} />
      </div>
    </section>
  )
}
