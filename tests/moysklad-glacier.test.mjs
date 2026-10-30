import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMs, parseSite, qtyFor } from '../scripts/moysklad-stock.mjs'

test('Glacier stock matches Pro and Pro Max variants without mixing SIM, storage or colors', () => {
  const names = [
    'Apple iPhone 18 Pro 256Gb Glacier 1Sim imei 356295759038629',
    'Apple iPhone 18 Pro 256Gb Glacier eSim imei 351202814014921',
    'Apple iPhone 18 Pro Max 256Gb Glacier 1Sim imei 355767303533645',
    'Apple iPhone 18 Pro Max 256Gb Glacier eSim imei 357125428701993',
  ]
  const items = names.map((name) => parseMs(name, 1))
  const sites = ['Apple iPhone 18 Pro', 'Apple iPhone 18 Pro Max'].flatMap((name) =>
    ['SIM_ESIM', 'ESIM'].map((sim, index) => parseSite({
      id: `${name}-${index}`, name, english_label: 'Glacier', storage: '256GB', sim,
    })),
  )
  for (const site of sites) {
    assert.equal(qtyFor(site, items, sites), 1)
    assert.equal(qtyFor({ ...site, storage: '512gb' }, items, sites), 0)
    assert.equal(qtyFor({ ...site, color: 'silver', colorLabel: 'Silver' }, items, sites), 0)
    assert.equal(qtyFor({ ...site, color: 'blue', colorLabel: 'Blue' }, items, sites), 0)
  }
})
