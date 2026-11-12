import test from 'node:test'
import assert from 'node:assert/strict'

const { planVariants, pendingPriceGroups, pendingColorPriceCells, applyVariantChanges, comboKey } = await import('../src/payload/variant-tools/plan.ts')
const { parseCapacity, parseStorage, compareCapacity, normalizeHex, colorSlug, uniqueSlug, validateNewColor, colorPhotoCounts } = await import('../src/payload/variant-tools/options.ts')
const { profileFor, supportsRam } = await import('../src/payload/variant-tools/profiles.ts')

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
    [{ key: '2|7', storage: '2', sim: '7', ram: '' }, { key: '2|8', storage: '2', sim: '8', ram: '' }],
  )
  assert.deepEqual(pendingPriceGroups({ color: [5], storage: [1, 2], sim: [7] }, rows), [{ key: '2|', storage: '2', sim: '', ram: '' }])
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

test('counts photos per color from the product color photo groups', () => {
  const groups = [
    { id: 'a', color: 5, images: [1, 2, 3] },
    { id: 'b', color: { id: 7, englishLabel: 'Blue' }, images: [{ id: 9 }] },
    { id: 'c', color: 5, images: [4] },
    { id: 'd', color: 8, images: [] },
    { id: 'e', color: null, images: [5] },
    { id: 'f', images: [6] },
    null,
    'x',
  ]
  assert.deepEqual(colorPhotoCounts(groups), { 5: 4, 7: 1 })
  assert.deepEqual(colorPhotoCounts(undefined), {})
  assert.deepEqual(colorPhotoCounts([]), {})
})

test('a color price overrides the group price for that color only', () => {
  const plan = planVariants(
    { dims: { color: [1, 2], storage: [10, 20] }, prices: { '10|': 90000, '20|': 110000 }, colorPrices: { '2:20|': 115000 } },
    [],
  )
  assert.equal(plan.ok, true)
  const priceOf = (color, storage) => plan.add.find((row) => row.color === color && row.storage === storage).price
  assert.equal(priceOf(1, 10), 90000)
  assert.equal(priceOf(1, 20), 110000)
  assert.equal(priceOf(2, 10), 90000)
  assert.equal(priceOf(2, 20), 115000)
})

test('a color price can replace the missing group price and applies per sim', () => {
  const colorPrices = { '1:5|7': 100000, '1:5|8': 95000, '2:5|7': 101000, '2:5|8': 96000 }
  const plan = planVariants({ dims: { color: [1, 2], storage: [5], sim: [7, 8] }, colorPrices }, [])
  assert.equal(plan.ok, true)
  for (const row of plan.add) assert.equal(row.price, colorPrices[`${row.color}:${row.storage}|${row.sim}`])
  assert.equal(planVariants({ dims: { color: [1, 2], storage: [5], sim: [7, 8] }, colorPrices: { '1:5|7': 1 } }, []).ok, false)
})

test('a color price works without storage or sim and falls back to the base price', () => {
  const plan = planVariants({ dims: { color: [1, 2, 3] }, basePrice: 5000, colorPrices: { '2:|': 5500 } }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.add.map((row) => row.price), [5000, 5500, 5000])
})

test('rejects an invalid color price instead of silently using the group price', () => {
  for (const bad of [0, -5, 1.5, Number.NaN]) {
    const plan = planVariants({ dims: { color: [1], storage: [10] }, prices: { '10|': 90000 }, colorPrices: { '1:10|': bad } }, [])
    assert.equal(plan.ok, false)
    assert.match(plan.error, /цвета/)
  }
})

test('lists color price cells only for variants that still have to be added', () => {
  const rows = [{ id: 'a', color: 1, storage: 10, sim: 7 }]
  assert.deepEqual(
    pendingColorPriceCells({ color: [1, 2], storage: [10], sim: [7, 8] }, rows).map((cell) => cell.key),
    ['1:10|8', '2:10|7', '2:10|8'],
  )
  assert.deepEqual(pendingColorPriceCells({ color: [4], storage: [10] }, []).map((cell) => [cell.key, cell.group.key]), [['4:10|', '10|']])
  assert.deepEqual(pendingColorPriceCells({ color: [4] }, []).map((cell) => cell.key), ['4:|'])
  assert.deepEqual(pendingColorPriceCells({ storage: [10] }, []), [])
})

test('prices every ram and storage pair separately once two rams are chosen', () => {
  const prices = { '1||20': 30000, '1||21': 33000, '2||20': 36000, '2||21': 39000 }
  const plan = planVariants({ dims: { color: [5], storage: [1, 2], ramOption: [20, 21] }, prices }, [])
  assert.equal(plan.ok, true)
  assert.equal(plan.add.length, 4)
  for (const row of plan.add) assert.equal(row.price, prices[`${row.storage}||${row.ramOption}`])
  assert.deepEqual(
    pendingPriceGroups({ color: [5], storage: [1], ramOption: [20, 21] }, []).map((group) => group.key),
    ['1||20', '1||21'],
  )
})

test('a single ram keeps one price per storage and does not enter the group key', () => {
  const plan = planVariants({ dims: { color: [5], storage: [1, 2], ramOption: [20] }, prices: { '1|': 30000, '2|': 36000 } }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.add.map((row) => [row.storage, row.ramOption, row.price]), [[1, 20, 30000], [2, 20, 36000]])
  assert.deepEqual(pendingPriceGroups({ color: [5], storage: [1, 2], ramOption: [20] }, []).map((group) => group.ram), ['', ''])
})

