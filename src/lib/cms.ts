import config from '@payload-config'
import { getPayload } from 'payload'

import { CATEGORY_SEED, CONTACTS } from './constants'
import type { CatalogFacets, CatalogFilters, Category, PageDoc, Product, SiteAppearance, SiteSettings } from './types'

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
  const color = one(searchParams.color)?.trim() || undefined
  const memory = one(searchParams.memory)?.trim() || undefined
  const sim = one(searchParams.sim)?.trim() || undefined
  return {
    color,
    memory,
    query,
    sim,
    sort: rawSort === 'price_desc' || rawSort === 'price_asc' ? rawSort : undefined,
  }
}

function normalizeFacetValue(value?: string | null): string | undefined {
  return value?.trim() || undefined
}

function collectColorTokens(products: Product[]): string[] {
  const values = new Set<string>()

  for (const product of products) {
    const color = normalizeFacetValue(product.color)

    if (!color) {
      continue
    }

    for (const token of color.split(',').map((item) => item.trim()).filter(Boolean)) {
      values.add(token)
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b, 'ru'))
}

function parseMemorySize(value: string): number {
  const num = parseFloat(value) || 0
  const lower = value.toLowerCase()
  if (lower.includes('tb') || lower.includes('тб')) return num * 1024
  if (lower.includes('gb') || lower.includes('гб')) return num
  if (lower.includes('mm') || lower.includes('мм')) return num * 0.001
  if (lower.includes('м') && !lower.includes('мм')) return num * 0.0001
  return num
}

export function buildCatalogFacets(products: Product[]): CatalogFacets {
  const memories = new Set<string>()
  const simTypes = new Set<string>()

  for (const product of products) {
    const memory = normalizeFacetValue(product.memory)
    const simType = normalizeFacetValue(product.simType)

    if (memory) {
      memories.add(memory)
    }

    if (simType) {
      simTypes.add(simType)
    }
  }

  return {
    colors: collectColorTokens(products),
    memories: [...memories].sort((a, b) => parseMemorySize(a) - parseMemorySize(b)),
    simTypes: [...simTypes].sort((a, b) => a.localeCompare(b, 'ru')),
  }
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

    if (args?.filters?.memory) {
      conditions.push({ memory: { equals: args.filters.memory } })
    }

    if (args?.filters?.sim) {
      conditions.push({ simType: { equals: args.filters.sim } })
    }

    if (args?.filters?.color) {
      conditions.push({ color: { like: args.filters.color } })
    }

    let sort = 'sortOrder'
    if (args?.filters?.sort === 'price_asc') {
      sort = 'price'
    }
    if (args?.filters?.sort === 'price_desc') {
      sort = '-price'
    }

    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: args?.limit || 100,
      sort,
      where: {
        and: conditions,
      },
    })

    return result.docs as Product[]
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
    return (result.docs[0] as Product | undefined) || null
  } catch (error) {
    console.error(`Failed to load product ${productSlug}`, error)
    return null
  }
}

export async function getSiteAppearance(): Promise<SiteAppearance> {
  try {
    const payload = await getPayloadClient()
    const data = await payload.findGlobal({ slug: 'site-appearance' as any })
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
