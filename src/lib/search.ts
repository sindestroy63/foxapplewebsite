import type { Product, ProductVariant } from './types'
import { getCatalogPrice } from './pricing.ts'

type SearchAlias = { terms: string[]; phrases?: string[] }

// Keep this dictionary small and catalog-oriented. Aliases add candidates;
// they never replace the user's original query.
const aliases: Record<string, SearchAlias> = {
  часы: { terms: ['watch'], phrases: ['часы'] },
  'смарт часы': { terms: ['watch'], phrases: ['смарт часы', 'смарт-часы'] },
  наушники: { terms: ['headphones', 'earbuds', 'airpods', 'buds'] },
  телефон: { terms: ['phone', 'iphone', 'galaxy'] },
  смартфон: { terms: ['phone', 'iphone', 'galaxy'] },
  планшет: { terms: ['tablet', 'ipad'] },
  ноутбук: { terms: ['laptop', 'macbook'] },
  айфон: { terms: ['iphone'] },
  макбук: { terms: ['macbook'] },
  айпад: { terms: ['ipad'] },
  аирподс: { terms: ['airpods'] },
  самсунг: { terms: ['samsung'] },
  плейстейшн: { terms: ['playstation'] },
}

const groupSearchText: Record<string, string> = {
  smartphones: 'смартфоны смартфон phone iphone galaxy',
  tablets: 'планшеты планшет tablet ipad',
  laptops: 'ноутбуки ноутбук laptop macbook',
  'smart-watches': 'смарт часы часы watch',
  audio: 'наушники headphones earbuds airpods buds аудио',
}

const groupCategoryText: Record<string, string> = {
  smartphones: 'смартфоны смартфон',
  tablets: 'планшеты планшет',
  laptops: 'ноутбуки ноутбук',
  'smart-watches': 'смарт часы часы',
  audio: 'наушники аудио',
}

export function normalizeSearch(value: string): string {
  return value.toLowerCase().replace(/[ё]/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function searchTokens(value: string): string[] {
  return normalizeSearch(value).split(' ').filter(Boolean)
}

function compact(value: unknown): string {
  return normalizeSearch(String(value || '')).replace(/\s/g, '')
}

function queryParts(query: string) {
  const normalized = normalizeSearch(query)
  const original = searchTokens(query)
  const phraseAlias = aliases[normalized]
  const semantic = [...new Set([...original.flatMap((token) => aliases[token]?.terms || []), ...(phraseAlias?.terms || [])])]
  return { normalized, original, phraseAlias, semantic }
}

function matchesAll(text: string, tokens: string[]): boolean {
  return tokens.every((token) => text.includes(compact(token)))
}

function matchesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(compact(term)))
}

export function searchQueryTerms(query: string): string[] {
  const { original, semantic } = queryParts(query)
  return [...new Set([...original, ...semantic])]
}

export function variantSearchText(variant: ProductVariant): string {
  const color = variant.color && typeof variant.color === 'object'
    ? [variant.color.value, variant.color.englishLabel, variant.color.russianLabel]
    : [variant.color]
  return compact([
    variant.memory, variant.storage, variant.size, variant.sim, variant.simType,
    variant.chip, variant.ram, variant.screenSize, variant.connectivity,
    variant.generation, variant.revision, variant.packageLabel, ...color,
  ].join(' '))
}

export function productSearchText(product: Product): string {
  const category = product.category && typeof product.category === 'object'
    ? [product.category.name, product.category.slug]
    : [product.category]
  const group = product.productGroup ? groupSearchText[product.productGroup] || product.productGroup : ''
  return compact([
    product.name, product.model, product.slug, product.brand, product.productLine,
    product.productType, product.deviceType, product.sku, ...category, group,
  ].join(' '))
}

function productMetadataSearchText(product: Product): string {
  const category = product.category && typeof product.category === 'object'
    ? [product.category.name, product.category.slug]
    : [product.category]
  return compact([
    product.name, product.model, product.slug, product.brand, product.productLine,
    product.productType, product.deviceType, product.sku, ...category,
  ].join(' '))
}

function titleSearchText(product: Product): string {
  return compact([product.name, product.model].filter(Boolean).join(' '))
}

function categorySearchText(product: Product): string {
  const category = product.category && typeof product.category === 'object'
    ? [product.category.name, product.category.slug]
    : [product.category]
  return compact([product.productGroup ? groupCategoryText[product.productGroup] : '', ...category].join(' '))
}

export function matchingVariant(product: Product, query: string): ProductVariant | null {
  const { original, semantic } = queryParts(query)
  const variants = product.variants?.length ? product.variants : [{ ...product, price: product.price } as ProductVariant]
  const productText = productSearchText(product)
  return variants.find((variant) => {
    const text = compact(variantSearchText(variant))
    return matchesAll(`${productText} ${text}`, original) || matchesAny(`${productText} ${text}`, semantic)
  }) || null
}

export function searchScore(product: Product, query: string): number {
  const { normalized, original, phraseAlias, semantic } = queryParts(query)
  if (!original.length) return -1
  const title = titleSearchText(product)
  const category = categorySearchText(product)
  const variant = matchingVariant(product, query)
  const originalText = `${title} ${category} ${variant ? variantSearchText(variant) : ''}`
  const originalMatch = matchesAll(originalText, original)
  const aliasTitleMatch = matchesAny(title, semantic)
  const aliasCategoryMatch = matchesAny(category, semantic)
  const aliasProductMatch = matchesAny(productMetadataSearchText(product), semantic)
  const compactQuery = compact(normalized)

  if (originalMatch && title === compactQuery) return 1200
  if (originalMatch && title.startsWith(compactQuery)) return 1000
  if (originalMatch && title.includes(compactQuery)) return 850
  if (originalMatch && matchesAll(category, original)) return 700
  if (originalMatch) return variant ? 650 + original.length : 600
  if (phraseAlias && aliasTitleMatch) return 420
  if (aliasTitleMatch) return 400
  if (aliasCategoryMatch) return 320
  if (aliasProductMatch) return 260
  return -1
}

export function rankSearchResults(products: Product[], query: string): Product[] {
  return products
    .map((product, index) => ({ product, score: searchScore(product, query), index }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || getSearchPrice(a.product) - getSearchPrice(b.product) || a.index - b.index)
    .map((entry) => entry.product)
}

export function getSearchPrice(product: Product): number {
  return getCatalogPrice(product)
}