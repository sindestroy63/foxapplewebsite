import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('homepage hero points to the general catalog', () => {
  const source = fs.readFileSync('src/app/(frontend)/page.tsx', 'utf8')
  assert.match(source, /<Link className="button hero-primary" href="\/catalog">[\s\S]*Подобрать технику/)
})

test('catalog search is available in desktop and mobile navigation', () => {
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8')
  const mobileMenu = fs.readFileSync('src/components/MobileMenu.tsx', 'utf8')
  const catalog = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
  assert.match(header, /className="header-search" action="\/catalog" method="get"/)
  assert.match(mobileMenu, /className="catalog-search mobile-catalog-search" action="\/catalog" method="get"/)
  assert.match(catalog, /if \(filters\.query\)/)
  assert.match(catalog, /<ProductGrid emptyText=/)
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

test('branded catalog headings and breadcrumbs use the shared placement resolver', () => {
  const page = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
  const group = fs.readFileSync('src/components/GroupCatalogPage.tsx', 'utf8')
  const client = fs.readFileSync('src/components/CategoryCatalogClient.tsx', 'utf8')
  assert.match(page, /resolveProductCatalogPlacement\(\{ productGroup: groupSlug, brand: filters\.brand, productLine: filters\.line \}\)/)
  assert.match(page, /filters\.brand \? `\$\{filters\.brand\} — \$\{placement\.childTitle/)
  assert.match(group, /heading\?: string; breadcrumbChild\?: string/)
  assert.match(client, /breadcrumbBrand\?: string/)
  assert.match(client, /breadcrumbChild\?: string/)
  assert.match(client, /breadcrumbBrand \?/)
})

test('catalog placement tabs use filtered brand subdivisions and preserve model level', () => {
  const client = fs.readFileSync('src/components/CategoryCatalogClient.tsx', 'utf8')
  const helper = fs.readFileSync('src/lib/product-catalog-placement.ts', 'utf8')
  assert.match(helper, /export function getCatalogPlacementTabs/)
  assert.match(client, /catalog-placement-tabs/)
  assert.match(client, /activePlacement\?\.childKey === placement\.childKey/)
  assert.match(client, /merged\.map\(\(product, idx\)/)
  assert.match(client, /catalogPlacementHref\(placement\)/)
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
