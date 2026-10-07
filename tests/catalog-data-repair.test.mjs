import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const canonical = fs.readFileSync('scripts/catalog-canonical-repair.ts', 'utf8')
const repair = fs.readFileSync('scripts/catalog-data-repair.ts', 'utf8')
const placement = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')

test('canonical repair applies only SAFE records and excludes navigation 275', () => {
  assert.match(canonical, /reviewNavigationIds = new Set\(\[275\]\)/)
  assert.match(canonical, /change\.status === 'SAFE'/)
  assert.match(canonical, /await client\.query\('BEGIN'\)/)
  assert.match(canonical, /catalog-canonical-repair-\$\{stamp\(\)\}/)
})

test('data repair never creates or deletes Products and backs up before transaction', () => {
  assert.match(repair, /noProductDeletes: true/)
  assert.match(repair, /noProductCreates: true/)
  assert.doesNotMatch(repair, /INSERT INTO products|DELETE FROM products/i)
  assert.match(repair, /await fs\.writeFile\(reportPath/)
  assert.match(repair, /await client\.query\('BEGIN'\)/)
})

test('placement flow is transactional and rejects duplicate product navigation', () => {
  assert.match(placement, /transactionStarted = await initTransaction/)
  assert.match(placement, /Duplicate navigation placements for product/)
  assert.match(placement, /await commitTransaction/)
  assert.match(placement, /await killTransaction/)
})

test('product saves synchronize canonical href and placement metadata', () => {
  assert.match(products, /afterChange: \[/)
  assert.match(products, /productCanonicalUrl/)
  assert.match(products, /productGroup: doc\.productGroup/)
  assert.match(products, /brand: doc\.brand/)
  assert.match(products, /Product saved but catalog navigation synchronization failed/)
})

test('repairs use the existing Ray-Ban placement and review unsafe saved slugs', () => {
  assert.match(repair, /existingRayBanPlacement/)
  assert.match(repair, /existing Ray-Ban product placement parent/)
  assert.match(canonical, /stableSlugPattern/)
  assert.match(canonical, /!stableSlugPattern\.test/)
})