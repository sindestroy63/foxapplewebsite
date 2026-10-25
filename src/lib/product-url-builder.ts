import type { Product, ProductGroup } from './types'
import { productGroupSlug } from './catalog-groups'

export function buildProductUrl(product: {
  slug: string
  productGroup?: ProductGroup | string | null
}): string {
  const categorySlug = productGroupSlug(product.productGroup || null)

  if (!categorySlug) {
    console.warn(`Product ${product.slug} has invalid productGroup: ${product.productGroup}`)
    return `/catalog/${product.slug}`
  }

  return `/catalog/${categorySlug}/${product.slug}`
}

export function getEffectiveProductImage(
  product: Product,
  selectedVariant?: { images?: Array<any> } | null
): { url: string | null; alt: string } {
  const images = selectedVariant?.images || product.images
  const first = images?.find((image) => image && typeof image === 'object')

  return {
    url: first && typeof first === 'object' ? (first as any).url || null : null,
    alt: typeof first === 'object' && (first as any).alt ? (first as any).alt : product.name,
  }
}
