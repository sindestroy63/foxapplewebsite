import { isManagedProductType, resolveProductType } from './product-type.ts'
import { isManagedDeviceType, resolveDeviceType } from './device-type.ts'

type Variant = Record<string, unknown> & { id?: unknown }

const missing = (variant: Variant, field: string) => variant[field] === null || variant[field] === undefined || variant[field] === ''

export function validateNewVariantConfigurations(data?: Record<string, unknown> | null, originalDoc?: Record<string, unknown> | null): string | null {
  if (!data || (!isManagedProductType(data.productType) && !isManagedDeviceType(data.deviceType)) || !Array.isArray(data.variants)) return null
  const legacyType = resolveProductType(data)
  const type = resolveDeviceType(data)
  const originalIDs = new Set(Array.isArray(originalDoc?.variants)
    ? (originalDoc.variants as Variant[]).map((variant) => String(variant.id))
    : [])

  for (const [index, variant] of (data.variants as Variant[]).entries()) {
    if (variant.id && originalIDs.has(String(variant.id))) continue
    const required = type === 'phone' || legacyType === 'iphone' || legacyType === 'samsung'
      ? ['color', 'storage', 'sim']
      : type === 'laptop' || legacyType === 'mac'
        ? ['color', 'storage', 'chip', 'ramOption']
        : type === 'tablet' || legacyType === 'ipad'
          ? ['color', 'storage', 'connectivityOption']
          : type === 'smartwatch' || legacyType === 'apple-watch'
            ? ['color', 'sizeOption']
            : []
    const field = required.find((name) => missing(variant, name))
    if (field) return `Вариант ${index + 1}: заполните поле «${field}» для типа ${type}.`
  }
  return null
}
