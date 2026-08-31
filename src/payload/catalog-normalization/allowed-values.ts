export const ALLOWED_STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'] as const
export const ALLOWED_RAM_VALUES = ['8GB', '12GB', '16GB', '24GB'] as const
export const ALLOWED_SIZE_VALUES = ['40mm', '42mm', '44mm', '46mm', '47mm', '49mm'] as const
export const ALLOWED_SCREEN_SIZE_VALUES = ['11"', '13"', '15"'] as const
export const ALLOWED_CONNECTIVITY_VALUES = ['Wi-Fi', 'LTE', 'Wi-Fi + Cellular'] as const

const normalize = (value: string) => value.normalize('NFKC').replace(/[\u00A0\s]+/gu, '').toUpperCase()

export function isAllowedStorageValue(value: unknown): value is (typeof ALLOWED_STORAGE_VALUES)[number] {
  return typeof value === 'string' && ALLOWED_STORAGE_VALUES.includes(normalize(value) as (typeof ALLOWED_STORAGE_VALUES)[number])
}

export function cleanStorageValue(value: unknown): string | null {
  if (!isAllowedStorageValue(value)) return null
  return normalize(String(value))
}

export function isAllowedRamValue(value: unknown): boolean {
  return typeof value === 'string' && ALLOWED_RAM_VALUES.includes(normalize(value) as (typeof ALLOWED_RAM_VALUES)[number])
}

export function isAllowedSizeValue(value: unknown): boolean {
  return typeof value === 'string' && ALLOWED_SIZE_VALUES.includes(normalize(value) as (typeof ALLOWED_SIZE_VALUES)[number])
}

export function isAllowedScreenSizeValue(value: unknown): boolean {
  return typeof value === 'string' && ALLOWED_SCREEN_SIZE_VALUES.includes(String(value).trim() as (typeof ALLOWED_SCREEN_SIZE_VALUES)[number])
}

export function isAllowedConnectivityValue(value: unknown): boolean {
  return typeof value === 'string' && ALLOWED_CONNECTIVITY_VALUES.includes(String(value).trim() as (typeof ALLOWED_CONNECTIVITY_VALUES)[number])
}
