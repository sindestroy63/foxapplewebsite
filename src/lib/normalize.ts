import type { Product, ProductVariant, VariantColor, ColorImageGroup } from './types'

function nc(r: any): VariantColor | undefined {
  if (!r || typeof r !== 'object') return undefined
  if (r.value || r.primaryHex) return { value: r.value, englishLabel: r.englishLabel, russianLabel: r.russianLabel, primaryHex: r.primaryHex, secondaryHex: r.secondaryHex }
  return undefined
}

function relationText(value: any, keys: string[] = ['value', 'label', 'key']): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  for (const key of keys) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim()
  }
  return undefined
}

function nv(v: Record<string, any>): ProductVariant {
  const storage = typeof v.storage === 'object' && v.storage ? v.storage.value : v.storage
  const simType = (typeof v.sim === 'object' && v.sim ? v.sim.value : v.sim) || v.simType
  const ram = relationText(v.ramOption) || v.ram
  const size = relationText(v.sizeOption) || v.size
  const screenSize = relationText(v.screenSizeOption) || v.screenSize
  const connectivity = relationText(v.connectivityOption) || v.connectivity
  return {
    id: v.id, sku: v.sku, color: nc(v.color), memory: storage, simType,
    size, hasTouchId: v.hasTouchId, storage, sim: typeof v.sim === 'object' && v.sim ? v.sim.value : v.sim,
    chip: v.chip, ram, screenSize, connectivity, generation: v.generation, revision: v.revision,
    packageLabel: v.packageLabel, material: v.material, strapSize: v.strapSize,
    price: v.price, oldPrice: v.oldPrice,
    status: v.status, isAvailable: v.isAvailable, images: v.images,
  }
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
