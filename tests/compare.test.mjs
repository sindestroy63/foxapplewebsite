import test from 'node:test'
import assert from 'node:assert/strict'

const { COMPARE_LIMIT, buildCompareRows, parseCompareEntries, parseCompareIds, productSpecs, toggleCompareEntry } = await import('../src/lib/compare.ts')

const item = (id, specs) => ({ id, name: id, href: '/', image: null, imageAlt: '', price: 1, priceFrom: false, available: true, statusLabel: '', specs })

test('ids are validated, deduplicated and capped at the compare limit', () => {
  assert.deepEqual(parseCompareIds('5,5,abc,-3,7, 9 ,12,15,18'), ['5', '7', '9', '12'])
  assert.equal(parseCompareIds(['1', '2', '3', '4', '5', '6']).length, COMPARE_LIMIT)
  assert.deepEqual(parseCompareIds(null), [])
  assert.deepEqual(parseCompareIds('1;2,<script>'), [])
})

test('the first product sets the category and products from other categories are refused', () => {
  const first = toggleCompareEntry([], { id: '1', group: 'smartphones' })
  assert.equal(first.result, 'added')
  const refused = toggleCompareEntry(first.entries, { id: '2', group: 'audio' })
  assert.equal(refused.result, 'group')
  assert.deepEqual(refused.entries, [{ id: '1', group: 'smartphones' }])
  const same = toggleCompareEntry(first.entries, { id: '3', group: 'smartphones' })
  assert.equal(same.result, 'added')
  assert.deepEqual(same.entries.map((entry) => entry.id), ['1', '3'])
})

test('removing the last product frees the category and the limit is enforced inside it', () => {
  let entries = []
  for (const id of ['1', '2', '3', '4']) entries = toggleCompareEntry(entries, { id, group: 'laptops' }).entries
  assert.equal(toggleCompareEntry(entries, { id: '5', group: 'laptops' }).result, 'full')
  assert.equal(toggleCompareEntry(entries, { id: '5', group: 'tablets' }).result, 'group')
  for (const id of ['1', '2', '3', '4']) entries = toggleCompareEntry(entries, { id, group: 'laptops' }).entries
  assert.deepEqual(entries, [])
  assert.equal(toggleCompareEntry(entries, { id: '9', group: 'tablets' }).result, 'added')
})

test('stored lists are sanitized: legacy ids, duplicates and foreign categories are dropped', () => {
  assert.deepEqual(parseCompareEntries(['1', '2']), [])
  assert.deepEqual(parseCompareEntries(null), [])
  const stored = parseCompareEntries([
    { id: '1', group: 'smartphones' },
    { id: '1', group: 'smartphones' },
    { id: '2', group: 'audio' },
    { id: 'x', group: 'smartphones' },
    { id: '3', group: 'smartphones' },
  ])
  assert.deepEqual(stored.map((entry) => entry.id), ['1', '3'])
})

test('a row is marked as different only when the products really differ', () => {
  const rows = buildCompareRows([
    item('a', { chip: ['A19'], ram: ['8GB'], colors: ['Чёрный', 'Белый'] }),
    item('b', { chip: ['A18'], ram: ['8GB'], colors: ['белый', 'чёрный'] }),
  ])
  const byKey = Object.fromEntries(rows.map((row) => [row.key, row]))
  assert.equal(byKey.chip.different, true)
  assert.equal(byKey.ram.different, false)
  assert.equal(byKey.colors.different, true)
})

test('rows that are empty for every product are dropped and missing data is not a difference', () => {
  const rows = buildCompareRows([item('a', { chip: ['A19'], ram: [] }), item('b', { chip: [], ram: [] })])
  assert.deepEqual(rows.map((row) => row.key), ['chip'])
  assert.equal(rows[0].different, false)
})

test('a value present on one product and different on another is flagged even if a third is empty', () => {
  const rows = buildCompareRows([item('a', { chip: ['A19'] }), item('b', { chip: ['A18'] }), item('c', { chip: [] })])
  assert.equal(rows[0].different, true)
})

test('a single product never has different rows', () => {
  const rows = buildCompareRows([item('a', { chip: ['A19'] })])
  assert.equal(rows[0].different, false)
})

test('specs merge variants and product fields without duplicates and sort storage by size', () => {
  const specs = productSpecs({
    id: 1,
    name: 'Phone',
    slug: 'phone',
    price: 100,
    brand: 'Apple',
    memory: '256GB',
    variants: [
      { price: 1, storage: '1TB', simType: 'SIM_ESIM', color: { russianLabel: 'Чёрный' } },
      { price: 2, memory: '256GB', simType: 'ESIM', color: { englishLabel: 'Black' } },
      { price: 3, storage: '512GB', simType: 'SIM_ESIM', color: { russianLabel: 'Чёрный' } },
    ],
  })
  assert.deepEqual(specs.storage, ['256GB', '512GB', '1TB'])
  assert.deepEqual(specs.sim, ['SIM + eSIM', 'eSIM'])
  assert.deepEqual(specs.colors, ['Чёрный', 'Black'])
  assert.deepEqual(specs.brand, ['Apple'])
})
