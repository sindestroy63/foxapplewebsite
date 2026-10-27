import test from 'node:test'
import assert from 'node:assert/strict'

const { buildCompareRows, parseDescription, productSpecs } = await import('../src/lib/compare.ts')

const phone = [
  'iPhone 17 Pro Max — абсолютный флагман',
  '',
  '· Экран: 6.9″ Super Retina XDR, 120 Гц, Always-On, 3000 нит',
  '· Процессор: Apple A19 Pro (3 нм)',
  '· Память: 12 ГБ ОЗУ + от 256 ГБ SSD',
  '· Камеры: тройная 48 МП + 18 МП фронтальная',
  '· Аккумулятор: до 5088 мА·ч (лучший в истории iPhone)',
  '· Зарядка: USB-C, до 40 Вт проводная, 25 Вт MagSafe',
  '· Защита: IP68, Ceramic Shield 2',
  '· Вес: 233 г',
  '',
  'Главное:',
  '',
  '· Все три задние камеры — по 48 МП',
  '',
  'Цвета: Silver, Cosmic Orange',
  '',
  'Для кого: для тех, кому нужен максимум',
].join('\n')

const item = (id, specs) => ({ id, name: id, href: '/', image: null, imageAlt: '', price: 1, priceFrom: false, available: true, statusLabel: '', specs })

test('a structured description is split into labeled specs and an intro', () => {
  const parsed = parseDescription(phone)
  assert.equal(parsed.intro, 'iPhone 17 Pro Max — абсолютный флагман')
  assert.equal(parsed.specs.screen, '6.9″ Super Retina XDR, 120 Гц, Always-On, 3000 нит')
  assert.equal(parsed.specs.chip, 'Apple A19 Pro (3 нм)')
  assert.equal(parsed.specs.battery, 'до 5088 мА·ч (лучший в истории iPhone)')
  assert.equal(parsed.specs.weight, '233 г')
  assert.equal(parsed.specs.colors, undefined)
  assert.equal(parsed.specs['Для кого'], undefined)
})

test('a prose description yields only a trimmed intro and no specs', () => {
  const long = `Samsung Galaxy A18 — современный смартфон. ${'Очень удобный и быстрый. '.repeat(20)}`
  const parsed = parseDescription(long)
  assert.deepEqual(parsed.specs, {})
  assert.ok(parsed.intro.length <= 221)
  assert.ok(parsed.intro.startsWith('Samsung Galaxy A18'))
})

test('rear and front camera lines are merged into one camera spec', () => {
  const parsed = parseDescription('Часы\n\n· Основная камера: 50 Мп\n· Фронтальная камера: 12 Мп')
  assert.equal(parsed.specs.camera, 'Основная: 50 Мп; Фронтальная: 12 Мп')
})

test('RAM is taken from the memory line while storage comes only from variants', () => {
  const specs = productSpecs({
    id: 9,
    name: 'Phone',
    slug: 'phone',
    price: 1,
    shortDescription: phone,
    variants: [{ price: 1, storage: '256GB' }, { price: 2, storage: '512GB' }],
  })
  assert.deepEqual(specs.ram, ['12 ГБ'])
  assert.deepEqual(specs.storage, ['256GB', '512GB'])
  assert.deepEqual(specs.summary, ['iPhone 17 Pro Max — абсолютный флагман'])
})

test('own variant data wins over the description for the chip', () => {
  const specs = productSpecs({ id: 1, name: 'Phone', slug: 'phone', price: 1, shortDescription: phone, variants: [{ price: 1, chip: 'A19 Pro' }] })
  assert.deepEqual(specs.chip, ['A19 Pro'])
})

test('rows come out in a fixed logical order and identical brand rows are hidden', () => {
  const a = productSpecs({ id: 1, name: 'A', slug: 'a', price: 1, brand: 'Apple', shortDescription: phone })
  const b = productSpecs({ id: 2, name: 'B', slug: 'b', price: 1, brand: 'Apple', shortDescription: phone.replace('A19 Pro', 'A20 Pro') })
  const keys = buildCompareRows([item('a', a), item('b', b)]).map((row) => row.key)
  assert.ok(!keys.includes('brand'))
  assert.deepEqual(keys, ['screen', 'chip', 'ram', 'camera', 'battery', 'charging', 'protection', 'weight', 'summary'])
})

test('different brands keep the brand row at the top and long values are flagged', () => {
  const long = 'x'.repeat(130)
  const rows = buildCompareRows([item('a', { brand: ['Apple'], camera: [long] }), item('b', { brand: ['Samsung'], camera: ['short'] })])
  assert.equal(rows[0].key, 'brand')
  assert.equal(rows.find((row) => row.key === 'camera').long, true)
})