test('ram with sim and storage keeps all three parts in the price key', () => {
  const groups = pendingPriceGroups({ storage: [1], sim: [7, 8], ramOption: [20, 21] }, [])
  assert.deepEqual(groups.map((group) => group.key), ['1|7|20', '1|7|21', '1|8|20', '1|8|21'])
  assert.equal(planVariants({ dims: { storage: [1], sim: [7, 8], ramOption: [20, 21] }, prices: { '1|7|20': 1, '1|7|21': 2, '1|8|20': 3 } }, []).ok, false)
})

test('asks for a price per ram when ram is the only priced dimension', () => {
  const plan = planVariants({ dims: { color: [5], ramOption: [20, 21] }, prices: { '||20': 1 } }, [])
  assert.equal(plan.ok, false)
  assert.match(plan.error, /сочетания выбранных параметров/)
  assert.equal(planVariants({ dims: { color: [5], ramOption: [20, 21] }, prices: { '||20': 1, '||21': 2 } }, []).ok, true)
})

test('skipped price groups remove unwanted ram and storage pairs from the plan and from price cells', () => {
  const dims = { color: [5, 6], storage: [1, 2], ramOption: [20, 21] }
  const prices = { '1||20': 30000, '2||21': 39000 }
  const plan = planVariants({ dims, prices, skip: ['1||21', '2||20'] }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual(plan.add.map((row) => [row.color, row.storage, row.ramOption, row.price]), [[5, 1, 20, 30000], [5, 2, 21, 39000], [6, 1, 20, 30000], [6, 2, 21, 39000]])
  assert.equal(planVariants({ dims, prices }, []).ok, false)
  assert.deepEqual(pendingColorPriceCells(dims, [], ['1||21', '2||20']).map((cell) => cell.key), ['5:1||20', '5:2||21', '6:1||20', '6:2||21'])
  assert.equal(pendingPriceGroups(dims, []).length, 4)
})

test('skipping every group leaves nothing to add and does not count as already existing', () => {
  const plan = planVariants({ dims: { storage: [1], ramOption: [20, 21] }, prices: {}, skip: ['1||20', '1||21'] }, [])
  assert.equal(plan.ok, true)
  assert.deepEqual([plan.add.length, plan.skipped], [0, 0])
})

test('parses combined ram and storage values and keeps plain storage working', () => {
  assert.deepEqual(parseStorage('8/128GB'), { value: '8/128GB', gb: 128, ramGb: 8 })
  assert.deepEqual(parseStorage(' 12 / 1 тб '), { value: '12/1TB', gb: 1024, ramGb: 12 })
  assert.deepEqual(parseStorage('256 гб'), { value: '256GB', gb: 256, ramGb: 0 })
  assert.deepEqual(parseStorage('1TB'), { value: '1TB', gb: 1024, ramGb: 0 })
  for (const bad of ['', '/128GB', '8/', '0/128GB', '8/0GB', '123/128GB', '8|128', '8/128', '8/128MB', '8/128GB/1', '4TB/128GB', null, 8]) assert.equal(parseStorage(bad), null)
})

test('orders combined storage values by storage size first and ram second', () => {
  const sorted = ['12/256GB', '256GB', '8/128GB', '128GB', '4/128GB', '1TB', '12/1TB', '8/256GB', 'ПАМЯТЬ'].sort(compareCapacity)
  assert.deepEqual(sorted, ['128GB', '4/128GB', '8/128GB', '256GB', '8/256GB', '12/256GB', '1TB', '12/1TB', 'ПАМЯТЬ'])
})

test('phones that are not Apple get a ram dimension and Apple phones do not', () => {
  assert.deepEqual(profileFor('phone', { brand: 'Samsung' }).dimensions, ['color', 'storage', 'ramOption', 'sim'])
  assert.deepEqual(profileFor('phone', { brand: '', productType: '' }).dimensions, ['color', 'storage', 'ramOption', 'sim'])
  assert.deepEqual(profileFor('phone').dimensions, ['color', 'storage', 'ramOption', 'sim'])
  assert.deepEqual(profileFor('phone', { brand: ' apple ' }).dimensions, ['color', 'storage', 'sim'])
  assert.deepEqual(profileFor('phone', { brand: 'Xiaomi', productType: 'iphone' }).dimensions, ['color', 'storage', 'sim'])
  assert.match(profileFor('phone', { brand: 'Samsung' }).hint, /оперативная память/)
})

test('ram support is limited to laptops and non Apple phones', () => {
  assert.equal(supportsRam('laptop', { brand: 'Apple' }), true)
  assert.equal(supportsRam('phone', { brand: 'Google' }), true)
  assert.equal(supportsRam('phone', { brand: 'Apple' }), false)
  assert.equal(supportsRam('tablet', { brand: 'Samsung' }), false)
  assert.equal(supportsRam('smartwatch'), false)
  assert.deepEqual(profileFor('laptop', { brand: 'Apple' }).dimensions, ['color', 'storage', 'ramOption', 'screenSizeOption'])
  assert.deepEqual(profileFor('headphones').dimensions, ['color', 'connectivityOption'])
})
