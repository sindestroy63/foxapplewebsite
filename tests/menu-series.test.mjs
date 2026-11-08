import test from 'node:test'
import assert from 'node:assert/strict'

const { buildMenuSeries } = await import('../src/lib/menu-series.ts')

const entry = (brand, name, id) => ({ brand, product: { id, name, href: `/catalog/smartphones/${id}` } })

test('groups Samsung phones into S, A and Z series in rule order and keeps product order', () => {
  const series = buildMenuSeries([
    entry('Samsung', 'Galaxy Z Fold8 Ultra', 1),
    entry('Samsung', 'Galaxy S26 Ultra', 2),
    entry('Samsung', 'Galaxy A57', 3),
    entry('Samsung', 'Galaxy S26', 4),
    entry('Samsung', 'Galaxy Z Flip8', 5),
    entry('Samsung', 'Galaxy A18', 6),
  ])
  assert.deepEqual(series.map((item) => item.label), ['Galaxy S', 'Galaxy A', 'Galaxy Z'])
  assert.deepEqual(series.map((item) => item.products.map((product) => product.id)), [[2, 4], [3, 6], [1, 5]])
})

test('does not group accessories, watches or unknown brands', () => {
  assert.deepEqual(buildMenuSeries([entry('Samsung', 'Часы Samsung Galaxy Watch 8', 1), entry('Samsung', 'Samsung 45W', 2), entry('Samsung', 'Наушники Galaxy Buds 4', 3)]), [])
  assert.deepEqual(buildMenuSeries([entry('Apple', 'Galaxy S26', 1), entry('Apple', 'Galaxy S25', 2), entry('Apple', 'Galaxy A57', 3), entry('Apple', 'Galaxy A18', 4)]), [])
  assert.deepEqual(buildMenuSeries([entry(undefined, 'Galaxy S26', 1)]), [])
})

test('keeps a flat list when fewer than two series have at least two products', () => {
  assert.deepEqual(buildMenuSeries([entry('Samsung', 'Galaxy S26', 1), entry('Samsung', 'Galaxy S25', 2), entry('Samsung', 'Galaxy A57', 3)]), [])
  assert.deepEqual(buildMenuSeries([entry('Samsung', 'Galaxy S26', 1), entry('Samsung', 'Galaxy S25', 2)]), [])
  assert.deepEqual(buildMenuSeries([]), [])
})

test('series with a single product are left out while larger ones remain', () => {
  const series = buildMenuSeries([
    entry('Samsung', 'Galaxy S26', 1),
    entry('Samsung', 'Galaxy S25', 2),
    entry('Samsung', 'Galaxy Z Flip8', 3),
    entry('Samsung', 'Galaxy Z Fold8', 4),
    entry('Samsung', 'Galaxy A57', 5),
  ])
  assert.deepEqual(series.map((item) => item.label), ['Galaxy S', 'Galaxy Z'])
  assert.equal(series.some((item) => item.products.some((product) => product.id === 5)), false)
})

test('separates Redmi from Redmi Note and orders Xiaomi lines', () => {
  const series = buildMenuSeries([
    entry('Xiaomi', 'Xiaomi Redmi Note 15 Pro', 1),
    entry('Xiaomi', 'Xiaomi Redmi 15C', 2),
    entry('Xiaomi', 'Xiaomi Redmi Note 15', 3),
    entry('Xiaomi', 'Xiaomi Redmi 14C', 4),
    entry('xiaomi', 'Xiaomi 17T Pro', 5),
    entry('Xiaomi', 'Xiaomi 17 Ultra', 6),
    entry('Xiaomi', 'POCO X8 Pro', 7),
    entry('Xiaomi', 'Xiaomi POCO F8', 8),
  ])
  assert.deepEqual(series.map((item) => item.label), ['Xiaomi', 'POCO', 'Redmi', 'Redmi Note'])
  assert.deepEqual(series.map((item) => item.products.map((product) => product.id)), [[5, 6], [7, 8], [2, 4], [1, 3]])
})
