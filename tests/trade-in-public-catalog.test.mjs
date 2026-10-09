import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')
const page = fs.readFileSync('src/app/(frontend)/trade-in/catalog/page.tsx', 'utf8')
const header = fs.readFileSync('src/components/Header.tsx', 'utf8')
const mobileMenu = fs.readFileSync('src/components/MobileMenu.tsx', 'utf8')
const productCard = fs.readFileSync('src/components/ProductCard.tsx', 'utf8')
const catalog = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
const catalogCard = fs.readFileSync('src/components/CatalogGroupCard.tsx', 'utf8')
const desktopCatalogMenu = fs.readFileSync('src/components/DesktopCatalogMenu.tsx', 'utf8')

test('public Trade-in catalog queries only visible used Trade-in Products', () => {
  const query = cms.match(/export async function getTradeInProducts[\s\S]*?\n}\n\nexport async function getProductsByCategorySlug/)
  assert.ok(query)
  assert.match(query[0], /collection: 'products'/)
  assert.match(query[0], /productGroup: \{ equals: 'trade-in' \}/)
  assert.match(query[0], /condition: \{ equals: 'used' \}/)
  assert.match(query[0], /isAvailable: \{ equals: true \}/)
})

test('Trade-in catalog uses existing cards and has the requested empty state', () => {
  assert.match(page, /<ProductGrid products=\{products\} settings=\{settings\} \/>/)
  assert.match(page, /Сейчас в Trade-in нет доступных устройств/)
  assert.match(page, /href="\/trade-in"/)
  assert.match(page, /Перейти к заявке на Trade-in/)
  assert.match(page, /canonical: '\/trade-in\/catalog'/)
})

test('Trade-in service and catalog links have separate information and category menu placements', () => {
  for (const source of [header, mobileMenu]) assert.match(source, /href: '\/trade-in', label: 'Trade-In'/)
  assert.doesNotMatch(header.match(/const secondaryNav = \[[\s\S]*?\n\]/)?.[0] || '', /trade-in\/catalog/)
  assert.doesNotMatch(mobileMenu.match(/const secondaryLinks = \[[\s\S]*?\n\]/)?.[0] || '', /trade-in\/catalog/)
  assert.match(fs.readFileSync('src/lib/brand-catalog-menu.ts', 'utf8'), /href: '\/trade-in\/catalog'/)
  assert.match(desktopCatalogMenu, /groups\.map[\s\S]*?\{trailingLink && <Link href=\{trailingLink\.href\} className="nav-dropdown-trigger">\{trailingLink\.label\}<\/Link>\}/)
  assert.match(mobileMenu, /brandNavigation/)
  assert.match(fs.readFileSync('src/lib/brand-catalog-menu.ts', 'utf8'), /key: 'trade-in'/)
})

test('catalog category card sends Trade-in visitors to the public Trade-in catalog', () => {
  assert.match(fs.readFileSync('src/lib/brand-catalog-menu.ts', 'utf8'), /key: 'trade-in'/)
  assert.match(catalogCard, /href \|\| `\/catalog\?group=\$\{slug\}`/)
})

test('Product cards use buildProductUrl for unified URL construction', () => {
  assert.match(productCard, /buildProductUrl/)
  assert.match(productCard, /from '@\/lib\/product-url-builder'/)
  assert.doesNotMatch(productCard, /productGroupSlug\(product\.productGroup\)/)
})
