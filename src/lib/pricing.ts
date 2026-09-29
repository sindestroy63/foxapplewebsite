import type { Product, ProductVariant } from './types'

export function cardPrice(cashPrice?: number | null): number | null {
  if (typeof cashPrice !== 'number') return null
  return Math.round(cashPrice * 1.2)
}

export function getCatalogVariants(product: Product): ProductVariant[] {
  return product.variants?.length ? product.variants : [{ ...product, price: product.price } as ProductVariant]
}

export function getCatalogPrice(product: Product): number {
  const prices = getCatalogVariants(product)
    .filter((variant) => variant.isAvailable !== false)
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price >= 0)
  if (prices.length) return Math.min(...prices)
  const fallback = Number(product.price)
  return Number.isFinite(fallback) ? fallback : 0
}

export function getCatalogPriceVariant(product: Product): ProductVariant | null {
  const variants = getCatalogVariants(product).filter((variant) => variant.isAvailable !== false)
  if (!variants.length) return null
  return variants.reduce((cheapest, variant) => Number(variant.price) < Number(cheapest.price) ? variant : cheapest)
}
