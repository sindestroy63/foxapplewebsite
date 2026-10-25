import type { Media, Product } from './types'

function mediaPath(filename?: string): string | null {
  return filename ? `/api/media/file/${encodeURIComponent(filename)}` : null
}

export function getMediaUrl(media?: Media | string | number | null, preferred = 'card'): string | null {
  if (!media || typeof media !== 'object') {
    return null
  }

  if (isVideoMedia(media)) {
    return mediaPath(media.filename)
  }

  const sized = media.sizes?.[preferred as keyof NonNullable<Media['sizes']>]
  return mediaPath(sized?.filename || media.filename)
}

export function isVideoMedia(media?: Media | string | number | null): boolean {
  if (!media || typeof media !== 'object') {
    return false
  }

  return media.mimeType?.startsWith('video/') === true
}

export function getProductImage(
  product: Product,
  preferred = 'card',
  selectedVariant?: { images?: Array<Media | string | number> } | null
): { url: string | null; alt: string } {
  let images = selectedVariant?.images || product.images

  if ((!images || images.length === 0) && product.colorImages && product.colorImages.length > 0) {
    const firstColorImage = product.colorImages[0]
    if (firstColorImage && typeof firstColorImage === 'object' && 'images' in firstColorImage) {
      images = firstColorImage.images
    }
  }

  const first = images?.find((image) => image != null && typeof image === 'object') as Media | undefined

  return {
    url: getMediaUrl(first, preferred),
    alt: typeof first === 'object' && first?.alt ? first.alt : product.name,
  }
}