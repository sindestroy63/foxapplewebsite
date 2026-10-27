import test from 'node:test'
import assert from 'node:assert/strict'

const { COMPARE_LIMIT, buildCompareRows, parseCompareIds, productSpecs } = await import('../src/lib/compare.ts')

const item = (id, specs) => ({ id, name: id, href: '/', image: null, imageAlt: '', price: 1, priceFrom: false, available: true, statusLabel: '', specs })

test('ids are validated, deduplicated and capped at the compare limit', () => {
  assert.deepEqual(parseCompareIds('5,5,abc,-3,7, 9 ,12,15,18'), ['5', '7', '9', '12'])
  assert.equal(parseCompareIds(['1', '2', '3', '4', '5', '6']).length, COMPARE_LIMIT)
  assert.deepEqual(parseCompareIds(null), [])
  assert.deepEqual(parseCompareIds('1;2,<script>'), [])
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
