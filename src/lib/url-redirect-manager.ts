
import type { Payload } from 'payload'

export interface UrlRedirect {
  id?: number
  from: string
  to: string
  permanent: boolean
  createdAt?: string
}

export async function saveUrlRedirect(
  payload: Payload,
  oldPath: string,
  newPath: string
): Promise<void> {
  if (oldPath === newPath) return
  if (!oldPath || !newPath) return

  try {
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

    const duplicate = await payload.find({
      collection: 'url-redirects' as any,
      where: {
        from: { equals: oldPath },
      },
      limit: 1,
    })

    if (duplicate.docs.length > 0) {
      await payload.update({
        collection: 'url-redirects' as any,
        id: duplicate.docs[0].id,
        data: {
          to: newPath,
          permanent: true,
        } as any,
      })
    } else {
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
  }
}

export function buildProductPath(
  productGroup: string | null | undefined,
  slug: string | null | undefined
): string | null {
  if (!productGroup || !slug) return null
  return `/catalog/${productGroup}/${slug}`
}

export function hasProductUrlChanged(
  oldData: { productGroup?: string | null; slug?: string | null },
  newData: { productGroup?: string | null; slug?: string | null }
): boolean {
  const oldPath = buildProductPath(oldData.productGroup, oldData.slug)
  const newPath = buildProductPath(newData.productGroup, newData.slug)

  if (!oldPath || !newPath) return false
  return oldPath !== newPath
}
