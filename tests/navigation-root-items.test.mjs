import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')
const endpoint = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
const globalEndpoint = fs.readFileSync('src/payload/brand-catalog-navigation-admin.ts', 'utf8')
test('catalog editor remains available during Global rollback', () => { assert.match(view, /catalog-navigation-admin/); assert.match(view, /brand-nav-grid/); assert.match(view, /coverImage/) })
test('legacy endpoint remains available while Global rollout is disabled', () => { assert.match(endpoint, /body\.action === 'deleteSubtree'/); assert.match(globalEndpoint, /updateGlobal/); assert.match(globalEndpoint, /hasFullAdminAccess/) })

test('root navigation management keeps full-admin permissions and Trade-in service link rules', () => {
  assert.match(endpoint, /const isSuperadmin = \(req: any\) => hasFullAdminAccess\(req\.user\)/)
  assert.match(endpoint, /stableKey = .*service:trade-in/)
  assert.match(endpoint, /href === '\/trade-in'/)
  assert.match(endpoint, /Service links cannot have children/)
  assert.match(view, /Добавить раздел/)
})

test('root creation validates groups and internal service URLs', () => {
  assert.match(endpoint, /body\.action === 'createRoot'/)
  assert.match(endpoint, /Only superadmin can add root sections/)
  assert.match(endpoint, /Only internal paths are allowed/)
  assert.match(endpoint, /Unsupported product group/)
})

test('service links cannot receive child navigation nodes', () => {
  assert.match(endpoint, /parent\?\.kind === 'custom_link'/)
  assert.match(endpoint, /Service links cannot have children/)
})

test('subtree deletion requires exact confirmation and uses a transaction', () => {
  assert.match(view, /window\.confirm\(/)
  assert.match(view, /window\.confirm\(/)
  assert.match(endpoint, /body\.action === 'deleteSubtree'/)
  assert.match(endpoint, /initTransaction\(req as any\)/)
  assert.match(endpoint, /killTransaction\(req as any\)/)
  assert.match(endpoint, /collection: 'catalog-navigation'/)
  assert.doesNotMatch(endpoint.slice(endpoint.indexOf("body.action === 'deleteSubtree'")), /collection: 'products'/)
})

test('subtree delete reports rollback-safe result without touching legacy products', () => {
  assert.match(endpoint, /deletedNavigationRecords/)
  assert.match(endpoint, /if \(started\) await killTransaction/)
  assert.match(endpoint, /confirmTitle/)
  assert.match(endpoint, /Exact section title confirmation is required/)
})

test('manager, admin and superadmin share the permitted navigation access predicate', () => {
  assert.match(endpoint, /hasFullAdminAccess\(req\.user\)/)
  assert.match(globalEndpoint, /hasFullAdminAccess\(req\.user\)/)
  assert.match(fs.readFileSync('src/payload/access.ts', 'utf8'), /hasFullAdminAccess/)
})
