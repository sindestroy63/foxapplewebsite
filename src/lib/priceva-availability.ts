type Availability = { isAvailable?: boolean | null; status?: string | null; sku?: string | null }

type FeedProduct = Availability & { id: string | number; variants?: Array<{ sku?: string | null }> | null }

const monitoredProductIds = new Set(['28'])
const monitoredVariantSkus = new Set(['VAR-DYSON-HS08-V001'])

function isMonitoredSku(sku?: string | null): boolean {
  return Boolean(sku) && monitoredVariantSkus.has(String(sku).trim())
}

export function pricevaAvailability(product: FeedProduct, variant?: Availability): boolean | null {
  if (product.isAvailable === false) return null
  const available = product.status !== 'out_of_stock' &&
    (!variant || (variant.isAvailable !== false && variant.status !== 'out_of_stock'))
  if (available) return true
  if (monitoredProductIds.has(String(product.id))) return false
  if (variant) return isMonitoredSku(variant.sku) ? false : null
  return (product.variants || []).some((item) => isMonitoredSku(item.sku)) ? false : null
}
