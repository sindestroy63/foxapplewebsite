import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { cardPrice } from '../src/lib/pricing.ts'
import { prepareProductPriceUpdate } from '../src/payload/price-updates/apply.ts'
import { aiPriceUpdateSchema, normalizeAIPriceUpdateResponse } from '../src/payload/price-updates/ai-response.ts'
import { buildPreviewPriceInput, candidateByKey, canManuallyConfirmMissingAttributes, matchCatalogItem } from '../src/payload/price-updates/match.ts'
import { duplicateSkus, parseFreeformPriceList, parsePriceUpdateInput } from '../src/payload/price-updates/parse.ts'
import { classifyVariantForNormalization } from '../src/payload/catalog-normalization/dry-run.ts'
import {
  assertNoForbiddenChanges,
  buildApplyPreviewReport,
  createApplyPreviewReport,
} from '../src/payload/catalog-normalization/apply-preview.ts'
import { classifyStructureProduct, createCatalogStructureReport } from '../src/payload/catalog-structure/dry-run.ts'
import { createAccessoriesToOtherReport } from '../src/payload/catalog-structure/accessories-to-other-dry-run.ts'
import { CATALOG_GROUPS, catalogGroupHref, productBelongsToGroup } from '../src/lib/catalog-groups.ts'
import { buildVerifiedPreviewRows } from '../src/payload/price-updates/verified-preview.ts'
import { PRODUCT_PRICING_NOTICE } from '../src/lib/product-pricing-notice.ts'
import { formatPriceUpdateTarget } from '../src/payload/price-updates/display.ts'
import { isAllowedStorageValue } from '../src/payload/catalog-normalization/allowed-values.ts'

test('price import UI accepts ordinary price lists without a visible SKU checker', async () => {
  const source = await readFile(new URL('../src/payload/components/admin/PriceUpdateViewClient.tsx', import.meta.url), 'utf8')
  assert.match(source, />Разобрать прайс<\/button>/)
  assert.match(source, /<span>Прайс-лист<\/span>/)
  assert.match(source, /Вставьте список товаров и цен в свободном формате\. Артикулы указывать не нужно\./)
  assert.equal(source.includes('>Проверить SKU</button>'), false)
  assert.equal(source.includes('Прайс или SKU и новые цены'), false)
  assert.match(source, /match-price-list/)
  assert.match(source, /preview-import/)
  assert.match(source, /item\.resolution === 'automatic' \|\| item\.resolution === 'manual'/)
  assert.match(source, /item\.resolution !== 'pending'/)
})

test('archived storage options are admin-only and excluded from new selections', async () => {
  const storageSource = await readFile(new URL('../src/payload/collections/StorageOptions.ts', import.meta.url), 'utf8')
  const generatorSource = await readFile(new URL('../src/payload/components/admin/VariantGenerator.tsx', import.meta.url), 'utf8')
  const productsSource = await readFile(new URL('../src/payload/collections/Products.ts', import.meta.url), 'utf8')
  const deviceModelsSource = await readFile(new URL('../src/payload/collections/DeviceModels.ts', import.meta.url), 'utf8')
  assert.match(storageSource, /plural: 'Варианты накопителя'/)
  assert.match(storageSource, /name: 'archived'/)
  assert.match(storageSource, /access: \{ update: admins \}/)
  assert.match(generatorSource, /where\[archived\]\[not_equals\]=true/)
  assert.match(generatorSource, /filter\(\(storage\) => !storage\.archived\)/)
  assert.match(productsSource, /filterOptions: \{ archived: \{ not_equals: true \} \}/)
  assert.match(deviceModelsSource, /filterOptions: \{ archived: \{ not_equals: true \} \}/)
})

