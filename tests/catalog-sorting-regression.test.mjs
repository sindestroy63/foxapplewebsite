import test from 'node:test'
import assert from 'node:assert/strict'

const { getCatalogPrice, getCatalogPriceVariant } = await import('../src/lib/pricing.ts')
const { sortCatalogProducts } = await import('../src/lib/catalog-sort.ts')

const product = (id, name, price, variants = []) => ({ id, name, slug: String(id), price, variants })

test('catalog price uses the cheapest available variant as a number', () => {
  const item = product(1, 'Model', 999, [
    { id: 'unavailable-cheap', price: 2, isAvailable: false },
    { id: 'expensive', price: 10, isAvailable: true },
    { id: 'cheapest-available', price: 3, isAvailable: true },
  ])
  assert.equal(getCatalogPrice(item), 3)
  assert.equal(getCatalogPriceVariant(item)?.id, 'cheapest-available')
})

test('price sorting compares numeric catalog prices, not strings', () => {
  const items = [product(1, 'Ten', 10), product(2, 'Two', 2), product(3, 'One Hundred', 100)]
  assert.deepEqual(sortCatalogProducts(items, 'price_asc').map((item) => item.id), [2, 1, 3])
  assert.deepEqual(sortCatalogProducts(items, 'price_desc').map((item) => item.id), [3, 1, 2])
})

test('sorting and displayed price use the same available variant price', () => {
  const items = [
    product(1, 'Product A', 100, [{ price: 900, isAvailable: true }]),
    product(2, 'Product B', 100, [{ price: 200, isAvailable: true }]),
  ]
  assert.deepEqual(sortCatalogProducts(items, 'price_asc').map((item) => getCatalogPrice(item)), [200, 900])
})

test('price filters use the same displayed product price as sorting', () => {
  const item = product(1, 'Product A', 100, [
    { price: 16_390, isAvailable: true },
    { price: 17_000, isAvailable: true },
  ])
  assert.equal(getCatalogPrice(item) >= 17_000, false)
})

test('title sorting is locale-aware and stable for equal names', () => {
  const items = [product(1, 'MacBook Pro'), product(2, 'iPhone'), product(3, 'iPhone')]
  assert.deepEqual(sortCatalogProducts(items, 'name').map((item) => item.id), [2, 3, 1])
})