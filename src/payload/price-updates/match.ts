import type { AICatalogItem } from './ai-response'
import { canonicalText, normalizeColor, normalizeModel, normalizeModelKey, normalizeRam, normalizeRegion, normalizeSim, normalizeStorage } from './normalization.ts'

export type MatchStatus = 'matched' | 'ambiguous' | 'not_found' | 'missing_attributes' | 'manual_review' | 'excluded_used'
export type CatalogVariant = { id: string; sku: string; price?: number; color?: string; storage?: string; sim?: string; ram?: string; size?: string; screenSize?: string; connectivity?: string; generation?: string; chip?: string; manufacturerModelNumber?: string; region?: string; hasTouchId?: boolean }
export type CatalogProduct = { id: number | string; name: string; model?: string; sku?: string; price?: number; category?: { slug?: string; name?: string }; productGroup?: string; condition?: 'new' | 'used'; brand?: string; productType?: string; productLine?: string; variants: CatalogVariant[] }
export type MatchCandidate = { productId: number | string; productName: string; matchType: 'product' | 'variant'; variantId?: string; sku: string; storage?: string; ram?: string; color?: string; sim?: string; region?: string; size?: string; screenSize?: string; connectivity?: string; generation?: string; chip?: string; manufacturerModelNumber?: string; reason: string }
export type MatchResult = { status: MatchStatus; reason: string; candidates: MatchCandidate[]; selected?: MatchCandidate }

export function candidateByKey<T extends MatchCandidate & { key: string }>(candidates: T[], key: string): T | undefined { return candidates.find((candidate) => candidate.key === key) }
export function canManuallyConfirmMissingAttributes(status: MatchStatus, candidates: MatchCandidate[]): boolean { return status === 'missing_attributes' && candidates.length === 1 }
export function buildPreviewPriceInput(items: Array<{ resolution: string; selectedSku?: string | null; price: number }>): string {
  if (items.some((item) => item.resolution === 'pending')) throw new Error('Есть неразрешённые позиции.')
  const selected = items.filter((item) => item.resolution === 'automatic' || item.resolution === 'manual')
  if (selected.some((item) => !item.selectedSku)) throw new Error('У выбранной позиции отсутствует SKU.')
  const skus = selected.map((item) => item.selectedSku as string)
  if (new Set(skus).size !== skus.length) throw new Error('Один SKU выбран для нескольких строк.')
  return selected.map((item) => `${item.selectedSku} — ${item.price}`).join('\n')
}

