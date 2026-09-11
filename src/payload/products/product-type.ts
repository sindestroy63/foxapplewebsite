export const PRODUCT_TYPE_OPTIONS = [
  { label: 'iPhone', value: 'iphone' }, { label: 'Mac', value: 'mac' }, { label: 'iPad', value: 'ipad' },
  { label: 'Apple Watch', value: 'apple-watch' }, { label: 'AirPods', value: 'airpods' }, { label: 'Samsung', value: 'samsung' }, { label: 'Другое', value: 'other' },
] as const
export type ManagedProductType = typeof PRODUCT_TYPE_OPTIONS[number]['value']
const MANAGED_TYPES = new Set<string>(PRODUCT_TYPE_OPTIONS.map((option) => option.value))
export function isManagedProductType(value: unknown): value is ManagedProductType { return typeof value === 'string' && MANAGED_TYPES.has(value) }
export function resolveProductType(data: Record<string, unknown> | null | undefined): ManagedProductType {
  if (isManagedProductType(data?.productType)) return data.productType
  const name = `${data?.name || ''} ${data?.model || ''} ${data?.productLine || ''}`.toLowerCase()
  const brand = String(data?.brand || '').toLowerCase(); const group = String(data?.productGroup || '')
  if (name.includes('airpods')) return 'airpods'; if (name.includes('iphone')) return 'iphone'; if (name.includes('ipad')) return 'ipad';
  if (name.includes('macbook') || /\bmac\b/u.test(name)) return 'mac'; if (name.includes('apple watch')) return 'apple-watch'
  if (brand === 'samsung' || name.includes('samsung') || name.includes('galaxy')) return 'samsung'
  if (brand === 'apple' && group === 'smartphones') return 'iphone'; if (brand === 'apple' && group === 'laptops') return 'mac';
  if (brand === 'apple' && group === 'tablets') return 'ipad'; if (brand === 'apple' && group === 'smart-watches') return 'apple-watch';
  if (brand === 'apple' && group === 'audio') return 'airpods'; return 'other'
}
export function productTypeCondition(types: ManagedProductType[], existingField?: string) {
  const deviceMap: Record<string, ManagedProductType> = { phone: 'iphone', tablet: 'ipad', laptop: 'mac', smartwatch: 'apple-watch', headphones: 'airpods' }
  return (data: Record<string, unknown>, siblingData?: Record<string, unknown>) => { const deviceType = typeof data.deviceType === 'string' ? deviceMap[data.deviceType] : undefined; return (deviceType ? types.includes(deviceType) : types.includes(resolveProductType(data))) || Boolean(existingField && siblingData?.[existingField]) }
}
