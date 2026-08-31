import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const endpoint = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
const view = fs.readFileSync('src/payload/components/admin/CatalogNavigationView.tsx', 'utf8')
const schema = fs.readFileSync('src/payload/collections/CatalogNavigation.ts', 'utf8')
const script = fs.readFileSync('scripts/catalog-navigation-root-items-apply.ts', 'utf8')

test('root navigation management is superadmin-only and supports Trade-in service link', () => {
  assert.match(endpoint, /isSuperadmin/)
  assert.match(endpoint, /createRoot/)
  assert.match(endpoint, /service:trade-in/)
  assert.match(endpoint, /href === '\/trade-in'/)
  assert.match(endpoint, /Service links cannot have children/)
  assert.match(schema, /custom_link/)
})

test('root editor exposes add section only when permitted and keeps service links childless', () => {
  assert.match(view, /canManageRoots/)
  assert.match(view, /Добавить раздел/)
  assert.match(view, /createRoot/)
  assert.match(view, /!\['group', 'brand', 'line'\]\.includes\(node\.kind\)/)
})

test('root apply is explicit, backed up, transactional and idempotent for Trade-in', () => {
  assert.match(script, /CATALOG_NAVIGATION_ROOT_APPLY_CONFIRM !== 'YES'/)
  assert.doesNotMatch(script, /pg_dump/)
  assert.match(fs.readFileSync('docs/catalog-navigation-root-backup.md', 'utf8'), /docker compose exec -T postgres pg_dump/)
  assert.match(script, /CATALOG_NAVIGATION_ROOT_BACKUP_CONFIRMED !== 'YES'/)
  assert.match(script, /Внешний PostgreSQL backup подтверждён пользователем/)
  assert.match(script, /CATALOG_NAVIGATION_ROOT_BACKUP_FILE/)
  assert.match(script, /catalog-navigation-root-items-plan-/)
  assert.match(script, /catalog-navigation-root-items-after-/)
  assert.match(script, /BEGIN/)
  assert.match(script, /COMMIT/)
  assert.match(script, /ROLLBACK/)
  assert.match(script, /service:trade-in/)
})

test('root apply command is registered', () => {
  assert.match(fs.readFileSync('package.json', 'utf8'), /catalog:navigation:root-items:apply/)
})

test('Trade-in group plan and apply preserve products and require explicit confirmation', () => {
  const plan = fs.readFileSync('scripts/catalog-tradein-group-plan.ts', 'utf8')
  const apply = fs.readFileSync('scripts/catalog-tradein-group-apply.ts', 'utf8')
  const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
  assert.match(plan, /catalog-tradein-group-plan-/)
  assert.match(plan, /writesPerformed: 0/)
  assert.match(plan, /service:trade-in/)
  assert.match(apply, /CATALOG_TRADEIN_GROUP_APPLY_CONFIRM/)
  assert.match(apply, /CATALOG_TRADEIN_GROUP_BACKUP_CONFIRMED/)
  assert.match(apply, /BEGIN/)
  assert.match(apply, /ROLLBACK/)
  assert.match(apply, /group:trade-in/)
  assert.doesNotMatch(apply, /UPDATE products|DELETE FROM products/i)
  assert.match(products, /value: 'trade-in'|\['trade-in'/)
  const condition = products.slice(products.indexOf("name: 'condition'"), products.indexOf("name: 'condition'") + 700)
  assert.match(condition, /type: 'select'/)
  assert.match(condition, /value: 'new'/)
  assert.match(condition, /value: 'used'/)
  assert.match(condition, /hidden: true/)
  assert.match(condition, /readOnly: true/)
  assert.doesNotMatch(condition, /required: true/)
  assert.doesNotMatch(condition, /defaultValue/)
})

test('subtree deletion is double-confirmed and navigation-only', () => {
  assert.match(view, /Удалить раздел вместе с пунктами/)
  assert.match(view, /window\.confirm\('Будет удалён этот раздел/)
  assert.match(view, /window\.prompt\(`Введите точное название раздела/)
  assert.match(view, /action\(node\.id, 'deleteSubtree'/)
  assert.match(endpoint, /body\.action === 'deleteSubtree'/)
  assert.match(endpoint, /initTransaction/)
  assert.match(endpoint, /killTransaction/)
  assert.match(endpoint, /collection: 'catalog-navigation', id: item\.id/)
  assert.doesNotMatch(endpoint.slice(endpoint.indexOf("body.action === 'deleteSubtree'"), endpoint.indexOf("body.action === 'move'")), /collection: 'products'/)
})
