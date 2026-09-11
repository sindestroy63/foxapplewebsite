export const DEVICE_TYPE_OPTIONS = [
  { label: 'Телефон', value: 'phone' }, { label: 'Планшет', value: 'tablet' },
  { label: 'Ноутбук', value: 'laptop' }, { label: 'Умные часы', value: 'smartwatch' },
  { label: 'Наушники', value: 'headphones' }, { label: 'Игровая приставка', value: 'game-console' },
  { label: 'Фен', value: 'hair-dryer' }, { label: 'Пылесос', value: 'vacuum-cleaner' },
  { label: 'Аксессуар', value: 'accessory' }, { label: 'Другое', value: 'other' },
] as const
export type DeviceType = typeof DEVICE_TYPE_OPTIONS[number]['value']
const DEVICE_TYPES = new Set<string>(DEVICE_TYPE_OPTIONS.map((option) => option.value))
export function isManagedDeviceType(value: unknown): value is DeviceType { return typeof value === 'string' && DEVICE_TYPES.has(value) }
export function resolveDeviceType(data: Record<string, unknown> | null | undefined): DeviceType {
  if (isManagedDeviceType(data?.deviceType)) return data.deviceType
  const legacy = String(data?.productType || '').toLowerCase()
  if (legacy === 'iphone' || legacy === 'samsung') return 'phone'
  if (legacy === 'ipad') return 'tablet'
  if (legacy === 'mac') return 'laptop'
  if (legacy === 'apple-watch') return 'smartwatch'
  if (legacy === 'airpods') return 'headphones'
  const name = `${data?.name || ''} ${data?.model || ''} ${data?.productLine || ''}`.toLowerCase()
  const brand = String(data?.brand || '').toLowerCase()
  const group = String(data?.productGroup || '').toLowerCase()
  if (brand === 'dyson' && /v\s*\d|vacuum/.test(name)) return 'vacuum-cleaner'
  if (brand === 'dyson' || /supersonic|airwrap|hair ?dryer/.test(name)) return 'hair-dryer'
  if (/airpods|headphones|earbuds/.test(name)) return 'headphones'
  if (/watch|часы/.test(name) || group === 'smart-watches') return 'smartwatch'
  if (/ipad|tablet/.test(name) || group === 'tablets') return 'tablet'
  if (/macbook|\bmac\b|laptop/.test(name) || group === 'laptops') return 'laptop'
  if (/iphone|galaxy|\bs\d{2}\b/.test(name) || brand === 'samsung' || group === 'smartphones') return 'phone'
  if (/playstation|xbox|console/.test(name) || group === 'gaming-consoles') return 'game-console'
  if (group === 'accessories') return 'accessory'
  return 'other'
}
export function deviceTypeCondition(types: DeviceType[], existingField?: string) {
  return (data: Record<string, unknown>, siblingData?: Record<string, unknown>) => types.includes(resolveDeviceType(data)) || Boolean(existingField && siblingData?.[existingField])
}
