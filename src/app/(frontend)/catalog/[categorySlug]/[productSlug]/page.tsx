import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ProductDetailClient } from '@/components/ProductDetailClient'
import { ProductStory } from '@/components/ProductStory'
import { RichText } from '@/components/RichText'
import { getProductBySlugs } from '@/lib/cms'
import { productCanonicalUrl } from '@/lib/product-url'

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

  const seoName = product.name?.trim() || product.model?.trim() || 'Техника в ФОХСТОР'
  const seoTitle = `${seoName} — купить в Самаре | ФОХСТОР`
  const seoDescription = `${seoName}. Цена, наличие и доставка в Самаре. ФОХСТОР.`
  return {
    title: seoTitle,
    description: seoDescription,
    alternates: {
      canonical: productCanonicalUrl(product) || `/catalog/${categorySlug}/${productSlug}`,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { categorySlug, productSlug } = await params
  const product = await getProductBySlugs(categorySlug, productSlug)

  if (!product) {
    notFound()
  }

  return (
    <section className="page-section">
      <div className="container product-detail product-detail-panel">
        <ProductDetailClient
          product={product}
        />
      </div>
      <ProductStory product={product} />

      <div className="container product-detail-bottom">
        <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
        {categorySlug !== 'used' && (
          <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
        )}
      </div>
    </section>
  )
}
