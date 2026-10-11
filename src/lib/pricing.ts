import type { Product, ProductVariant } from './types'

export function cardPrice(cashPrice?: number | null): number | null {
  if (typeof cashPrice !== 'number') return null
  return Math.round(cashPrice * 1.2)
}

export function getCatalogVariants(product: Product): ProductVariant[] {
  return product.variants?.length ? product.variants : [{ ...product, price: product.price } as ProductVariant]
}

export function getCatalogPrice(product: Product): number {
  const variants = getCatalogVariants(product)

  // Сначала попытаться получить минимальную цену среди доступных вариантов
  const availablePrices = variants
    .filter((variant) => variant.isAvailable !== false)
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0)

  if (availablePrices.length) return Math.min(...availablePrices)

  // Если нет доступных вариантов с ценой, попытаться найти цену среди всех вариантов
  const allPrices = variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0)

  if (allPrices.length) return Math.min(...allPrices)

  // Fallback на цену товара
  const fallback = Number(product.price)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
}

export function getCatalogPriceVariant(product: Product): ProductVariant | null {
  const variants = getCatalogVariants(product).filter((variant) => variant.isAvailable !== false)
  if (!variants.length) return null
  return variants.reduce((cheapest, variant) => Number(variant.price) < Number(cheapest.price) ? variant : cheapest)
}