test('catalog cleanup whitelist keeps only clean storage values', async () => {
  for (const value of ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB']) assert.equal(isAllowedStorageValue(value), true)
  for (const value of ['ПАМЯТЬ', '8|128', '40mm', 'LTE40mm', 'HS08', '512GB | с Touch ID']) assert.equal(isAllowedStorageValue(value), false)
  const source = await readFile(new URL('../scripts/catalog-dictionaries-cleanup-apply.ts', import.meta.url), 'utf8')
  assert.match(source, /CATALOG_CLEANUP_BACKUP/)
  assert.match(source, /CLEANUP_APPLY_CONFIRM === 'YES'/)
  assert.match(source, /BEGIN/)
  assert.match(source, /ROLLBACK/)
})

test('cleanup plan is explicitly read-only and preserves problematic values for manual review', async () => {
  const source = await readFile(new URL('../scripts/catalog-dictionaries-cleanup-plan.ts', import.meta.url), 'utf8')
  assert.match(source, /readOnly: true/)
  assert.match(source, /archiveCandidates/)
  assert.match(source, /manual_review/)
  assert.equal(source.includes("payload.update"), false)
})

test('price import UI exposes server candidates before manual confirmation', async () => {
  const source = await readFile(new URL('../src/payload/components/admin/PriceUpdateViewClient.tsx', import.meta.url), 'utf8')
  assert.match(source, /candidate\.displayPath \|\| candidate\.productName/)
  assert.match(source, /Служебный SKU:/)
  assert.match(source, /Подтвердить найденный товар/)
  assert.match(source, /Строки, требующие внимания/)
  assert.equal(source.includes('Вопросы ИИ'), false)
})

test('stored candidate response includes a server-built display path', async () => {
  const source = await readFile(new URL('../src/payload/price-updates/endpoints.ts', import.meta.url), 'utf8')
  assert.match(source, /displayPath: candidateDisplayPath\(candidate, catalog\)/)
  assert.match(source, /displayPath: candidate\.displayPath/)
  assert.match(source, /formatPriceUpdateTarget\(product, variant \|\| candidate\)/)
  assert.match(source, /selectedCandidateKey: item\.selectedCandidateKey/)
})

test('manual resolution controls cover ambiguous single candidates', async () => {
  const source = await readFile(new URL('../src/payload/components/admin/PriceUpdateViewClient.tsx', import.meta.url), 'utf8')
  assert.match(source, /\['ambiguous', 'missing_attributes', 'manual_review'\]\.includes\(item\.matchStatus\) && item\.candidates\.length === 1/)
  assert.match(source, /\['ambiguous', 'missing_attributes', 'manual_review'\]\.includes\(item\.matchStatus\) && item\.candidates\.length > 1/)
  assert.match(source, /\['ambiguous', 'manual_review', 'missing_attributes', 'not_found', 'excluded_used'\]\.includes\(item\.matchStatus\)/)
})

test('price import decision controls are not clipped', async () => {
  const source = await readFile(new URL('../src/app/(payload)/custom.scss', import.meta.url), 'utf8')
  assert.match(source, /white-space: nowrap/)
  assert.match(source, /td:last-child[\s\S]*min-width: 220px/)
})

test('internal audit collections and globals stay protected from CMS mutations', async () => {
  const config = await readFile(new URL('../src/payload.config.ts', import.meta.url), 'utf8')
  const collectionFiles = [
    'PriceUpdateBatches.ts', 'PriceUpdateItems.ts', 'PriceImportSessions.ts', 'PriceImportItems.ts',
  ]
  for (const file of collectionFiles) {
    const source = await readFile(new URL(`../src/payload/collections/${file}`, import.meta.url), 'utf8')
    assert.match(source, /hidden:\s*true/)
    assert.match(source, /read:\s*denyPriceUpdateMutation/)
  }
  for (const file of ['SiteSettings.ts', 'SiteAppearance.ts']) {
    const source = await readFile(new URL(`../src/payload/globals/${file}`, import.meta.url), 'utf8')
    assert.match(source, /admin:\s*\{\s*hidden:\s*true\s*\}/)
    assert.match(source, /read:\s*anyone/)
    assert.match(source, /update:\s*denyAll/)
  }
  assert.match(config, /priceUpdates:\s*\{/)
  assert.match(config, /path:\s*'\/price-updates'/)
})

test('frontend does not read editable site appearance globals', async () => {
  const homepage = await readFile(new URL('../src/app/(frontend)/page.tsx', import.meta.url), 'utf8')
  const cms = await readFile(new URL('../src/lib/cms.ts', import.meta.url), 'utf8')
  assert.equal(homepage.includes('getSiteAppearance'), false)
  assert.equal(homepage.includes('appearance.'), false)
  assert.equal(cms.includes("findGlobal({ slug: 'site-settings'"), false)
  assert.equal(cms.includes("findGlobal({ slug: 'site-appearance'"), false)
})

test('formats a full, readable price-update target without exposing SKU', () => {
  const target = formatPriceUpdateTarget({
    productGroup: 'smartphones', brand: 'Samsung', productType: 'Galaxy', name: 'Samsung Galaxy S26 Ultra',
  }, { ram: '12GB', storage: '256GB', color: { englishLabel: 'Black' }, sim: 'SIM_ESIM' })
  assert.equal(target, 'Смартфоны / Samsung / Galaxy / Samsung Galaxy S26 Ultra / 12 ГБ ОЗУ / 256 ГБ / Black / SIM + eSIM')
  assert.equal(target.includes('undefined'), false)
  assert.equal(target.includes('VAR-'), false)
})

test('formats product-level price-update targets without empty fields', () => {
  assert.equal(
    formatPriceUpdateTarget({ productGroup: 'gaming-consoles', brand: 'Sony', productType: 'PlayStation', name: 'PlayStation 5 Slim Digital' }),
    'Игровые консоли / Sony / PlayStation / PlayStation 5 Slim Digital',
  )
  assert.equal(
    formatPriceUpdateTarget({ productGroup: 'audio', brand: 'Apple', productType: 'AirPods', name: 'AirPods Pro 3' }),
    'Наушники и аудио / Apple / AirPods / AirPods Pro 3',
  )
})

const normalizeSku = (value) => typeof value === 'string' ? value.trim().toUpperCase() || undefined : undefined

test('renders the dynamic-price notice once on product details only', async () => {
  const [detail, card, cart, checkout] = await Promise.all([
    readFile(new URL('../src/components/ProductDetailClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ProductCard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CartPageClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CheckoutForm.tsx', import.meta.url), 'utf8'),
  ])
  assert.equal(PRODUCT_PRICING_NOTICE, 'Стоимость техники может меняться в течение дня.')
  assert.equal((detail.match(/PRODUCT_PRICING_NOTICE/g) || []).length, 2)
  assert.equal((detail.match(/detail-pricing-notice/g) || []).length, 1)
  for (const source of [card, cart, checkout]) assert.equal(source.includes(PRODUCT_PRICING_NOTICE), false)
})

const normalizationInput = (storage, overrides = {}) => ({
  productId: 1,
  productName: 'Test product',
  category: { slug: 'samsung' },
  variantId: 'variant-1',
  storage,
  ram: null,
  size: null,
  hasTouchId: null,
  ...overrides,
})

test('classifies approved RAM and storage splits without writes', () => {
  for (const [storage, ram, disk] of [['8|128', '8GB', '128GB'], ['12 | 256 ГБ', '12GB', '256GB'], ['16/1TB', '16GB', '1TB']]) {
    const result = classifyVariantForNormalization(normalizationInput(storage))
    assert.deepEqual([result.status, result.proposedRam, result.proposedStorage], ['auto_split', ram, disk])
  }
})

test('keeps a clean storage value unchanged', () => {
  const result = classifyVariantForNormalization(normalizationInput('256GB', { hasTouchId: true }))
  assert.equal(result.status, 'unchanged')
  assert.equal(result.proposedStorage, '256GB')
  assert.equal(result.proposedHasTouchId, true)
})

test('extracts Touch ID without writing variant data', () => {
  const input = normalizationInput('512GB | \u0441 Touch ID')
  const result = classifyVariantForNormalization(input)
  assert.deepEqual(
    [result.status, result.proposedStorage, result.proposedHasTouchId],
    ['auto_touch_id', '512GB', true],
  )
  assert.deepEqual(input, normalizationInput('512GB | \u0441 Touch ID'))
})

test('moves watch sizes only for watch categories', () => {
  const watch = classifyVariantForNormalization(normalizationInput('40mm', { category: { slug: 'apple-watch' } }))
  assert.deepEqual([watch.status, watch.proposedStorage, watch.proposedSize], ['auto_size', null, '40mm'])
  assert.equal(classifyVariantForNormalization(normalizationInput('40mm')).status, 'manual_review')
})

test('keeps unsupported storage values for manual review', () => {
  for (const storage of ['512GB | unknown feature', 'LTE40mm', 'unknown']) {
    assert.equal(classifyVariantForNormalization(normalizationInput(storage)).status, 'manual_review')
  }
})

const previewExpected = (auto_split, auto_size, auto_touch_id) => ({
  auto_split,
  auto_size,
  auto_touch_id,
  total: auto_split + auto_size + auto_touch_id,
})

test('apply preview reuses the common normalization classification', () => {
  const classified = classifyVariantForNormalization(normalizationInput('8|128'))
  const preview = buildApplyPreviewReport([classified], previewExpected(1, 0, 0))
  assert.equal(preview.changes[0].status, classified.status)
  assert.equal(preview.changes[0].newValues.storage, classified.proposedStorage)
})

test('apply preview accepts exact expected counters', () => {
  const rows = [
    classifyVariantForNormalization(normalizationInput('8|128', { variantId: 'split' })),
    classifyVariantForNormalization(normalizationInput('40mm', { productId: 2, variantId: 'size', category: { slug: 'apple-watch' } })),
    classifyVariantForNormalization(normalizationInput('512GB | \u0441 Touch ID', { productId: 3, variantId: 'touch' })),
  ]
  assert.equal(buildApplyPreviewReport(rows, previewExpected(1, 1, 1)).changes.length, 3)
})

test('apply preview rejects unexpected counters', () => {
  const row = classifyVariantForNormalization(normalizationInput('8|128'))
  assert.throws(() => buildApplyPreviewReport([row], previewExpected(2, 0, 0)), /Unexpected auto_split count/)
})

test('apply preview rejects potential future duplicates', () => {
  const rows = [
    classifyVariantForNormalization(normalizationInput('256GB', { variantId: 'one' })),
    classifyVariantForNormalization(normalizationInput('256GB', { variantId: 'two' })),
  ]
  assert.throws(() => buildApplyPreviewReport(rows, previewExpected(0, 0, 0)), /Potential duplicate variants/)
})

test('apply preview rejects a forbidden field change', () => {
  assert.throws(
    () => assertNoForbiddenChanges({ price: 100 }, { price: 200 }),
    /forbidden field: price/,
  )
})

test('apply preview uses only Payload find and never writes', async () => {
  let writes = 0
  const rejectWrite = () => { writes++; throw new Error('write called') }
  const payload = {
    find: async () => ({ docs: [
      { id: 1, sku: 'P1', name: 'Phone', slug: 'phone', category: { slug: 'samsung' }, variants: [{ id: 'split', sku: 'V1', storage: { value: '8|128' }, price: 1 }] },
      { id: 2, sku: 'P2', name: 'Watch', slug: 'watch', category: { slug: 'apple-watch' }, variants: [{ id: 'size', sku: 'V2', storage: { value: '40mm' }, price: 1 }] },
      { id: 3, sku: 'P3', name: 'Mac', slug: 'mac', category: { slug: 'macbook' }, variants: [{ id: 'touch', sku: 'V3', storage: { value: '512GB | \u0441 Touch ID' }, price: 1 }] },
    ] }),
    create: rejectWrite,
    update: rejectWrite,
    delete: rejectWrite,
  }
  const preview = await createApplyPreviewReport(payload, previewExpected(1, 1, 1))
  assert.equal(preview.changes.length, 3)
  assert.equal(writes, 0)
})

test('parses supported separators, spaces and ruble sign', () => {
  const lines = parsePriceUpdateInput([
    'SKU-ONE 79 990 ₽',
    'SKU-TWO — 129990',
    'SKU-THREE: 1',
    '',
  ].join('\n'), normalizeSku)
  assert.deepEqual(lines.map(({ sku, newCashPrice }) => [sku, newCashPrice]), [
    ['SKU-ONE', 79_990], ['SKU-TWO', 129_990], ['SKU-THREE', 1],
  ])
})

test('legacy SKU price input also accepts thousands points without accepting decimals', () => {
  const lines = parsePriceUpdateInput('SKU-POINT 94.800 ₽\nSKU-MILLION: 1.000.000\nSKU-DECIMAL 94.80', normalizeSku)
  assert.deepEqual(lines.map(({ sku, newCashPrice, error }) => [sku, newCashPrice, Boolean(error)]), [
    ['SKU-POINT', 94800, false], ['SKU-MILLION', 1000000, false], ['SKU-DECIMAL', undefined, true],
  ])
})

test('rejects invalid and out-of-range prices', () => {
  const lines = parsePriceUpdateInput('SKU-A 0\nSKU-B 10000001\nSKU-C abc', normalizeSku)
  assert.equal(lines.every((line) => Boolean(line.error)), true)
})

test('detects every repeated SKU in one input', () => {
  const lines = parsePriceUpdateInput('sku-a 100\nSKU-A: 200\nSKU-B 300', normalizeSku)
  assert.deepEqual([...duplicateSkus(lines)], ['SKU-A'])
})

test('product update contains only the cash price field', () => {
  const result = prepareProductPriceUpdate(
    { price: 100, variants: [{ id: 'v1', sku: 'VAR-A', price: 90, color: 7 }] },
    { matchType: 'product', sku: 'PRD-A', oldCashPrice: 100, newCashPrice: 120 },
  )
  assert.deepEqual(result, { conflict: false, data: { price: 120 } })
})

test('variant update changes its price and recalculates root minimum', () => {
  const variants = [
    { id: 'v1', sku: 'VAR-A', price: 90, color: 7 },
    { id: 'v2', sku: 'VAR-B', price: 110, color: 8 },
  ]
  const result = prepareProductPriceUpdate(
    { price: 90, variants },
    { matchType: 'variant', sku: 'VAR-A', variantId: 'v1', oldCashPrice: 90, newCashPrice: 130 },
  )
  assert.equal(result.conflict, false)
  assert.equal(result.data.price, 110)
  assert.deepEqual(result.data.variants, [
    { id: 'v1', sku: 'VAR-A', price: 130, color: 7 },
    variants[1],
  ])
})

test('detects a stale preview conflict', () => {
  const result = prepareProductPriceUpdate(
    { price: 105 },
    { matchType: 'product', sku: 'PRD-A', oldCashPrice: 100, newCashPrice: 120 },
  )
  assert.equal(result.conflict, true)
})

test('audit card price uses the existing 20 percent formula', () => {
  assert.equal(cardPrice(79_990), Math.round(79_990 * 1.2))
})

const aiItem = (overrides = {}) => ({
  sourceLine: 'AirPods 4 9900', contextHeading: '', modelText: 'AirPods 4', price: 9_900,
  storage: null, ram: null, color: null, sim: null, region: '', revision: null,
  manufacturerModelNumber: null, notes: [], ...overrides,
})

const catalog = [
  { id: 1, name: 'AirPods 4', model: 'AirPods 4', sku: 'PRD-AIRPODS-4', variants: [] },
  { id: 2, name: 'AirPods 4 с шумоподавлением', model: 'AirPods 4 ANC', sku: 'PRD-AIRPODS-4-ANC', variants: [] },
  { id: 3, name: 'AirPods Pro 3', model: 'AirPods Pro 3', sku: 'PRD-AIRPODS-PRO-3', variants: [] },
  { id: 4, name: 'PlayStation 5 Slim Disk', model: 'PlayStation 5 Slim Disk', sku: 'PRD-PS5-DISK', variants: [] },
  { id: 14, name: 'PlayStation 5 Slim Digital', model: 'PlayStation 5 Slim Digital', sku: 'PRD-PS5-DIGITAL', variants: [] },
  { id: 5, name: 'iPhone 17', model: 'iPhone 17', sku: 'PRD-IPHONE-17', variants: [
    { id: 'lav', sku: 'VAR-17-LAV', color: 'Lavender', storage: '256GB', sim: 'SIM + eSIM' },
    { id: 'sage', sku: 'VAR-17-SAGE', color: 'Sage', storage: '256GB', sim: 'SIM + eSIM' },
    { id: 'white', sku: 'VAR-17-WHITE', color: 'White', storage: '256GB', sim: 'SIM + eSIM' },
  ] },
  { id: 6, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', sku: 'PRD-17-PRO-MAX', variants: [
    { id: 'blue', sku: 'VAR-MAX-BLUE', color: 'Deep Blue', storage: '256GB', sim: 'eSIM' },
    { id: 'orange', sku: 'VAR-MAX-ORANGE', color: 'Cosmic Orange', storage: '256GB', sim: 'eSIM' },
    { id: 'silver', sku: 'VAR-MAX-SILVER', color: 'Silver', storage: '256GB', sim: 'eSIM' },
  ] },
  { id: 7, name: 'Samsung Galaxy Z Fold8 (2026)', model: 'Galaxy Z Fold8', sku: 'PRD-FOLD8', variants: [
    { id: 'graphite', sku: 'VAR-FOLD8-GRAPHITE', color: 'Graphite', storage: '12 | 256 ГБ', sim: 'SIM + eSIM' },
  ] },
  { id: 8, name: 'Galaxy S26 Ultra', model: 'Galaxy S26 Ultra', sku: 'PRD-S26-ULTRA', variants: [
    { id: 's26black', sku: 'VAR-S26-BLACK', color: 'Black', storage: '12 | 256 ГБ' },
    { id: 's26violet', sku: 'VAR-S26-VIOLET', color: 'Cobalt Violet', storage: '12 | 256 GB' },
  ] },
]

test('accepts a valid AI response object', () => {
  const item = aiItem()
  assert.deepEqual(aiPriceUpdateSchema.parse({ items: [item], questions: [] }), {
    items: [item],
    questions: [],
  })
})

test('normalizes a top-level AI response array before strict validation', () => {
  const item = aiItem()
  const response = normalizeAIPriceUpdateResponse([item])
  assert.deepEqual(aiPriceUpdateSchema.parse(response), {
    items: [item],
    questions: [],
  })
})

test('rejects an invalid price in a normalized top-level array', () => {
  assert.throws(() => aiPriceUpdateSchema.parse(normalizeAIPriceUpdateResponse([aiItem({ price: 0 })])))
})

test('rejects non-object AI response top levels other than arrays', () => {
  for (const value of ['text', null, 1]) assert.throws(() => aiPriceUpdateSchema.parse(normalizeAIPriceUpdateResponse(value)))
})

test('rejects AI response objects with unknown fields', () => {
  assert.throws(() => aiPriceUpdateSchema.parse({ items: [], questions: [], unexpected: true }))
})

test('accepts empty AI response arrays and questions', () => {
  assert.deepEqual(aiPriceUpdateSchema.parse({ items: [], questions: [] }), { items: [], questions: [] })
})

test('accepts several extracted products from one source line and a spaced ruble price', () => {
  const sourceLine = 'AirPods Pro 3 17800 AirPods 4 9 900 ₽ AirPods 4 ANC 13 900 ₽'
  const parsed = aiPriceUpdateSchema.parse({ items: [
    aiItem({ sourceLine, modelText: 'AirPods Pro 3', price: 17_800 }),
    aiItem({ sourceLine, modelText: 'AirPods 4', price: 9_900 }),
    aiItem({ sourceLine, modelText: 'AirPods 4 ANC', price: 13_900 }),
  ], questions: [] })
  assert.equal(parsed.items.length, 3)
  assert.equal(aiPriceUpdateSchema.parse({ items: [aiItem({ price: 135_000 })], questions: [] }).items[0].price, 135_000)
})

test('preserves country flags for audit without affecting matching', () => {
  const fold = aiItem({ modelText: 'Z Fold 8', storage: '256GB', ram: '12', color: 'Graphite', region: '🇯🇵' })
  assert.equal(aiPriceUpdateSchema.parse({ items: [fold], questions: [] }).items[0].region, '🇯🇵')
  assert.equal(matchCatalogItem(fold, catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'AirPods Pro 3', region: '🇦🇪' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'AirPods 4', region: '🇭🇰' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: '17', storage: '256GB', color: 'Lavender', sim: 'SIM + eSIM', region: '🇮🇳' }), catalog).status, 'matched')
})

