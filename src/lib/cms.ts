import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { CATEGORY_SEED, CONTACTS } from './constants'
import { normalizeProduct, normalizeProducts } from './normalize'
import { sortProductsByPriority } from '@/lib/sort'
import type { CatalogFilters, Category, PageDoc, Product, SiteAppearance, SiteSettings } from './types'
import { CATALOG_GROUPS, getCatalogGroup, productGroupSlug } from './catalog-groups'
import { DEFAULT_BRAND_CATALOG_MENU, visibleBrandMenu, type BrandMenu } from './brand-catalog-menu'
import { catalogPlacementHref, getCatalogPlacementByChildKey } from './product-catalog-placement'
import { rankSearchResults } from './search'
import { sortCatalogProducts } from './catalog-sort.ts'
import { getCatalogPrice } from './pricing.ts'
import { catalogNavigationHref } from './catalog-navigation-url'
import { productCanonicalUrl } from './product-url'

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
  const query = one(searchParams.search)?.trim() || one(searchParams.q)?.trim() || ''
  const rawSort = one(searchParams.sort)
  return {
    query,
    sort: rawSort === 'price_desc' || rawSort === 'price_asc' || rawSort === 'name' || rawSort === 'relevance' ? rawSort : undefined,
    productGroup: getCatalogGroup(one(searchParams.group) || '')?.slug,
    brand: one(searchParams.brand)?.trim() || undefined,
    line: one(searchParams.line)?.trim() || undefined,
    appleAccessories: one(searchParams.appleAccessories) === '1' ? true : undefined,
    category: one(searchParams.category)?.trim() || undefined,
    minPrice: Number(one(searchParams.minPrice)) || undefined,
    maxPrice: Number(one(searchParams.maxPrice)) || undefined,
    inStock: one(searchParams.inStock) === '1' ? true : undefined,
    storage: one(searchParams.storage)?.trim() || undefined,
    color: one(searchParams.color)?.trim() || undefined,
    sim: one(searchParams.sim)?.trim() || undefined,
    ram: one(searchParams.ram)?.trim() || undefined,
    placement: one(searchParams.placement)?.trim() || undefined,
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return fallbackSettings
}

