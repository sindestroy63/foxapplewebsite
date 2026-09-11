import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { PRODUCT_TYPE_OPTIONS, resolveProductType } from '../src/payload/products/product-type.ts'
import { validateNewVariantConfigurations } from '../src/payload/products/variant-validation.ts'
import { ensureVariantSkus } from '../src/payload/utils/sku.ts'
import { matchCatalogItem } from '../src/payload/price-updates/match.ts'
import { parseFreeformPriceList } from '../src/payload/price-updates/parse.ts'
import { normalizeProduct } from '../src/lib/normalize.ts'

const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
const metadata = fs.readFileSync('src/app/(frontend)/catalog/[categorySlug]/[productSlug]/page.tsx', 'utf8')
const system = fs.readFileSync('src/payload/components/admin/ProductSystemData.tsx', 'utf8')
const placement = fs.readFileSync('src/payload/components/admin/ProductCatalogPlacement.tsx', 'utf8')
const sections = fs.readFileSync('src/payload/components/admin/ProductSection.tsx', 'utf8')
const slugField = fs.readFileSync('src/payload/components/admin/ProductSlugField.tsx', 'utf8')
const productTypeField = fs.readFileSync('src/payload/components/admin/ProductTypeField.tsx', 'utf8')
const priceEndpoints = fs.readFileSync('src/payload/price-updates/endpoints.ts', 'utf8')
const productTypeMigration = fs.readFileSync('src/migrations/20260910_120000_backfill_product_type.ts', 'utf8')
const detail = fs.readFileSync('src/components/ProductDetailClient.tsx', 'utf8')
const materialMigration = fs.readFileSync('src/migrations/20260911_090000_variant_material_strap_size.ts', 'utf8')

test('watch material and strap size are persisted as nullable variant fields', () => {
  assert.match(products, /name: 'material'/)
  assert.match(products, /name: 'strapSize'/)
  assert.match(materialMigration, /ADD COLUMN IF NOT EXISTS "material" varchar NULL/)
  assert.match(materialMigration, /ADD COLUMN IF NOT EXISTS "strap_size" varchar NULL/)
  assert.match(materialMigration, /DROP COLUMN IF EXISTS "material"/)
  assert.match(materialMigration, /DROP COLUMN IF EXISTS "strap_size"/)
})

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

test('product detail renders selected variant characteristics and omits empty fields', () => {
  assert.match(detail, /product-variant-specs/)
  assert.match(detail, /activeVariant\?\.size/)
  assert.match(detail, /activeVariant\?\.connectivity/)
  assert.match(detail, /activeVariant\?\.generation/)
  assert.match(detail, /activeVariant\?\.packageLabel/)
})

test('Product identifiers and SEO inputs are protected in CMS', () => {
  assert.match(products, /name: 'sku'[\s\S]*?access: \{ update: \(\) => false \}/)
  assert.match(products, /name: 'slug'[\s\S]*?access: \{ update: \(\) => false \}/)
  assert.match(products, /name: 'seoTitle'[\s\S]*?hidden: true/)
  assert.match(products, /name: 'seoDescription'[\s\S]*?hidden: true/)
})

test('new product form calculates and submits a protected slug field', () => {
  assert.match(products, /name: 'slug'[\s\S]*?required: true[\s\S]*?unique: true[\s\S]*?readOnly: true[\s\S]*?ProductSlugField/)
  assert.match(slugField, /useField<string>\(\{ path: 'slug' \}\)/)
  assert.match(slugField, /slugField\.setValue\(nextSlug\)/)
  assert.match(slugField, /if \(id\) return/)
})
test('metadata uses the automatic SEO template', () => {
  assert.match(metadata, /купить в Самаре \| ФОХСТОР/)
  assert.doesNotMatch(metadata, /product\.seoTitle\s*\|\|/)
  assert.doesNotMatch(metadata, /product\.seoDescription\s*\|\|/)
})
test('system data preview is collapsible and generator warns before replacement', () => {
  assert.match(system, /<details(?:\s|>)/)
  assert.match(products, /ProductSystemData/)
  assert.match(fs.readFileSync('src/payload/components/admin/VariantGenerator.tsx', 'utf8'), /может заменить текущие варианты/)
})

test('device model sidebar is hidden without removing its data or generator', () => {
  const deviceModel = products.slice(products.indexOf("name: 'deviceModel'"), products.indexOf("name: 'variantGenerator'"))
  const generator = products.slice(products.indexOf("name: 'variantGenerator'"), products.indexOf("name: 'variantsSection'"))
  assert.match(deviceModel, /type: 'relationship'/)
  assert.match(deviceModel, /relationTo: 'device-models'/)
  assert.match(deviceModel, /hidden: true/)
  assert.match(deviceModel, /position: 'sidebar'/)
  assert.match(generator, /VariantGenerator/)
  assert.match(generator, /condition: \(\) => false/)
  assert.match(system, /deviceModel: fields\.deviceModel\?\.value/)
  assert.match(system, /deviceModelLabel/)
})

