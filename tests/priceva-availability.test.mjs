import test from 'node:test'
import assert from 'node:assert/strict'

const { pricevaAvailability } = await import('../src/lib/priceva-availability.ts')

test('monitored Ultra 3 exports unavailable variants without reporting stock', () => {
  const product = { id: 28, isAvailable: true, status: 'out_of_stock' }
  assert.equal(pricevaAvailability(product), false)
  assert.equal(pricevaAvailability(product, { isAvailable: false, status: 'out_of_stock' }), false)
  assert.equal(pricevaAvailability({ ...product, id: '28' }, { isAvailable: true, status: 'in_stock' }), false)
  assert.equal(pricevaAvailability({ ...product, status: 'in_stock' }, { isAvailable: false, status: 'out_of_stock' }), false)
  assert.equal(pricevaAvailability({ ...product, status: 'in_stock' }, { isAvailable: true, status: 'in_stock' }), true)
  assert.equal(pricevaAvailability({ ...product, isAvailable: false }), null)
})

test('other products retain stock and preorder eligibility and unavailable variants stay excluded', () => {
  const product = { id: 165, isAvailable: true, status: 'in_stock' }
  assert.equal(pricevaAvailability(product, { isAvailable: true, status: 'in_stock' }), true)
  assert.equal(pricevaAvailability({ ...product, status: 'preorder' }, { isAvailable: true, status: 'preorder' }), true)
  assert.equal(pricevaAvailability(product, { isAvailable: false, status: 'in_stock' }), null)
  assert.equal(pricevaAvailability(product, { isAvailable: true, status: 'out_of_stock' }), null)
  assert.equal(pricevaAvailability({ ...product, status: 'out_of_stock' }), null)
  assert.equal(pricevaAvailability({ ...product, isAvailable: false }), null)
})
