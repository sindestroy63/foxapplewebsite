import type { Media } from './types'
import { PRODUCT_CATALOG_PLACEMENTS, catalogPlacementFilter, catalogPlacementHref } from './product-catalog-placement'

export { BRAND_PLACEMENT_MAP, resolveProductCatalogPlacement } from './product-catalog-placement'

export type BrandMenuItem = {
  label: string
  href: string
  key: string
  filter?: Record<string, string>
  coverImage?: Media | null
  isVisible?: boolean
  isNew?: boolean
  sortOrder?: number
  products?: Array<{ id: string | number; name: string; href: string; isNew?: boolean }>
}

export type BrandMenu = {
  label: string
  href: string
  key: string
  filter?: Record<string, string>
  coverImage?: Media | null
  isVisible?: boolean
  isNew?: boolean
  sortOrder?: number
  items: BrandMenuItem[]
}

const catalogHref = (params: Record<string, string>) => `/catalog?${new URLSearchParams(params).toString()}`
const item = (label: string, key: string, href: string, filter?: Record<string, string>): BrandMenuItem => ({ label, key, href, filter, isVisible: true, coverImage: null })

const childPlacement = (key: string) => PRODUCT_CATALOG_PLACEMENTS.find((placement) => placement.childKey === key)!
const mappedItem = (label: string, key: string): BrandMenuItem => {
  const placement = childPlacement(key)
  const filter = catalogPlacementFilter(placement)
  return item(label, key, catalogPlacementHref(placement), filter)
}

export const DEFAULT_BRAND_CATALOG_MENU: BrandMenu[] = [
  { label: 'APPLE', key: 'apple', href: catalogHref({ brand: 'Apple' }), filter: { brand: 'Apple' }, isVisible: true, coverImage: null, items: [
    mappedItem('iPhone', 'iphone'),
    mappedItem('iPad', 'ipad'),
    mappedItem('Apple Watch', 'apple-watch'),
    mappedItem('Apple AirPods', 'apple-airpods'),
    mappedItem('MacBook', 'macbook'),
    mappedItem('Apple Mac', 'apple-mac'),
    mappedItem('Аксессуары Apple', 'apple-accessories'),
  ] },
  { label: 'SAMSUNG', key: 'samsung', href: catalogHref({ brand: 'Samsung' }), filter: { brand: 'Samsung' }, isVisible: true, coverImage: null, items: [
    mappedItem('Смартфоны', 'samsung-smartphones'),
    mappedItem('Планшеты', 'samsung-tablets'),
    mappedItem('Часы', 'samsung-watches'),
    mappedItem('Наушники', 'samsung-audio'),
  ] },
  { label: 'DYSON', key: 'dyson', href: catalogHref({ brand: 'Dyson' }), filter: { brand: 'Dyson' }, isVisible: true, coverImage: null, items: [
    mappedItem('Фены Dyson', 'dyson-hair-dryers'),
    mappedItem('Стайлеры Dyson', 'dyson-stylers'),
    mappedItem('Выпрямители Dyson', 'dyson-straighteners'),
    mappedItem('Очистители Dyson', 'dyson-purifiers'),
    mappedItem('Пылесосы Dyson', 'dyson-vacuums'),
  ] },
  { label: 'PLAYSTATION', key: 'playstation', href: catalogHref({ group: 'gaming-consoles', brand: 'Sony' }), filter: { group: 'gaming-consoles', brand: 'Sony' }, isVisible: true, coverImage: null, items: [
    mappedItem('PlayStation 5', 'playstation-5'),
    mappedItem('Геймпады PS5', 'gamepads-ps5'),
  ] },
  { label: 'ДРУГОЕ', key: 'other', href: catalogHref({ group: 'other' }), filter: { group: 'other' }, isVisible: true, coverImage: null, items: [
    mappedItem('Marshall', 'other-marshall'),
    mappedItem('GoPro', 'other-gopro'),
    mappedItem('Защитные стёкла', 'other-screen-protectors'),
  ] },
  { label: 'TRADE-IN', key: 'trade-in', href: '/trade-in/catalog', isVisible: true, coverImage: null, items: [] },
]

export const BRAND_CATALOG_MENU = DEFAULT_BRAND_CATALOG_MENU
export const BRAND_CATALOG_CARDS = DEFAULT_BRAND_CATALOG_MENU.map(({ key, label, href, coverImage }) => ({ slug: key, label, href, coverImage }))

export function visibleBrandMenu(groups: BrandMenu[]): BrandMenu[] {
  return groups.filter((group) => group.isVisible !== false).sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)).map((group) => ({
    ...group,
    items: (group.items || []).filter((child) => child.isVisible !== false).sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
  }))
}