test('region and unsupported catalog attributes do not block a valid match', () => {
  const s26 = aiItem({ modelText: 'S26 Ultra', storage: '256GB', ram: '12', color: 'Black', region: '🇨🇳', manufacturerModelNumber: 'SM-S948B' })
  const playstation = aiItem({ modelText: 'PlayStation 5 slim disk', region: '🇺🇸', revision: '2 рев' })
  assert.equal(matchCatalogItem(s26, catalog).status, 'matched')
  assert.equal(matchCatalogItem(playstation, catalog).status, 'matched')
})

test('manufacturer model code does not block the exact S26 Ultra variant', () => {
  for (const [color, sku] of [['Black', 'VAR-S26-BLACK'], ['Cobalt Violet', 'VAR-S26-VIOLET']]) {
    const result = matchCatalogItem(aiItem({ modelText: 'S26 Ultra', storage: '256GB', ram: '12', color, manufacturerModelNumber: 'SM-S948B', price: 78_000 }), catalog)
    assert.equal(result.status, 'matched')
    assert.equal(result.candidates.length, 1)
    assert.equal(result.candidates[0].sku, sku)
    assert.equal(result.candidates[0].productName, 'Galaxy S26 Ultra')
    assert.equal(canManuallyConfirmMissingAttributes(result.status, result.candidates), false)
  }
})

test('region alone never produces unsupported_region', () => {
  const items = [
    aiItem({ modelText: 'AirPods 4', region: 'JP' }),
    aiItem({ modelText: 'AirPods Pro 3', region: 'UAE' }),
    aiItem({ modelText: 'Unknown Model', region: 'EU' }),
  ]
  assert.equal(items.some((item) => matchCatalogItem(item, catalog).status === 'unsupported_region'), false)
})

test('resolves the 17 Max alias to the exact Pro Max product', () => {
  const withHeading = aiItem({ modelText: '17 Max', contextHeading: '17 Pro Max', storage: '256GB', color: 'Silver', sim: 'eSIM' })
  assert.equal(matchCatalogItem(withHeading, catalog).selected?.productName, 'iPhone 17 Pro Max')
  assert.equal(matchCatalogItem({ ...withHeading, contextHeading: '' }, catalog).selected?.productName, 'iPhone 17 Pro Max')
})

test('finds the exact iPhone 17 Pro Max model without a heading', () => {
  const result = matchCatalogItem(aiItem({ modelText: '17 Pro Max', storage: '256GB', color: 'Silver', sim: 'eSim' }), catalog)
  assert.notEqual(result.status, 'not_found')
  assert.equal(result.selected?.sku, 'VAR-MAX-SILVER')
})

test('activation and condition notes require manual review', () => {
  for (const note of ['Актив', 'уценка', 'мятая коробка', 'OB']) {
    const result = matchCatalogItem(aiItem({ modelText: '17 Pro Max', storage: '256GB', color: 'Silver', sim: 'eSIM', notes: [note] }), catalog)
    assert.equal(result.status, 'manual_review')
    assert.ok(result.candidates.length > 0)
  }
})

test('database migration includes the manual_review match status enum value', async () => {
  const migration = await readFile(new URL('../src/migrations/20260828_120000_price_import_manual_review.ts', import.meta.url), 'utf8')
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'manual_review'/)
  const endpoints = await readFile(new URL('../src/payload/price-updates/endpoints.ts', import.meta.url), 'utf8')
  assert.match(endpoints, /persistenceDiagnostic/)
  assert.equal(endpoints.includes("logger.error({ err: error }, 'Failed to persist price-list matching audit')"), false)
})

test('matches iPhone 17 Lavender, Sage and White with SIM plus eSIM', () => {
  for (const color of ['Lavender', 'Sage', 'White']) {
    const result = matchCatalogItem(aiItem({ modelText: '17', storage: '256GB', color, sim: 'SIM + eSIM' }), catalog)
    assert.equal(result.status, 'matched')
  }
})

test('matches Z Fold 8 Graphite and distinguishes AirPods ANC', () => {
  assert.equal(matchCatalogItem(aiItem({ modelText: 'Z Fold 8', storage: '256GB', ram: '12', color: 'Graphite' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'AirPods 4' }), catalog).selected?.sku, 'PRD-AIRPODS-4')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'AirPods 4 ANC' }), catalog).selected?.sku, 'PRD-AIRPODS-4-ANC')
})

test('ignores PlayStation revision and S26 manufacturer model number for matching', () => {
  assert.equal(matchCatalogItem(aiItem({ modelText: 'PlayStation 5 slim disk', revision: '2 рев' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'S26 Ultra', storage: '256GB', ram: '12', color: 'Black', manufacturerModelNumber: 'SM-S948B' }), catalog).status, 'matched')
})

