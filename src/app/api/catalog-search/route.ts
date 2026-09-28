import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/cms'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (!query) return NextResponse.json([])
  const products = await getProducts({ filters: { query, sort: 'relevance' }, limit: 8 })
  return NextResponse.json(products.map((product) => ({ id: product.id, name: product.name, href: `/catalog/${product.productGroup || 'other'}/${product.slug}`, price: product.price, image: typeof product.images?.[0] === 'object' ? product.images[0].url : undefined })))
}