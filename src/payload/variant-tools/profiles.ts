import type { CommonTextKey, DimensionKey } from './plan.ts'

export type VariantProfile = {
  dimensions: DimensionKey[]
  common: CommonTextKey[]
  hint: string
}

export type ProductHint = { brand?: unknown; productType?: unknown }

const PROFILES: Record<string, VariantProfile> = {
  phone: { dimensions: ['color', 'storage', 'sim'], common: [], hint: 'Цвет, память и SIM' },
  tablet: { dimensions: ['color', 'storage', 'connectivityOption', 'screenSizeOption'], common: ['generation'], hint: 'Цвет, память, подключение и диагональ' },
  laptop: { dimensions: ['color', 'storage', 'ramOption', 'screenSizeOption'], common: ['chip', 'generation'], hint: 'Цвет, память, оперативная память и диагональ' },
  smartwatch: { dimensions: ['color', 'sizeOption', 'connectivityOption'], common: ['material', 'strapSize', 'packageLabel'], hint: 'Цвет и размер корпуса' },
  headphones: { dimensions: ['color', 'connectivityOption'], common: ['generation', 'packageLabel'], hint: 'Цвет и подключение' },
  'game-console': { dimensions: ['color', 'storage'], common: ['packageLabel'], hint: 'Цвет и память' },
}

const PHONE_WITH_RAM: VariantProfile = {
  dimensions: ['color', 'storage', 'ramOption', 'sim'],
  common: [],
  hint: 'Цвет, память, оперативная память и SIM',
}

const FALLBACK: VariantProfile = { dimensions: ['color'], common: ['packageLabel', 'generation'], hint: 'Цвет и комплектация' }

export function supportsRam(deviceType: string, product?: ProductHint): boolean {
  if (deviceType === 'laptop') return true
  if (deviceType !== 'phone') return false
  const brand = String(product?.brand ?? '').trim().toLowerCase()
  const type = String(product?.productType ?? '').trim().toLowerCase()
  return brand !== 'apple' && type !== 'iphone'
}

export function profileFor(deviceType: string, product?: ProductHint): VariantProfile {
  if (deviceType === 'phone' && supportsRam(deviceType, product)) return PHONE_WITH_RAM
  return PROFILES[deviceType] ?? FALLBACK
}