export async function getBestOffers(): Promise<Product[]> {
  try {
    const payload = await getPayloadClient()
    const appearance = await payload.findGlobal({ slug: 'site-appearance', depth: 2 }) as SiteAppearance
    const selected = (appearance.bestOffers || [])
      .filter((product): product is Product => typeof product === 'object' && product !== null && 'id' in product)
      .filter((product) => product.isAvailable !== false)

    if (selected.length > 0) return normalizeProducts(selected)
  } catch (error) {
    console.error('Failed to load best offers', error)
  }

  return getProducts({ featuredOnly: true, limit: 6 })
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
    let directPlacementIds: Array<string | number> = []
    let placementChild: BrandCatalogNavigationItem | undefined
    let placementChildren: BrandCatalogNavigationItem[] = []
    if (args?.filters?.placement) {
      const navigation = await payload.findGlobal({ slug: 'brand-catalog-navigation', depth: 1 }) as any
      const groups = Array.isArray(navigation.groups) ? navigation.groups : []
      const findNode = (nodes: any[], siblings: any[] = []): { node?: any; siblings: any[] } => {
        for (const node of nodes) {
          if (String(node.key) === args.filters?.placement) return { node, siblings }
          const nested = Array.isArray(node.children) ? findNode(node.children, node.children) : undefined
          if (nested?.node) return nested
        }
        return { siblings }
      }
      const found = findNode(groups)
      placementChild = found.node
      placementChildren = found.siblings.filter((item: any) => item.isVisible !== false)
      directPlacementIds = Array.isArray(placementChild?.products)
        ? placementChild.products.map((item: any) => typeof item === 'object' ? item.id : item).filter(Boolean)
        : []
    }
    const conditions: any[] = [{ isAvailable: { equals: true } }, { id: { not_equals: 49 } }, { id: { not_equals: 61 } }, { id: { not_equals: 66 } }, { id: { not_equals: 70 } }]

    // Trade-in inventory has its own public storefront and must not leak into brand filters.
    if (args?.filters?.productGroup !== 'trade-in') conditions.push({ productGroup: { not_equals: 'trade-in' } })

    if (args?.categoryId) {
      conditions.push({ category: { equals: args.categoryId } })
    }

    if (args?.filters?.placement && !directPlacementIds.length && args.filters.query) {
      conditions.push({
        or: [
          { name: { contains: args.filters.query } },
          { model: { contains: args.filters.query } },
          { productLine: { contains: args.filters.query } },
        ],
      })
    }

    if (directPlacementIds.length > 0) {
      conditions.push({ id: { in: directPlacementIds } })
    } else if (args?.filters?.productGroup) {
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
    if (args?.filters?.brand) {
      if (!directPlacementIds.length) conditions.push({ brand: { equals: args.filters.brand } })
    }
    if (args?.filters?.line) {
      if (directPlacementIds.length) {
        // Direct CMS placement is authoritative for a selected subsection.
      } else {
      // Apple Mac and MacBook are two menu branches over the shared laptops
      // group. Their stored productLine values contain the concrete model
      // name (for example "Apple MacBook Pro ..."), so exact matching would
      // either merge the branches or hide every product.
      if (args.filters.line === 'MacBook') conditions.push({ productLine: { like: 'MacBook' } })
      else if (args.filters.line === 'Apple Mac') conditions.push({ or: [
        { productLine: { like: 'iMac' } },
        { productLine: { like: 'Mac mini' } },
        { productLine: { like: 'Mac Studio' } },
        { productLine: { like: 'Mac Pro' } },
      ] })
      else conditions.push({ productLine: { equals: args.filters.line } })
      }
    }
    if (args?.filters?.appleAccessories) {
      conditions.push({
        or: [
          { and: [{ productGroup: { equals: 'other' } }, { brand: { equals: 'Apple' } }] },
          { and: [{ productGroup: { equals: 'other' } }, { name: { like: 'Apple Pencil' } }] },
          { and: [{ productGroup: { equals: 'other' } }, { name: { like: 'Аксессуары Apple' } }] },
        ],
      })
    }

    if (args?.filters?.category) conditions.push({ category: { equals: args.filters.category } })

    if (args?.featuredOnly) {
      conditions.push({ isFeatured: { equals: true } })
    }

    const wantSort = args?.filters?.sort

    const result = await payload.find({
      collection: 'products',
      depth: 2,
      limit: args?.filters?.query ? 1000 : (args?.limit || 100),
      pagination: false,
      sort: 'sortOrder',
      where: {
        and: conditions,
      },
    })

    let products = normalizeProducts(result.docs)
    if (placementChild && placementChildren.length > 0) {
      products = filterProductsForNavigationChild(products, placementChildren, placementChild)
    }
    if (requestedQuery(args?.filters?.query)) products = rankSearchResults(products, args!.filters!.query!)
    const requested = args?.filters
    const value = (input: unknown) => String(input || '').trim().toLowerCase().replace(/\s+/g, '')
    const variantsForFilter = (product: Product) => (product.variants?.length ? product.variants : [{ ...product, price: product.price }])
    if (requested?.minPrice || requested?.maxPrice || requested?.inStock || requested?.storage || requested?.color || requested?.sim || requested?.ram) {
      products = products.filter((product) => {
        const catalogPrice = getCatalogPrice(product)
        const priceMatches = (!requested.minPrice || catalogPrice >= requested.minPrice)
          && (!requested.maxPrice || catalogPrice <= requested.maxPrice)
        return priceMatches && variantsForFilter(product).some((variant) => {
        const variantRecord = variant as NonNullable<Product['variants']>[number] & { storage?: string; sim?: string }
        const color = variant.color && typeof variant.color === 'object' ? [variant.color.value, variant.color.englishLabel, variant.color.russianLabel].join(' ') : variant.color
        return (!requested.inStock || (variant.isAvailable !== false && variant.status !== 'out_of_stock'))
          && (!requested.storage || value(variantRecord.storage || variant.memory).includes(value(requested.storage)))
          && (!requested.color || value(color).includes(value(requested.color)))
          && (!requested.sim || value(variantRecord.sim || variant.simType).includes(value(requested.sim)))
          && (!requested.ram || value(variant.ram).includes(value(requested.ram)))
        })
      })
    }

    const queryForRanking = args?.filters?.query
    if (wantSort === 'relevance' || (queryForRanking && !wantSort)) {
      products = rankSearchResults(products, queryForRanking || '')
    } else if (wantSort === 'price_asc' || wantSort === 'price_desc' || wantSort === 'name') {
      products = sortCatalogProducts(products, wantSort)
    }

    return products
  } catch (error) {
    console.error('Failed to load products', error)
    return []
  }
}

