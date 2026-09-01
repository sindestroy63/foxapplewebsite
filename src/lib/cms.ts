import config from '@payload-config'
import { getPayload } from 'payload'

import { CATEGORY_SEED, CONTACTS } from './constants'
import { normalizeProduct, normalizeProducts } from './normalize'
import { sortProductsByPriority } from '@/lib/sort'
import type { CatalogFilters, Category, PageDoc, Product, SiteAppearance, SiteSettings } from './types'
import { CATALOG_GROUPS, getCatalogGroup, productGroupSlug } from './catalog-groups'

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
    productGroup: getCatalogGroup(one(searchParams.group) || '')?.slug,
    brand: one(searchParams.brand)?.trim() || undefined,
    line: one(searchParams.line)?.trim() || undefined,
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
  return fallbackSettings
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
    const conditions: any[] = [{ isAvailable: { equals: true } }, { id: { not_equals: 49 } }, { id: { not_equals: 61 } }, { id: { not_equals: 66 } }, { id: { not_equals: 70 } }]

    if (args?.categoryId) {
      conditions.push({ category: { equals: args.categoryId } })
    }

    if (args?.filters?.productGroup) {
      // The data migration from accessories to other is deliberately pending
      // confirmation. Treat both values as Other meanwhile, so the public
      // catalog does not split the same business group during the transition.
      if (args.filters.productGroup === 'other') {
        conditions.push({
          or: [
            { productGroup: { equals: 'other' } },
            { productGroup: { equals: 'accessories' } },
          ],
        })
      } else {
        conditions.push({ productGroup: { equals: args.filters.productGroup } })
      }
    }
    if (args?.filters?.brand) conditions.push({ brand: { equals: args.filters.brand } })
    if (args?.filters?.line) conditions.push({ productLine: { equals: args.filters.line } })

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

export async function getProductsByProductGroup(productGroup: NonNullable<CatalogFilters['productGroup']>, params?: CatalogFilters) {
  const group = getCatalogGroup(productGroup)
  const products = await getProducts({ filters: { ...params, productGroup } })
  return {
    group,
    products,
  }
}

/** Public inventory for the separate Trade-in storefront. */
export async function getTradeInProducts(): Promise<Product[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 100,
      sort: 'sortOrder',
      where: {
        and: [
          { productGroup: { equals: 'trade-in' } },
          { condition: { equals: 'used' } },
          { isAvailable: { equals: true } },
        ],
      },
    })

    return normalizeProducts(result.docs)
  } catch (error) {
    console.error('Failed to load Trade-in products', error)
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
  const group = getCatalogGroup(categorySlug)
  if (!category && !group) return null

  try {
    const payload = await getPayloadClient()
    // Decode a dynamic route parameter once; retain raw and trimmed candidates
    // for legacy records whose stored slug contains spaces or a trailing space.
    const decodedSlug = (() => {
      try {
        return decodeURIComponent(productSlug)
      } catch {
        return productSlug
      }
    })()
    const slugCandidates = [...new Set([productSlug, decodedSlug, decodedSlug.trim()])]
    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 1,
      where: {
        and: [
          { slug: { in: slugCandidates } },
          ...(category ? [{ category: { equals: category.id } }] : [{ productGroup: { equals: group!.slug } }]),
          { isAvailable: { equals: true } },
        ],
      },
    })
    if (result.docs[0]) {
      const matched = result.docs[0] as any
      // The former Marshall category URL was retired after moving the product
      // to the audio group. Keep the category fallback for other legacy URLs.
      if ([49, 61, 66, 70].includes(Number(matched.id)) || (categorySlug === 'drugoe' && matched.productGroup === 'audio')) return null
      return normalizeProduct(matched)
    }

    // A legacy record may contain a trailing space that cannot survive URL
    // normalization. Match only the trimmed slug within the same category.
    const fallback = await payload.find({
      collection: 'products',
      depth: 2,
      limit: 100,
      where: {
        and: [
          ...(category ? [{ category: { equals: category.id } }] : [{ productGroup: { equals: group!.slug } }]),
          { isAvailable: { equals: true } },
        ],
      },
    })
    const normalized = decodedSlug.trim()
    const legacyMatch = fallback.docs.find((doc) => {
      if (typeof doc.slug !== 'string' || doc.slug.trim() !== normalized) return false
      return !([49, 61, 66, 70].includes(Number((doc as any).id)) || (categorySlug === 'drugoe' && (doc as any).productGroup === 'audio'))
    })
    return legacyMatch ? normalizeProduct(legacyMatch) : null
  } catch (error) {
    console.error(`Failed to load product ${productSlug}`, error)
    return null
  }
}

