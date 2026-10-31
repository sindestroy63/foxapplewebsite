import test from 'node:test'
import assert from 'node:assert/strict'
import { colorOf, parseMs, parseSite, qtyFor, normRayBanColor, normRayBanSize, matchRayBan } from '../scripts/moysklad-stock.mjs'

test('Samsung Galaxy A57 matches colors and handles base RAM and dual SIM correctly', () => {
  assert.equal(colorOf('Samsung Galaxy A57 128Gb Gray imei 351550982226184'), 'awesome gray')
  assert.equal(colorOf('Samsung Galaxy A57 256Gb Lilac imei 350357925723819'), 'awesome lilac')
  assert.equal(colorOf('Samsung Galaxy A57 256Gb Awesome Navy imei 352857622601984'), 'awesome navy')
  assert.equal(colorOf('Samsung Galaxy A57 256Gb IcyBlue imei 350357925718140'), 'awesome icyblue')

  const parsedGray128 = parseMs('Samsung Galaxy A57 128Gb Gray imei 351550982226184', 1)
  assert.equal(parsedGray128.model, 'galaxy a57')
  assert.equal(parsedGray128.sim, 'SIM_ESIM')
  assert.equal(parsedGray128.storage, '128gb')
  assert.equal(parsedGray128.color, 'awesome gray')

  const parsedGray256 = parseMs('Samsung Galaxy A57 256Gb Gray 355550737921671', 1)
  assert.equal(parsedGray256.model, 'galaxy a57')
  assert.equal(parsedGray256.sim, 'SIM_ESIM')
  assert.equal(parsedGray256.storage, '256gb')
  assert.equal(parsedGray256.color, 'awesome gray')

  const siteVariant8 = parseSite({
    id: 'a57-256-gray-8',
    product_id: 112,
    name: 'Galaxy A57',
    english_label: 'Awesome Gray',
    storage: '256GB',
    sim: 'SIM_ESIM',
    ram: '8GB'
  })
  const siteVariant12 = parseSite({
    id: 'a57-256-gray-12',
    product_id: 112,
    name: 'Galaxy A57',
    english_label: 'Awesome Gray',
    storage: '256GB',
    sim: 'SIM_ESIM',
    ram: '12GB'
  })

  const sites = [siteVariant8, siteVariant12]
  assert.equal(qtyFor(siteVariant8, [parsedGray256], sites), 1)
  assert.equal(qtyFor(siteVariant12, [parsedGray256], sites), 0)
})

test('Ray-Ban normalizes colors, sizes, matches products and ignores service/demo items', () => {
  assert.equal(normRayBanColor('Matte Black/Transitions Grey'), 'matte black/transitions gray')
  assert.equal(normRayBanColor('Matte Black / Transitions Gray'), 'matte black/transitions gray')

  assert.equal(normRayBanSize('Умные очки Ray-Ban Wayfarer Gen 2, размер L, Matte Black/Transitions Grey'), 'l')
  assert.equal(normRayBanSize('Размер: M'), 'm')
  assert.equal(normRayBanSize('Размер: L'), 'l')
  assert.equal(normRayBanSize('Размер: М'), 'm')
  assert.equal(normRayBanSize('Размер: 2'), '2')
  assert.equal(normRayBanSize('Размер: 3'), '3')

  const variants = [
    { id: '1', product_name: 'Ray Ban Wayfarer Gen 2 (RW4012)', package_label: 'Размер: M', color: 'Matte Black/Transitions Grey' },
    { id: '2', product_name: 'Ray Ban Wayfarer Gen 2 (RW4012)', package_label: 'Размер: L', color: 'Matte Black/Transitions Grey' },
    { id: '3', product_name: 'Ray-Ban Skyler Gen 2 (RW4014)', package_label: 'Размер: М', color: 'Shiny Black/G-15 Green' }
  ]

  const matched = matchRayBan('Умные очки Ray-Ban Wayfarer Gen 2, размер L, Matte Black/Transitions Grey serial 4V0ZW31J6S00PS', variants)
  assert.equal(matched?.id, '2')

  assert.equal(matchRayBan('Настройка очков Rey-Ban', variants), null)
  assert.equal(matchRayBan('Демозона Ray-Ban Meta Gen 2 Matte Black/Clear L imei 4V0ZW27J5102Z6', variants), null)
})
