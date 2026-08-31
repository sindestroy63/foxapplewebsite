type ProductSnapshot = {
  price: number
  variants?: Array<Record<string, unknown> & { id?: string; price?: number; sku?: string | null }>
}

type PriceUpdateTarget = {
  matchType: 'product' | 'variant'
  sku: string
  variantId?: string
  oldCashPrice: number
  newCashPrice: number
}

type ApplyResult =
  | { conflict: true; error: string }
  | { conflict: false; data: { price: number; variants?: ProductSnapshot['variants'] } }

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

export function prepareProductPriceUpdate(product: ProductSnapshot, target: PriceUpdateTarget): ApplyResult {
  if (target.matchType === 'product') {
    if (Number(product.price) !== Number(target.oldCashPrice)) {
      return { conflict: true, error: 'Цена изменилась после предпросмотра.' }
    }
    return { conflict: false, data: { price: target.newCashPrice } }
  }

  const variants = Array.isArray(product.variants) ? product.variants : []
  const variant = variants.find((entry) => String(entry.id) === String(target.variantId))
  if (!variant || normalized(variant.sku) !== normalized(target.sku) || Number(variant.price) !== Number(target.oldCashPrice)) {
    return { conflict: true, error: 'Вариант или его цена изменились после предпросмотра.' }
  }

  const updatedVariants = variants.map((entry) =>
    String(entry.id) === String(target.variantId) ? { ...entry, price: target.newCashPrice } : entry,
  )
  const rootPrice = Math.min(...updatedVariants.map((entry) => Number(entry.price)))
  return { conflict: false, data: { variants: updatedVariants, price: rootPrice } }
}
