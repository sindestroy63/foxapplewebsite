import test from 'node:test'
import assert from 'node:assert/strict'

const { planVariants, pendingPriceGroups, applyVariantChanges, comboKey } = await import('../src/payload/variant-tools/plan.ts')
const { parseCapacity, compareCapacity, normalizeHex, colorSlug, uniqueSlug, validateNewColor } = await import('../src/payload/variant-tools/options.ts')

const existing = [
  { id: 'a', sku: 'VAR-A', color: 5, storage: 1, sim: 9, price: 100000, status: 'in_stock', isAvailable: true },
]

test('adds only missing combinations and keeps existing ones untouched', () => {
  const plan = planVariants(
    { dims: { color: [5], storage: [1, 2], sim: [9] }, prices: { '1|': 100000, '2|': 120000 } },
    existing,
  )
  assert.equal(plan.ok, true)
  assert.equal(plan.skipped, 1)
  assert.equal(plan.add.length, 1)
  assert.deepEqual(
    { color: plan.add[0].color, storage: plan.add[0].storage, sim: plan.add[0].sim, price: plan.add[0].price },
    { color: 5, storage: 2, sim: 9, price: 120000 },
  )
  assert.equal(plan.add[0].sku, undefined)
  assert.equal(plan.add[0].id, undefined)
})

test('treats numeric and object relation ids as the same combination', () => {
  const rows = [{ id: 'a', color: { id: 5 }, storage: { id: '1' }, sim: 9 }]
  const plan = planVariants({ dims: { color: ['5'], storage: [1], sim: [9] }, basePrice: 1 }, rows)
  assert.equal(plan.ok, true)
  assert.equal(plan.add.length, 0)
  assert.equal(plan.skipped, 1)
  assert.equal(comboKey(rows[0]), '5|1|9||||')
})

test('builds the full product of selected values with per-storage prices', () => {
  const plan = planVariants(
    { dims: { color: [1, 2], storage: [10, 20], sim: [7] }, prices: { '10|': 90000, '20|': 110000 }, status: 'preorder' },
    [],
  )
  assert.equal(plan.ok, true)
  assert.equal(plan.add.length, 4)
  assert.deepEqual(plan.add.map((row) => row.price).sort((a, b) => a - b), [90000, 90000, 110000, 110000])
  assert.ok(plan.add.every((row) => row.status === 'preorder' && row.isAvailable === true))
})

test('out of stock builds hidden-by-availability variants', () => {
  const plan = planVariants({ dims: { color: [1] }, basePrice: 5000, status: 'out_of_stock' }, [])
  assert.equal(plan.ok, true)
  assert.equal(plan.add[0].isAvailable, false)
})

test('copies common text fields and ignores blank ones', () => {
  const plan = planVariants({ dims: { color: [1] }, basePrice: 5000, common: { chip: ' M4 ', packageLabel: '  ' } }, [])
  assert.equal(plan.ok, true)
  assert.equal(plan.add[0].chip, 'M4')
  assert.equal('packageLabel' in plan.add[0], false)
})

test('rejects empty selection, missing price and oversized batches', () => {
  assert.equal(planVariants({ dims: {}, basePrice: 1 }, []).ok, false)
  assert.equal(planVariants({ dims: { color: [1] } }, []).ok, false)
  assert.equal(planVariants({ dims: { color: [1], storage: [1, 2] }, prices: { '1|': 10 } }, []).ok, false)
  assert.equal(planVariants({ dims: { color: [1], storage: [1] }, basePrice: 1.5 }, []).ok, false)
  const many = Array.from({ length: 15 }, (_, index) => index + 1)
  assert.equal(planVariants({ dims: { color: many, storage: many }, basePrice: 1 }, []).ok, false)
})

test('prices every storage and sim pair separately when two sim types are chosen', () => {
  const prices = { '1|7': 100000, '1|8': 95000, '2|7': 120000, '2|8': 115000 }
  const plan = planVariants({ dims: { color: [1, 2], storage: [1, 2], sim: [7, 8] }, prices }, [])
  assert.equal(plan.ok, true)
  assert.equal(plan.add.length, 8)
  for (const row of plan.add) assert.equal(row.price, prices[`${row.storage}|${row.sim}`])
})

test('keeps one price per storage when a single sim type is chosen', () => {
  const plan = planVariants({ dims: { color: [1], storage: [1, 2], sim: [7] }, prices: { '1|': 100000, '2|': 120000 } }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.add.map((row) => row.price), [100000, 120000])
})

test('asks for a price per sim when storage is not selected', () => {
  assert.equal(planVariants({ dims: { color: [1], sim: [7, 8] }, prices: { '|7': 90000 } }, []).ok, false)
  const plan = planVariants({ dims: { color: [1], sim: [7, 8] }, prices: { '|7': 90000, '|8': 85000 } }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.add.map((row) => [row.sim, row.price]), [[7, 90000], [8, 85000]])
})

test('requires every storage and sim pair to be priced', () => {
  const plan = planVariants({ dims: { storage: [1, 2], sim: [7, 8] }, prices: { '1|7': 1, '1|8': 2, '2|7': 3 } }, [])
  assert.equal(plan.ok, false)
  assert.match(plan.error, /памяти и SIM/)
})

