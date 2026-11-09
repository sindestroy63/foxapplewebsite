export type MenuProduct = { id: string | number; name: string; href: string; isNew?: boolean }
export type MenuSeries = { key: string; label: string; products: MenuProduct[] }
export type SeriesEntry = { brand: unknown; series?: unknown; product: MenuProduct }
export type SeriesLabelSource = { brand: unknown; name: string; series?: unknown }

type SeriesRule = { label: string; pattern: RegExp }
type SeriesInput = { ok: true; value: string } | { ok: false; error: string }

export const SERIES_NONE = '__none__'
export const MAX_SERIES_LENGTH = 60

const MIN_SERIES = 2
const MIN_PRODUCTS_IN_SERIES = 2
const UNRANKED = Number.MAX_SAFE_INTEGER

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

function brandKeyOf(brand: unknown): string {
  return String(brand ?? '').trim().toLowerCase()
}

function collapse(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function autoSeriesLabel(brand: unknown, name: string): string {
  const rule = SERIES_RULES[brandKeyOf(brand)]?.find((item) => item.pattern.test(name))
  return rule?.label ?? ''
}

export function normalizeSeriesLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = collapse(raw)
  if (!value || value === SERIES_NONE || value.length > MAX_SERIES_LENGTH) return null
  return value
}

export function normalizeSeriesInput(raw: unknown): SeriesInput {
  if (raw === null || raw === undefined) return { ok: true, value: '' }
  if (typeof raw !== 'string') return { ok: false, error: 'Название серии должно быть текстом.' }
  const value = collapse(raw)
  if (value === '' || value === SERIES_NONE) return { ok: true, value }
  if (value.length > MAX_SERIES_LENGTH) return { ok: false, error: `Название серии не длиннее ${MAX_SERIES_LENGTH} символов.` }
  return { ok: true, value }
}

function rankOf(brand: unknown, label: string): { label: string; order: number } {
  const rules = SERIES_RULES[brandKeyOf(brand)] || []
  const index = rules.findIndex((rule) => rule.label.toLowerCase() === label.toLowerCase())
  return index < 0 ? { label, order: UNRANKED } : { label: rules[index].label, order: index }
}

function resolveLabel(brand: unknown, name: string, series: unknown): { label: string; order: number; manual: boolean } | null {
  const manual = typeof series === 'string' ? collapse(series) : ''
  if (manual === SERIES_NONE) return null
  const label = manual || autoSeriesLabel(brand, name)
  if (!label) return null
  return { ...rankOf(brand, label), manual: manual !== '' }
}

function seriesKey(label: string): string {
  return label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'series'
}

type Bucket = { order: number; seen: number; series: MenuSeries }

function byRank(a: Bucket, b: Bucket): number {
  return a.order === b.order ? a.seen - b.seen : a.order < b.order ? -1 : 1
}

export function buildMenuSeries(entries: SeriesEntry[]): MenuSeries[] {
  const buckets = new Map<string, Bucket>()
  let curated = false

  entries.forEach(({ brand, series, product }, seen) => {
    const resolved = resolveLabel(brand, product.name, series)
    if (!resolved) return
    if (resolved.manual) curated = true
    const key = seriesKey(resolved.label)
    const bucket = buckets.get(key) || { order: resolved.order, seen, series: { key, label: resolved.label, products: [] } }
    bucket.series.products.push(product)
    buckets.set(key, bucket)
  })

  const ordered = [...buckets.values()].sort(byRank)
  if (curated) return ordered.map((bucket) => bucket.series)

  const large = ordered.filter((bucket) => bucket.series.products.length >= MIN_PRODUCTS_IN_SERIES)
  return large.length >= MIN_SERIES ? large.map((bucket) => bucket.series) : []
}

export function collectSeriesLabels(items: SeriesLabelSource[]): string[] {
  const labels = new Map<string, Bucket>()
  items.forEach(({ brand, name, series }, seen) => {
    const resolved = resolveLabel(brand, name, series)
    if (!resolved) return
    const key = seriesKey(resolved.label)
    if (!labels.has(key)) labels.set(key, { order: resolved.order, seen, series: { key, label: resolved.label, products: [] } })
  })
  return [...labels.values()].sort(byRank).map((bucket) => bucket.series.label)
}
