import { NextResponse } from 'next/server'

import { getProducts, getProductsByIds } from '@/lib/cms'
import { productGroupSlug } from '@/lib/catalog-groups'
import { getProductImage } from '@/lib/media'
import { getCatalogPrice, getCatalogPriceVariant } from '@/lib/pricing'
import { recommendationCategory, recommendedAccessories, type RecommendedProduct } from '@/lib/product-recommendations'
import { buildProductUrl } from '@/lib/product-url-builder'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('productId') || ''
  if (!/^\d{1,12}$/.test(id)) return NextResponse.json([], { status: 400 })
  const [product] = await getProductsByIds([id])
  const category = product ? recommendationCategory(product) : null
  if (!product || !category) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })
  }
  const candidates = await getProducts({ filters: category === 'ps5' ? { productGroup: 'gaming-consoles' } : undefined, limit: 1000 })
  const items: RecommendedProduct[] = recommendedAccessories(product, candidates.filter((item) => productGroupSlug(item.productGroup) !== null)).map((item) => {
    const variant = getCatalogPriceVariant(item)
    const image = getProductImage(item, 'card', variant?.images?.length ? variant : item.variants?.find((entry) => entry.images?.length))
    return {
      id: String(item.id),
      name: item.name,
      href: buildProductUrl(item),
      image: image.url || null,
      imageAlt: image.alt,
      price: getCatalogPrice(item),
      status: item.status,
    }
  })
  return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } })
}