function requestedQuery(query?: string): boolean {
  return Boolean(query && query.trim().length >= 2)
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
  try {
    const payload = await getPayloadClient()
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
          { isAvailable: { equals: true } },
        ],
      },
    })
    if (result.docs[0]) {
      const matched = result.docs[0] as any
      return productCanonicalUrl(matched)?.startsWith(`/catalog/${categorySlug}/`) ? normalizeProduct(matched) : null
    }
    return null
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
  sortOrder?: number
  isNew?: boolean
  badgeText?: string | null
  coverImage?: import('./types').Media | null
  children: CatalogNavNode[]
}

export type BrandCatalogNavigationItem = { title: string; key: string; href?: string; filter?: Record<string, string>; isVisible?: boolean; sortOrder?: number; coverImage?: import('./types').Media | null; children?: BrandCatalogNavigationItem[]; products?: Array<{ id: string | number; name: string; href: string; isNew?: boolean }> }

export function navigationFilterMatchesCatalogParams(filter: Record<string, string> | undefined, params: CatalogFilters): boolean {
  if (!filter) return false
  const values: Record<string, string | undefined> = {
    group: params.productGroup,
    brand: params.brand,
    line: params.line,
    appleAccessories: params.appleAccessories ? '1' : undefined,
    q: params.query || undefined,
  }
  return Object.entries(filter).every(([key, value]) => String(values[key] || '') === String(value))
}

export function visibleNavigationChildren(group: BrandCatalogNavigationItem | undefined): BrandCatalogNavigationItem[] {
  return (group?.children || []).filter((child) => child.isVisible !== false)
}

export function findBrandNavigationRoot(navigation: BrandCatalogNavigationItem[], params: CatalogFilters): BrandCatalogNavigationItem | undefined {
  return navigation.find((group) => {
    if (group.isVisible === false) return false
    if (navigationFilterMatchesCatalogParams(group.filter, params)) return true
    // Some legacy/public root links use the CMS group key as `brand`.
    return !params.line && !params.placement && params.brand?.toLowerCase() === group.key.toLowerCase()
  })
}

function productMatchesNavigationFilter(product: any, filter: Record<string, string> | undefined): boolean {
  if (!filter) return false
  if (filter.group && product.productGroup !== filter.group) return false
  if (filter.brand && product.brand !== filter.brand) return false
  if (filter.line) {
    if (filter.line === 'MacBook' && !String(product.productLine || '').includes('MacBook')) return false
    if (filter.line === 'Apple Mac' && !['iMac', 'Mac mini', 'Mac Studio', 'Mac Pro'].some((line) => String(product.productLine || '').includes(line))) return false
    if (!['MacBook', 'Apple Mac'].includes(filter.line) && product.productLine !== filter.line) return false
  }
  if (filter.appleAccessories === '1' && !(product.productGroup === 'other' && product.brand === 'Apple')) return false
  if (filter.q && !`${product.name || ''} ${product.model || ''} ${product.productLine || ''}`.toLowerCase().includes(filter.q.toLowerCase())) return false
  return true
}

export function filterProductsForNavigationChild(products: any[], children: BrandCatalogNavigationItem[], child: BrandCatalogNavigationItem): any[] {
  const directIds = new Set((child.products || []).map((item: any) => String(item.id)))
  return products.filter((product) => {
    if (directIds.has(String(product.id))) return true
    const matches = children.filter((candidate) => candidate.isVisible !== false && productMatchesNavigationFilter(product, candidate.filter))
    if (!matches.some((candidate) => candidate.key === child.key)) return false
    const specificity = (candidate: BrandCatalogNavigationItem) => Object.keys(candidate.filter || {}).length
    return specificity(child) === Math.max(...matches.map(specificity))
  })
}

