import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CategoryCatalogClient } from '@/components/CategoryCatalogClient'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { ProductStory } from '@/components/ProductStory'
import { ProductRecommendations } from '@/components/ProductRecommendations'
import { RichText } from '@/components/RichText'
import { getProductBySlugs, getProductFamily } from '@/lib/cms'
import { productCanonicalUrl } from '@/lib/product-url'
import { productSeoTitle } from '@/lib/product-seo'

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
  const seoTitle = productSeoTitle(product)
  const seoDescription = `${seoName}. Цена и наличие в Самаре. ФОХСТОР.`
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

  const family = await getProductFamily(product.id)
  if (family) {
    return (
      <section className="page-section">
        <div className="container">
          <CategoryCatalogClient
            categoryName={family.child.title}
            categorySlug="other"
            products={family.products}
            initialModelSlug={product.slug}
            breadcrumbBrand={family.groupTitle}
            breadcrumbChild={family.child.title}
            syncProductUrl
          />
          <div className="catalog-bottom">
            <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
            {categorySlug !== 'used' && (
              <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
            )}
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="page-section">
      <div className="container product-detail product-detail-panel">
        <ProductDetailClient
          product={product}
        />
      </div>
      <ProductStory product={product} />
      <div className="container"><ProductRecommendations product={product} /></div>

      <div className="container product-detail-bottom">
        <p className="offer-note detail-offer-note">Информация на сайте не является публичной офертой.</p>
        {categorySlug !== 'used' && (
          <p className="offer-note detail-offer-note">Товар имеет недостаток в виде невозможности предустановки RuStore.</p>
        )}
      </div>
    </section>
  )
}
