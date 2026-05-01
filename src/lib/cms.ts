import config from '@payload-config'
import { getPayload } from 'payload'

import { CATEGORY_SEED, CONTACTS } from './constants'
import { normalizeProduct, normalizeProducts } from './normalize'
import type { CatalogFilters, Category, PageDoc, Product, SiteAppearance, SiteSettings } from './types'

type SearchParams = Record<string, string | string[] | undefined>

const fallbackCategories: Category[] = CATEGORY_SEED.map((category, index) => ({
  ...category,
  id: category.slug,
  sortOrder: index + 1,
  isActive: true,
}))

export const fallbackSettings: Required<
  Pick<
    SiteSettings,
    | 'shopName'
    | 'phone'
    | 'telegramUsername'
    | 'telegramChannelUrl'
    | 'address'
    | 'workTime'
    | 'mainDomain'
    | 'secondaryDomain'
    | 'heroTitle'
    | 'heroSubtitle'
    | 'aboutText'
    | 'homepageMediaTitle'
    | 'homepageMediaText'
  >
> &
  SiteSettings = CONTACTS

async function getPayloadClient() {
  return getPayload({ config })
}

function one(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function readCatalogParams(searchParams: SearchParams): CatalogFilters {
  const query = one(searchParams.q)?.trim() || ''
  const rawSort = one(searchParams.sort)
  return {
    query,
    sort: rawSort === 'price_desc' || rawSort === 'price_asc' ? rawSort : undefined,
  }
}

function getMinPrice(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    const prices = product.variants
      .filter((v) => v.isAvailable !== false)
      .map((v) => v.price)
      .filter(Boolean)
    return prices.length > 0 ? Math.min(...prices) : product.price
  }
  return product.price
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({
      slug: 'site-settings',
    })
    return { ...fallbackSettings, ...(settings as SiteSettings) }
  } catch (error) {
    console.error('Failed to load site settings', error)
    return fallbackSettings
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'categories',
      depth: 1,
      limit: 100,
      sort: 'sortOrder',
      where: {
        isActive: {
          equals: true,
        },
      },
    })
    return result.docs as Category[]
  } catch (error) {
    console.error('Failed to load categories', error)
    return fallbackCategories
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories()
  const fallback = categories.find((category) => category.slug === slug) || null
  if (fallback && typeof fallback.id === 'string' && fallback.id === fallback.slug) {
    return fallback
  }

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'categories',
      depth: 0,
      limit: 1,
      where: {
        and: [
          { slug: { equals: slug } },
          { isActive: { equals: true } },
        ],
      },
    })
    return (result.docs[0] as Category | undefined) || null
  } catch (error) {
    console.error(`Failed to load category ${slug}`, error)
    return fallback
  }
}

export async function getProducts(args?: {
  categoryId?: string | number
  categorySlug?: string
  featuredOnly?: boolean
  filters?: CatalogFilters
  limit?: number
}): Promise<Product[]> {
  try {
    const payload = await getPayloadClient()
    const conditions: any[] = [{ isAvailable: { equals: true } }]

    if (args?.categoryId) {
      conditions.push({ category: { equals: args.categoryId } })
    }

    if (args?.featuredOnly) {
      conditions.push({ isFeatured: { equals: true } })
    }

    if (args?.filters?.query) {
      conditions.push({
        or: [{ name: { like: args.filters.query } }, { model: { like: args.filters.query } }],
      })
    }

    const wantSort = args?.filters?.sort

    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: args?.limit || 100,
      sort: 'sortOrder',
      where: {
        and: conditions,
      },
    })

    let products = normalizeProducts(result.docs)

    if (wantSort === 'price_asc') {
      products = products.slice().sort((a, b) => getMinPrice(a) - getMinPrice(b))
    } else if (wantSort === 'price_desc') {
      products = products.slice().sort((a, b) => getMinPrice(b) - getMinPrice(a))
    }

    return products
  } catch (error) {
    console.error('Failed to load products', error)
    return []
  }
}

export async function getProductsByCategorySlug(
  categorySlug: string,
  params?: CatalogFilters,
) {
  const category = await getCategoryBySlug(categorySlug)
  if (!category) {
    return { category: null, products: [] as Product[] }
  }

  const products = await getProducts({
    categoryId: category.id,
    filters: params,
  })

  return { category, products }
}

export async function getProductBySlugs(categorySlug: string, productSlug: string) {
  const category = await getCategoryBySlug(categorySlug)
  if (!category) {
    return null
  }

  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 1,
      where: {
        and: [
          { slug: { equals: productSlug } },
          { category: { equals: category.id } },
          { isAvailable: { equals: true } },
        ],
      },
    })
    return result.docs[0] ? normalizeProduct(result.docs[0]) : null
  } catch (error) {
    console.error(`Failed to load product ${productSlug}`, error)
    return null
  }
}

export type NavCategory = {
  slug: string
  name: string
  products: { model: string; slug: string }[]
}

export async function getNavData(): Promise<NavCategory[]> {
  try {
    const payload = await getPayloadClient()
    const [catResult, prodResult] = await Promise.all([
      payload.find({ collection: 'categories', depth: 0, limit: 100, sort: 'sortOrder', where: { isActive: { equals: true } } }),
      payload.find({ collection: 'products', depth: 0, limit: 200, sort: 'sortOrder', where: { isAvailable: { equals: true } } }),
    ])
    const categories = catResult.docs as any[]
    const products = prodResult.docs as any[]
    return categories.map(cat => ({
      slug: cat.slug,
      name: cat.name,
      products: products
        .filter(p => {
          const cid = typeof p.category === 'object' ? p.category?.id : p.category
          return cid == cat.id
        })
        .map(p => ({ model: p.model || p.name, slug: p.slug })),
    }))
  } catch (error) {
    console.error('Failed to load nav data', error)
    return []
  }
}

export async function getSiteAppearance(): Promise<SiteAppearance> {
  try {
    const payload = await getPayloadClient()
    const data = await payload.findGlobal({ slug: 'site-appearance' as any, depth: 2 })
    return data as SiteAppearance
  } catch {
    return {}
  }
}

export async function getPageBySlug(slug: string): Promise<PageDoc | null> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      where: {
        slug: {
          equals: slug,
        },
      },
    })
    return (result.docs[0] as PageDoc | undefined) || null
  } catch (error) {
    console.error(`Failed to load page ${slug}`, error)
    return null
  }
}