test('DeviceModels collection remains registered', () => {
  assert.match(fs.readFileSync('src/payload/collections/DeviceModels.ts', 'utf8'), /export const DeviceModels/)
  assert.match(fs.readFileSync('src/payload.config.ts', 'utf8'), /DeviceModels/)
})

test('Products form exposes the approved manager sections without changing data shape', () => {
  for (const section of ['BasicsSection', 'PlacementSection', 'CommerceSection', 'VariantsSection', 'MediaSection']) assert.match(products, new RegExp(`ProductSection#${section}`))
  for (const label of ['Основное', 'Размещение в каталоге', 'Цена и наличие', 'Варианты товара', 'Фото и описание']) assert.match(sections, new RegExp(label))
  assert.match(products, /ProductCatalogPlacement/)
  assert.match(placement, /productGroup/)
  assert.match(placement, /brand/)
  assert.match(placement, /productLine/)
  assert.match(placement, /Навигац(?:ия|ии) каталога/)
})

test('technical product fields are hidden from ordinary form and retained in read-only system data', () => {
  for (const field of ['model', 'productGroup', 'brand', 'productLine', 'badge', 'isFeatured', 'isNew', 'sortOrder', 'size']) {
    const block = products.slice(products.indexOf(`name: '${field}'`), products.indexOf(`name: '${field}'`) + 1400)
    assert.match(block, /admin: \{[^}]*hidden: true/)
  }
  assert.match(system, /productGroup/)
  assert.match(system, /productLine/)
  assert.match(system, /legacyRam/)
  assert.match(system, /только чтение/)
})

test('product type reuses the legacy text column through a managed selector', () => {
  assert.deepEqual(PRODUCT_TYPE_OPTIONS.map(({ value }) => value), ['iphone', 'mac', 'ipad', 'apple-watch', 'airpods', 'samsung', 'other'])
  assert.match(products, /name: 'productType'[\s\S]*?type: 'text'[\s\S]*?ProductTypeField/)
  assert.match(productTypeField, /useField<string>\(\{ path: 'productType' \}\)/)
  assert.match(productTypeField, /Текущее значение:/)
  assert.equal(resolveProductType({ name: 'iPhone 18' }), 'iphone')
  assert.equal(resolveProductType({ productGroup: 'laptops', brand: 'Apple' }), 'mac')
  assert.equal(resolveProductType({ productGroup: 'tablets', brand: 'Apple' }), 'ipad')
  assert.equal(resolveProductType({ name: 'AirPods Pro 3' }), 'airpods')
  assert.equal(resolveProductType({ name: 'Galaxy S26', brand: 'Samsung' }), 'samsung')
})

test('variant fields use existing dictionaries and remain visible when legacy data exists', () => {
  for (const relation of ['storage-options', 'sim-options', 'ram-options', 'screen-size-options', 'connectivity-options', 'variant-size-options']) {
    assert.match(products, new RegExp(`relationTo: '${relation}'`))
  }
  assert.match(products, /value: \{ in: \['ESIM', 'SIM_ESIM'\] \}/)
  for (const field of ['storage', 'sim', 'ramOption', 'sizeOption', 'screenSizeOption', 'connectivityOption']) {
    assert.match(products, new RegExp(`(?:productTypeCondition|deviceTypeCondition)\\([^\n]+['"]${field}['"]`))
  }
  assert.match(priceEndpoints, /relationText\(variant\.ramOption/)
  assert.match(priceEndpoints, /relationText\(variant\.sizeOption/)
  assert.match(priceEndpoints, /relationText\(variant\.screenSizeOption/)
  assert.match(priceEndpoints, /relationText\(variant\.connectivityOption/)
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
  const { DEVICE_TYPE_OPTIONS, resolveDeviceType } = await import('../src/payload/products/device-type.ts')
  assert.deepEqual(DEVICE_TYPE_OPTIONS.map(({ value }) => value), ['phone', 'tablet', 'laptop', 'smartwatch', 'headphones', 'game-console', 'hair-dryer', 'vacuum-cleaner', 'accessory', 'other'])
  assert.equal(resolveDeviceType({ brand: 'Dyson', name: 'Dyson Supersonic' }), 'hair-dryer')
  assert.equal(resolveDeviceType({ brand: 'Dyson', name: 'Dyson V15' }), 'vacuum-cleaner')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'iPhone 18' }), 'phone')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'MacBook Air' }), 'laptop')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'iPad Air' }), 'tablet')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'Apple Watch' }), 'smartwatch')
  assert.equal(resolveDeviceType({ brand: 'Apple', name: 'AirPods Pro' }), 'headphones')
  assert.match(products, /name: 'deviceType'/)
  assert.match(products, /DeviceTypeField/)
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

