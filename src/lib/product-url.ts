import { productGroupSlug } from './catalog-groups'

export type ProductUrlFields = {
  slug?: string | null
  productGroup?: string | null
  category?: { slug?: string | null } | string | number | null
}

/** The only public product URL builder. Legacy category data is a fallback only. */
export function productCanonicalUrl(product: ProductUrlFields): string | null {
  const slug = String(product.slug || '').trim()
  if (!slug) return null
  const group = productGroupSlug(String(product.productGroup || '').trim())
  const category = product.category && typeof product.category === 'object' ? String(product.category.slug || '') : ''
  return `/catalog/${group || category || 'other'}/${slug}`
}

export function productUrlMatches(product: ProductUrlFields, scope: string, slug: string): boolean {
  return productCanonicalUrl(product) === `/catalog/${scope}/${slug}`
}