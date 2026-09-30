import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const placement = fs.readFileSync('src/payload/components/admin/ProductCatalogPlacement.tsx', 'utf8')
const placementEndpoint = fs.readFileSync('src/payload/brand-catalog-navigation-admin.ts', 'utf8')
const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')
const navigation = fs.readFileSync('src/payload/globals/BrandCatalogNavigation.ts', 'utf8')
const navigationAdmin = fs.readFileSync('src/payload/brand-catalog-navigation-admin.ts', 'utf8')
const relationshipMigration = fs.readFileSync('src/migrations/20260930_090000_brand_navigation_relationship_table.ts', 'utf8')
const detail = fs.readFileSync('src/components/ProductDetailClient.tsx', 'utf8')
const cart = fs.readFileSync('src/lib/cart.ts', 'utf8')
const migration = fs.readFileSync('src/migrations/20260929_120000_brand_navigation_direct_products.ts', 'utf8')

test('manual placement uses direct CMS product relations without requiring a filter', () => {
  assert.match(placement, /brand-catalog-placement/)
  assert.doesNotMatch(placement, /У выбранного подраздела нет фильтра каталога/)
  assert.match(placementEndpoint, /products: \[\.\.\.new Set\(\[\.\.\.ids, body\.productId\]\)\]/)
  assert.match(navigation, /name: 'products'.*hasMany: true/)
  assert.match(cms, /args\?\.filters\?\.placement/)
  assert.match(cms, /directPlacementIds/)
  assert.match(migration, /brand_catalog_navigation_groups_children_products/)
})

test('placement navigation reads the CMS global through the Payload-compatible relationship table', () => {
  assert.match(placement, /fetch\(endpoint, \{ credentials: 'same-origin' \}\)/)
  assert.match(navigationAdmin, /path: "\/brand-catalog-navigation"[\s\S]*findGlobal/)
  assert.match(navigationAdmin, /errorResponse\(error, \{ field: "read" \}\)/)
  assert.match(relationshipMigration, /brand_catalog_navigation_rels/)
  assert.match(relationshipMigration, /INSERT INTO "brand_catalog_navigation_rels"/)
  assert.doesNotMatch(placement, /localhost/)
})

test('variant characteristics are selectable and carried into cart identity', () => {
  assert.match(detail, /key: 'material'/)
  assert.match(detail, /key: 'strapSize'/)
  assert.match(detail, /if \(!isDisabled\)/)
  assert.match(cart, /mat:\$\{variant\.material\}/)
  assert.match(cart, /strap:\$\{variant\.strapSize\}/)
})