test('product type backfill is idempotent and preserves every non-empty legacy value', () => {
  assert.match(productTypeMigration, /WHERE "product_type" IS NULL OR btrim\("product_type"\) = ''/)
  assert.doesNotMatch(productTypeMigration, /SET "product_type" = CASE[\s\S]*WHERE "product_type" IS NOT NULL/)
  assert.match(fs.readFileSync('src/migrations/index.ts', 'utf8'), /20260910_120000_backfill_product_type/)
})

test('placement and system UI are read-only and do not add persistence logic', () => {
  assert.doesNotMatch(system, /fetch\(|payload\.(create|update)|method:\s*['"](POST|PATCH|PUT)/i)
  assert.match(products, /name: 'slug'[\s\S]*?access: \{ update: \(\) => false \}/)
  assert.match(products, /name: 'sku'[\s\S]*?access: \{ update: \(\) => false \}/)
})

test('catalog placement selector uses the new Global navigation and writes form state', () => {
  assert.match(placement, /brand-catalog-navigation/)
  assert.doesNotMatch(placement, /catalog-placement-options/)
  assert.doesNotMatch(placement, /fetch\(['"]\/api\/catalog-placement/)
  assert.match(placement, /<select/)
  assert.match(placement, /productGroupField\.setValue/)
  assert.match(placement, /Брендовый раздел/)
  assert.match(placement, /Подраздел/)
  assert.match(placement, /Текущий путь/)
  assert.match(placement, /conditionField\.setValue/)
})

test('catalog placement hydrates from Payload tuple form state without mutating on open', () => {
  assert.match(placement, /useFormFields\(\(\[fields\](?:: any)?\)/)
  assert.match(placement, /resolveProductCatalogPlacement\(values\)/)
  assert.match(placement, /Hydrate the visual path from Payload's form state/)
  assert.match(placement, /setGroupKey\(\(current\) => current \|\| placement\.groupKey\)/)
  assert.match(placement, /setChildKey\(\(current\) => current \|\| placement\.childKey \|\| ''\)/)
  assert.match(placement, /condition: fields\.condition\?\.value/)
})

test('shared placement resolver maps Apple smartphones to APPLE/iPhone', () => {
  const helper = fs.readFileSync('src/lib/product-catalog-placement.ts', 'utf8')
  assert.match(helper, /placement\('apple', 'APPLE', 'iphone', 'iPhone', 'smartphones', 'Apple'\)/)
  assert.match(helper, /export function resolveProductCatalogPlacement/)
  assert.match(helper, /item\.productGroup === productGroup && item\.brand === brand/)
})

test('legacy rich-text description is hidden while shortDescription remains the manager field', () => {
  const description = products.slice(products.indexOf("name: 'description'"), products.indexOf("name: 'description'") + 400)
  const shortDescription = products.slice(products.indexOf("name: 'shortDescription'"), products.indexOf("name: 'shortDescription'") + 250)
  assert.match(description, /type: 'richText'/)
  assert.match(description, /hidden: true/)
  assert.match(description, /обратной совместимости/)
  assert.match(shortDescription, /type: 'textarea'/)
  assert.doesNotMatch(system, /fields\.description/)
})

test('product detail renders shortDescription and does not fall back to legacy rich text', () => {
  assert.match(metadata, /seoDescription/)
  const detail = fs.readFileSync('src/components/ProductDetailClient.tsx', 'utf8')
  assert.match(detail, /product\.shortDescription/)
  assert.doesNotMatch(detail, /product\.description/)
})

test('placement endpoint validates tree nodes and derives product metadata server-side', () => {
  const endpoint = fs.readFileSync('src/payload/catalog-navigation-admin.ts', 'utf8')
  assert.match(endpoint, /catalog-placement-options/)
  assert.match(endpoint, /catalog-placement'/)
  assert.match(endpoint, /resolvePlacement/)
  assert.match(endpoint, /const productGroup = String\(placement\.productGroup/)
  assert.match(endpoint, /brand: placement\.brand/)
  assert.match(endpoint, /productLine: placement\.productLine/)
  assert.match(endpoint, /stableKey: `product:\$\{product\.id\}`/)
  assert.doesNotMatch(endpoint, /body\.productGroup|body\.brand|body\.productLine/)
})
