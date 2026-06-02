import type { Media, Product } from './types'

function mediaPath(filename?: string): string | null {
  return filename ? `/api/media/file/${encodeURIComponent(filename)}` : null
}

/**
 * Returns URL for media file using our custom route /api/media/file/<filename>
 * Always uses the filename instead of Payload's default url to avoid 404 on production
 */
export function getMediaUrl(media?: Media | string | number | null, preferred = 'card'): string | null {
  if (!media || typeof media !== 'object') {
    return null
  }

  if (isVideoMedia(media)) {
    return mediaPath(media.filename)
  }

  const sized = media.sizes?.[preferred as keyof NonNullable<Media['sizes']>]
  // Always use filename-based path through our custom route
  return mediaPath(sized?.filename || media.filename)
}

export function isVideoMedia(media?: Media | string | number | null): boolean {
  if (!media || typeof media !== 'object') {
    return false
  }

  return media.mimeType?.startsWith('video/') === true
}

export function getProductImage(product: Product, preferred = 'card'): { url: string | null; alt: string } {
  const first = product.images?.find((image) => image && typeof image === 'object')
  return {
    url: getMediaUrl(first, preferred),
    alt: typeof first === 'object' && first.alt ? first.alt : product.name,
  }
}