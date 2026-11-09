import test from 'node:test'
import assert from 'node:assert/strict'

const { findProductFamily } = await import('../src/lib/product-family.ts')
const { productSeoTitle } = await import('../src/lib/product-seo.ts')

const child = (key, ids, extra = {}) => ({ key, title: key.toUpperCase(), products: ids.map((id) => ({ id })), ...extra })

const navigation = [
  { key: 'apple', title: 'APPLE', children: [child('iphone', [1, 2, 3]), child('ipad', [4])] },
  { key: 'samsung', title: 'SAMSUNG', children: [child('samsung-phones', ['5', '6'])] },
  { key: 'hidden', title: 'HIDDEN', isVisible: false, children: [child('secret', [7, 8])] },
  { key: 'other', title: 'OTHER', children: [child('closed', [9, 10], { isVisible: false }), child('later', [1, 11])] },
]

test('finds the section that lists the product together with at least one more model', () => {
  const found = findProductFamily(navigation, 2)
  assert.equal(found.group.key, 'apple')
  assert.equal(found.child.key, 'iphone')
})

test('matches numeric and string ids interchangeably', () => {
  assert.equal(findProductFamily(navigation, 5).child.key, 'samsung-phones')
  assert.equal(findProductFamily(navigation, '6').child.key, 'samsung-phones')
  assert.equal(findProductFamily(navigation, '3').child.key, 'iphone')
})

test('a section with a single product does not form a family', () => {
  assert.equal(findProductFamily(navigation, 4), null)
})

test('hidden groups and hidden sections are skipped', () => {
  assert.equal(findProductFamily(navigation, 7), null)
  assert.equal(findProductFamily(navigation, 9), null)
})

test('the first matching section in menu order wins', () => {
  assert.equal(findProductFamily(navigation, 1).child.key, 'iphone')
  assert.equal(findProductFamily(navigation, 11).child.key, 'later')
})

test('unknown products and empty navigation give no family', () => {
  assert.equal(findProductFamily(navigation, 999), null)
  assert.equal(findProductFamily([], 1), null)
  assert.equal(findProductFamily([{ key: 'x', title: 'X', children: [{ key: 'c', title: 'C' }] }], 1), null)
})

test('builds the product page title used by both the page and the tab switcher', () => {
  assert.equal(productSeoTitle({ name: '  iPhone 17 Pro ' }), 'iPhone 17 Pro — купить в Самаре | ФОХСТОР')
  assert.equal(productSeoTitle({ name: '', model: 'Galaxy S26' }), 'Galaxy S26 — купить в Самаре | ФОХСТОР')
  assert.equal(productSeoTitle({}), 'Техника в ФОХСТОР — купить в Самаре | ФОХСТОР')
})
