import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const products = fs.readFileSync('src/payload/collections/Products.ts', 'utf8')
const metadata = fs.readFileSync('src/app/(frontend)/catalog/[categorySlug]/[productSlug]/page.tsx', 'utf8')
const system = fs.readFileSync('src/payload/components/admin/ProductSystemData.tsx', 'utf8')
const placement = fs.readFileSync('src/payload/components/admin/ProductCatalogPlacement.tsx', 'utf8')
const sections = fs.readFileSync('src/payload/components/admin/ProductSection.tsx', 'utf8')
const slugField = fs.readFileSync('src/payload/components/admin/ProductSlugField.tsx', 'utf8')

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
  for (const field of ['model', 'productGroup', 'brand', 'productType', 'productLine', 'badge', 'isFeatured', 'isNew', 'sortOrder', 'size']) {
    const block = products.slice(products.indexOf(`name: '${field}'`), products.indexOf(`name: '${field}'`) + 1400)
    assert.match(block, /admin: \{[^}]*hidden: true/)
  }
  assert.match(system, /productGroup/)
  assert.match(system, /productLine/)
  assert.match(system, /legacyRam/)
  assert.match(system, /только чтение/)
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
