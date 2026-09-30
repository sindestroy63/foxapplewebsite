import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const { normalizeSearch, rankSearchResults, searchScore, searchQueryTerms } = await import('../src/lib/search.ts')

const iphone = {
  id: 5,
  name: 'iPhone 17',
  model: 'iPhone 17',
  category: null,
  variants: [{ id: 'v1', storage: '256GB', memory: '256GB', simType: 'SIM + eSIM', color: { value: 'black', englishLabel: 'Black' }, price: 100 }],
  price: 100,
}

const pro = {
  id: 8,
  name: 'iPhone 17 Pro',
  model: 'iPhone 17 Pro',
  category: null,
  variants: [{ id: 'v1', storage: '256GB', memory: '256GB', simType: 'eSIM', color: { value: 'black', englishLabel: 'Black' }, price: 120 }],
  price: 120,
}

test('runtime search remains usable when a product category relation is null', () => {
  assert.deepEqual(rankSearchResults([iphone], 'iphone').map((product) => product.id), [5])
})

test('aliases and case normalization match the same products', () => {
  assert.equal(normalizeSearch('айфон'), 'айфон')
  assert.deepEqual(rankSearchResults([iphone], 'айфон').map((product) => product.id), [5])
  assert.deepEqual(rankSearchResults([iphone], 'iPhone').map((product) => product.id), [5])
})

test('search uses the actual MacBook product fields', () => {
  assert.deepEqual(rankSearchResults([{
    id: 58,
    name: 'Apple MacBook Air (M5, 2026)',
    model: 'Apple MacBook Air (M5, 2026)',
    slug: 'Apple MacBook Air (M5, 2026)',
    productLine: 'Apple MacBook Air (M5, 2026)',
    category: null,
    variants: [],
    price: 100,
  }], 'MacBook').map((product) => product.id), [58])
})

test('query candidate loading is not limited before ranking', () => {
  assert.deepEqual(rankSearchResults([
    { id: 1, name: 'iPhone 17', model: 'iPhone 17', category: null, variants: [], price: 1 },
    { id: 58, name: 'Apple MacBook Air', model: 'Apple MacBook Air', category: null, variants: [], price: 1 },
  ], 'MacBook').map((product) => product.id), [58])
})

test('product and same-variant configuration queries match', () => {
  assert.deepEqual(rankSearchResults([iphone, pro], 'iPhone 17 Pro').map((product) => product.id), [8])
  assert.deepEqual(rankSearchResults([iphone, pro], 'iPhone 17 Pro 256 Black eSIM').map((product) => product.id), [8])
})

const samsungWatch = {
  id: 69,
  name: 'Часы Samsung Galaxy Watch 8',
  model: 'Samsung Galaxy Watch 8',
  productGroup: 'smart-watches',
  category: { name: 'Samsung Watch', slug: 'samsung-watch' },
  variants: [],
  price: 100,
}

const appleWatch = {
  id: 46,
  name: 'Apple Watch Series 11',
  model: 'Apple Watch Series 11',
  productGroup: 'smart-watches',
  category: { name: 'Apple Watch', slug: 'apple-watch' },
  variants: [],
  price: 200,
}

const unrelated = {
  id: 999,
  name: 'Apple MacBook Air',
  model: 'Apple MacBook Air',
  productGroup: 'laptops',
  category: { name: 'MacBook', slug: 'macbook' },
  variants: [],
  price: 300,
}

test('semantic watch aliases preserve the original query and find both watch brands', () => {
  assert.deepEqual(searchQueryTerms('часы').sort(), ['watch', 'часы'])
  assert.deepEqual(rankSearchResults([unrelated, appleWatch, samsungWatch], 'часы').map((product) => product.id), [samsungWatch.id, appleWatch.id])
})

test('exact title match scores higher than semantic alias-only match', () => {
  assert.ok(searchScore(samsungWatch, 'часы') > searchScore(appleWatch, 'часы'))
})

test('category aliases find products whose title lacks the Russian category word', () => {
  assert.deepEqual(rankSearchResults([
    { ...unrelated, id: 1 },
    { id: 2, name: 'iPad Air', model: 'iPad Air', productGroup: 'tablets', category: { name: 'iPad', slug: 'ipad' }, variants: [], price: 100 },
    { id: 3, name: 'MacBook Air', model: 'MacBook Air', productGroup: 'laptops', category: { name: 'MacBook', slug: 'macbook' }, variants: [], price: 100 },
  ], 'планшет').map((product) => product.id), [2])
  assert.deepEqual(rankSearchResults([unrelated, { id: 4, name: 'Galaxy S26', model: 'Galaxy S26', productGroup: 'smartphones', category: { name: 'Samsung Phone', slug: 'samsung' }, variants: [], price: 100 }], 'смартфон').map((product) => product.id), [4])
})

test('specific Apple Watch queries remain precise', () => {
  assert.deepEqual(rankSearchResults([unrelated, samsungWatch, appleWatch], 'Apple Watch').map((product) => product.id), [appleWatch.id])
})

test('live search uses a compact generated thumbnail DTO with a stable fallback URL', () => {
  const route = readFileSync('src/app/api/catalog-search/route.ts', 'utf8')
  assert.match(route, /sizes\?\.thumbnail/)
  assert.match(route, /getMediaUrl\(media, 'thumbnail'\)/)
  assert.match(route, /return \{ id: product\.id, name: product\.name, slug: product\.slug, href:/)
  assert.doesNotMatch(route, /return \{\.\.\.product/)
  assert.match(route, /selectedVariant\?\.images/)
  assert.match(route, /colorImages/)
  assert.match(route, /getMediaUrl\(media, 'thumbnail'\)/)
})