/**
 * Global rows created by older versions may have lost href/filter values.
 * Recover only from the explicit fallback map; never turn an unresolved item
 * into the unfiltered /catalog route.
 */
function resolveBrandHref(key: string, href: unknown, filter: unknown): string | undefined {
  return catalogNavigationHref({ key, href: typeof href === 'string' ? href : undefined, filter: filter && typeof filter === 'object' && !Array.isArray(filter) ? filter as Record<string, string> : undefined })
}

function hrefFromFilter(filter: unknown): string | undefined {
  return catalogNavigationHref({ filter: filter && typeof filter === 'object' && !Array.isArray(filter) ? filter as Record<string, string> : undefined })
}

function productMatchesFilter(product: any, filter: Record<string, string> | undefined): boolean {
  if (!filter) return false
  if (filter.group && product.productGroup !== filter.group) return false
  if (filter.brand && product.brand !== filter.brand) return false
  if (filter.line) {
    if (filter.line === 'MacBook' && !String(product.productLine || '').includes('MacBook')) return false
    else if (filter.line === 'Apple Mac' && !['iMac', 'Mac mini', 'Mac Studio', 'Mac Pro'].some((line) => String(product.productLine || '').includes(line))) return false
    else if (!['MacBook', 'Apple Mac'].includes(filter.line) && product.productLine !== filter.line) return false
  }
  if (filter.appleAccessories === '1' && !(product.productGroup === 'other' && product.brand === 'Apple')) return false
  if (filter.q && !`${product.name || ''} ${product.model || ''} ${product.productLine || ''}`.toLowerCase().includes(filter.q.toLowerCase())) return false
  return true
}

function productsForMenuChild(products: any[], children: any[], child: any): any[] {
  const directIds = new Set((Array.isArray(child.products) ? child.products : []).map((item: any) => String(typeof item === 'object' ? item.id : item)))
  const matchingChildren = (product: any) => children.filter((candidate) =>
    candidate.isVisible !== false && productMatchesFilter(product, candidate.filter || undefined))
  const specificity = (candidate: any) => Object.values(candidate.filter || {}).filter((value) => value !== '' && value != null).length
  return products.filter((product) => {
    if (directIds.has(String(product.id))) return true
    const matches = matchingChildren(product)
    if (!matches.some((candidate) => String(candidate.key) === String(child.key))) return false
    const best = Math.max(...matches.map(specificity))
    return specificity(child) === best
  })
}

function menuChildFilter(child: any, group: any): Record<string, string> | undefined {
  if (child.filter && typeof child.filter === 'object' && !Array.isArray(child.filter)) return child.filter
  if (child.href) return undefined
  const parentFilter = group.filter && typeof group.filter === 'object' && !Array.isArray(group.filter) ? group.filter : {}
  return Object.keys(parentFilter).length > 0 ? parentFilter : undefined
}

function productHref(product: any): string {
  const category = product.category && typeof product.category === 'object' ? product.category.slug : null
  return `/catalog/${productGroupSlug(product.productGroup) || category || 'other'}/${product.slug}`
}

export async function getBrandCatalogNavigation(): Promise<BrandCatalogNavigationItem[]> {
  return getCachedBrandCatalogNavigation()
}

