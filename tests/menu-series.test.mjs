import test from 'node:test'
import assert from 'node:assert/strict'

const { buildMenuSeries, autoSeriesLabel, collectSeriesLabels, normalizeSeriesInput, normalizeSeriesLabel, SERIES_NONE } = await import('../src/lib/menu-series.ts')

const entry = (brand, name, id, series) => ({ brand, series, product: { id, name, href: `/catalog/smartphones/${id}` } })

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

test('a manual series overrides the automatic one and merges with it case-insensitively', () => {
  const series = buildMenuSeries([
    entry('Samsung', 'Galaxy S26', 1),
    entry('Samsung', 'Galaxy S25', 2),
    entry('Samsung', 'Galaxy A57', 3, 'galaxy s'),
    entry('Samsung', 'Galaxy Z Fold8', 4),
  ])
  assert.deepEqual(series.map((item) => item.label), ['Galaxy S', 'Galaxy Z'])
  assert.deepEqual(series[0].products.map((product) => product.id), [1, 2, 3])
})

test('manual series work for any brand and keep single-product series once curated', () => {
  const series = buildMenuSeries([
    entry('Apple', 'iPhone 17 Pro Max', 1, 'iPhone 17'),
    entry('Apple', 'iPhone 17 Pro', 2, 'iPhone 17'),
    entry('Apple', 'iPhone Air', 3, 'iPhone Air'),
    entry('Apple', 'iPhone 16', 4),
  ])
  assert.deepEqual(series.map((item) => [item.label, item.products.map((product) => product.id)]), [['iPhone 17', [1, 2]], ['iPhone Air', [3]]])
})

test('the none marker removes a product from its automatic series', () => {
  const series = buildMenuSeries([
    entry('Samsung', 'Galaxy S26', 1),
    entry('Samsung', 'Galaxy S25', 2),
    entry('Samsung', 'Galaxy S24', 3, SERIES_NONE),
    entry('Samsung', 'Galaxy Z Fold8', 4),
    entry('Samsung', 'Galaxy Z Flip8', 5),
  ])
  assert.deepEqual(series.map((item) => item.products.map((product) => product.id)), [[1, 2], [4, 5]])
  assert.deepEqual(buildMenuSeries([entry('Apple', 'iPhone 16', 1, SERIES_NONE), entry('Apple', 'iPhone 17', 2, SERIES_NONE)]), [])
})

test('manual series follow rule order first, then first appearance', () => {
  const series = buildMenuSeries([
    entry('Samsung', 'Galaxy Tab', 1, 'Планшеты'),
    entry('Samsung', 'Galaxy Z Fold8', 2),
    entry('Samsung', 'Galaxy S26', 3),
    entry('Samsung', 'Galaxy Buds', 4, 'Наушники'),
  ])
  assert.deepEqual(series.map((item) => item.label), ['Galaxy S', 'Galaxy Z', 'Планшеты', 'Наушники'])
})

test('series keys stay unique inside one list and survive non latin names', () => {
  const series = buildMenuSeries([entry('Apple', 'a', 1, 'Серия 1'), entry('Apple', 'b', 2, 'серия  1'), entry('Apple', 'c', 3, 'Серия 2')])
  assert.deepEqual(series.map((item) => [item.key, item.label, item.products.length]), [['серия-1', 'Серия 1', 2], ['серия-2', 'Серия 2', 1]])
})

test('detects the automatic label from brand rules only', () => {
  assert.equal(autoSeriesLabel('Samsung', 'Samsung Galaxy S26 Ultra'), 'Galaxy S')
  assert.equal(autoSeriesLabel('Xiaomi', 'Xiaomi Redmi Note 15'), 'Redmi Note')
  assert.equal(autoSeriesLabel('Apple', 'Galaxy S26'), '')
  assert.equal(autoSeriesLabel(undefined, 'Galaxy S26'), '')
})

test('lists series labels for a section from manual and automatic values', () => {
  const labels = collectSeriesLabels([
    { brand: 'Samsung', name: 'Galaxy Z Fold8' },
    { brand: 'Samsung', name: 'Galaxy S26' },
    { brand: 'Samsung', name: 'Galaxy S25', series: 'galaxy s' },
    { brand: 'Samsung', name: 'Galaxy Tab', series: 'Планшеты' },
    { brand: 'Samsung', name: 'Galaxy Buds', series: SERIES_NONE },
    { brand: 'Samsung', name: 'Charger' },
  ])
  assert.deepEqual(labels, ['Galaxy S', 'Galaxy Z', 'Планшеты'])
})

test('validates series input: trims, collapses spaces, keeps the none marker and limits length', () => {
  assert.deepEqual(normalizeSeriesInput('  Galaxy   S  '), { ok: true, value: 'Galaxy S' })
  assert.deepEqual(normalizeSeriesInput(''), { ok: true, value: '' })
  assert.deepEqual(normalizeSeriesInput(null), { ok: true, value: '' })
  assert.deepEqual(normalizeSeriesInput(SERIES_NONE), { ok: true, value: SERIES_NONE })
  assert.equal(normalizeSeriesInput('x'.repeat(61)).ok, false)
  assert.equal(normalizeSeriesInput(5).ok, false)
  assert.equal(normalizeSeriesLabel('  Redmi  Note '), 'Redmi Note')
  for (const bad of ['', '   ', SERIES_NONE, 'x'.repeat(61), null, 7]) assert.equal(normalizeSeriesLabel(bad), null)
})
