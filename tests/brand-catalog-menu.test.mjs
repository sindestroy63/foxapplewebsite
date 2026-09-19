import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const menu = fs.readFileSync('src/lib/brand-catalog-menu.ts', 'utf8')
const header = fs.readFileSync('src/components/Header.tsx', 'utf8')
const mobile = fs.readFileSync('src/components/MobileMenu.tsx', 'utf8')
const catalog = fs.readFileSync('src/app/(frontend)/catalog/page.tsx', 'utf8')
const cms = fs.readFileSync('src/lib/cms.ts', 'utf8')
const placements = fs.readFileSync('src/lib/product-catalog-placement.ts', 'utf8')

test('brand menu has the requested top-level order and Trade-in stays separate', () => {
  assert.match(menu, /label: 'APPLE'/)
  assert.match(menu, /label: 'SAMSUNG'/)
  assert.match(menu, /label: 'DYSON'/)
  assert.match(menu, /label: 'PLAYSTATION'/)
  assert.match(menu, /label: 'ДРУГОЕ'/)
  assert.match(header, /brandNavigation/)
  assert.match(menu, /href: '\/trade-in\/catalog'/)
  assert.match(header, /secondaryNav[\s\S]*\/trade-in'/)
})

test('brand menu links use real catalog filters and no navigation writes', () => {
  for (const value of ["'Apple'", "'Samsung'", "'Dyson'", "'gaming-consoles'", "'Геймпады PS5'", "'Пылесосы Dyson'"]) assert.ok(placements.includes(value), `missing placement ${value}`)
  assert.match(cms, /if \(args\?\.filters\?\.brand\)/)
  assert.match(cms, /if \(args\?\.filters\?\.line\)/)
  assert.doesNotMatch(menu, /navigation\.create|INSERT INTO|UPDATE products/i)
})

test('brand navigation preserves new flags through the header menu', () => {
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8')
  const desktop = fs.readFileSync('src/components/DesktopCatalogMenu.tsx', 'utf8')
  assert.match(header, /isNew: group\.isNew/)
  assert.match(header, /isNew: child\.isNew/)
  assert.match(desktop, /brandMenu\.filter\(\(brand\) => brand\.isVisible !== false\)/)
  assert.match(desktop, /brand\.isNew && <small className="nav-new-badge">/)
})

test('Other excludes generic headphones and Apple accessories use a dedicated read filter', () => {
  const other = menu.slice(menu.indexOf("label: 'ДРУГОЕ'"))
  assert.doesNotMatch(other, /label: 'Наушники'/)
  assert.match(placements, /appleAccessories: '1'/)
  assert.doesNotMatch(placements.slice(placements.indexOf("'apple-accessories'"), placements.indexOf("'samsung-smartphones'")), /'audio'/)
  assert.match(cms, /appleAccessories/)
  assert.match(cms, /Apple Pencil/)
})

test('desktop catalog uses one non-wrapping row and mobile keeps a separate menu', () => {
  const styles = fs.readFileSync('src/app/(frontend)/globals.css', 'utf8')
  assert.match(styles, /\.desktop-catalog-groups[\s\S]*display: flex; flex-wrap: nowrap/)
  assert.match(menu, /label: 'TRADE-IN'/)
  assert.match(mobile, /brandNavigation/)
})

test('catalog renders brand cards and Trade-in card without changing product routes', () => {
  assert.match(catalog, /getBrandCatalogNavigation/)
  assert.match(catalog, /brandNavigation\.map/)
  assert.match(menu, /href: '\/trade-in\/catalog'/)
  assert.match(mobile, /brandNavigation/)
})

test('Global navigation restores filtered child hrefs instead of falling back to the unfiltered catalog', () => {
  assert.match(cms, /hrefFromFilter\(filter\)/)
  assert.match(cms, /href\.trim\(\) === '\/catalog'/)
  assert.match(cms, /resolveBrandHref\(String\(child\.key\), child\.href, child\.filter\)/)
})

test('placement mapping provides confirmed product fields without guessing product lines', () => {
  assert.match(placements, /PRODUCT_CATALOG_PLACEMENTS/)
  for (const key of ['iphone', 'apple-airpods', 'samsung-audio', 'dyson-vacuums', 'gamepads-ps5', 'other-marshall', 'other-gopro', 'other-screen-protectors']) {
    assert.ok(placements.includes(`'${key}'`), `missing placement ${key}`)
  }
  assert.match(menu, /product-catalog-placement/)
})

test('submenu products use exclusive most-specific placement and product new flags', () => {
  assert.match(cms, /productsForMenuChild/)
  assert.match(cms, /const best = Math\.max/)
  assert.match(cms, /isNew: Boolean\(product\.isNew\)/)
})
