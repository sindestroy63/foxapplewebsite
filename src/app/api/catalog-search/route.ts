import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/cms'
import { getCatalogPrice, getCatalogPriceVariant } from '@/lib/pricing'
import { getMediaUrl, isVideoMedia } from '@/lib/media'

function getSearchThumbnail(product: Awaited<ReturnType<typeof getProducts>>[number]) {
  const selectedVariant = getCatalogPriceVariant(product)
  const candidates = [
    ...(selectedVariant?.images || []),
    ...(product.images || []),
    ...(product.colorImages || []).flatMap((group) => group.images || []),
  ]
  const media = candidates.find((image) => image && typeof image === 'object' && !isVideoMedia(image))
  if (!media || typeof media !== 'object') return undefined
  const url = getMediaUrl(media, 'thumbnail')
  if (!url) return undefined
  const thumbnail = media.sizes?.thumbnail
  return { url, width: thumbnail?.width || media.width || 400, height: thumbnail?.height || media.height || 300 }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (query.length < 2) return NextResponse.json([])
  const products = (await getProducts({ filters: { query, sort: 'relevance' } })).slice(0, 8)
  return NextResponse.json(products.map((product) => {
    const variant = getCatalogPriceVariant(product)
    const configuration = variant && [variant.memory || variant.storage, variant.color && (typeof variant.color === 'object' ? (variant.color.englishLabel || variant.color.russianLabel) : variant.color), variant.sim || variant.simType].filter(Boolean).join(' · ')
    const thumbnail = getSearchThumbnail(product)
    return { id: product.id, name: product.name, slug: product.slug, href: `/catalog/${product.productGroup || 'other'}/${product.slug}`, price: getCatalogPrice(product), thumbnail, configuration, available: variant?.isAvailable !== false }
  }), { headers: { 'Cache-Control': 'no-store' } })
}