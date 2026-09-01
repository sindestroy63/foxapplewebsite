import assert from 'node:assert/strict'
import test from 'node:test'

import fs from 'node:fs'

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

test('existing product updates preserve their legacy slug', () => {
  const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
  assert.match(products, /if \(operation === 'create' && data\) \{\s*data\.slug = await ensureUniqueSlugOnCreate/)
  assert.doesNotMatch(products, /operation === 'update'[\s\S]{0,100}ensureUniqueSlugOnCreate/)
})

test('create-form slug preview reads the Payload form state and writes the submitted field', () => {
  const field = fs.readFileSync('src/payload/components/admin/ProductSlugField.tsx', 'utf8')
  assert.match(field, /useFormFields\(\(\[fields\]: any\) => fields\.name\?\.value\)/)
  assert.match(field, /composeProductSlug\(typeof name === 'string' \? name : '', suffix\)/)
  assert.match(field, /slugField\.setValue\(nextSlug\)/)
  assert.match(field, /getProductSlugSuffix\(currentSlug\) \|\| suffixRef\.current \|\| createSlugSuffix\(\)/)
})
