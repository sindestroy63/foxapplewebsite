import test from 'node:test'
import assert from 'node:assert/strict'

const { recommendationCategory, recommendedAccessories } = await import('../src/lib/product-recommendations.ts')

const product = (id, name, productLine, extra = {}) => ({ id, name, productLine, productGroup: 'gaming-consoles', slug: String(id), price: 1000, isAvailable: true, ...extra })

test('PS5 console editions recommend published PS5 accessories, not consoles or other platforms', () => {
  const console = product(35, 'PlayStation 5 Pro', 'PlayStation 5')
  const candidates = [
    console,
    product(36, 'PlayStation 5 Slim Disk', 'PlayStation 5'),
    product(55, 'DualSense PS5', 'Геймпады PS5'),
    product(59, 'Зарядная станция Sony Dualsense', 'Аксессуары для PS5'),
    product(166, 'Дисковод Sony Disc Drive', 'Аксессуары для PS5'),
    product(179, 'Подставка Vertical Stand', 'Аксессуары для PS5'),
    product(169, 'PlayStation VR2', 'Аксессуары для PS5', { status: 'out_of_stock' }),
    product(99, 'Hidden accessory', 'Аксессуары для PS5', { isAvailable: false }),
    product(100, 'Xbox Controller', 'Геймпады Xbox'),
  ]
  assert.deepEqual(recommendedAccessories(console, candidates).map((item) => item.id), [55, 59, 166, 179, 169])
  assert.equal(recommendationCategory(product(180, 'PlayStation 5 Slim Disk Ghost of Yotei Limited Edition', 'PlayStation 5')), 'ps5')
  assert.equal(recommendationCategory(product(181, 'Sony PlayStation 5 Slim Digital', 'PlayStation 5')), 'ps5')
})

test('accessories, portable players, other consoles and phones do not trigger PS5 recommendations', () => {
  for (const item of [
    product(55, 'DualSense PS5', 'Геймпады PS5'),
    product(170, 'Портативная консоль PS Portal Remote Player', 'Аксессуары для PS5'),
    product(10, 'Xbox Series X', 'Xbox'),
    product(5, 'iPhone 17', '', { productGroup: 'smartphones' }),
  ]) assert.deepEqual(recommendedAccessories(item, [product(59, 'Зарядная станция', 'Аксессуары для PS5')]), [])
})

const accessory = (id, name, extra = {}) => product(id, name, '', { productGroup: 'other', ...extra })
const appleAccessories = [
  accessory(118, 'Apple Pencil'),
  accessory(116, 'Apple Magic Mouse USB-C'),
  accessory(255, 'Сетевое зарядное устройство', { brand: 'Apple' }),
  accessory(43, 'Защитное стекло '),
  accessory(241, 'Повербанк Apple MagSafe 5000', { productGroup: 'accessories' }),
  accessory(184, 'Внешний аккумулятор Keephone Brendy MagSafe', { productGroup: 'home-appliances' }),
  accessory(242, 'Повербанк Xiaomi MagSafe', { productGroup: 'accessories' }),
  accessory(249, 'Повербанк Keephone 5000', { productGroup: 'accessories' }),
  accessory(243, 'Картхолдер MagSafe'),
  accessory(250, 'Прозрачный чехол MagSafe'),
  accessory(300, 'Сетевое зарядное устройство', { brand: 'Samsung' }),
  accessory(301, 'Защитное стекло Samsung Galaxy S26'),
  accessory(302, 'Apple Pencil', { isAvailable: false }),
]

test('iPad recommends Pencil and MacBook recommends Magic Mouse without unrelated accessories', () => {
  const ipad = product(10, 'Apple iPad 11" (A16, 2025)', '', { productGroup: 'tablets' })
  const macbook = product(58, 'Apple MacBook Air (M5, 2026)', '', { productGroup: 'laptops' })
  assert.deepEqual(recommendedAccessories(ipad, appleAccessories).map((item) => item.id), [118])
  assert.deepEqual(recommendedAccessories(macbook, appleAccessories).map((item) => item.id), [116])
  assert.deepEqual(recommendedAccessories(product(200, 'Samsung Galaxy Tab', '', { productGroup: 'tablets' }), appleAccessories), [])
  assert.deepEqual(recommendedAccessories(product(201, 'Apple Mac mini', '', { productGroup: 'laptops' }), appleAccessories), [])
})

test('iPhone recommends Apple chargers, power banks and glass, but not cases, wallets or other brands chargers', () => {
  const iphone = product(5, 'iPhone 17', '', { productGroup: 'smartphones' })
  assert.deepEqual(recommendedAccessories(iphone, appleAccessories).map((item) => item.id), [255, 43, 241, 184, 242, 249])
  assert.deepEqual(recommendedAccessories(product(52, 'Galaxy S26 Ultra', '', { productGroup: 'smartphones' }), appleAccessories), [])
})
