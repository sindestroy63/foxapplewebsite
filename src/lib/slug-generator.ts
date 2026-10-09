/**
 * FOXSTORE Slug Generation & URL Protection
 *
 * Автоматическая генерация уникальных slug с транслитерацией и защитой URL
 */

import type { CollectionSlug, Payload } from 'payload'

/**
 * Транслитерация кириллицы в латиницу (ГОСТ 7.79-2000)
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya'
}

/**
 * Транслитерация строки
 */
function transliterate(text: string): string {
  return text
    .split('')
    .map(char => CYRILLIC_TO_LATIN[char] || char)
    .join('')
}

/**
 * Нормализация slug
 */
export function normalizeSlug(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Только буквы, цифры, пробелы, дефисы
    .replace(/[\s_]+/g, '-') // Пробелы и _ → дефис
    .replace(/-+/g, '-') // Множественные дефисы → один
    .replace(/^-+|-+$/g, '') // Удалить дефисы с концов
}

/**
 * Генерация уникального slug
 */
export async function generateUniqueSlug(
  payload: Payload,
  collection: CollectionSlug,
  baseSlug: string,
  excludeId?: number | string
): Promise<string> {
  const normalized = normalizeSlug(baseSlug)

  if (!normalized) {
    throw new Error('Cannot generate slug from empty string')
  }

  // Проверка уникальности
  const existing = await payload.find({
    collection,
    where: {
      slug: { equals: normalized },
      ...(excludeId ? { id: { not_equals: excludeId } } : {}),
    },
    limit: 1,
  })

  if (existing.docs.length === 0) {
    return normalized
  }

  // Поиск свободного суффикса
  let counter = 2
  while (counter < 1000) {
    const candidate = `${normalized}-${counter}`

    const conflict = await payload.find({
      collection,
      where: {
        slug: { equals: candidate },
        ...(excludeId ? { id: { not_equals: excludeId } } : {}),
      },
      limit: 1,
    })

    if (conflict.docs.length === 0) {
      return candidate
    }

    counter++
  }

  throw new Error(`Cannot generate unique slug for: ${baseSlug}`)
}

/**
 * Проверка, изменился ли slug
 */
export function isSlugChanged(
  oldSlug: string | undefined | null,
  newSlug: string | undefined | null
): boolean {
  if (!oldSlug && newSlug) return true
  if (oldSlug && !newSlug) return true
  return oldSlug !== newSlug
}

/**
 * Валидация slug
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug cannot be empty' }
  }

  if (slug !== slug.toLowerCase()) {
    return { valid: false, error: 'Slug must be lowercase' }
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain a-z, 0-9, and hyphens' }
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with hyphen' }
  }

  if (slug.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' }
  }

  if (slug.length < 2) {
    return { valid: false, error: 'Slug must be at least 2 characters' }
  }

  if (slug.length > 200) {
    return { valid: false, error: 'Slug must be 200 characters or less' }
  }

  return { valid: true }
}
