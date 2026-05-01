import type { Product, ProductVariant, VariantColor, ColorImageGroup } from './types'

function nc(r: any): VariantColor | undefined {
  if (!r || typeof r !== 'object') return undefined
  if (r.value || r.primaryHex) return { value: r.value, englishLabel: r.englishLabel, russianLabel: r.russianLabel, primaryHex: r.primaryHex, secondaryHex: r.secondaryHex }
  return undefined
}

function nv(v: Record<string, any>): ProductVariant {
  let memory = v.memory, size = v.size, simType = v.simType
  if (v.storage?.value) { if (/^\d+mm$/.test(v.storage.value)) size = v.storage.value; else memory = v.storage.value }
  if (v.sim?.value) simType = v.sim.value
  return { id: v.id, color: nc(v.color), memory, simType, size, chip: v.chip, ram: v.ram, screenSize: v.screenSize, connectivity: v.connectivity, price: v.price, oldPrice: v.oldPrice, status: v.status, isAvailable: v.isAvailable, images: v.images }
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
