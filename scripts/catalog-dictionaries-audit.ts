import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type AnyDoc = Record<string, any>

function relationId(value: unknown): string | null {
  if (value && typeof value === 'object' && 'id' in value) return String((value as AnyDoc).id)
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return null
}
function valueOf(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const obj = value as AnyDoc
    for (const key of ['value', 'label', 'englishLabel', 'russianLabel', 'name', 'slug']) if (obj[key]) return String(obj[key])
  }
  return value == null ? null : String(value)
}
function arr(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function usageKeys(value: unknown): string[] {
  const keys = new Set<string>()
  const id = relationId(value)
  const text = valueOf(value)
  if (id) keys.add(id)
  if (text) keys.add(text.trim().toLowerCase())
  return [...keys]
}
function classifyStorage(raw: string): { group: string; meaning: string; action: string; targetField?: string } {
  const value = raw.trim()
  if (/^(64|128|256|512)\s*GB$|^(1|2)\s*TB$/iu.test(value)) return { group: 'correct_storage', meaning: 'Настоящий накопитель', action: 'keep' }
  if (/^\d+\s*\|\s*\d+\s*(GB|TB|ГБ|ТБ)?$/iu.test(value)) return { group: 'ram_storage', meaning: 'RAM + накопитель', action: 'move_to_other_field', targetField: 'ram + storage' }
  if (/^\d+\s*mm$/iu.test(value)) return { group: 'watch_size', meaning: 'Размер часов', action: 'move_to_other_field', targetField: 'variants.size' }
  if (/дюйм|inch|\*/iu.test(value)) return { group: 'screen_size', meaning: 'Диагональ', action: 'move_to_other_field', targetField: 'variants.screenSize' }
  if (/LTE|Wi-?Fi|cellular/iu.test(value)) return { group: 'connectivity', meaning: 'Подключение', action: 'move_to_other_field', targetField: 'variants.connectivity' }
  if (/touch\s*id/iu.test(value)) return { group: 'touch_id', meaning: 'Touch ID', action: 'move_to_other_field', targetField: 'variants.hasTouchId' }
  if (/^HS\d+|^SV\d+|Coanda/iu.test(value)) return { group: 'dyson_model', meaning: 'Модель Dyson', action: 'move_to_other_field', targetField: 'variants.generation' }
  if (/память/iu.test(value)) return { group: 'technical_mess', meaning: 'Технический мусор', action: 'safe_to_archive' }
  return { group: 'unknown', meaning: 'Неизвестное значение', action: 'manual_review' }
}
function productPath(product: AnyDoc): string { return `${valueOf(product.productGroup) || ''} / ${valueOf(product.brand) || ''} / ${valueOf(product.productType) || ''} / ${product.name || ''}`.replace(/(^ \/ | \/ $)/g, '') }

async function main() {
  const [{ default: config }, { getPayload }] = await Promise.all([
    import(new URL('../src/payload.config.ts', import.meta.url).href),
    import('payload'),
  ])
  const payload = await getPayload({ config })
  const [storageResult, colorsResult, simResult, modelsResult, categoriesResult, productsResult] = await Promise.all([
    payload.find({ collection: 'storage-options', limit: 10000, pagination: false, depth: 0 }),
    payload.find({ collection: 'colors', limit: 10000, pagination: false, depth: 0 }),
    payload.find({ collection: 'sim-options', limit: 10000, pagination: false, depth: 0 }),
    payload.find({ collection: 'device-models', limit: 10000, pagination: false, depth: 2 }),
    payload.find({ collection: 'categories', limit: 10000, pagination: false, depth: 0 }),
    payload.find({ collection: 'products', limit: 10000, pagination: false, depth: 2 }),
  ])
  const storages = storageResult.docs as AnyDoc[]
  const colors = colorsResult.docs as AnyDoc[]
  const sims = simResult.docs as AnyDoc[]
  const models = modelsResult.docs as AnyDoc[]
  const categories = categoriesResult.docs as AnyDoc[]
  const products = productsResult.docs as AnyDoc[]
  const variants = products.flatMap((product) => (arr(product.variants) as AnyDoc[]).map((variant) => ({ product, variant })))
  const storageUsage = new Map<string, any[]>()
  const colorUsage = new Map<string, any[]>()
  const simUsage = new Map<string, any[]>()
  for (const { product, variant } of variants) {
    const base = { productId: product.id, productName: product.name, productSku: product.sku || null, variantId: variant.id, variantSku: variant.sku || null }
    for (const [map, value] of [[storageUsage, variant.storage], [colorUsage, variant.color], [simUsage, variant.sim]] as const) {
      for (const key of usageKeys(value)) map.set(key, [...(map.get(key) || []), base])
    }
  }
  const linksFor = (map: Map<string, any[]>, entry: AnyDoc) => {
    const rows = usageKeys(entry).flatMap((key) => map.get(key) || [])
    return [...new Map(rows.map((row) => [`${row.productId}:${row.variantId}`, row])).values()]
  }
  const storageRows = storages.map((entry) => { const value = String(entry.value || ''); const links = linksFor(storageUsage, entry); const classification = classifyStorage(value); return { id: entry.id, key: value, value, usageCount: links.length, links, ...classification, usedByVariantGenerator: models.some((m) => arr(m.availableStorage).some((x) => usageKeys(x).some((key) => usageKeys(entry).includes(key)))), usedByAIMatching: true, usedOnFrontend: true, usedInSeedOrMigrations: true, canDeleteAfterUnlink: classification.action === 'safe_to_archive' } })
  const colorRows = colors.map((entry) => { const links = linksFor(colorUsage, entry); return { id: entry.id, key: entry.value, englishLabel: entry.englishLabel, russianLabel: entry.russianLabel, usageCount: links.length, links, usedOnFrontend: true, usedByVariantGenerator: true, usedByAIMatching: true, action: links.length ? 'keep' : 'safe_to_archive' } })
  const simRows = sims.map((entry) => { const links = linksFor(simUsage, entry); return { id: entry.id, key: entry.value, label: entry.label, usageCount: links.length, links, usedOnFrontend: true, usedByVariantGenerator: true, usedByAIMatching: true, action: links.length ? 'keep' : 'safe_to_archive' } })
  const variantRows = variants.map(({ product, variant }) => {
    const storage = valueOf(variant.storage); const category = valueOf(product.category)
    const violations: string[] = []
    if (storage && /\||\d+\s*mm|дюйм|LTE|touch\s*id|\b(?:HS|SV)\d+/iu.test(storage)) violations.push('storage содержит не только накопитель')
    if (!variant.ram && storage && /^\d+\s*\|/u.test(storage)) violations.push('ram пустой при смешанном storage')
    if (/watch|часы/iu.test(`${product.name} ${product.productType}`) && !variant.size) violations.push('у часов не заполнен size')
    const colorText = String(valueOf(variant.color) || '')
    if (colorText && (colorText.includes('|') || /DualSense|Disc Drive|зарядн|Экшн-камера|MAJOR\s*5/i.test(colorText))) violations.push('color содержит комплектацию или модель')
    return { product: product.name, productSku: product.sku || null, variantSku: variant.sku || null, storage, ram: variant.ram || null, color: valueOf(variant.color), sim: valueOf(variant.sim), size: variant.size || null, screenSize: variant.screenSize || null, connectivity: variant.connectivity || null, generation: variant.generation || null, hasTouchId: variant.hasTouchId === true, category: valueOf(product.category), productGroup: product.productGroup || null, brand: product.brand || null, productType: product.productType || null, productLine: product.productLine || null, displayPath: productPath(product), violations }
  })
  const colorMeaning = new Map<string, any[]>()
  for (const entry of colors) colorMeaning.set(String(entry.englishLabel || '').toLowerCase(), [...(colorMeaning.get(String(entry.englishLabel || '').toLowerCase()) || []), entry])
  const duplicateColors = [...colorMeaning.entries()].filter(([, entries]) => entries.length > 1).map(([key, entries]) => ({ key, entries: entries.map((e) => ({ id: e.id, value: e.value, englishLabel: e.englishLabel, russianLabel: e.russianLabel })) }))
  const productRows = products.map((product) => ({ id: product.id, name: product.name, model: product.model || null, sku: product.sku || null, category: valueOf(product.category), productGroup: product.productGroup || null, brand: product.brand || null, productType: product.productType || null, productLine: product.productLine || null, variantCount: arr(product.variants).length, action: product.productGroup && product.brand ? 'keep' : 'manual_review' }))
  const report = { generatedAt: new Date().toISOString(), readOnly: true, dictionaries: { storageOptions: storageRows, colors: colorRows, simOptions: simRows, deviceModels: models.map((m) => ({ id: m.id, name: m.name, category: valueOf(m.category), availableColors: arr(m.availableColors).map(valueOf), availableStorage: arr(m.availableStorage).map(valueOf), availableSim: arr(m.availableSim).map(valueOf), ram: m.ram || null, screenSize: m.screenSize || null, connectivity: m.connectivity || null, generation: m.generation || null, storageIsSize: m.storageIsSize === true, usedByVariantGenerator: true, action: 'manual_review' })), categories: categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name, productCount: products.filter((p) => relationId(p.category) === String(c.id)).length })) }, products: productRows, variants: variantRows, violations: variantRows.filter((row) => row.violations.length), duplicates: { colors: duplicateColors }, importUsage: { aiParser: true, matching: true, displayFormatter: true, verifiedPreview: true, priceImportItems: true, priceImportSessions: true }, summary: { totalStorageOptions: storageRows.length, usedStorageOptions: storageRows.filter((r) => r.usageCount > 0).length, unusedStorageOptions: storageRows.filter((r) => r.usageCount === 0).length, correctStorage: storageRows.filter((r) => r.group === 'correct_storage').length, mixedRamStorage: storageRows.filter((r) => r.group === 'ram_storage').length, watchSizes: storageRows.filter((r) => r.group === 'watch_size').length, technicalMess: storageRows.filter((r) => ['technical_mess', 'unknown'].includes(r.group)).length, duplicateColors: duplicateColors.length, unusedColors: colorRows.filter((r) => r.usageCount === 0).length, simErrors: sims.filter((s) => !/^(SIM|ESIM|SIM_ESIM|DUAL_SIM)$/iu.test(String(s.value))).length, productsWrongGroup: productRows.filter((r) => r.action === 'manual_review').length, variantsWithViolations: variantRows.filter((r) => r.violations.length).length, potentiallyArchivableStorage: storageRows.filter((r) => r.canDeleteAfterUnlink).map((r) => r.key) }, manualDecisions: storageRows.filter((r) => ['manual_review', 'move_to_other_field'].includes(r.action)).map((r) => ({ type: 'storageOption', key: r.key, action: r.action, targetField: r.targetField })) }
  const stamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
  const output = path.resolve(process.cwd(), 'backups', `catalog-dictionaries-audit-${stamp}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report.summary, null, 2)); console.log(`Audit report: ${output}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1 })
