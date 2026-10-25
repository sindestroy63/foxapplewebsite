import assert from 'node:assert/strict'
import test from 'node:test'

import {
  composeProductSlug,
  getProductSlugSuffix,
  isProductSlug,
} from '../src/payload/utils/slugify.ts'

test('builds an English product slug with a stable six-character suffix', () => {
  assert.equal(composeProductSlug('iPhone 17 Pro', 'a1b2c3'), 'iphone-17-pro-a1b2c3')
})

test('transliterates Russian product names', () => {
  assert.equal(composeProductSlug('\u0410\u0439\u0444\u043e\u043d 17 \u041f\u0440\u043e', 'a1b2c3'), 'ayfon-17-pro-a1b2c3')
})

test('same product names remain distinct when their generated suffixes differ', () => {
  assert.notEqual(composeProductSlug('iPhone 17 Pro', 'a1b2c3'), composeProductSlug('iPhone 17 Pro', 'd4e5f6'))
})

test('unsupported names still receive a non-empty valid slug', () => {
  const slug = composeProductSlug('\ud83d\ude80', 'a1b2c3')
  assert.equal(slug, 'product-a1b2c3')
  assert.equal(isProductSlug(slug), true)
  assert.equal(getProductSlugSuffix(slug), 'a1b2c3')
})