export type NavCategory = {
  slug: string
  name: string
  products: { model: string; slug: string; badge?: string | null }[]
}

export type NavGroup = {
  slug: string
  name: string
  brands: string[]
}

export type CatalogNavNode = {
  id: number | string
  title: string
  kind: 'group' | 'brand' | 'line' | 'product' | 'custom_link'
  href: string
  isNew?: boolean
  badgeText?: string | null
  coverImage?: import('./types').Media | null
  children: CatalogNavNode[]
}

export { sortProductsByPriority }

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
      products: sortProductsByPriority(
        products
          .filter(p => {
            const cid = typeof p.category === 'object' ? p.category?.id : p.category
            return cid == cat.id
          })
          .map(p => ({ model: p.model || p.name, slug: p.slug, name: p.name, badge: p.badge || null })),
      ),
    }))
  } catch (error) {
    console.error('Failed to load nav data', error)
    return []
  }
}

export async function getGroupNavData(): Promise<NavGroup[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({ collection: 'products', depth: 0, limit: 1_000, pagination: false, where: { isAvailable: { equals: true } } })
    const products = result.docs as Array<{ productGroup?: string; brand?: string | null }>
    return CATALOG_GROUPS.map((group) => ({
      slug: group.slug,
      name: group.label,
      brands: [...new Set(products
        .filter((product) => group.slug === 'other'
          ? product.productGroup === 'other' || product.productGroup === 'accessories'
          : product.productGroup === group.slug)
        .map((product) => product.brand?.trim())
        .filter((brand): brand is string => Boolean(brand)))].sort((a, b) => a.localeCompare(b, 'ru')),
    }))
  } catch {
    return CATALOG_GROUPS.map((group) => ({ slug: group.slug, name: group.label, brands: [] }))
  }
}

export async function getCatalogNavigation(): Promise<CatalogNavNode[]> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({ collection: 'catalog-navigation', depth: 2, limit: 1000, pagination: false, sort: 'sortOrder', where: { isVisible: { equals: true } } })
    const docs = result.docs as any[]
    const nodes = new Map<string, CatalogNavNode>()
    for (const doc of docs) {
      const product = doc.product && typeof doc.product === 'object' ? doc.product : null
      const category = product?.category && typeof product.category === 'object' ? product.category.slug : null
      nodes.set(String(doc.id), {
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        href: doc.kind === 'product' && product?.slug
          ? `/catalog/${productGroupSlug(product?.productGroup) || category || 'other'}/${product.slug}`
          : doc.href || (doc.kind === 'line' && doc.productGroup && doc.brand && doc.productLine
            ? `/catalog?group=${encodeURIComponent(doc.productGroup)}&brand=${encodeURIComponent(doc.brand)}&line=${encodeURIComponent(doc.productLine)}`
            : doc.kind === 'brand' && doc.productGroup && doc.brand
              ? `/catalog?group=${encodeURIComponent(doc.productGroup)}&brand=${encodeURIComponent(doc.brand)}`
              : doc.productGroup ? `/catalog?group=${encodeURIComponent(doc.productGroup)}` : '/catalog'),
        isNew: Boolean(doc.isNew),
        badgeText: doc.badgeText || null,
        coverImage: doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null,
        children: [],
      })
    }
    const roots: CatalogNavNode[] = []
    for (const doc of docs) {
      const node = nodes.get(String(doc.id))!
      const parentId = typeof doc.parent === 'object' ? doc.parent?.id : doc.parent
      const parent = parentId ? nodes.get(String(parentId)) : undefined
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
    return roots
  } catch (error) {
    console.error('Failed to load catalog navigation', error)
    return []
  }
}

export async function getCatalogRootGroups() {
  const fallback = CATALOG_GROUPS.map((group) => ({ ...group, isNew: false, coverImage: null as import('./types').Media | null }))
  try {
    const roots = (await getCatalogNavigation()).filter((node) => node.kind === 'group')
    const bySlug = new Map(roots.map((node) => [node.href.split('group=')[1] || '', node]))
    const groups = CATALOG_GROUPS.map((group) => ({ ...group, isNew: Boolean(bySlug.get(group.slug)?.isNew), coverImage: bySlug.get(group.slug)?.coverImage || null }))
    const tradeIn = roots.find((node) => node.href.includes('group=trade-in'))
    return tradeIn ? [...groups, { slug: 'trade-in' as const, label: tradeIn.title, categorySlugs: [], isNew: tradeIn.isNew, coverImage: tradeIn.coverImage || null }] : groups
  } catch {
    return fallback
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
