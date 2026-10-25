import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveProductType } from '../src/payload/products/product-type.ts'
import { validateNewVariantConfigurations } from '../src/payload/products/variant-validation.ts'
import { ensureVariantSkus } from '../src/payload/utils/sku.ts'
import { matchCatalogItem } from '../src/payload/price-updates/match.ts'
import { parseFreeformPriceList } from '../src/payload/price-updates/parse.ts'
import { normalizeProduct } from '../src/lib/normalize.ts'

test('normalized API variants retain relationship-backed characteristics', () => {
  const product = normalizeProduct({
    id: 1, name: 'Watch', slug: 'watch', price: 100,
    variants: [{ id: 'v1', price: 100, color: { value: 'black', englishLabel: 'Black' },
      sizeOption: { key: '42mm', label: '42 мм' },
      connectivityOption: { key: 'cellular', label: 'Wi-Fi + Cellular' },
      generation: 'Series 12', packageLabel: 'Sport Band',
    }],
  })
  assert.equal(product.variants?.[0]?.size, '42 мм')
  assert.equal(product.variants?.[0]?.connectivity, 'Wi-Fi + Cellular')
  assert.equal(product.variants?.[0]?.generation, 'Series 12')
  assert.equal(product.variants?.[0]?.packageLabel, 'Sport Band')
})

test('product type reuses the legacy text column through a managed selector', () => {
  assert.equal(resolveProductType({ name: 'iPhone 18' }), 'iphone')
  assert.equal(resolveProductType({ productGroup: 'laptops', brand: 'Apple' }), 'mac')
  assert.equal(resolveProductType({ productGroup: 'tablets', brand: 'Apple' }), 'ipad')
  assert.equal(resolveProductType({ name: 'AirPods Pro 3' }), 'airpods')
  assert.equal(resolveProductType({ name: 'Galaxy S26', brand: 'Samsung' }), 'samsung')
})

test('new configurable variants validate required fields without blocking stored rows', () => {
  assert.equal(validateNewVariantConfigurations({ productType: 'iphone', variants: [{ color: 1, storage: 2, sim: 3, price: 100000 }] }), null)
  assert.match(validateNewVariantConfigurations({ productType: 'iphone', variants: [{ color: 1, storage: 2, price: 100000 }] }), /sim/)
  assert.equal(validateNewVariantConfigurations({ productType: 'mac', variants: [{ color: 1, storage: 2, chip: 'M5', ramOption: 4, price: 100000 }] }), null)
  assert.equal(validateNewVariantConfigurations({ productType: 'ipad', variants: [{ color: 1, storage: 2, connectivityOption: 3, price: 100000 }] }), null)
  assert.equal(validateNewVariantConfigurations({ productType: 'apple-watch', variants: [{ color: 1, sizeOption: 2, price: 30000 }] }), null)
  assert.equal(validateNewVariantConfigurations(
    { productType: 'iphone', variants: [{ id: 'stored-incomplete', price: 100000 }] },
    { variants: [{ id: 'stored-incomplete' }] },
  ), null)
  assert.match(validateNewVariantConfigurations(
    { productType: 'iphone', variants: [{ id: 'new-client-id', color: 1, storage: 2, price: 100000 }] },
    { variants: [{ id: 'stored-incomplete' }] },
  ), /sim/)
})

test('device type separates brand from device characteristics', async () => {
  const { resolveDeviceType } = await import('../src/payload/products/device-type.ts')
  assert.equal(resolveDeviceType({ brand: 'Dyson', name: 'Dyson Supersonic' }), 'hair-dryer')
  assert.equal(resolveDeviceType({ brand: 'Dyson', name: 'Dyson V15' }), 'vacuum-cleaner')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'iPhone 18' }), 'phone')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'MacBook Air' }), 'laptop')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'iPad Air' }), 'tablet')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'Apple Watch' }), 'smartwatch')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'AirPods Pro' }), 'headphones')
})

test('new variant SKUs are stable and existing SKUs are never replaced', () => {
  const existing = { id: 'saved', sku: 'VAR-EXISTING' }
  const variants = ensureVariantSkus('iphone-18-abcdef', [existing, { color: 1 }, { color: 2 }], [existing])
  assert.equal(variants[0].sku, 'VAR-EXISTING')
  assert.equal(variants[1].sku, 'VAR-IPHONE-18-ABCDEF-V001')
  assert.equal(variants[2].sku, 'VAR-IPHONE-18-ABCDEF-V002')
  assert.equal(new Set(variants.map(({ sku }) => sku)).size, 3)
})

test('admin-created iPhone relationships remain compatible with deterministic price matching', () => {
  const catalog = [{
    id: 18,
    name: 'iPhone 18',
    sku: 'IPHONE-18',
    variants: [
      { id: 'black', sku: 'IPHONE-18-256-BLACK-SIM-ESIM', storage: '256GB', color: 'Black', sim: 'SIM + eSIM', price: 99000 },
      { id: 'white', sku: 'IPHONE-18-256-WHITE-ESIM', storage: '256GB', color: 'White', sim: 'eSIM', price: 99000 },
    ],
  }]
  const parsed = parseFreeformPriceList(`iPhone 18 256GB Black (SIM + eSIM) 100000\niPhone 18 256GB White (eSIM) 101000`)
  assert.equal(parsed.errors.length, 0)
  const matches = parsed.items.map((item) => matchCatalogItem(item, catalog))
  assert.deepEqual(matches.map(({ status }) => status), ['matched', 'matched'])
  assert.deepEqual(matches.map(({ selected }) => selected?.sku), [
    'IPHONE-18-256-BLACK-SIM-ESIM',
    'IPHONE-18-256-WHITE-ESIM',
  ])
})

