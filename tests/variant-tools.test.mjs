import test from 'node:test'
import assert from 'node:assert/strict'

const { planVariants, applyVariantChanges, comboKey } = await import('../src/payload/variant-tools/plan.ts')

const existing = [
  { id: 'a', sku: 'VAR-A', color: 5, storage: 1, sim: 9, price: 100000, status: 'in_stock', isAvailable: true },
]

test('adds only missing combinations and keeps existing ones untouched', () => {
  const plan = planVariants(
    { dims: { color: [5], storage: [1, 2], sim: [9] }, priceByStorage: { 1: 100000, 2: 120000 } },
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
    { dims: { color: [1, 2], storage: [10, 20], sim: [7] }, priceByStorage: { 10: 90000, 20: 110000 }, status: 'preorder' },
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
  assert.equal(planVariants({ dims: { color: [1], storage: [1, 2] }, priceByStorage: { 1: 10 } }, []).ok, false)
  assert.equal(planVariants({ dims: { color: [1], storage: [1] }, basePrice: 1.5 }, []).ok, false)
  const many = Array.from({ length: 15 }, (_, index) => index + 1)
  assert.equal(planVariants({ dims: { color: many, storage: many }, basePrice: 1 }, []).ok, false)
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
