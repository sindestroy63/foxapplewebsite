import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LeadForm } from '@/components/LeadForm'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { RichText } from '@/components/RichText'
import { getProductBySlugs, getSiteSettings } from '@/lib/cms'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ categorySlug: string; productSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlugs(categorySlug, productSlug)

  if (!product) {
    return {
      title: 'Товар не найден',
    }
  }

  return {
    title: product.seoTitle || product.name,
    description:
      product.seoDescription ||
      product.shortDescription ||
      `${product.name} в FOX APPLE. Актуальная цена и наличие в Самаре.`,
    openGraph: {
      title: product.name,
      description: product.shortDescription || 'Уточните наличие и забронируйте товар в FOX APPLE.',
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const [{ categorySlug, productSlug }, settings] = await Promise.all([params, getSiteSettings()])
  const product = await getProductBySlugs(categorySlug, productSlug)

  if (!product) {
    notFound()
  }

  const phone = settings.phone || '+7 (917) 954-64-64'

  return (
    <section className="page-section">
      <div className="container product-detail">
        <ProductDetailClient
          product={product}
          phone={phone}
          telegramUsername={settings.telegramUsername}
        />
      </div>

      <div className="container product-detail-bottom">
        <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
        {categorySlug !== 'used' && (
          <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
        )}

        <LeadForm
          description="Оставьте номер телефона или Telegram. Мы уточним наличие, цену и свяжемся с вами."
          productId={product.id}
          source="product_form"
          title="Оставить заявку по товару"
        />
      </div>
    </section>
  )
}
