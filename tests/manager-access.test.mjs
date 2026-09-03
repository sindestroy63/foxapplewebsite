import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const access = fs.readFileSync('src/payload/access.ts', 'utf8')
const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
const users = fs.readFileSync('src/payload/collections/Users.ts', 'utf8')
const categories = fs.readFileSync('src/payload/collections/Categories.ts', 'utf8')
const globals = [
  fs.readFileSync('src/payload/globals/SiteSettings.ts', 'utf8'),
  fs.readFileSync('src/payload/globals/SiteAppearance.ts', 'utf8'),
]
const navigation = fs.readFileSync('src/payload/collections/CatalogNavigation.ts', 'utf8')
const tradeIn = fs.readFileSync('src/payload/trade-in-admin.ts', 'utf8')
const navEndpoints = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
const tradeInNav = fs.readFileSync('src/payload/components/admin/TradeInNavLink.tsx', 'utf8')
const catalogNav = fs.readFileSync('src/payload/components/admin/CatalogNavigationNavLink.tsx', 'utf8')

test('full-admin helper treats manager, admin and superadmin equally', () => {
  assert.match(access, /export function hasFullAdminAccess/)
  assert.match(access, /role === 'manager' \|\| role === 'admin' \|\| role === 'superadmin'/)
})

test('manager retains working products, Trade-in, and the custom navigation view', () => {
  assert.match(products, /create: admins/)
  assert.match(products, /update: admins/)
  assert.match(products, /delete: admins/)
  assert.match(tradeIn, /hasFullAdminAccess/)
  assert.match(navEndpoints, /path: '\/catalog-navigation-admin'/)
  assert.doesNotMatch(navEndpoints, /Catalog navigation administration is disabled/)
  assert.match(navigation, /access: \{ read: anyone, create: denyAll, update: denyAll, delete: denyAll \}/)
  assert.match(tradeInNav, /hasFullAdminAccess/)
  assert.match(catalogNav, /hasFullAdminAccess/)
})

test('standard CatalogNavigation collection stays hidden while custom navigation is restored', async () => {
  const config = await fs.promises.readFile('src/payload.config.ts', 'utf8')
  assert.match(navigation, /admin: \{ hidden: true/)
  assert.match(config, /CatalogNavigationNavLink/)
  assert.match(config, /catalogNavigation:\s*\{[\s\S]*Component: '\/payload\/components\/admin\/CatalogNavigationView'/)
  assert.match(config, /catalogNavigation:\s*\{[\s\S]*path: '\/catalog-navigation'/)
  assert.match(catalogNav, /href="\/admin\/catalog-navigation"/)
  assert.match(navEndpoints, /if \(!isAdmin\(req\)\) return Response\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)/)
})

test('hidden sections preserve system/public reads and deny CMS mutations', () => {
  assert.match(users, /hidden: true/)
  assert.match(users, /create: denyAll/)
  assert.match(users, /delete: denyAll/)
  assert.match(categories, /hidden: true/)
  assert.match(categories, /read: anyone/)
  for (const source of globals) {
    assert.match(source, /hidden: true/)
    assert.match(source, /read: anyone/)
    assert.match(source, /update: denyAll/)
  }
})
