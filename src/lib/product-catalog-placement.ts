export type ProductCatalogFields = {
  productGroup?: string | null
  brand?: string | null
  productLine?: string | null
  condition?: string | null
}

export type CatalogPlacementDefinition = {
  groupKey: string
  groupTitle: string
  childKey?: string
  childTitle?: string
  productGroup: string
  brand: string
  productLine: string
  condition: 'new' | 'used'
  query?: Record<string, string>
  matchLines?: string[]
}

const placement = (
  groupKey: string,
  groupTitle: string,
  childKey: string | undefined,
  childTitle: string | undefined,
  productGroup: string,
  brand = '',
  productLine = '',
  query?: Record<string, string>,
  matchLines?: string[],
): CatalogPlacementDefinition => ({
  groupKey, groupTitle, childKey, childTitle, productGroup, brand, productLine,
  condition: productGroup === 'trade-in' ? 'used' : 'new', query, matchLines,
})

/** One source of truth for CMS placement and public child filters. */
export const PRODUCT_CATALOG_PLACEMENTS: CatalogPlacementDefinition[] = [
  placement('apple', 'APPLE', 'iphone', 'iPhone', 'smartphones', 'Apple'),
  placement('apple', 'APPLE', 'ipad', 'iPad', 'tablets', 'Apple'),
  placement('apple', 'APPLE', 'apple-watch', 'Apple Watch', 'smart-watches', 'Apple'),
  placement('apple', 'APPLE', 'apple-airpods', 'Apple AirPods', 'audio', 'Apple'),
  placement('apple', 'APPLE', 'apple-mac', 'Apple Mac', 'laptops', 'Apple', '', undefined, ['iMac', 'Mac mini', 'Mac Studio', 'Mac Pro']),
  placement('apple', 'APPLE', 'macbook', 'MacBook', 'laptops', 'Apple'),
  placement('apple', 'APPLE', 'apple-accessories', 'Аксессуары Apple', 'other', 'Apple', '', { group: 'other', appleAccessories: '1' }),

  placement('samsung', 'SAMSUNG', 'samsung-smartphones', 'Смартфоны', 'smartphones', 'Samsung'),
  placement('samsung', 'SAMSUNG', 'samsung-tablets', 'Планшеты', 'tablets', 'Samsung'),
  placement('samsung', 'SAMSUNG', 'samsung-watches', 'Часы', 'smart-watches', 'Samsung'),
  placement('samsung', 'SAMSUNG', 'samsung-audio', 'Наушники', 'audio', 'Samsung'),

  placement('dyson', 'DYSON', 'dyson-hair-dryers', 'Фены Dyson', 'home-appliances', 'Dyson', 'Фен Dyson'),
  placement('dyson', 'DYSON', 'dyson-stylers', 'Стайлеры Dyson', 'home-appliances', 'Dyson', 'Стайлеры Dyson'),
  placement('dyson', 'DYSON', 'dyson-straighteners', 'Выпрямители Dyson', 'home-appliances', 'Dyson', 'Выпрямитель Dyson'),
  placement('dyson', 'DYSON', 'dyson-purifiers', 'Очистители Dyson', 'home-appliances', 'Dyson', 'Очистители Dyson'),
  placement('dyson', 'DYSON', 'dyson-vacuums', 'Пылесосы Dyson', 'home-appliances', 'Dyson', 'Пылесосы Dyson'),

  placement('playstation', 'PLAYSTATION', 'gamepads-ps5', 'Геймпады PS5', 'gaming-consoles', 'Sony', 'Геймпады PS5'),
  placement('playstation', 'PLAYSTATION', 'playstation-5', 'PlayStation 5', 'gaming-consoles', 'Sony'),

  placement('other', 'ДРУГОЕ', 'other-marshall', 'Marshall', 'audio', 'Marshall'),
  placement('other', 'ДРУГОЕ', 'other-gopro', 'GoPro', 'other', '', 'Экшн-камера GoPro', { group: 'other', q: 'GoPro' }),
  placement('other', 'ДРУГОЕ', 'other-screen-protectors', 'Защитные стёкла', 'other', '', 'Защитное стекло', { group: 'other', q: 'Защитное стекло' }),

  placement('trade-in', 'TRADE-IN', undefined, undefined, 'trade-in'),
]

export const BRAND_PLACEMENT_MAP = Object.fromEntries(
  PRODUCT_CATALOG_PLACEMENTS.filter((item) => item.childKey).map((item) => [item.childKey!, {
    productGroup: item.productGroup,
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.productLine ? { productLine: item.productLine } : {}),
  }]),
) as Record<string, { productGroup: string; brand?: string; productLine?: string }>

export function catalogPlacementFilter(item: CatalogPlacementDefinition): Record<string, string> {
  return item.query || {
    group: item.productGroup,
    ...(item.brand ? { brand: item.brand } : {}),
    ...(item.productLine ? { line: item.productLine } : {}),
  }
}

export function catalogPlacementHref(item: CatalogPlacementDefinition): string {
  if (item.productGroup === 'trade-in') return '/trade-in/catalog'
  return `/catalog?${new URLSearchParams(catalogPlacementFilter(item)).toString()}`
}

export function getCatalogPlacementByChildKey(childKey?: string | null) {
  return PRODUCT_CATALOG_PLACEMENTS.find((item) => item.childKey === childKey)
}

export function getCatalogPlacementTabs(fields: { productGroup?: string; brand?: string; line?: string; appleAccessories?: boolean }) {
  const brand = fields.brand?.trim()
  return PRODUCT_CATALOG_PLACEMENTS.filter((item) => {
    if (!item.childKey || item.productGroup === 'trade-in') return false
    if (brand && item.brand !== brand) return false
    if (!brand && fields.productGroup !== 'other') return false
    if (fields.productGroup && fields.productGroup !== 'other' && item.productGroup !== fields.productGroup) return false
    if (fields.productGroup === 'other' && item.groupKey !== 'other') return false
    if (fields.appleAccessories && item.childKey !== 'apple-accessories') return false
    if (fields.line && item.productLine !== fields.line) return false
    return true
  })
}

export function resolveProductCatalogPlacement(fields: ProductCatalogFields): CatalogPlacementDefinition | null {
  const storedProductGroup = String(fields.productGroup || '')
  const productGroup = storedProductGroup === 'accessories' ? 'other' : storedProductGroup
  const brand = String(fields.brand || '')
  const productLine = String(fields.productLine || '')
  if (productGroup === 'trade-in' || fields.condition === 'used' && !brand) {
    return PRODUCT_CATALOG_PLACEMENTS.find((item) => item.groupKey === 'trade-in') || null
  }

  const candidates = PRODUCT_CATALOG_PLACEMENTS.filter((item) =>
    item.productGroup === productGroup && item.brand === brand && item.groupKey !== 'trade-in')
  const lineMatch = candidates.find((item) =>
    item.productLine === productLine && Boolean(item.productLine)
    || item.matchLines?.some((line) => productLine === line || productLine.startsWith(`${line} `)))
  return lineMatch || candidates.find((item) => !item.productLine && !item.matchLines) || null
}
