import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('homepage hero points to the general catalog', () => {
  const source = fs.readFileSync('src/app/(frontend)/page.tsx', 'utf8')
  assert.match(source, /<Link className="button hero-primary" href="\/catalog">[\s\S]*Подобрать технику/)
})

test('Trade-in catalog uses TRADE-IN label and omits the retired subtitle', () => {
  const page = fs.readFileSync('src/app/(frontend)/trade-in/catalog/page.tsx', 'utf8')
  assert.match(page, /TRADE-IN/)
  assert.doesNotMatch(page, /Проверенные устройства с пробегом\./)
})

test('product renderers always display Products.name, never model or productLine', () => {
  const card = fs.readFileSync('src/components/ProductCard.tsx', 'utf8')
  const detail = fs.readFileSync('src/components/ProductDetailClient.tsx', 'utf8')
  assert.match(card, /\{product\.name\}/)
  assert.match(detail, /<h1 className="detail-title">\{product\.name\}<\/h1>/)
  assert.doesNotMatch(card, /product\.model \|\| product\.name/)
  assert.doesNotMatch(detail, /product\.model \|\| product\.name/)
})

test('custom catalog navigation keeps cover editing and standard collection hidden', () => {
  const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')
  const endpoint = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
  const collection = fs.readFileSync('src/payload/collections/CatalogNavigation.ts', 'utf8')
  assert.match(view, /\/api\/catalog-navigation-admin/)
  assert.match(view, /coverImage/)
  assert.match(view, /Обложка:/)
  assert.match(endpoint, /body\.action === 'coverImage'/)
  assert.match(endpoint, /overrideAccess: true/)
  assert.match(collection, /hidden: true/)
})
