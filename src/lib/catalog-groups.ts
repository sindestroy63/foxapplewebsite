import type { ProductGroup } from './types'

export type CatalogGroupDefinition = {
  slug: ProductGroup
  label: string
  categorySlugs: string[]
}

export const CATALOG_GROUPS: CatalogGroupDefinition[] = [
  { slug: 'smartphones', label: 'Смартфоны', categorySlugs: ['iphone', 'samsung'] },
  { slug: 'tablets', label: 'Планшеты', categorySlugs: ['ipad'] },
  { slug: 'laptops', label: 'Ноутбуки', categorySlugs: ['macbook'] },
  { slug: 'smart-watches', label: 'Смарт-часы', categorySlugs: ['apple-watch', 'samsung-watch'] },
  { slug: 'audio', label: 'Наушники и аудио', categorySlugs: ['airpods', 'Samsung-headphones', 'samsung-headphones'] },
  { slug: 'gaming-consoles', label: 'Игровые консоли', categorySlugs: ['playstation'] },
  { slug: 'home-appliances', label: 'Бытовая техника', categorySlugs: ['dyson'] },
  { slug: 'smart-devices', label: 'Умные устройства', categorySlugs: [] },
  { slug: 'other', label: 'Другое', categorySlugs: ['drugoe'] },
]

const TRADE_IN_GROUP: CatalogGroupDefinition = { slug: 'trade-in', label: 'Trade-in', categorySlugs: [] }

export function getCatalogGroup(slug: string): CatalogGroupDefinition | undefined {
  return [...CATALOG_GROUPS, TRADE_IN_GROUP].find((group) => group.slug === slug)
}

export function categorySlugsForGroup(slug: ProductGroup): string[] {
  return getCatalogGroup(slug)?.categorySlugs || []
}

export function catalogGroupHref(slug: ProductGroup): string {
  return `/catalog?group=${slug}`
}

export function productGroupSlug(productGroup?: string | null): string | null {
  if (!productGroup) return null
  return getCatalogGroup(productGroup)?.slug || null
}

export function productBelongsToGroup(product: { productGroup?: ProductGroup | null }, slug: ProductGroup): boolean {
  return product.productGroup === slug
}

export const LEGACY_CATEGORY_GROUP_ALIASES: Record<string, ProductGroup> = {
  dyson: 'home-appliances',
  'ray-ban': 'smart-devices',
  accessories: 'other',
}
