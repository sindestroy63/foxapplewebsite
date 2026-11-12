import test from 'node:test'
import assert from 'node:assert/strict'

const { statusLabel, statusTone, OUT_OF_STOCK_LABEL } = await import('../src/lib/stock-status.ts')

test('an out of stock position is offered as a one working day order', () => {
  assert.equal(OUT_OF_STOCK_LABEL, 'Под заказ 1 рабочий день')
  assert.equal(statusLabel('out_of_stock'), 'Под заказ 1 рабочий день')
})

test('in stock and preorder labels are unchanged and unknown status falls back to in stock', () => {
  assert.equal(statusLabel('in_stock'), 'В наличии')
  assert.equal(statusLabel('preorder'), 'Под заказ')
  assert.equal(statusLabel(undefined), 'В наличии')
})

test('no status ever says the item is not in stock', () => {
  for (const status of ['in_stock', 'preorder', 'out_of_stock', undefined]) {
    assert.doesNotMatch(statusLabel(status).toLowerCase(), /нет в наличии/)
  }
})

test('orderable statuses look the same and only available stock is green', () => {
  assert.equal(statusTone('in_stock'), 'green')
  assert.equal(statusTone(undefined), 'green')
  assert.equal(statusTone('preorder'), 'orange')
  assert.equal(statusTone('out_of_stock'), 'orange')
})
