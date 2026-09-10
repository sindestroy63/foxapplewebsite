import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const migration = fs.readFileSync('src/migrations/20260831_150000_product_condition.ts', 'utf8')
const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
const types = fs.readFileSync('src/payload-types.ts', 'utf8')

test('condition migration is nullable, idempotent, and does not backfill products', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS condition varchar NULL/)
  assert.match(migration, /DROP COLUMN IF EXISTS condition/)
  assert.doesNotMatch(migration, /UPDATE products|INSERT INTO products|SET condition\s*=/i)
})

test('Products condition remains optional and constrained to new or used', () => {
  const field = products.slice(products.indexOf("name: 'condition'"), products.indexOf("name: 'condition'") + 700)
  assert.match(field, /value: 'new'/)
  assert.match(field, /value: 'used'/)
  assert.match(field, /hidden: true/)
  assert.match(field, /readOnly: true/)
  assert.doesNotMatch(field, /required: true|defaultValue/)
  assert.match(types, /condition\?: (?:\()?['"]new['"] \| ['"]used['"](?:\))? \| null/)
})
