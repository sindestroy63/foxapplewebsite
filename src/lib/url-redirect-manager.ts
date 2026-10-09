/**
 * FOXSTORE URL Redirect Manager
 *
 * Автоматическое сохранение старых URL при изменении slug/category
 */

import type { Payload } from 'payload'

export interface UrlRedirect {
  id?: number
  from: string
  to: string
  permanent: boolean
  createdAt?: string
}

/**
 * Сохранение redirect при изменении URL
 */
export async function saveUrlRedirect(
  payload: Payload,
  oldPath: string,
  newPath: string
): Promise<void> {
  if (oldPath === newPath) return
  if (!oldPath || !newPath) return

  try {
    // Проверка на циклические редиректы
    const existingRedirect = await payload.find({
      collection: 'url-redirects' as any,
      where: {
        from: { equals: newPath },
      },
      limit: 1,
    })

    if (existingRedirect.docs.length > 0) {
      throw new Error(`Circular redirect detected: ${newPath} → ${oldPath}`)
    }

    // Проверка на дубликат
    const duplicate = await payload.find({
      collection: 'url-redirects' as any,
      where: {
        from: { equals: oldPath },
      },
      limit: 1,
    })

    if (duplicate.docs.length > 0) {
      // Обновить существующий redirect
      await payload.update({
        collection: 'url-redirects' as any,
        id: duplicate.docs[0].id,
        data: {
          to: newPath,
          permanent: true,
        } as any,
      })
    } else {
      // Создать новый redirect
      await payload.create({
        collection: 'url-redirects' as any,
        data: {
          from: oldPath,
          to: newPath,
          permanent: true,
          source: 'auto',
        } as any,
      })
    }
  } catch (err: any) {
    payload.logger.error({ err, oldPath, newPath }, 'Failed to save URL redirect')
    // Не прерываем сохранение продукта из-за ошибки redirect
  }
}

/**
 * Product URL из данных
 */
export function buildProductPath(
  productGroup: string | null | undefined,
  slug: string | null | undefined
): string | null {
  if (!productGroup || !slug) return null
  return `/catalog/${productGroup}/${slug}`
}

/**
 * Проверка изменения URL продукта
 */
export function hasProductUrlChanged(
  oldData: { productGroup?: string | null; slug?: string | null },
  newData: { productGroup?: string | null; slug?: string | null }
): boolean {
  const oldPath = buildProductPath(oldData.productGroup, oldData.slug)
  const newPath = buildProductPath(newData.productGroup, newData.slug)

  if (!oldPath || !newPath) return false
  return oldPath !== newPath
}
