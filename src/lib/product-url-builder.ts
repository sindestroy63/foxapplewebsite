import type { Product, ProductGroup } from './types'
import { productGroupSlug } from './catalog-groups'

/**
 * ЕДИНАЯ ФУНКЦИЯ ПОСТРОЕНИЯ PRODUCT URL
 *
 * Всегда использует productGroup как источник истины для категории URL.
 * Устаревший Product.category игнорируется.
 *
 * @returns Canonical URL path для товара, например: /catalog/smartphones/iphone-16-pro
 */
export function buildProductUrl(product: {
  slug: string
  productGroup?: ProductGroup | string | null
}): string {
  const categorySlug = productGroupSlug(product.productGroup || null)

  if (!categorySlug) {
    // Fallback если productGroup не задан или невалиден
    console.warn(`Product ${product.slug} has invalid productGroup: ${product.productGroup}`)
    return `/catalog/${product.slug}`
  }

  return `/catalog/${categorySlug}/${product.slug}`
}

/**
 * Извлекает эффективное изображение товара с учётом выбранного варианта
 */
export function getEffectiveProductImage(
  product: Product,
  selectedVariant?: { images?: Array<any> } | null
): { url: string | null; alt: string } {
  // Приоритет: variant images → product images → placeholder
  const images = selectedVariant?.images || product.images
  const first = images?.find((image) => image && typeof image === 'object')

  return {
    url: first && typeof first === 'object' ? (first as any).url || null : null,
    alt: typeof first === 'object' && (first as any).alt ? (first as any).alt : product.name,
  }
}
