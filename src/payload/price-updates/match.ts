import type { AICatalogItem } from './ai-response'

export type MatchStatus = 'matched' | 'ambiguous' | 'not_found' | 'missing_attributes' | 'manual_review' | 'excluded_used'

export type CatalogVariant = {
  id: string
  sku: string
  price?: number
  color?: string
  storage?: string
  sim?: string
  ram?: string
  size?: string
  screenSize?: string
  connectivity?: string
  generation?: string
  hasTouchId?: boolean
}

export type CatalogProduct = {
  id: number | string
  name: string
  model?: string
  sku?: string
  price?: number
  category?: { slug?: string; name?: string }
  productGroup?: string
  condition?: 'new' | 'used'
  brand?: string
  productType?: string
  productLine?: string
  variants: CatalogVariant[]
}

export type MatchCandidate = {
  productId: number | string
  productName: string
  matchType: 'product' | 'variant'
  variantId?: string
  sku: string
  storage?: string
  ram?: string
  color?: string
  sim?: string
  size?: string
  screenSize?: string
  connectivity?: string
  generation?: string
  reason: string
}

export type MatchResult = { status: MatchStatus; reason: string; candidates: MatchCandidate[]; selected?: MatchCandidate }

export function candidateByKey<T extends MatchCandidate & { key: string }>(candidates: T[], key: string): T | undefined {
  return candidates.find((candidate) => candidate.key === key)
}

export function canManuallyConfirmMissingAttributes(status: MatchStatus, candidates: MatchCandidate[]): boolean {
  return status === 'missing_attributes' && candidates.length === 1
}

export function buildPreviewPriceInput(items: Array<{ resolution: string; selectedSku?: string | null; price: number }>): string {
  if (items.some((item) => item.resolution === 'pending')) throw new Error('Есть неразрешённые позиции.')
  const selected = items.filter((item) => item.resolution === 'automatic' || item.resolution === 'manual')
  if (selected.some((item) => !item.selectedSku)) throw new Error('У выбранной позиции отсутствует SKU.')
  const skus = selected.map((item) => item.selectedSku as string)
  if (new Set(skus).size !== skus.length) throw new Error('Один SKU выбран для нескольких строк.')
  return selected.map((item) => `${item.selectedSku} — ${item.price}`).join('\n')
}

function words(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFKC').toLowerCase().replace(/[ё]/g, 'е')
    .replace(/([a-zа-я])(\d)/giu, '$1 $2').replace(/(\d)([a-zа-я])/giu, '$1 $2')
    .replace(/\b(samsung|galaxy|apple)\b/giu, ' ').replace(/\b(20\d{2})\b/gu, ' ')
    .replace(/\b(disc)\b/gu, 'disk').replace(/[^a-zа-я0-9]+/giu, ' ').trim().replace(/\s+/g, ' ') : ''
}

function canonicalModel(value: unknown): string {
  const raw = words(value).replace(/(?:^|\s)1\s*шт(?:$|\s)/gu, ' ').trim().replace(/\s+/gu, ' ')
  if (!raw) return ''
  const samsung = raw.match(/^(?:samsung )?(?:galaxy )?(s\d{2})(?: (plus|ultra))?$/u)
  if (samsung) return `samsung galaxy ${samsung[1]}${samsung[2] ? ` ${samsung[2]}` : ''}`
  const fold = raw.match(/^(?:samsung )?(?:galaxy )?z fold ?8(?: ultra)?$/u)
  if (fold) return `samsung galaxy ${raw.includes('ultra') ? 'z fold8 ultra' : 'z fold8'}`
  if (/^(?:samsung )?(?:galaxy )?a57$/u.test(raw)) return 'samsung galaxy a57'
  if (/^(?:iphone )?17e$/u.test(raw)) return 'iphone 17e'
  if (/^(?:iphone )?17 pro max$/u.test(raw)) return 'iphone 17 pro max'
  if (/^(?:iphone )?17 pro$/u.test(raw)) return 'iphone 17 pro'
  if (/^(?:iphone )?air$/u.test(raw)) return 'iphone air'
  if (/^pro max$/u.test(raw)) return 'iphone 17 pro max'
  const playstation = raw.match(/^(?:playstation|ps) 5(?: slim)? (disk|digital|цифровая|с дисководом|diskovodom)$/u)
  if (playstation) return `playstation 5 slim ${/digital|цифровая/u.test(playstation[1]) ? 'digital' : 'disk'}`
  if (raw === '17') return 'iphone 17'
  if (raw === '17 max') return '17 max'
  return raw
}