test('matches PlayStation disk and digital before revision is checked', () => {
  for (const [modelText, sku] of [['PlayStation 5 slim disk 1шт', 'PRD-PS5-DISK'], ['PlayStation 5 disc', 'PRD-PS5-DISK'], ['PlayStation 5 с дисководом', 'PRD-PS5-DISK'], ['PlayStation 5 digital', 'PRD-PS5-DIGITAL'], ['PlayStation 5 цифровая', 'PRD-PS5-DIGITAL']]) {
    assert.equal(matchCatalogItem(aiItem({ modelText, region: 'JP' }), catalog).selected?.sku, sku)
  }
  const revision = matchCatalogItem(aiItem({ modelText: 'PlayStation 5 slim disk', revision: '2 рев' }), catalog)
  assert.equal(revision.status, 'matched')
  assert.equal(revision.selected?.sku, 'PRD-PS5-DISK')
})

test('PlayStation revision keeps the resolved base SKU for automatic matching', () => {
  for (const [modelText, sku, name] of [
    ['PlayStation 5 slim disk', 'PRD-PS5-DISK', 'PlayStation 5 Slim Disk'],
    ['PlayStation 5 digital', 'PRD-PS5-DIGITAL', 'PlayStation 5 Slim Digital'],
  ]) {
    const result = matchCatalogItem(aiItem({ modelText, revision: '2 рев', price: 66_500 }), catalog)
    assert.equal(result.status, 'matched')
    assert.equal(result.selected?.sku, sku)
    assert.equal(result.selected?.productName, name)
  }
})

test('uses contextual Blue and Orange aliases for Pro Max colors', () => {
  for (const color of ['Blue', 'Orange']) {
    const result = matchCatalogItem(aiItem({ modelText: '17 Max', contextHeading: '17 Pro Max', storage: '256GB', color, sim: 'eSIM' }), catalog)
    assert.equal(result.status, 'matched')
    assert.equal(result.candidates.length, 1)
  }
})

test('manual candidate choice uses only a server-issued key', () => {
  const candidates = [{ ...matchCatalogItem(aiItem({ modelText: '17 Max', contextHeading: '17 Pro Max', storage: '256GB', color: 'Blue', sim: 'eSIM' }), catalog).candidates[0], key: 'server-key' }]
  assert.equal(candidateByKey(candidates, 'server-key')?.sku, 'VAR-MAX-BLUE')
  assert.equal(candidateByKey(candidates, 'forged-key'), undefined)
})

test('skipped lines are omitted when selected lines enter the existing preview', () => {
  assert.equal(buildPreviewPriceInput([
    { resolution: 'automatic', selectedSku: 'VAR-A', price: 100 },
    { resolution: 'manual', selectedSku: 'VAR-B', price: 200 },
    { resolution: 'skipped', price: 300 },
  ]), 'VAR-A — 100\nVAR-B — 200')
  assert.throws(() => buildPreviewPriceInput([{ resolution: 'pending', price: 100 }]))
})

test('matches Samsung aliases before searching a variant and keeps absent S25 not found', () => {
  assert.equal(matchCatalogItem(aiItem({ modelText: 'S26 Ultra', storage: '256GB', ram: '12', color: 'Black' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'Galaxy S26 Ultra', storage: '256GB', ram: '12', color: 'Black' }), catalog).status, 'matched')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'S25 Ultra' }), catalog).status, 'not_found')
})

test('freeform parser skips headings and extracts price, memory, SIM and regions', () => {
  const parsed = parseFreeformPriceList([
    'AirPods:',
    'AirPods 4 ANC India  13 300 ₽',
    'Samsung:',
    'Samsung S26 Ultra 12 / 256 GB Violet  77 300 руб',
    '17:',
    '17 256ГБ Lavender 1 SIM + eSIM  76 000',
    '17 Pro Max:',
    '17 Max 512GB Blue eSim  122000',
  ].join('\n'))
  assert.equal(parsed.lines.length, 4)
  assert.equal(parsed.items.length, 4)
  assert.deepEqual(parsed.items.map(({ modelText, price, storage, ram, color, sim, region }) => ({ modelText, price, storage, ram, color, sim, region })), [
    { modelText: 'AirPods 4 ANC', price: 13_300, storage: null, ram: null, color: null, sim: null, region: 'India' },
    { modelText: 'Samsung S26 Ultra', price: 77_300, storage: '256GB', ram: '12GB', color: 'Violet', sim: null, region: '' },
    { modelText: '17', price: 76_000, storage: '256GB', ram: null, color: 'Lavender', sim: 'SIM + eSIM', region: '' },
    { modelText: '17 Max', price: 122_000, storage: '512GB', ram: null, color: 'Blue', sim: 'eSIM', region: '' },
  ])
})

test('uses a group heading when a configuration line has no model text', () => {
  const parsed = parseFreeformPriceList([
    '17 Pro Max:',
    '256GB Blue eSIM 122000',
  ].join('\n'))
  assert.equal(parsed.items[0].modelText, '')
  const result = matchCatalogItem(parsed.items[0], catalog)
  assert.equal(result.status, 'matched')
  assert.equal(result.selected?.productName, 'iPhone 17 Pro Max')
})

test('freeform parser recognizes all supported price spellings and flags', () => {
  const parsed = parseFreeformPriceList([
    'AirPods 4 9800',
    'AirPods 4 9 800',
    'AirPods 4 9800 ₽',
    'AirPods 4 9\u00a0800 руб',
    'AirPods 4 🇯🇵 9800',
  ].join('\n'))
  assert.deepEqual(parsed.items.map((item) => item.price), [9800, 9800, 9800, 9800, 9800])
  assert.equal(parsed.items.at(-1).region, 'Japan')
})

test('freeform parser normalizes the extended region dictionary without leaking tokens into models', () => {
  const parsed = parseFreeformPriceList([
    'Air 256GB Sky Blue — 9800 🇺🇸 ESIM',
    'Air 256GB Sky Blue — 9800 EU ESIM',
    'Air 256GB Sky Blue — 9800 China ESIM',
    'Air 256GB Sky Blue — 9800 UAE ESIM',
    'Air 256GB Sky Blue — 9800 🇰🇷 ESIM',
  ].join('\n'))
  assert.deepEqual(parsed.items.map(({ modelText, region, sim }) => ({ modelText, region, sim })), [
    { modelText: 'Air', region: 'United States', sim: 'eSIM' },
    { modelText: 'Air', region: 'Europe', sim: 'eSIM' },
    { modelText: 'Air', region: 'China', sim: 'eSIM' },
    { modelText: 'Air', region: 'United Arab Emirates', sim: 'eSIM' },
    { modelText: 'Air', region: 'South Korea', sim: 'eSIM' },
  ])
})

test('SIM forms remain distinct configurations', () => {
  const simCatalog = [{ id: 1, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', variants: [
    { id: 'esim', sku: 'ESIM', storage: '256GB', color: 'Deep Blue', sim: 'eSIM' },
    { id: 'combo', sku: 'COMBO', storage: '256GB', color: 'Deep Blue', sim: 'SIM + eSIM' },
  ] }]
  const esim = matchCatalogItem(aiItem({ modelText: '17 Max', storage: '256GB', color: 'Blue', sim: 'eSIM' }), simCatalog)
  const combo = matchCatalogItem(aiItem({ modelText: '17 Max', storage: '256GB', color: 'Blue', sim: '1sim esim' }), simCatalog)
  assert.equal(esim.selected?.sku, 'ESIM')
  assert.equal(combo.selected?.sku, 'COMBO')
})

