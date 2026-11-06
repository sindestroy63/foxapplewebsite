import type { CommonTextKey, DimensionKey } from './plan.ts'

export type VariantProfile = {
  dimensions: DimensionKey[]
  common: CommonTextKey[]
  hint: string
}

const PROFILES: Record<string, VariantProfile> = {
  phone: { dimensions: ['color', 'storage', 'sim'], common: [], hint: 'Цвет, память и SIM' },
  tablet: { dimensions: ['color', 'storage', 'connectivityOption', 'screenSizeOption'], common: ['generation'], hint: 'Цвет, память, подключение и диагональ' },
  laptop: { dimensions: ['color', 'storage', 'ramOption', 'screenSizeOption'], common: ['chip', 'generation'], hint: 'Цвет, память, оперативная память и диагональ' },
  smartwatch: { dimensions: ['color', 'sizeOption', 'connectivityOption'], common: ['material', 'strapSize', 'packageLabel'], hint: 'Цвет и размер корпуса' },
  headphones: { dimensions: ['color', 'connectivityOption'], common: ['generation', 'packageLabel'], hint: 'Цвет и подключение' },
  'game-console': { dimensions: ['color', 'storage'], common: ['packageLabel'], hint: 'Цвет и память' },
}

const FALLBACK: VariantProfile = { dimensions: ['color'], common: ['packageLabel', 'generation'], hint: 'Цвет и комплектация' }

export function profileFor(deviceType: string): VariantProfile {
  return PROFILES[deviceType] ?? FALLBACK
}
