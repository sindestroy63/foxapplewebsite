type Availability = { isAvailable?: boolean | null; status?: string | null }

type FeedProduct = Availability & { id: string | number }

const monitoredProductIds = new Set(['28'])

export function pricevaAvailability(product: FeedProduct, variant?: Availability): boolean | null {
  if (product.isAvailable === false) return null
  const available = product.status !== 'out_of_stock' &&
    (!variant || (variant.isAvailable !== false && variant.status !== 'out_of_stock'))
  if (available) return true
  return monitoredProductIds.has(String(product.id)) ? false : null
}
