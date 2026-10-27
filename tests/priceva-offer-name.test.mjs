import test from 'node:test'
import assert from 'node:assert/strict'

const { buildOfferName } = await import('../src/lib/priceva-offer-name.ts')

const empty = { chip: '', ram: '', storage: '', color: '', sim: '' }

test('SIM goes right after the model, before storage and color', () => {
  const name = buildOfferName('iPhone 16 Pro Max', { ...empty, storage: '256GB', color: 'Чёрный титан', sim: 'SIM + eSIM' })
  assert.equal(name, 'iPhone 16 Pro Max SIM + eSIM 256GB Чёрный титан')
})

test('RAM and storage stay together after SIM for phones with two memory values', () => {
  const name = buildOfferName('Galaxy A18', { ...empty, ram: '4', storage: '128GB', color: 'Серебристый', sim: 'SIM + eSIM' })
  assert.equal(name, 'Galaxy A18 SIM + eSIM 4/128GB Серебристый')
})

test('offers without SIM keep the model, memory, color order', () => {
  const name = buildOfferName('Apple Watch Series 12', { ...empty, storage: '64GB', color: 'Серебристый' })
  assert.equal(name, 'Apple Watch Series 12 64GB Серебристый')
})

test('parts already present in the product name are not repeated', () => {
  const name = buildOfferName('iPhone 17 256GB SIM + eSIM', { ...empty, storage: '256GB', color: 'Белый', sim: 'SIM + eSIM' })
  assert.equal(name, 'iPhone 17 256GB SIM + eSIM Белый')
})

test('chip is placed before SIM when the model name lacks it', () => {
  const name = buildOfferName('MacBook Air', { ...empty, chip: 'M5', storage: '512GB', color: 'Серебристый' })
  assert.equal(name, 'MacBook Air M5 512GB Серебристый')
})
