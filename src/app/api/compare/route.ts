import { NextResponse } from 'next/server'

import { productSpecs, parseCompareIds, type CompareItem } from '@/lib/compare'
import { getProductsByIds } from '@/lib/cms'
import { statusLabel } from '@/lib/format'
import { getProductImage } from '@/lib/media'
import { getCatalogPrice, getCatalogPriceVariant, getCatalogVariants } from '@/lib/pricing'
import { buildProductUrl } from '@/lib/product-url-builder'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

function toCompareItem(product: Product): CompareItem {
  const image = getProductImage(product, 'detail')
  const availablePrices = getCatalogVariants(product)
    .filter((variant) => variant.isAvailable !== false)
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0)

  return {
    id: String(product.id),
    name: product.name,
    href: buildProductUrl(product),
    image: image.url || null,
    imageAlt: image.alt,
    price: getCatalogPrice(product),
    priceFrom: new Set(availablePrices).size > 1,
    available: product.status !== 'out_of_stock' && getCatalogPriceVariant(product) !== null,
    statusLabel: statusLabel(product.status),
    specs: productSpecs(product),
  }
}

export async function GET(request: Request) {
  const ids = parseCompareIds(new URL(request.url).searchParams.get('ids'))
  if (!ids.length) return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })

  const products = await getProductsByIds(ids)
  const items = ids
    .map((id) => products.find((product) => String(product.id) === id))
    .filter((product): product is Product => Boolean(product))
    .map(toCompareItem)

  return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } })
}