const getCachedBrandCatalogNavigation = unstable_cache(
  async (): Promise<BrandCatalogNavigationItem[]> => {
  try {
    const payload = await getPayloadClient()
    const [value, productResult] = await Promise.all([
      payload.findGlobal({ slug: 'brand-catalog-navigation', depth: 1 }),
      payload.find({ collection: 'products', depth: 0, limit: 1000, pagination: false, where: { isAvailable: { equals: true } } }),
    ]) as [any, any]
    const products = productResult.docs as any[]
    const source = Array.isArray(value.groups) && value.groups.length >= 6 ? value.groups : DEFAULT_BRAND_CATALOG_MENU
    const menu = visibleBrandMenu(source.map((group: any) => {
      const children = Array.isArray(group.children) ? group.children : []
      return {
        label: String(group.title ?? group.label), key: String(group.key), href: resolveBrandHref(String(group.key), group.href, group.filter), filter: group.filter || undefined,
        coverImage: group.coverImage || null, isVisible: group.isVisible !== false, isNew: group.isNew === true, sortOrder: Number(group.sortOrder ?? 0),
        items: children.map((child: any) => {
          const filter = menuChildFilter(child, group)
          const href = catalogNavigationHref({ key: String(child.key), href: typeof child.href === 'string' ? child.href : undefined, filter, preserveKey: true })
          return {
          label: String(child.title ?? child.label), key: String(child.key), href, filter,
          coverImage: child.coverImage || null, isVisible: child.isVisible !== false, isNew: child.isNew === true, sortOrder: Number(child.sortOrder ?? 0),
          products: productsForMenuChild(products, children, child).sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || Number(a.id) - Number(b.id)).map((product) => ({ id: product.id, name: product.name, href: productHref(product), isNew: Boolean(product.isNew) })),
          }
        }),
      }
    }) as BrandMenu[])
    return menu.map((group) => ({
      title: group.label, key: group.key, href: group.href, filter: group.filter, coverImage: group.coverImage,
      isVisible: group.isVisible, isNew: group.isNew, sortOrder: group.sortOrder,
      children: group.items.map((child) => ({ title: child.label, key: child.key, href: child.href, filter: child.filter, coverImage: child.coverImage, isVisible: child.isVisible, isNew: child.isNew, sortOrder: child.sortOrder, products: child.products })),
    }))
  } catch {
    return DEFAULT_BRAND_CATALOG_MENU.map((group) => ({
      title: group.label, key: group.key, href: group.href, filter: group.filter, coverImage: null, isVisible: true, sortOrder: group.sortOrder,
      children: group.items.map((child) => ({ title: child.label, key: child.key, href: child.href, filter: child.filter, coverImage: null, isVisible: true, sortOrder: child.sortOrder })),
    }))
  }
  },
  ['brand-catalog-navigation'],
  { revalidate: 60 },
)

export { sortProductsByPriority }

export async function getNavData(): Promise<NavCategory[]> {
  return getCachedNavData()
}

const getCachedNavData = unstable_cache(
  async (): Promise<NavCategory[]> => {
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
          .map(p => ({ model: p.name, slug: p.slug, name: p.name, badge: p.badge || null })),
      ),
    }))
  } catch (error) {
    console.error('Failed to load nav data', error)
    return []
  }
  },
  ['frontend-nav-data'],
  { revalidate: 60 },
)

export async function getGroupNavData(): Promise<NavGroup[]> {
  return getCachedGroupNavData()
}

const getCachedGroupNavData = unstable_cache(
  async (): Promise<NavGroup[]> => {
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
  },
  ['frontend-group-nav-data'],
  { revalidate: 60 },
)

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
          ? productCanonicalUrl(product) || doc.href || '/catalog'
          : doc.href || (doc.kind === 'line' && doc.productGroup && doc.brand && doc.productLine
            ? `/catalog?group=${encodeURIComponent(doc.productGroup)}&brand=${encodeURIComponent(doc.brand)}&line=${encodeURIComponent(doc.productLine)}`
            : doc.kind === 'brand' && doc.productGroup && doc.brand
              ? `/catalog?group=${encodeURIComponent(doc.productGroup)}&brand=${encodeURIComponent(doc.brand)}`
              : doc.productGroup ? `/catalog?group=${encodeURIComponent(doc.productGroup)}` : '/catalog'),
        sortOrder: Number(doc.sortOrder ?? 0),
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
    const sortNodes = (items: CatalogNavNode[]) => {
      items.sort((a, b) => Number((a as any).sortOrder ?? 0) - Number((b as any).sortOrder ?? 0) || String(a.id).localeCompare(String(b.id), 'en'))
      items.forEach((item) => sortNodes(item.children))
    }
    sortNodes(roots)
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