test('lists only price groups that still have variants to add', () => {
  const rows = [{ id: 'a', color: 5, storage: 1, sim: 7 }, { id: 'b', color: 5, storage: 1, sim: 8 }]
  assert.deepEqual(
    pendingPriceGroups({ color: [5], storage: [1, 2], sim: [7, 8] }, rows),
    [{ key: '2|7', storage: '2', sim: '7' }, { key: '2|8', storage: '2', sim: '8' }],
  )
  assert.deepEqual(pendingPriceGroups({ color: [5], storage: [1, 2], sim: [7] }, rows), [{ key: '2|', storage: '2', sim: '' }])
  assert.deepEqual(pendingPriceGroups({ color: [5, 6] }, []), [])
  assert.deepEqual(pendingPriceGroups({}, []), [])
})

test('parses storage and RAM capacities and keeps terabytes out of RAM', () => {
  assert.deepEqual(parseCapacity(' 256 gb ', 'storage'), { value: '256GB', gb: 256 })
  assert.deepEqual(parseCapacity('1 ТБ', 'storage'), { value: '1TB', gb: 1024 })
  assert.deepEqual(parseCapacity('512гб', 'storage'), { value: '512GB', gb: 512 })
  assert.deepEqual(parseCapacity('8GB', 'ram'), { value: '8GB', gb: 8 })
  assert.equal(parseCapacity('1TB', 'ram'), null)
  for (const bad of ['', '0GB', '256', 'GB', '12/256GB', '8|128', '-8GB', '8.5GB', '10000GB', null, 8]) assert.equal(parseCapacity(bad, 'storage'), null)
})

test('orders capacities by size and leaves unparsable labels last', () => {
  const sorted = ['1TB', '256GB', '8GB', 'ПАМЯТЬ', '36GB', '2TB', '64GB'].sort(compareCapacity)
  assert.deepEqual(sorted, ['8GB', '36GB', '64GB', '256GB', '1TB', '2TB', 'ПАМЯТЬ'])
})

test('normalizes hex colors and builds latin slugs', () => {
  assert.equal(normalizeHex('#ABC'), '#aabbcc')
  assert.equal(normalizeHex(' 7A3CFF '), '#7a3cff')
  for (const bad of ['', '#12', '#12345', 'red', '#gggggg', null]) assert.equal(normalizeHex(bad), null)
  assert.equal(colorSlug('Ultra Violet'), 'ultra-violet')
  assert.equal(colorSlug('Белый'), '')
  assert.equal(uniqueSlug('green', new Set(['green', 'green-2'])), 'green-3')
  assert.equal(uniqueSlug('teal', new Set(['green'])), 'teal')
})

test('validates new colors before creation', () => {
  const ok = validateNewColor({ englishLabel: '  Deep   Blue ', russianLabel: ' Глубокий синий', primaryHex: '#1A2B3C' })
  assert.deepEqual(ok, { ok: true, data: { englishLabel: 'Deep Blue', russianLabel: 'Глубокий синий', primaryHex: '#1a2b3c', slug: 'deep-blue' } })
  assert.equal(validateNewColor({ englishLabel: '', russianLabel: 'Синий', primaryHex: '#000000' }).ok, false)
  assert.equal(validateNewColor({ englishLabel: 'Blue', russianLabel: '', primaryHex: '#000000' }).ok, false)
  assert.equal(validateNewColor({ englishLabel: 'Синий', russianLabel: 'Синий', primaryHex: '#000000' }).ok, false)
  assert.equal(validateNewColor({ englishLabel: 'Blue', russianLabel: 'Синий', primaryHex: 'blue' }).ok, false)
  assert.equal(validateNewColor({ englishLabel: 'x'.repeat(61), russianLabel: 'Синий', primaryHex: '#000000' }).ok, false)
})

test('applies price and status edits to matching variants only', () => {
  const rows = [
    { id: 'a', price: 100, status: 'in_stock', isAvailable: true, color: 1 },
    { id: 'b', price: 200, status: 'in_stock', isAvailable: true, color: 2 },
  ]
  const result = applyVariantChanges(rows, [{ variantId: 'b', price: 250, status: 'out_of_stock' }])
  assert.equal(result.ok, true)
  assert.equal(result.changed, 1)
  assert.deepEqual(result.rows[0], rows[0])
  assert.deepEqual(result.rows[1], { id: 'b', price: 250, status: 'out_of_stock', isAvailable: false, color: 2 })
})

test('reports unchanged edits as zero changes and rejects bad input', () => {
  const rows = [{ id: 'a', price: 100, status: 'in_stock', isAvailable: true }]
  assert.equal(applyVariantChanges(rows, [{ variantId: 'a', price: 100 }]).changed, 0)
  assert.equal(applyVariantChanges(rows, [{ variantId: 'zzz', price: 100 }]).ok, false)
  assert.equal(applyVariantChanges(rows, [{ variantId: 'a', price: 0 }]).ok, false)
  assert.equal(applyVariantChanges(rows, [{ variantId: 'a', status: 'gone' }]).ok, false)
})

test('validates product level price and status edits', async () => {
  const { validateProductChange } = await import('../src/payload/variant-tools/plan.ts')
  assert.deepEqual(validateProductChange({ price: 12990, status: 'out_of_stock', isAvailable: false }), { ok: true, data: { price: 12990, status: 'out_of_stock', isAvailable: false } })
  assert.deepEqual(validateProductChange({ isAvailable: true }), { ok: true, data: { isAvailable: true } })
  assert.equal(validateProductChange({}).ok, false)
  assert.equal(validateProductChange({ price: 0 }).ok, false)
  assert.equal(validateProductChange({ price: 10.5 }).ok, false)
  assert.equal(validateProductChange({ status: 'gone' }).ok, false)
})
