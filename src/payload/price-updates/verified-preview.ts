import { normalizeSku } from '../utils/sku.ts'
import { formatPriceUpdateTarget } from './display.ts'

export type VerifiedPreviewRow = {
  lineNumber: number
  sourceLine: string
  sku: string
  matchType: 'product' | 'variant'
  product: number
  productLabel: string
  variantId?: string
  oldCashPrice: number
  newCashPrice: number
  status: 'ready'
}

export type VerifiedPreviewDiagnostic = {
  itemID: number | string
  itemStatus: string
  hasSelectedCandidateKey: boolean
  hasSelectedSku: boolean
  candidateMatchType?: 'product' | 'variant'
  currentProductFound: boolean
  currentSkuValid: boolean
  currentPriceFinite: boolean
}

function relationID(value: unknown): number | string | undefined {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return (value as { id?: number | string }).id
  return undefined
}

function isUsed(product: Record<string, any>): boolean {
  const category = product.category && typeof product.category === 'object' ? product.category.slug : product.category
  return product.condition === 'used' || product.productGroup === 'trade-in' || String(category || '').toLowerCase() === 'used' || /\bб\s*\/\s*у\b|\bб\.у\.?\b|used/i.test(`${product.name || ''} ${product.model || ''}`)
}

export function buildVerifiedPreviewRows(
  items: Array<Record<string, any>>,
  products: Array<Record<string, any>>,
  onDiagnostic?: (diagnostic: VerifiedPreviewDiagnostic) => void,
): VerifiedPreviewRow[] {
  return items.filter((item) => item.resolution === 'automatic' || item.resolution === 'manual').map((item, index) => {
    const candidates = Array.isArray(item.candidates) ? item.candidates : []
    const candidate = candidates.find((entry: any) => entry.key === item.selectedCandidateKey)
    const baseDiagnostic = {
      itemID: item.id,
      itemStatus: String(item.matchStatus || item.resolution || ''),
      hasSelectedCandidateKey: Boolean(item.selectedCandidateKey),
      hasSelectedSku: Boolean(normalizeSku(item.selectedSku)),
    }
    if (!candidate) {
      onDiagnostic?.({ ...baseDiagnostic, currentProductFound: false, currentSkuValid: false, currentPriceFinite: false })
      throw new Error(`Selected candidate is unavailable for import item ${item.id}.`)
    }
    const product = products.find((entry) => String(entry.id) === String(candidate.productId))
    if (!product || isUsed(product)) {
      onDiagnostic?.({ ...baseDiagnostic, candidateMatchType: candidate.matchType, currentProductFound: Boolean(product), currentSkuValid: false, currentPriceFinite: false })
      throw new Error(`Selected candidate changed for import item ${item.id}.`)
    }
    const productID = relationID(product.id)
    if (productID === undefined || Number.isNaN(Number(productID))) {
      onDiagnostic?.({ ...baseDiagnostic, candidateMatchType: candidate.matchType, currentProductFound: true, currentSkuValid: false, currentPriceFinite: false })
      throw new Error(`Selected product is unavailable for import item ${item.id}.`)
    }
    let oldCashPrice = Number(product.price)
    let variantId: string | undefined
    let currentSku: string | undefined
    let currentVariant: Record<string, any> | undefined
    if (candidate.matchType === 'variant') {
      const variant = (product.variants || []).find((entry: any) => String(entry.id) === String(candidate.variantId))
      const currentIdentity = variant ? (normalizeSku(variant.sku) || `VARIANT-${variant.id}`).toUpperCase() : ''
      if (!variant || currentIdentity !== normalizeSku(candidate.sku)) {
        onDiagnostic?.({ ...baseDiagnostic, candidateMatchType: candidate.matchType, currentProductFound: true, currentSkuValid: false, currentPriceFinite: false })
        throw new Error(`Selected variant changed for import item ${item.id}.`)
      }
      oldCashPrice = Number(variant.price)
      variantId = String(variant.id)
      currentSku = currentIdentity
      currentVariant = variant
    } else {
      currentSku = normalizeSku(product.sku)
      if (currentSku !== normalizeSku(candidate.sku)) {
        onDiagnostic?.({ ...baseDiagnostic, candidateMatchType: candidate.matchType, currentProductFound: true, currentSkuValid: false, currentPriceFinite: false })
        throw new Error(`Selected product SKU changed for import item ${item.id}.`)
      }
    }
    const sku = currentSku
    const currentSkuValid = Boolean(sku)
    const currentPriceFinite = Number.isFinite(oldCashPrice)
    onDiagnostic?.({ ...baseDiagnostic, candidateMatchType: candidate.matchType, currentProductFound: true, currentSkuValid, currentPriceFinite })
    if (!sku) throw new Error(`Selected SKU is invalid for import item ${item.id}.`)
    if (!currentPriceFinite) throw new Error(`Selected price is unavailable for import item ${item.id}.`)
    return {
      lineNumber: Number(item.itemNumber) || index + 1,
      sourceLine: String(item.sourceLine || ''),
      sku,
      matchType: candidate.matchType,
      product: Number(productID),
      productLabel: formatPriceUpdateTarget(product, currentVariant) || String(product.name || candidate.productName || ''),
      ...(variantId ? { variantId } : {}),
      oldCashPrice,
      newCashPrice: Number(item.price),
      status: 'ready',
    }
  })
}