function isUsed(product: CatalogProduct): boolean {
  const slug = product.category?.slug?.toLowerCase() || ''
  return product.condition === 'used' || product.productGroup === 'trade-in' || slug === 'used' || /\bб\s*\/\s*у\b|\bб\.?у\.?\b|used/i.test(`${product.name} ${product.model || ''}`)
}
function variantRam(variant?: CatalogVariant): string {
  if (!variant) return ''
  if (variant.ram) return normalizeRam(variant.ram)
  const match = variant.storage?.match(/^\s*(\d+)\s*[|/]/u)
  return match ? `${match[1]}GB` : ''
}
function candidateFor(product: CatalogProduct, variant?: CatalogVariant): MatchCandidate | null {
  const sku = variant?.sku || product.sku
  if (!sku) return null
  return { productId: product.id, productName: product.name, matchType: variant ? 'variant' : 'product', variantId: variant?.id, sku, storage: variant?.storage, ram: variantRam(variant) || undefined, color: variant?.color, sim: variant?.sim, region: variant?.region, size: variant?.size, screenSize: variant?.screenSize, connectivity: variant?.connectivity, generation: variant?.generation, chip: variant?.chip, manufacturerModelNumber: variant?.manufacturerModelNumber, reason: 'Точное совпадение' }
}
function productModelKeys(product: CatalogProduct): string[] { return [...new Set([normalizeModelKey(product.name), normalizeModelKey(product.model), normalizeModelKey(product.productLine)].filter(Boolean))] }
function modelProductsForItem(item: AICatalogItem, catalog: CatalogProduct[], modelKey: string): CatalogProduct[] {
  const family = item.productType || ''
  if (family === 'mac') {
    const line = /neo/i.test(item.modelText) ? 'neo' : /air/i.test(item.modelText) ? 'air' : /pro/i.test(item.modelText) ? 'pro' : ''
    return catalog.filter((product) => product.productGroup === 'laptops' && (!line || canonicalText(`${product.name} ${product.model}` || '').includes(line)))
  }
  if (family === 'ipad') {
    const line = /mini/i.test(item.modelText) ? 'mini' : /air/i.test(item.modelText) ? 'air' : /pro/i.test(item.modelText) ? 'pro' : 'base'
    return catalog.filter((product) => {
      if (product.productGroup !== 'tablets') return false
      const text = canonicalText(`${product.name} ${product.model}`)
      if (line === 'base') return text.includes('ipad') && !/(mini|air|pro)/u.test(text)
      return text.includes(line)
    })
  }
  if (family === 'watch') {
    const wanted = canonicalText(item.modelText)
    return catalog.filter((product) => product.productGroup === 'smart-watches' && canonicalText(`${product.name} ${product.model}`).includes(wanted.replace('applewatch', '')))
  }
  return catalog.filter((product) => productModelKeys(product).includes(modelKey))
}
function candidatesForProducts(products: CatalogProduct[]): MatchCandidate[] {
  return products.flatMap((product) => product.variants.length ? product.variants.map((variant) => candidateFor(product, variant)).filter((entry): entry is MatchCandidate => Boolean(entry)) : [candidateFor(product)].filter((entry): entry is MatchCandidate => Boolean(entry)))
}
function candidateMatchScore(candidate: MatchCandidate, item: AICatalogItem, modelKey: string): number {
  let score = 1
  if (item.storage && normalizeStorage(candidate.storage) === normalizeStorage(item.storage)) score += 1
  if (item.ram && normalizeRam(candidate.ram) === normalizeRam(item.ram)) score += 1
  if (item.color && canonicalText(normalizeColor(candidate.color, modelKey)) === canonicalText(normalizeColor(item.color, modelKey))) score += 1
  if (item.sim && normalizeSim(candidate.sim) === normalizeSim(item.sim)) score += 1
  if (item.region && candidate.region && canonicalText(normalizeRegion(candidate.region)) === canonicalText(normalizeRegion(item.region))) score += 1
  return score
}
function topCandidates(candidates: MatchCandidate[], item?: AICatalogItem, modelKey?: string, limit = 5): MatchCandidate[] {
  return [...candidates].sort((a, b) => {
    const scoreDelta = item && modelKey ? candidateMatchScore(b, item, modelKey) - candidateMatchScore(a, item, modelKey) : 0
    if (scoreDelta) return scoreDelta
    return `${a.productName} ${a.storage || ''} ${a.color || ''} ${a.sim || ''}`.localeCompare(`${b.productName} ${b.storage || ''} ${b.color || ''} ${b.sim || ''}`)
  }).slice(0, limit)
}

