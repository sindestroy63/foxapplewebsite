import assert from 'node:assert/strict'
import test from 'node:test'

import { belongsToChild, matchesProductFilter } from '../src/lib/catalog-navigation-membership.ts'

const realmePhone = { id: 11, name: 'Realme 14T', brand: 'Realme', productGroup: 'phones' }
const pocoPhone = { id: 13, name: 'Poco C71', brand: 'Xiaomi', productGroup: 'phones' }

test('a product assigned directly to a subcategory without a filter belongs to it', () => {
  assert.equal(belongsToChild(realmePhone, { products: [11, 12], filter: null }), true)
  assert.equal(belongsToChild(realmePhone, { products: ['11'], filter: null }), true)
  assert.equal(belongsToChild(realmePhone, { products: [{ id: 11 }], filter: null }), true)
})

test('a direct assignment is honoured even when the filter would exclude the product', () => {
  assert.equal(belongsToChild(pocoPhone, { products: [13], filter: { brand: 'Realme' } }), true)
})

test('a product that is neither assigned nor matched by the filter does not belong', () => {
  assert.equal(belongsToChild(pocoPhone, { products: [11, 12], filter: { brand: 'Realme' } }), false)
  assert.equal(belongsToChild(pocoPhone, { products: [], filter: null }), false)
  assert.equal(belongsToChild(pocoPhone, {}), false)
})

test('a filter-matched product belongs without a direct assignment', () => {
  assert.equal(belongsToChild(realmePhone, { products: [], filter: { brand: 'Realme' } }), true)
  assert.equal(belongsToChild(realmePhone, { filter: { brand: 'Realme', group: 'phones' } }), true)
})

test('filters keep their existing semantics', () => {
  assert.equal(matchesProductFilter(realmePhone, null), false)
  assert.equal(matchesProductFilter(realmePhone, { brand: 'Realme', q: '14t' }), true)
  assert.equal(matchesProductFilter(realmePhone, { brand: 'Realme', q: 'c71' }), false)
  assert.equal(matchesProductFilter({ productGroup: 'other', brand: 'Apple' }, { appleAccessories: true }), true)
})