function storageKey(value?: string | null): string {
  if (!value) return ''
  const normalized = value.toUpperCase().replace(/ГБ/g, 'GB').replace(/ТБ/g, 'TB')
  const matches = [...normalized.matchAll(/(\d+)\s*(GB|TB)/g)]
  return matches.length ? `${matches[matches.length - 1][1]}${matches[matches.length - 1][2]}` : words(value).replace(/\s/g, '')
}
function ramKey(value?: string | null): string { return value ? value.match(/\d+/u)?.[0] || words(value) : '' }
function textKey(value?: string | null): string { return words(value).replace(/\s/g, '') }
function simKey(value?: string | null): string {
  const normalized = textKey(value)
  if (normalized === 'esim') return 'esim'
  if (normalized.includes('sim') && normalized.includes('esim')) return 'sim+esim'
  return normalized
}
function isUsed(product: CatalogProduct): boolean {
  const slug = product.category?.slug?.toLowerCase() || ''
  return product.condition === 'used' || product.productGroup === 'trade-in' || slug === 'used' || /\bб\s*\/\s*у\b|\bб\.?у\.?\b|used/i.test(`${product.name} ${product.model || ''}`)
}
function variantRam(variant?: CatalogVariant): string {
  if (!variant) return ''
  if (variant.ram) return ramKey(variant.ram)
  return variant.storage?.match(/^\s*(\d+)\s*[|/]/u)?.[1] || ''
}
function candidateFor(product: CatalogProduct, variant?: CatalogVariant, reason = 'Точное совпадение'): MatchCandidate | null {
  const sku = variant?.sku || product.sku
  if (!sku) return null
  return { productId: product.id, productName: product.name, matchType: variant ? 'variant' : 'product', variantId: variant?.id, sku,
    storage: variant?.storage, ram: variantRam(variant) || undefined, color: variant?.color, sim: variant?.sim,
    size: variant?.size, screenSize: variant?.screenSize, connectivity: variant?.connectivity, generation: variant?.generation, reason }
}
function productModelKeys(product: CatalogProduct): string[] {
  return [...new Set([canonicalModel(product.name), canonicalModel(product.model), canonicalModel(product.productLine)].filter(Boolean))]
}
function modelProducts(item: AICatalogItem, products: CatalogProduct[]): { products: CatalogProduct[]; missingHeading: boolean } {
  const rawModel = canonicalModel(item.modelText)
  if (rawModel === '17 max') return { products: products.filter((p) => productModelKeys(p).includes('iphone 17 pro max')), missingHeading: true }
  const target = rawModel === '17 max' ? 'iphone 17 pro max' : rawModel
  return { products: products.filter((p) => productModelKeys(p).includes(target)), missingHeading: false }
}
function candidatesForProducts(products: CatalogProduct[]): MatchCandidate[] {
  return products.flatMap((product) => product.variants.length ? product.variants.map((v) => candidateFor(product, v)).filter((v): v is MatchCandidate => Boolean(v)) : [candidateFor(product)].filter((v): v is MatchCandidate => Boolean(v)))
}

export function matchCatalogItem(item: AICatalogItem, catalog: CatalogProduct[]): MatchResult {
  const modelMatch = modelProducts(item, catalog)
  if (!modelMatch.products.length) return { status: 'not_found', reason: 'Товар с такой моделью не найден.', candidates: [] }
  const normalProducts = modelMatch.products.filter((product) => !isUsed(product))
  if (!normalProducts.length) return { status: 'excluded_used', reason: 'Позиция относится к Б/У товару и не участвует в автоматическом обновлении цен', candidates: [] }
  if (modelMatch.missingHeading) return { status: 'ambiguous', reason: 'Сокращение «17 Max» требует видимого заголовка «17 Pro Max».', candidates: candidatesForProducts(normalProducts) }
  let candidates = candidatesForProducts(normalProducts)
  const requestedStorage = storageKey(item.storage), requestedRam = ramKey(item.ram), requestedSim = simKey(item.sim), requestedColor = textKey(item.color)
  if (requestedStorage) candidates = candidates.filter((c) => storageKey(c.storage) === requestedStorage)
  if (requestedRam) candidates = candidates.filter((c) => ramKey(c.ram) === requestedRam)
  if (requestedSim) candidates = candidates.filter((c) => simKey(c.sim) === requestedSim)
  const beforeColor = candidates
  if (requestedColor) candidates = candidates.filter((c) => textKey(c.color) === requestedColor)
  const alias = requestedColor === 'blue' ? 'deepblue' : requestedColor === 'orange' ? 'cosmicorange' : ''
  const aliasAllowed = normalProducts.length === 1 && /iphone 17 pro max/i.test(`${normalProducts[0].name} ${normalProducts[0].model || ''}`)
  const aliasCandidates = !candidates.length && alias && aliasAllowed ? beforeColor.filter((c) => textKey(c.color) === alias).map((c) => ({ ...c, reason: `Цвет «${item.color}» требует ручного подтверждения как «${c.color}».` })) : []
  const relevant = candidates.length ? candidates : aliasCandidates
  const reviewNote = (item.notes || []).find((note) => /(?:актив|уценк|мятая коробка|\bob\b)/iu.test(note))
  if (reviewNote && relevant.length) {
    return { status: 'manual_review', reason: `Пометка «${reviewNote}» требует ручной проверки.`, candidates: relevant }
  }
  if (aliasCandidates.length) return { status: 'ambiguous', reason: 'Цвет требует ручного подтверждения.', candidates: aliasCandidates }
  if (!relevant.length) return { status: 'not_found', reason: 'Модель найдена, но точной конфигурации не обнаружено.', candidates: [] }
  if (relevant.length > 1) return { status: 'ambiguous', reason: 'Найдено несколько подходящих конфигураций.', candidates: relevant }
  return { status: 'matched', reason: 'Найдено одно точное совпадение.', candidates: relevant, selected: relevant[0] }
}
