import type { Product, ProductVariant, VariantColor, ColorImageGroup } from './types'

function nc(r: any): VariantColor | undefined {
  if (!r || typeof r !== 'object') return undefined
  if (r.value || r.primaryHex) return { value: r.value, englishLabel: r.englishLabel, russianLabel: r.russianLabel, primaryHex: r.primaryHex, secondaryHex: r.secondaryHex }
  return undefined
}

function nv(v: Record<string, any>): ProductVariant {
  const storage = v.storage?.value
  let simType = v.simType
  if (v.sim?.value) simType = v.sim.value
  return { id: v.id, sku: v.sku, color: nc(v.color), memory: storage, simType, size: v.size, hasTouchId: v.hasTouchId, storage, sim: v.sim?.value, chip: v.chip, ram: v.ram, screenSize: v.screenSize, connectivity: v.connectivity, generation: v.generation, packageLabel: v.packageLabel, price: v.price, oldPrice: v.oldPrice, status: v.status, isAvailable: v.isAvailable, images: v.images }
}

function nci(ci: Record<string, any>): ColorImageGroup {
  return { color: nc(ci.color) ?? ci.color, images: ci.images }
}

export function normalizeProduct(raw: any): Product {
  return {
    ...raw,
    variants: raw.variants?.map(nv) ?? [],
    colorImages: raw.colorImages?.map(nci) ?? [],
  }
}
export function normalizeProducts(docs: any[]): Product[] { return docs.map(normalizeProduct) }
