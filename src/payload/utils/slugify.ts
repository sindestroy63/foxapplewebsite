const translit: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => translit[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/

export function composeProductSlug(name: string, suffix: string): string {
  const normalizedSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)
  if (normalizedSuffix.length !== 6) {
    throw new Error('Product slug suffix must contain exactly six letters or digits.')
  }

  return `${slugify(name) || 'product'}-${normalizedSuffix}`
}

export function isProductSlug(value: unknown): value is string {
  return typeof value === 'string' && productSlugPattern.test(value)
}

export function getProductSlugSuffix(value: unknown): string | null {
  if (!isProductSlug(value)) return null
  return value.slice(-6)
}

export function createSlugSuffix(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(6)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}
