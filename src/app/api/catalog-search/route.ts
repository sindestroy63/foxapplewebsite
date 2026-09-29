import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/cms'
import { getCatalogPrice, getCatalogPriceVariant } from '@/lib/pricing'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (query.length < 2) return NextResponse.json([])
  const products = (await getProducts({ filters: { query, sort: 'relevance' } })).slice(0, 8)
  return NextResponse.json(products.map((product) => {
    const variant = getCatalogPriceVariant(product)
    const configuration = variant && [variant.memory || variant.storage, variant.color && (typeof variant.color === 'object' ? (variant.color.englishLabel || variant.color.russianLabel) : variant.color), variant.sim || variant.simType].filter(Boolean).join(' · ')
    const image = typeof product.images?.[0] === 'object' ? (product.images[0].sizes?.thumbnail?.url || product.images[0].url) : undefined
    return { id: product.id, name: product.name, href: `/catalog/${product.productGroup || 'other'}/${product.slug}`, price: getCatalogPrice(product), image, configuration, available: variant?.isAvailable !== false }
  }))
}