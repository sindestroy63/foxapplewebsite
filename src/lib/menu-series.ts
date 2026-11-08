export type MenuProduct = { id: string | number; name: string; href: string; isNew?: boolean }
export type MenuSeries = { key: string; label: string; products: MenuProduct[] }

type SeriesRule = { label: string; pattern: RegExp }

const MIN_SERIES = 2
const MIN_PRODUCTS_IN_SERIES = 2

const SERIES_RULES: Record<string, SeriesRule[]> = {
  samsung: [
    { label: 'Galaxy S', pattern: /^(?:Samsung\s+)?Galaxy\s+S\d/i },
    { label: 'Galaxy A', pattern: /^(?:Samsung\s+)?Galaxy\s+A\d/i },
    { label: 'Galaxy Z', pattern: /^(?:Samsung\s+)?Galaxy\s+Z\s/i },
  ],
  xiaomi: [
    { label: 'Xiaomi', pattern: /^Xiaomi\s+\d/i },
    { label: 'POCO', pattern: /^(?:Xiaomi\s+)?POCO\b/i },
    { label: 'Redmi', pattern: /^(?:Xiaomi\s+)?Redmi\s+(?!Note\b)/i },
    { label: 'Redmi Note', pattern: /^(?:Xiaomi\s+)?Redmi\s+Note\b/i },
  ],
}

export function buildMenuSeries(entries: Array<{ brand: unknown; product: MenuProduct }>): MenuSeries[] {
  const buckets = new Map<string, { order: number; series: MenuSeries }>()

  for (const { brand, product } of entries) {
    const brandKey = String(brand ?? '').trim().toLowerCase()
    const rules = SERIES_RULES[brandKey]
    const index = rules ? rules.findIndex((rule) => rule.pattern.test(product.name)) : -1
    if (!rules || index < 0) continue
    const label = rules[index].label
    const key = `${brandKey}-${label.toLowerCase().replace(/\s+/g, '-')}`
    const bucket = buckets.get(key) || { order: index, series: { key, label, products: [] } }
    bucket.series.products.push(product)
    buckets.set(key, bucket)
  }

  const series = [...buckets.values()]
    .filter((bucket) => bucket.series.products.length >= MIN_PRODUCTS_IN_SERIES)
    .sort((a, b) => a.order - b.order)
    .map((bucket) => bucket.series)

  return series.length >= MIN_SERIES ? series : []
}