test('full regression price list produces a deterministic matching report', () => {
  const fixture = [
    'AirPods:',
    'AirPods 4 ANC India  13300',
    'AirPods 4 Hong Kong  9800',
    'AirPods Pro 3  17700',
    'Samsung:',
    'Samsung S25 Ultra 12/256GB Black  67000',
    'Samsung S25 Ultra 12/256GB White Silver  65000',
    'Samsung S26 12/256GB Violet  62000',
    'Samsung S26 Ultra 12/256GB Violet  77300',
    'Samsung S26 Ultra 12/256GB Black  77300',
    'Samsung S26 Ultra 12/256GB Blue  77200',
    '17:',
    '17 256GB Lavender 1Sim+eSim  76000',
    '17 256GB Sage 1Sim+eSim  74500',
    '17 256GB Black 1Sim+eSim  75500',
    '17 256GB Mist Blue 1Sim+eSim  75000',
    '17 256GB White 1Sim+eSim  74500',
    '17 Pro:',
    '17 Pro 256GB Blue eSim  98000',
    '17 Pro 256GB Orange eSim  95500',
    '17 Pro 256GB Silver eSim  98500',
    '17 Pro 256GB Orange 1Sim+eSim  99500',
    '17 Pro 256GB Blue 1Sim+eSim  101500',
    '17 Pro 256GB Silver 1Sim+eSim  103000',
    '17 Pro Max:',
    '17 Max 256GB Blue eSim  105500',
    '17 Max 256GB Orange eSim  105000',
    '17 Max 256GB Silver eSim  105500',
    '17 Max 256GB Blue 1Sim+eSim  111500',
    '17 Max 256GB Orange 1Sim+eSim  110500',
    '17 Max 256GB Silver 1Sim+eSim  113000',
    '17 Max 512GB Blue eSim  122000',
    '17 Max 512GB Orange eSim  119500',
    '17 Max 512GB Silver eSim  124000',
    '17 Max 512GB Blue 1Sim+eSim  130000',
    '17 Max 512GB Orange 1Sim+eSim  129000',
    '17 Max 512GB Silver 1Sim+eSim  134000',
  ].join('\n')
  const variants = (prefix, storage, colors, sims) => colors.flatMap(([input, catalogColor]) => sims.map((sim) => ({
    id: `${prefix}-${storage}-${input}-${sim}`,
    sku: `${prefix}-${storage}-${input}-${sim}`,
    storage,
    color: catalogColor,
    sim,
  })))
  const fullCatalog = [
    { id: 1, name: 'AirPods 4 с шумоподавлением', model: 'AirPods 4 ANC', sku: 'AIR-ANC', variants: [] },
    { id: 2, name: 'AirPods 4', model: 'AirPods 4', sku: 'AIR-4', variants: [] },
    { id: 3, name: 'AirPods Pro 3', model: 'AirPods Pro 3', sku: 'AIR-PRO-3', variants: [] },
    { id: 4, name: 'Samsung Galaxy S26', model: 'Samsung Galaxy S26', variants: [{ id: 's26', sku: 'S26', storage: '256GB', ram: '12GB', color: 'Cobalt Violet' }] },
    { id: 5, name: 'Samsung Galaxy S26 Ultra', model: 'Samsung Galaxy S26 Ultra', variants: [['Violet', 'Cobalt Violet'], ['Black', 'Black'], ['Blue', 'Sky Blue']].map(([id, color]) => ({ id, sku: `S26U-${id}`, storage: '256GB', ram: '12GB', color })) },
    { id: 6, name: 'iPhone 17', model: 'iPhone 17', variants: variants('17', '256GB', [['Lavender', 'Lavender'], ['Sage', 'Sage'], ['Black', 'Black'], ['Mist Blue', 'Mist Blue'], ['White', 'White']], ['SIM + eSIM']) },
    { id: 7, name: 'iPhone 17 Pro', model: 'iPhone 17 Pro', variants: variants('17P', '256GB', [['Blue', 'Deep Blue'], ['Orange', 'Cosmic Orange'], ['Silver', 'Silver']], ['eSIM', 'SIM + eSIM']) },
    { id: 8, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', variants: [...variants('17PM', '256GB', [['Blue', 'Deep Blue'], ['Orange', 'Cosmic Orange'], ['Silver', 'Silver']], ['eSIM', 'SIM + eSIM']), ...variants('17PM', '512GB', [['Blue', 'Deep Blue'], ['Orange', 'Cosmic Orange'], ['Silver', 'Silver']], ['eSIM', 'SIM + eSIM'])] },
  ]
  const items = parseFreeformPriceList(fixture).items
  const report = items.map((item) => ({ item, result: matchCatalogItem(item, fullCatalog) }))
  assert.equal(report.length, 32)
  assert.equal(report.filter(({ result }) => result.status === 'matched').length, 30)
  assert.equal(report.filter(({ result }) => result.status === 'ambiguous').length, 0)
  assert.equal(report.filter(({ result }) => result.status === 'not_found').length, 2)
  assert.deepEqual(report.filter(({ result }) => result.status === 'not_found').map(({ item, result }) => [item.modelText, result.reason.includes('модел')]), [
    ['Samsung S25 Ultra', true], ['Samsung S25 Ultra', true],
  ])
})

test('second regression fixture matches every iPhone 17 Pro and Pro Max price to one SKU', () => {
  const fixture = `iPhone 17 Pro

17 Pro 256Gb Cosmic Orange (eSIM) — 94.800
17 Pro 256Gb Deep Blue (eSIM) — 96.200
17 Pro 256Gb Silver (eSIM) — 97.300

17 Pro 512Gb Cosmic Orange (eSIM) — 112.700
17 Pro 512Gb Deep Blue (eSIM) — 116.000
17 Pro 512Gb Silver (eSIM) — 112.700

17 Pro 1Tb Cosmic Orange (eSIM) — 122.500
17 Pro 1Tb Deep Blue (eSIM) — 123.500
17 Pro 1Tb Silver (eSIM) — 128.900

17 Pro 256Gb Cosmic Orange (1SIM) — 99.300
17 Pro 256Gb Deep Blue (1SIM) — 100.200
17 Pro 256Gb Silver (1SIM) — 102.500

17 Pro 512Gb Cosmic Orange (1SIM) — 119.000
17 Pro 512Gb Deep Blue (1SIM) — 122.300
17 Pro 512Gb Silver (1SIM) — 125.000

17 Pro 1Tb Cosmic Orange (1SIM) — 133.500
17 Pro 1Tb Deep Blue (1SIM) — 138.500
17 Pro 1Tb Silver (1SIM) — 140.400

iPhone 17 Pro Max

17 Pro Max 256Gb Cosmic Orange (eSIM) — 104.500
17 Pro Max 256Gb Deep Blue (eSIM) — 104.400
17 Pro Max 256Gb Silver (eSIM) — 104.500

17 Pro Max 512Gb Cosmic Orange (eSIM) — 119.200
17 Pro Max 512Gb Deep Blue (eSIM) — 119.300
17 Pro Max 512Gb Silver (eSIM) — 120.800

17 Pro Max 1Tb Cosmic Orange (eSIM) — 136.000
17 Pro Max 1Tb Deep Blue (eSIM) — 134.500
17 Pro Max 1Tb Silver (eSIM) — 139.100

17 Pro Max 2Tb Cosmic Orange (eSIM) — 148.800
17 Pro Max 2Tb Deep Blue (eSIM) — 149.400
17 Pro Max 2Tb Silver (eSIM) — 163.600

17 Pro Max 256Gb Cosmic Orange (1SIM) — 109.300
17 Pro Max 256Gb Deep Blue (1SIM) — 109.900
17 Pro Max 256Gb Silver (1SIM) — 112.200

17 Pro Max 512Gb Cosmic Orange (1SIM) — 127.300
17 Pro Max 512Gb Deep Blue (1SIM) — 128.800
17 Pro Max 512Gb Silver (1SIM) — 133.700

17 Pro Max 1Tb Cosmic Orange (1SIM) — 153.600
17 Pro Max 1Tb Deep Blue (1SIM) — 150.200

17 Pro Max 2Tb Cosmic Orange (1SIM) — 166.900
17 Pro Max 2Tb Deep Blue (1SIM) — 170.500
17 Pro Max 2Tb Silver (1SIM) — 173.400`
  const makeVariants = (prefix, storages) => storages.flatMap((storage) => [
    ['Cosmic Orange', 'orange'], ['Deep Blue', 'blue'], ['Silver', 'silver'],
  ].flatMap(([color, colorKey]) => ['eSIM', 'SIM + eSIM'].map((sim) => ({
    id: `${prefix}-${storage}-${colorKey}-${sim}`,
    sku: `${prefix}-${storage}-${colorKey}-${sim === 'eSIM' ? 'ESIM' : 'SIM-ESIM'}`,
    storage, color, sim,
  }))))
  const fixtureCatalog = [
    { id: 101, name: 'iPhone 17 Pro', model: 'iPhone 17 Pro', variants: makeVariants('17P', ['256GB', '512GB', '1TB']) },
    { id: 102, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', variants: makeVariants('17PM', ['256GB', '512GB', '1TB', '2TB']) },
  ]
  const parsed = parseFreeformPriceList(fixture)
  const report = parsed.items.map((item) => ({ item, result: matchCatalogItem(item, fixtureCatalog) }))
  assert.equal(parsed.items.length, 41)
  assert.equal(parsed.lines.length, 41)
  assert.equal(report.filter(({ result }) => result.status === 'matched').length, 41)
  assert.equal(report.filter(({ result }) => result.status === 'ambiguous').length, 0)
  assert.equal(report.filter(({ result }) => result.status === 'not_found').length, 0)
  for (const { item, result } of report) {
    assert.equal(result.selected?.productName, item.modelText.includes('Max') ? 'iPhone 17 Pro Max' : 'iPhone 17 Pro')
    assert.equal(result.selected?.storage, item.storage)
    assert.equal(result.selected?.color, item.color === 'Cosmic Orange' || item.color === 'Deep Blue' ? item.color : 'Silver')
    assert.equal(result.selected?.sim, item.sim)
    const colorKey = item.color === 'Cosmic Orange' ? 'orange' : item.color === 'Deep Blue' ? 'blue' : 'silver'
    assert.equal(result.selected?.sku, `${item.modelText.includes('Max') ? '17PM' : '17P'}-${item.storage}-${colorKey}-${item.sim === 'eSIM' ? 'ESIM' : 'SIM-ESIM'}`)
  }
})

test('third regression fixture handles money before SIM or region and keeps headings out of import results', () => {
  const fixture = `iPhone 17e
Japan 17e 256GB White ESIM — 56.300
17e 256GB Black (1SIM) — 56.300 Kuwait
17e 512GB Pink — 104.200 ESIM

iPhone Air
Air 256GB Sky Blue — 73.600 ESIM
Air 256GB Light Gold — 74.600 (eSIM) Europe
Air 256GB Cloud White — 75.600 ESIM United States
Air 1TB Space Black : 1.000.000 ESIM

iPhone 17
17 256GB White 1SIM — 60.000 USA
17 256GB Black — 60.100 SIM + ESIM
17 256GB Mist Blue Europe SIM+ESIM — 60.200
17 256GB Sage (1SIM) — 60.300 South Korea
17 256GB Lavender — 60.400 1SIM China

iPhone 17 Pro
17 Pro 256GB Cosmic Orange — 94.800 (eSIM)
17 Pro 256GB Deep Blue — 96.200 ESIM
17 Pro 256GB Silver — 97.300 (1SIM)

iPhone 17 Pro Max
17 Max 2TB Cosmic Orange — 148.800 ESIM
17 Pro Max 2TB Deep Blue — 149.400 SIM + ESIM
17 Pro Max 2TB Silver — 163.600 (1SIM)

iPhone 17
17e 256GB White
17 Pro Max 2TB Silver
iPhone 17`
  const makeVariant = (id, storage, color, sim, region) => ({ id, sku: `SKU-${id}`, storage, color, sim, ...(region ? { region } : {}) })
  const fixtureCatalog = [
    { id: 201, name: 'iPhone 17e', model: 'iPhone 17e', variants: [
      makeVariant('17E-WHITE-ESIM-JP', '256GB', 'White', 'eSIM', 'Japan'),
      makeVariant('17E-BLACK-COMBO-KW', '256GB', 'Black', 'SIM + eSIM', 'Kuwait'),
      makeVariant('17E-SOFT-PINK-ESIM', '512GB', 'Soft Pink', 'eSIM'),
    ] },
    { id: 202, name: 'iPhone Air', model: 'iPhone Air', variants: [
      makeVariant('AIR-SKY', '256GB', 'Sky Blue', 'eSIM'),
      makeVariant('AIR-GOLD', '256GB', 'Light Gold', 'eSIM', 'Europe'),
      makeVariant('AIR-CLOUD', '256GB', 'Cloud White', 'eSIM', 'United States'),
      makeVariant('AIR-BLACK-1TB', '1TB', 'Space Black', 'eSIM'),
    ] },
    { id: 203, name: 'iPhone 17', model: 'iPhone 17', variants: [
      makeVariant('17-WHITE', '256GB', 'White', 'SIM + eSIM', 'United States'),
      makeVariant('17-BLACK', '256GB', 'Black', 'SIM + eSIM'),
      makeVariant('17-MIST', '256GB', 'Mist Blue', 'SIM + eSIM', 'Europe'),
      makeVariant('17-SAGE', '256GB', 'Sage', 'SIM + eSIM', 'South Korea'),
      makeVariant('17-LAV', '256GB', 'Lavender', 'SIM + eSIM', 'China'),
    ] },
    { id: 204, name: 'iPhone 17 Pro', model: 'iPhone 17 Pro', variants: [
      makeVariant('17P-ORANGE', '256GB', 'Cosmic Orange', 'eSIM'),
      makeVariant('17P-BLUE', '256GB', 'Deep Blue', 'eSIM'),
      makeVariant('17P-SILVER', '256GB', 'Silver', 'SIM + eSIM'),
    ] },
    { id: 205, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', variants: [
      makeVariant('17PM-ORANGE', '2TB', 'Cosmic Orange', 'eSIM'),
      makeVariant('17PM-BLUE', '2TB', 'Deep Blue', 'SIM + eSIM'),
      makeVariant('17PM-SILVER', '2TB', 'Silver', 'SIM + eSIM'),
    ] },
  ]
  const parsed = parseFreeformPriceList(fixture)
  assert.equal(parsed.items.length, 18)
  assert.equal(parsed.lines.length, 20)
  assert.equal(parsed.errors.length, 2)
  assert.equal(parsed.items.some((item) => item.modelText === 'iPhone'), false)
  assert.deepEqual(parsed.items.map(({ modelText, storage, color, sim, region, price }) => ({ modelText, storage, color, sim, region, price })), [
    { modelText: '17e', storage: '256GB', color: 'White', sim: 'eSIM', region: 'Japan', price: 56300 },
    { modelText: '17e', storage: '256GB', color: 'Black', sim: 'SIM + eSIM', region: 'Kuwait', price: 56300 },
    { modelText: '17e', storage: '512GB', color: 'Pink', sim: 'eSIM', region: '', price: 104200 },
    { modelText: 'Air', storage: '256GB', color: 'Sky Blue', sim: 'eSIM', region: '', price: 73600 },
    { modelText: 'Air', storage: '256GB', color: 'Light Gold', sim: 'eSIM', region: 'Europe', price: 74600 },
    { modelText: 'Air', storage: '256GB', color: 'Cloud White', sim: 'eSIM', region: 'United States', price: 75600 },
    { modelText: 'Air', storage: '1TB', color: 'Space Black', sim: 'eSIM', region: '', price: 1000000 },
    { modelText: '17', storage: '256GB', color: 'White', sim: 'SIM + eSIM', region: 'United States', price: 60000 },
    { modelText: '17', storage: '256GB', color: 'Black', sim: 'SIM + eSIM', region: '', price: 60100 },
    { modelText: '17', storage: '256GB', color: 'Mist Blue', sim: 'SIM + eSIM', region: 'Europe', price: 60200 },
    { modelText: '17', storage: '256GB', color: 'Sage', sim: 'SIM + eSIM', region: 'South Korea', price: 60300 },
    { modelText: '17', storage: '256GB', color: 'Lavender', sim: 'SIM + eSIM', region: 'China', price: 60400 },
    { modelText: '17 Pro', storage: '256GB', color: 'Cosmic Orange', sim: 'eSIM', region: '', price: 94800 },
    { modelText: '17 Pro', storage: '256GB', color: 'Deep Blue', sim: 'eSIM', region: '', price: 96200 },
    { modelText: '17 Pro', storage: '256GB', color: 'Silver', sim: 'SIM + eSIM', region: '', price: 97300 },
    { modelText: '17 Max', storage: '2TB', color: 'Cosmic Orange', sim: 'eSIM', region: '', price: 148800 },
    { modelText: '17 Pro Max', storage: '2TB', color: 'Deep Blue', sim: 'SIM + eSIM', region: '', price: 149400 },
    { modelText: '17 Pro Max', storage: '2TB', color: 'Silver', sim: 'SIM + eSIM', region: '', price: 163600 },
  ])
  const report = parsed.items.map((item) => ({ item, result: matchCatalogItem(item, fixtureCatalog) }))
  assert.equal(report.filter(({ result }) => result.status === 'matched').length, 18)
  assert.equal(report.filter(({ result }) => result.status === 'ambiguous').length, 0)
  assert.equal(report.filter(({ result }) => result.status === 'not_found').length, 0)
  for (const { item, result } of report) assert.equal(result.selected?.sku.startsWith('SKU-'), true)
  assert.equal(matchCatalogItem(aiItem({ modelText: '17', storage: '256GB', color: 'White', sim: 'SIM + eSIM' }), fixtureCatalog).selected?.productName, 'iPhone 17')
})

test('short storage and Active are removed before deterministic model matching', () => {
  const fixture = `17 Pro Max 256 Silver (1Sim+eSim) 111700
17 Pro Max 256 Blue (1Sim+eSim) 110500
17 Pro Max 256 Orange (1Sim+eSim) 110400
17 Pro Max 512 Silver (1Sim+eSim) 132705
17 Pro Max 512 Blue (1Sim+eSim) 129700
17 Pro Max 512 Orange (1Sim+eSim) 128400
17 Pro Max 2TB Orange (eSim) Актив 142700
17 Pro 512 Blue (eSim) Актив 110700
17 512 Black (eSim) Актив 79700
iPad 11 128 Silver Wi-Fi 39400
Air 13 MDHE4 Midnight (M5 16/512) 120800`
  const variants = (prefix, storages, colors, sims) => storages.flatMap((storage) => colors.flatMap(([input, color]) => sims.map((sim) => ({
    id: `${prefix}-${storage}-${input}-${sim}`,
    sku: `${prefix}-${storage}-${input}-${sim}`,
    storage, color, sim,
  }))))
  const fixtureCatalog = [
    { id: 301, name: 'iPhone 17 Pro Max', model: 'iPhone 17 Pro Max', productGroup: 'smartphones', variants: variants('17PM', ['256GB', '512GB', '1TB', '2TB'], [['Silver', 'Silver'], ['Blue', 'Deep Blue'], ['Orange', 'Cosmic Orange']], ['eSIM', 'SIM + eSIM']) },
    { id: 302, name: 'iPhone 17 Pro', model: 'iPhone 17 Pro', productGroup: 'smartphones', variants: variants('17P', ['512GB'], [['Blue', 'Deep Blue']], ['eSIM']) },
    { id: 303, name: 'iPhone 17', model: 'iPhone 17', productGroup: 'smartphones', variants: variants('17', ['512GB'], [['Black', 'Black']], ['eSIM']) },
    { id: 304, name: 'iPad', model: 'iPad', productGroup: 'tablets', variants: [{ id: 'ipad', sku: 'IPAD-128-SILVER', storage: '128GB', color: 'Silver', screenSize: '11″', connectivity: 'Wi-Fi' }] },
    { id: 305, name: 'MacBook Air 13″ M5', model: 'MacBook Air 13″ M5', productGroup: 'laptops', variants: [{ id: 'mac', sku: 'MAC-AIR-MDHE4', manufacturerModelNumber: 'MDHE4', storage: '512GB', ram: '16GB', color: 'Midnight', screenSize: '13.6″', chip: 'M5' }] },
  ]
  const parsed = parseFreeformPriceList(fixture)
  assert.equal(parsed.items.length, 11)
  assert.equal(parsed.errors.length, 0)
  assert.deepEqual(parsed.items.map(({ modelText, storage, ram, color, sim, active, price }) => ({ modelText, storage, ram, color, sim, active, price })), [
    { modelText: '17 Pro Max', storage: '256GB', ram: null, color: 'Silver', sim: 'SIM + eSIM', active: false, price: 111700 },
    { modelText: '17 Pro Max', storage: '256GB', ram: null, color: 'Blue', sim: 'SIM + eSIM', active: false, price: 110500 },
    { modelText: '17 Pro Max', storage: '256GB', ram: null, color: 'Orange', sim: 'SIM + eSIM', active: false, price: 110400 },
    { modelText: '17 Pro Max', storage: '512GB', ram: null, color: 'Silver', sim: 'SIM + eSIM', active: false, price: 132705 },
    { modelText: '17 Pro Max', storage: '512GB', ram: null, color: 'Blue', sim: 'SIM + eSIM', active: false, price: 129700 },
    { modelText: '17 Pro Max', storage: '512GB', ram: null, color: 'Orange', sim: 'SIM + eSIM', active: false, price: 128400 },
    { modelText: '17 Pro Max', storage: '2TB', ram: null, color: 'Orange', sim: 'eSIM', active: true, price: 142700 },
    { modelText: '17 Pro', storage: '512GB', ram: null, color: 'Blue', sim: 'eSIM', active: true, price: 110700 },
    { modelText: '17', storage: '512GB', ram: null, color: 'Black', sim: 'eSIM', active: true, price: 79700 },
    { modelText: 'iPad', storage: '128GB', ram: null, color: 'Silver', sim: null, active: false, price: 39400 },
    { modelText: 'MacBook Air', storage: '512GB', ram: '16GB', color: 'Midnight', sim: null, active: false, price: 120800 },
  ])
  for (const item of parsed.items) {
    assert.doesNotMatch(item.modelText, /(?:\b128\b|\b256\b|\b512\b|Актив)/iu)
  }
  const report = parsed.items.map((item) => ({ item, result: matchCatalogItem(item, fixtureCatalog) }))
  assert.equal(report.filter(({ result }) => result.status === 'matched').length, 11, JSON.stringify(report.map(({ item, result }) => ({ model: item.modelText, status: result.status, reason: result.reason }))))
  assert.equal(report.filter(({ result }) => result.status === 'ambiguous').length, 0)
  assert.equal(report.filter(({ result }) => result.status === 'not_found').length, 0)
  assert.equal(new Set(report.map(({ result }) => result.selected?.sku)).size, 11)
  assert.equal(report[7].result.selected?.productName, 'iPhone 17 Pro')
  assert.equal(report.slice(0, 7).every(({ result }) => result.selected?.productName === 'iPhone 17 Pro Max'), true)
  assert.equal(matchCatalogItem(aiItem({ modelText: '17 Pro Max', storage: '1TB', color: 'Silver', sim: 'SIM + eSIM' }), fixtureCatalog).status, 'matched')
})

test('iPhone Air color aliases stay model-scoped and match exact catalog colors', () => {
  const fixture = `17 Air 256 Black (eSim) 74000
17 Air 256 White (eSim) 74700
17 Air 256 Gold (eSim) 72600
17 Air 256 Blue (eSim) 72700
17 Air 512 Black (eSim) 80900
17 Air 512 White (eSim) 83200
17 Air 1TB White (eSim) 89900
17 Air 1TB Blue (eSim) 89900`
  const colors = [['Black', 'Space Black'], ['White', 'Cloud White'], ['Gold', 'Light Gold'], ['Blue', 'Sky Blue']]
  const airVariants = ['256GB', '512GB', '1TB'].flatMap((storage) => colors.map(([input, color]) => ({
    id: `${storage}-${input}`,
    sku: `AIR-${storage}-${input.toUpperCase()}`,
    storage,
    color,
    sim: 'eSIM',
  })))
  const fixtureCatalog = [
    { id: 401, name: 'iPhone Air', model: 'iPhone Air', variants: airVariants },
    { id: 402, name: 'iPhone 17', model: 'iPhone 17', variants: [{ id: '17-black', sku: '17-BLACK', storage: '512GB', color: 'Black', sim: 'eSIM' }] },
    { id: 403, name: 'iPhone 17 Pro', model: 'iPhone 17 Pro', variants: [{ id: '17p-blue', sku: '17P-DEEP-BLUE', storage: '256GB', color: 'Deep Blue', sim: 'eSIM' }] },
    { id: 404, name: 'AirPods 4', model: 'AirPods 4', sku: 'AIRPODS-4', variants: [] },
  ]
  const parsed = parseFreeformPriceList(fixture)
  const report = parsed.items.map((item) => ({ item, result: matchCatalogItem(item, fixtureCatalog) }))
  assert.equal(parsed.items.length, 8)
  assert.equal(parsed.errors.length, 0)
  assert.equal(report.every(({ result }) => result.status === 'matched'), true)
  assert.deepEqual(report.map(({ item, result }) => ({
    model: result.selected?.productName,
    storage: item.storage,
    inputColor: item.color,
    catalogColor: result.selected?.color,
    sim: item.sim,
    price: item.price,
    status: result.status,
    sku: result.selected?.sku,
  })), [
    { model: 'iPhone Air', storage: '256GB', inputColor: 'Black', catalogColor: 'Space Black', sim: 'eSIM', price: 74000, status: 'matched', sku: 'AIR-256GB-BLACK' },
    { model: 'iPhone Air', storage: '256GB', inputColor: 'White', catalogColor: 'Cloud White', sim: 'eSIM', price: 74700, status: 'matched', sku: 'AIR-256GB-WHITE' },
    { model: 'iPhone Air', storage: '256GB', inputColor: 'Gold', catalogColor: 'Light Gold', sim: 'eSIM', price: 72600, status: 'matched', sku: 'AIR-256GB-GOLD' },
    { model: 'iPhone Air', storage: '256GB', inputColor: 'Blue', catalogColor: 'Sky Blue', sim: 'eSIM', price: 72700, status: 'matched', sku: 'AIR-256GB-BLUE' },
    { model: 'iPhone Air', storage: '512GB', inputColor: 'Black', catalogColor: 'Space Black', sim: 'eSIM', price: 80900, status: 'matched', sku: 'AIR-512GB-BLACK' },
    { model: 'iPhone Air', storage: '512GB', inputColor: 'White', catalogColor: 'Cloud White', sim: 'eSIM', price: 83200, status: 'matched', sku: 'AIR-512GB-WHITE' },
    { model: 'iPhone Air', storage: '1TB', inputColor: 'White', catalogColor: 'Cloud White', sim: 'eSIM', price: 89900, status: 'matched', sku: 'AIR-1TB-WHITE' },
    { model: 'iPhone Air', storage: '1TB', inputColor: 'Blue', catalogColor: 'Sky Blue', sim: 'eSIM', price: 89900, status: 'matched', sku: 'AIR-1TB-BLUE' },
  ])
  assert.equal(matchCatalogItem(aiItem({ modelText: '17', storage: '512GB', color: 'Black', sim: 'eSIM' }), fixtureCatalog).selected?.color, 'Black')
  assert.equal(matchCatalogItem(aiItem({ modelText: '17 Pro', storage: '256GB', color: 'Blue', sim: 'eSIM' }), fixtureCatalog).selected?.color, 'Deep Blue')
  assert.equal(matchCatalogItem(aiItem({ modelText: 'AirPods 4' }), fixtureCatalog).selected?.sku, 'AIRPODS-4')
})

test('a standalone price on the next non-empty line is joined only to a configured product row', () => {
  const fixture = `iPad

iPad 11 128 Silver Wi-Fi
39400
iPad 11 128 Blue Wi-Fi
39 400
iPad 11 128 Pink Wi-Fi
39.900 ₽
iPad 11 128 Yellow Wi-Fi
38 200 руб`
  const fixtureCatalog = [{ id: 501, name: 'iPad', model: 'iPad', productGroup: 'tablets', variants: [
    { id: 'silver', sku: 'IPAD-SILVER', storage: '128GB', color: 'Silver', screenSize: '11″', connectivity: 'Wi-Fi' },
    { id: 'blue', sku: 'IPAD-BLUE', storage: '128GB', color: 'Blue', screenSize: '11″', connectivity: 'Wi-Fi' },
    { id: 'pink', sku: 'IPAD-PINK', storage: '128GB', color: 'Pink', screenSize: '11″', connectivity: 'Wi-Fi' },
    { id: 'yellow', sku: 'IPAD-YELLOW', storage: '128GB', color: 'Yellow', screenSize: '11″', connectivity: 'Wi-Fi' },
  ] }]
  const parsed = parseFreeformPriceList(fixture)
  const report = parsed.items.map((item) => ({ item, result: matchCatalogItem(item, fixtureCatalog) }))
  assert.equal(parsed.lines.length, 4)
  assert.equal(parsed.items.length, 4)
  assert.equal(parsed.errors.length, 0)
  assert.deepEqual(parsed.lines.map((line) => line.lineNumber), [3, 5, 7, 9])
  assert.deepEqual(report.map(({ item, result }) => ({ model: item.modelText, storage: item.storage, color: item.color, connectivity: item.connectivity, price: item.price, status: result.status, sku: result.selected?.sku })), [
    { model: 'iPad', storage: '128GB', color: 'Silver', connectivity: 'Wi-Fi', price: 39400, status: 'matched', sku: 'IPAD-SILVER' },
    { model: 'iPad', storage: '128GB', color: 'Blue', connectivity: 'Wi-Fi', price: 39400, status: 'matched', sku: 'IPAD-BLUE' },
    { model: 'iPad', storage: '128GB', color: 'Pink', connectivity: 'Wi-Fi', price: 39900, status: 'matched', sku: 'IPAD-PINK' },
    { model: 'iPad', storage: '128GB', color: 'Yellow', connectivity: 'Wi-Fi', price: 38200, status: 'matched', sku: 'IPAD-YELLOW' },
  ])
  const withoutYellow = [{ ...fixtureCatalog[0], variants: fixtureCatalog[0].variants.filter((variant) => variant.color !== 'Yellow') }]
  const missing = matchCatalogItem(parsed.items[3], withoutYellow)
  assert.equal(missing.status, 'not_found')
  assert.match(missing.reason, /цвет/u)
  const guarded = parseFreeformPriceList('iPhone 17\n39400\nWatch\n2025\niPad 11 128 Silver Wi-Fi 39400')
  assert.equal(guarded.items.length, 1)
  assert.equal(guarded.items[0].price, 39400)
  assert.equal(guarded.errors.length, 2)
})

test('unresolved rows never enter the verified price preview', () => {
  const pending = [
    { id: 1, resolution: 'pending', matchStatus: 'not_found', price: 10, candidates: [] },
    { id: 2, resolution: 'pending', matchStatus: 'ambiguous', price: 20, candidates: [{ key: 'a', productId: 1, productName: 'P', matchType: 'variant', variantId: 'a', sku: 'A' }, { key: 'b', productId: 1, productName: 'P', matchType: 'variant', variantId: 'b', sku: 'B' }] },
  ]
  assert.deepEqual(buildVerifiedPreviewRows(pending, []), [])
})

test('does not apply iPhone color aliases to other product models', () => {
  const result = matchCatalogItem(aiItem({ modelText: 'Z Fold 8', storage: '256GB', ram: '12', color: 'Blue' }), catalog)
  assert.equal(result.status, 'not_found')
})

test('excludes a matching used catalog product from automatic price import', () => {
  const usedCatalog = [{ id: 99, name: 'iPhone 17', model: 'iPhone 17', sku: 'USED-17', category: { slug: 'used' }, variants: [] }]
  const result = matchCatalogItem(aiItem({ modelText: '17' }), usedCatalog)
  assert.equal(result.status, 'excluded_used')
  assert.match(result.reason, /Б\/У/)
})

test('flags Dyson generation values that are actually separate model candidates', () => {
  const row = classifyStructureProduct({ id: 1, name: 'Стайлер Dyson Hairstyler', model: 'Стайлер Dyson', sku: 'P', slug: 'dyson', category: { slug: 'dyson', name: 'Dyson' }, variants: [
    { sku: 'HS08-A', generation: 'HS08' }, { sku: 'HS09-A', generation: 'HS09 Coanda 2x' },
  ] })
  assert.equal(row.action, 'split')
  assert.deepEqual(row.dyson?.generationModels, ['HS08', 'HS09 Coanda 2x'])
})

test('catalog structure dry-run only reads from Payload', async () => {
  let writes = 0
  const report = await createCatalogStructureReport({
    find: async () => ({ docs: [{ id: 1, name: 'Умные очки Ray-Ban Wayfarer Gen 2', category: { slug: 'drugoe', name: 'Другое' }, variants: [] }] }),
    create: () => { writes++; throw new Error('write') }, update: () => { writes++; throw new Error('write') }, delete: () => { writes++; throw new Error('write') },
  })
  assert.equal(report.rows[0].proposed.productGroup, 'smart-devices')
  assert.equal(writes, 0)
})

test('accessories-to-other dry-run only reads and reports duplicate SKUs', async () => {
  let writes = 0
  const report = await createAccessoriesToOtherReport({
    find: async () => ({ docs: [
      { id: 1, name: 'Cable', sku: 'CAB-1', slug: 'cable', productGroup: 'accessories', price: 1_000, variants: [], images: [] },
      { id: 2, name: 'Existing other item', sku: 'CAB-1', slug: 'other-cable', productGroup: 'other', price: 1_000, variants: [], images: [] },
    ] }),
    create: () => { writes++; throw new Error('write') }, update: () => { writes++; throw new Error('write') }, delete: () => { writes++; throw new Error('write') },
  })
  assert.equal(report.accessoriesCount, 1)
  assert.equal(report.rows[0].proposedProductGroup, 'other')
  assert.deepEqual(report.duplicateSkusInOther, ['CAB-1'])
  assert.equal(writes, 0)
})

test('approved product groups have stable top navigation links', () => {
  assert.deepEqual(CATALOG_GROUPS.map((group) => group.slug), [
    'smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles',
    'home-appliances', 'smart-devices', 'other',
  ])
  assert.deepEqual(CATALOG_GROUPS.map((group) => catalogGroupHref(group.slug)), CATALOG_GROUPS.map((group) => `/catalog?group=${group.slug}`))
})

test('product group filtering keeps used as a separate technical state', () => {
  assert.equal(productBelongsToGroup({ productGroup: 'smartphones' }, 'smartphones'), true)
  assert.equal(productBelongsToGroup({ productGroup: 'other' }, 'smartphones'), false)
  assert.equal(productBelongsToGroup({ productGroup: null }, 'other'), false)
})

test('legacy category aliases map to approved groups without changing their URLs', () => {
  const mappings = Object.fromEntries(CATALOG_GROUPS.flatMap((group) => group.categorySlugs.map((slug) => [slug, group.slug])))
  assert.equal(mappings.iphone, 'smartphones')
  assert.equal(mappings.macbook, 'laptops')
  assert.equal(mappings.dyson, 'home-appliances')
  assert.equal(mappings.playstation, 'gaming-consoles')
  assert.equal(mappings.airpods, 'audio')
  assert.equal('/catalog/iphone', '/catalog/iphone')
})

test('verified manual candidate becomes a concrete SKU price row without reparsing text', () => {
  const rows = buildVerifiedPreviewRows([{ id: 7, resolution: 'manual', price: 104000, selectedCandidateKey: 'k1', candidates: [{ key: 'k1', productId: 5, productName: 'iPhone 17 Pro Max', matchType: 'variant', variantId: 'blue', sku: 'VAR-MAX-BLUE' }] }], [
    { id: 5, name: 'iPhone 17 Pro Max', price: 100000, sku: 'PRD-MAX', variants: [{ id: 'blue', sku: 'VAR-MAX-BLUE', price: 99000 }] },
  ])
  assert.deepEqual(rows, [{ lineNumber: 1, sourceLine: '', sku: 'VAR-MAX-BLUE', matchType: 'variant', product: 5, productLabel: 'iPhone 17 Pro Max', variantId: 'blue', oldCashPrice: 99000, newCashPrice: 104000, status: 'ready' }])
})

test('verified preview keeps PlayStation product SKUs and their current prices after manual confirmation', () => {
  const products = [
    { id: 36, name: 'PlayStation 5 Slim Disk', sku: 'PRD-PLAYSTATION-5-SLIM-S-DISKOVODOM-P36', price: 70_000, variants: [] },
    { id: 37, name: 'PlayStation 5 Slim Digital', sku: 'PRD-PLAYSTATION-5-SLIM-CIFROVAYA-P37', price: 67_000, variants: [] },
  ]
  const rows = buildVerifiedPreviewRows([
    { id: 193, matchStatus: 'missing_attributes', resolution: 'manual', price: 66_500, selectedSku: products[0].sku, selectedCandidateKey: 'disk', candidates: [{ key: 'disk', productId: 36, productName: products[0].name, matchType: 'product', sku: products[0].sku }] },
    { id: 194, matchStatus: 'missing_attributes', resolution: 'manual', price: 57_500, selectedSku: products[1].sku, selectedCandidateKey: 'digital', candidates: [{ key: 'digital', productId: 37, productName: products[1].name, matchType: 'product', sku: products[1].sku }] },
  ], products)
  assert.deepEqual(rows.map(({ sku, oldCashPrice, newCashPrice, matchType }) => ({ sku, oldCashPrice, newCashPrice, matchType })), [
    { sku: products[0].sku, oldCashPrice: 70_000, newCashPrice: 66_500, matchType: 'product' },
    { sku: products[1].sku, oldCashPrice: 67_000, newCashPrice: 57_500, matchType: 'product' },
  ])
})

test('verified preview keeps variant SKU and price separate from its product SKU', () => {
  const rows = buildVerifiedPreviewRows([{ id: 195, resolution: 'manual', price: 78_000, selectedSku: 'VAR-S26-ULTRA-BLACK', selectedCandidateKey: 'variant', candidates: [{ key: 'variant', productId: 8, productName: 'Samsung Galaxy S26 Ultra', matchType: 'variant', variantId: 'black', sku: 'VAR-S26-ULTRA-BLACK' }] }], [
    { id: 8, name: 'Samsung Galaxy S26 Ultra', sku: 'PRD-S26-ULTRA', price: 80_000, variants: [{ id: 'black', sku: 'VAR-S26-ULTRA-BLACK', price: 79_000 }] },
  ])
  assert.deepEqual(rows.map(({ sku, oldCashPrice, matchType, variantId }) => ({ sku, oldCashPrice, matchType, variantId })), [{ sku: 'VAR-S26-ULTRA-BLACK', oldCashPrice: 79_000, matchType: 'variant', variantId: 'black' }])
})

test('verified preview reports unavailable prices without mislabeling the SKU as invalid', () => {
  assert.throws(
    () => buildVerifiedPreviewRows([{ id: 196, resolution: 'manual', price: 1, selectedCandidateKey: 'product', candidates: [{ key: 'product', productId: 1, productName: 'Product', matchType: 'product', sku: 'PRD-1' }] }], [{ id: 1, name: 'Product', sku: 'PRD-1', price: Number.NaN, variants: [] }]),
    /Selected price is unavailable for import item 196/,
  )
})

test('missing attributes stay out of preview until a manager confirms the server candidate', () => {
  const candidate = { key: 's26-key', productId: 8, productName: 'Galaxy S26 Ultra', matchType: 'variant', variantId: 's26black', sku: 'VAR-S26-BLACK' }
  const item = { id: 8, resolution: 'pending', price: 78_000, selectedCandidateKey: null, candidates: [candidate] }
  const products = [{ id: 8, name: 'Galaxy S26 Ultra', price: 80_000, sku: 'PRD-S26-ULTRA', variants: [{ id: 's26black', sku: 'VAR-S26-BLACK', price: 79_000 }] }]
  assert.deepEqual(buildVerifiedPreviewRows([item], products), [])
  const verified = buildVerifiedPreviewRows([{ ...item, resolution: 'manual', selectedCandidateKey: candidate.key }], products)
  assert.deepEqual(verified.map(({ sku, newCashPrice }) => ({ sku, newCashPrice })), [{ sku: 'VAR-S26-BLACK', newCashPrice: 78_000 }])
})

test('verified preview rejects forged candidate keys and product/variant mismatches', () => {
  assert.throws(() => buildVerifiedPreviewRows([{ id: 1, resolution: 'manual', price: 1, selectedCandidateKey: 'forged', candidates: [] }], []), /selected candidate/i)
})
