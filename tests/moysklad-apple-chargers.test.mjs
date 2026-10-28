import test from 'node:test'
import assert from 'node:assert/strict'

const { appleChargerOf } = await import('../scripts/moysklad-stock.mjs')

test('Apple charger names from MoySklad and site labels resolve to the same variant key', () => {
  assert.equal(appleChargerOf('Apple Dynamic 40-60W USB-C'), 'dynamic-40-60')
  assert.equal(appleChargerOf('Apple Dynamic 40-60W USB-C '), 'dynamic-40-60')
  assert.equal(appleChargerOf('Сетевое зарядное устройство USB‑C Apple 20 Вт Original'), '20w')
  assert.equal(appleChargerOf('Apple USB-C 20W '), '20w')
  assert.equal(appleChargerOf('Apple 35W USB-C'), '35w')
  assert.equal(appleChargerOf('Apple 96W USB-C'), '96w')
})

test('other chargers, cables and Apple devices are not treated as Apple wall chargers', () => {
  assert.equal(appleChargerOf('Remax GaN Fast Charger 20W U187-C20W'), null)
  assert.equal(appleChargerOf('Кабель Keephone WEAVEPORT (1.2m) 60W Белый'), null)
  assert.equal(appleChargerOf('Apple Watch Magnetic Fast Charger to USB-C Cable'), null)
  assert.equal(appleChargerOf('Apple Watch SE 3 (2025) 44mm Midnight M/L SF7W24X5HHX'), null)
  assert.equal(appleChargerOf('Apple MacBook Air (M5, 2026) 13" 16/512GB Midnight serial SM7X0NXRX0W'), null)
  assert.equal(appleChargerOf('Apple 67W USB-C'), null)
  assert.equal(appleChargerOf(null), null)
})
