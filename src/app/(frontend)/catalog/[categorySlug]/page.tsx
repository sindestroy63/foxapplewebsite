import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CategoryCatalogClient } from '@/components/CategoryCatalogClient'
import { LeadForm } from '@/components/LeadForm'
import {
  getProductsByCategorySlug,
  getSiteSettings,
} from '@/lib/cms'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ categorySlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params
  const { category } = await getProductsByCategorySlug(categorySlug)

  if (!category) {
    return { title: 'Категория не найдена' }
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

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params

  const [settings, data] = await Promise.all([
    getSiteSettings(),
    getProductsByCategorySlug(categorySlug),
  ])

  if (!data.category) {
    notFound()
  }

  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <section className="page-section">
      <div className="container">
        <CategoryCatalogClient
          categoryName={data.category.name}
          categorySlug={categorySlug}
          products={data.products}
          phone={phone}
          telegramUsername={settings.telegramUsername}
        />

        <div className="catalog-bottom">
          <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
          {categorySlug !== 'used' && (
            <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
          )}

          <LeadForm
            description="Оставьте номер телефона или Telegram. Мы уточним наличие, цену и свяжемся с вами."
            source="product_form"
            title="Оставить заявку по товару"
          />
        </div>
      </div>
    </section>
  )
}
