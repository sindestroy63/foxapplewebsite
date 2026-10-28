import test from 'node:test'
import assert from 'node:assert/strict'

const { isPlayStation5Console, playStationAccessories } = await import('../src/lib/product-recommendations.ts')

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
  assert.deepEqual(playStationAccessories(console, candidates).map((item) => item.id), [55, 59, 166, 179, 169])
  assert.equal(isPlayStation5Console(product(180, 'PlayStation 5 Slim Disk Ghost of Yotei Limited Edition', 'PlayStation 5')), true)
  assert.equal(isPlayStation5Console(product(181, 'Sony PlayStation 5 Slim Digital', 'PlayStation 5')), true)
})

test('accessories, portable players, other consoles and phones do not trigger PS5 recommendations', () => {
  for (const item of [
    product(55, 'DualSense PS5', 'Геймпады PS5'),
    product(170, 'Портативная консоль PS Portal Remote Player', 'Аксессуары для PS5'),
    product(10, 'Xbox Series X', 'Xbox'),
    product(5, 'iPhone 17', '', { productGroup: 'smartphones' }),
  ]) assert.deepEqual(playStationAccessories(item, [product(59, 'Зарядная станция', 'Аксессуары для PS5')]), [])
})
