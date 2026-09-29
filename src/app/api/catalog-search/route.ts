import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/cms'
import { getCatalogPrice, getCatalogPriceVariant } from '@/lib/pricing'

function getSearchThumbnail(product: Awaited<ReturnType<typeof getProducts>>[number]) {
  const media = product.images?.find((image) => image && typeof image === 'object')
  if (!media || typeof media !== 'object' || media.mimeType?.startsWith('video/')) return undefined

  const thumbnail = media.sizes?.thumbnail
  const filename = thumbnail?.filename || media.filename
  if (!filename) return undefined

  return {
    url: `/api/media/file/${encodeURIComponent(filename)}`,
    width: thumbnail?.width || media.width || 400,
    height: thumbnail?.height || media.height || 300,
  }
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