export function matchCatalogItem(item: AICatalogItem, catalog: CatalogProduct[]): MatchResult {
  const model = normalizeModel(item.modelText, item.contextHeading)
  const modelProducts = modelProductsForItem(item, catalog, model.key)
  if (!modelProducts.length) return { status: 'not_found', reason: 'Не совпало поле «модель»: товар с такой моделью не найден.', candidates: [] }
  const products = modelProducts.filter((product) => !isUsed(product))
  if (!products.length) return { status: 'excluded_used', reason: 'Совпала только позиция из раздела Б/У; автоматическое обновление запрещено.', candidates: [] }
  let candidates = candidatesForProducts(products)
  const requestedStorage = normalizeStorage(item.storage)
  const requestedRam = normalizeRam(item.ram)
  const requestedColor = normalizeColor(item.color, model.key)
  const requestedSim = normalizeSim(item.sim)
  const requestedRegion = normalizeRegion(item.region)
  const requestedChip = typeof item.chip === 'string' ? item.chip.trim().toLowerCase() : ''
  const requestedScreen = typeof item.screenSize === 'string' ? item.screenSize.replace(/["″]/g, '').trim() : ''
  const requestedConnectivity = typeof item.connectivity === 'string' ? item.connectivity.toLowerCase().replace(/\s+/g, '') : ''
  const requestedSize = typeof item.size === 'string' ? item.size.replace(/\s+/g, '').toLowerCase() : ''
  const requestedArticle = typeof item.manufacturerModelNumber === 'string' ? item.manufacturerModelNumber.trim().toLowerCase() : ''
  const stages: Array<{ label: string; value: string; test: (candidate: MatchCandidate) => boolean }> = [
    { label: 'артикул', value: requestedArticle, test: (candidate) => !candidate.manufacturerModelNumber || String(candidate.manufacturerModelNumber).trim().toLowerCase() === requestedArticle },
    { label: 'накопитель', value: requestedStorage, test: (candidate) => normalizeStorage(candidate.storage) === requestedStorage },
    { label: 'RAM', value: requestedRam, test: (candidate) => normalizeRam(candidate.ram) === requestedRam },
    { label: 'цвет', value: requestedColor, test: (candidate) => canonicalText(normalizeColor(candidate.color, model.key)) === canonicalText(requestedColor) },
    { label: 'SIM', value: requestedSim, test: (candidate) => normalizeSim(candidate.sim) === requestedSim },
    { label: 'регион', value: requestedRegion, test: (candidate) => !candidate.region || canonicalText(normalizeRegion(candidate.region)) === canonicalText(requestedRegion) },
    { label: 'чип', value: requestedChip, test: (candidate) => !candidate.chip || String(candidate.chip).trim().toLowerCase() === requestedChip },
    { label: 'диагональ/размер', value: requestedScreen || requestedSize, test: (candidate) => { const actual = String(candidate.screenSize || candidate.size || '').replace(/["″]/g, '').replace(/\s+/g, '').toLowerCase(); const wanted = requestedScreen || requestedSize; return actual === wanted || actual.startsWith(`${wanted}.`) } },
    { label: 'подключение', value: requestedConnectivity, test: (candidate) => String(candidate.connectivity || '').toLowerCase().replace(/\s+/g, '') === requestedConnectivity },
  ]
  const matchedFields = ['модель']
  for (const stage of stages) {
    if (!stage.value) continue
    const before = candidates
    candidates = candidates.filter(stage.test)
    if (!candidates.length) return { status: 'not_found', reason: `Не совпало поле «${stage.label}»: в найденной модели нет такой конфигурации. (field: ${stage.label})`, candidates: topCandidates(before, item, model.key) }
    matchedFields.push(stage.label)
  }
  const relevant = topCandidates(candidates, item, model.key)
  const reviewNote = (item.notes || []).find((note) => /(?:актив|уценк|мятая коробка|\bob\b)/iu.test(note))
  if (reviewNote && relevant.length) return { status: 'manual_review', reason: `Пометка «${reviewNote}» требует ручной проверки.`, candidates: relevant }
  if (!relevant.length) return { status: 'not_found', reason: 'Не найдено ни одного совместимого варианта.', candidates: [] }
  const explained = relevant.map((candidate) => ({ ...candidate, reason: `Совпало: ${matchedFields.join(', ')}.` }))
  if (explained.length > 1) return { status: 'ambiguous', reason: 'Осталось несколько совместимых конфигураций; автоматический выбор запрещён.', candidates: explained }
  return { status: 'matched', reason: 'Найдено ровно одно совместимое совпадение.', candidates: explained, selected: explained[0] }
}
