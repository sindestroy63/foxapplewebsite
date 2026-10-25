import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CategoryCatalogClient } from '@/components/CategoryCatalogClient'
import { LeadForm } from '@/components/LeadForm'
import {
  getProductsByCategorySlug,
  getProductsByProductGroup,
  getSiteSettings,
} from '@/lib/cms'
import { LEGACY_CATEGORY_GROUP_ALIASES } from '@/lib/catalog-groups'
import GroupCatalogPage from '@/components/GroupCatalogPage'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const { category } = await getProductsByCategorySlug(categorySlug)

  if (!category) {
    const aliasGroup = LEGACY_CATEGORY_GROUP_ALIASES[categorySlug]
    if (aliasGroup) return { title: `${aliasGroup} | FOXSTORE` }
    return { title: 'Категория не найдена' }
  }

  return {
    title: category.name,
    description: `${category.name} в наличии и под заказ в ФОХСТОР, Самара.`,
    alternates: {
      canonical: `/catalog/${categorySlug}`,
    },
    openGraph: {
      title: `${category.name} | ФОХСТОР`,
      description: `Актуальные цены на ${category.name} в Самаре.`,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { categorySlug } = await params
  const query = await searchParams
  const modelSlug = typeof query.model === 'string' ? query.model : undefined

  const [settings, data] = await Promise.all([
    getSiteSettings(),
    getProductsByCategorySlug(categorySlug),
  ])

  if (!data.category) {
    const aliasGroup = LEGACY_CATEGORY_GROUP_ALIASES[categorySlug]
    if (aliasGroup) {
      const grouped = await getProductsByProductGroup(aliasGroup)
      return <GroupCatalogPage group={grouped.group!} products={grouped.products} />
    }
    if (categorySlug === 'used') {
      return (
        <section className="page-section"><div className="container">
          <CategoryCatalogClient
            categoryName="Б/У"
            categorySlug="used"
            products={[]}
            telegramUsername={settings.telegramUsername}
          />
        </div></section>
      )
    }
    notFound()
  }

  return (
    <section className="page-section">
      <div className="container">
        <CategoryCatalogClient
          categoryName={data.category.name}
          categorySlug={categorySlug}
          products={data.products}
          telegramUsername={settings.telegramUsername}
          initialModelSlug={modelSlug}
        />

        <div className="catalog-bottom">
          <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
          {categorySlug !== 'used' && (
            <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
          )}

          <LeadForm
            categoryName={data.category.name}
            categorySlug={categorySlug}
            description="Оставьте номер телефона или Telegram. Мы уточним наличие, цену и свяжемся с вами."
            source="product_form"
            title="Оставить заявку по товару"
          />
        </div>
      </div>
    </section>
  )
}
