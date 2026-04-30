import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CatalogControls } from '@/components/CatalogControls'
import { ProductGrid } from '@/components/ProductGrid'
import {
  getCategories,
  getProductsByCategorySlug,
  getSiteSettings,
  readCatalogParams,
} from '@/lib/cms'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const { category } = await getProductsByCategorySlug(categorySlug)

  if (!category) {
    return {
      title: 'Категория не найдена',
    }
  }

  return {
    title: category.name,
    description: `${category.name} в наличии и под заказ в FOX APPLE, Самара.`,
    openGraph: {
      title: `${category.name} | FOX APPLE`,
      description: `Актуальные цены на ${category.name} в Самаре.`,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const queryParams = await searchParams
  const filters = readCatalogParams(queryParams)

  const [settings, categories, data] = await Promise.all([
    getSiteSettings(),
    getCategories(),
    getProductsByCategorySlug(categorySlug, filters),
  ])

  if (!data.category) {
    notFound()
  }

  return (
    <section className="page-section">
      <div className="container page-head">
        <p className="eyebrow">Каталог</p>
        <h1>{data.category.name}</h1>
        <p>Наличие меняется в течение дня. Самый быстрый способ забронировать товар — Telegram.</p>
      </div>
      <div className="container">
        <CatalogControls
          activeSlug={categorySlug}
          categories={categories}
          query={filters.query}
          sort={filters.sort}
        />
        <ProductGrid products={data.products} settings={settings} />
      </div>
    </section>
  )
}
