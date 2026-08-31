import fs from 'node:fs/promises'
import path from 'node:path'

type AnyDoc = Record<string, any>
const relationId = (v: unknown): number | null => typeof v === 'object' && v && 'id' in v ? Number((v as AnyDoc).id) : (typeof v === 'number' ? v : (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null))
const text = (v: unknown): string => typeof v === 'object' && v ? String((v as AnyDoc).key ?? (v as AnyDoc).label ?? '') : String(v ?? '')
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function main() {
  const [{ default: config }, { getPayload }] = await Promise.all([import(new URL('../src/payload.config.ts', import.meta.url).href), import('payload')])
  const payload = await getPayload({ config })
  const [products, ram, size, screen, connectivity] = await Promise.all([
    payload.find({ collection: 'products', limit: 10000, pagination: false, depth: 2 }),
    payload.find({ collection: 'ram-options', where: { archived: { not_equals: true } }, limit: 1000, pagination: false }),
    payload.find({ collection: 'variant-size-options', where: { archived: { not_equals: true } }, limit: 1000, pagination: false }),
    payload.find({ collection: 'screen-size-options', where: { archived: { not_equals: true } }, limit: 1000, pagination: false }),
    payload.find({ collection: 'connectivity-options', where: { archived: { not_equals: true } }, limit: 1000, pagination: false }),
  ])
  const index = (docs: AnyDoc[]) => new Map(docs.map((d) => [String(d.key).trim().toUpperCase(), d]))
  const indexes = { ram: index(ram.docs as AnyDoc[]), size: index(size.docs as AnyDoc[]), screenSize: index(screen.docs as AnyDoc[]), connectivity: index(connectivity.docs as AnyDoc[]) }
  const rows: AnyDoc[] = []
  for (const product of products.docs as AnyDoc[]) for (const variant of (Array.isArray(product.variants) ? product.variants : [])) {
    const fields = { ram: text(variant.ram).trim(), size: text(variant.size).trim(), screenSize: text(variant.screenSize).trim(), connectivity: text(variant.connectivity).trim(), storage: text(variant.storage).trim() }
    const proposed = {
      ramOption: fields.ram ? indexes.ram.get(fields.ram.toUpperCase())?.id ?? null : null,
      sizeOption: fields.size ? indexes.size.get(fields.size.toUpperCase())?.id ?? null : null,
      screenSizeOption: fields.screenSize ? indexes.screenSize.get(fields.screenSize.toUpperCase())?.id ?? null : null,
      connectivityOption: fields.connectivity ? indexes.connectivity.get(fields.connectivity.toUpperCase())?.id ?? null : null,
    }
    const unknown = Object.entries(fields).filter(([key, value]) => key !== 'storage' && value && !(indexes as AnyDoc)[key]?.has(value.toUpperCase()))
    const status = unknown.length ? 'manual_review' : Object.values(proposed).some(Boolean) ? 'ready_to_migrate' : 'no_change'
    rows.push({ productId: product.id, product: product.name, productSku: product.sku ?? null, variantId: variant.id, variantSku: variant.sku ?? null, old: fields, proposed, status, reason: unknown.length ? `Unknown characteristic values: ${unknown.map(([k, v]) => `${k}=${v}`).join(', ')}` : status === 'no_change' ? 'No non-empty characteristic values to migrate' : 'All values map to active options', duplicateRisk: 'none_assessed_without_virtual_write' })
  }
  const report = { generatedAt: new Date().toISOString(), readOnly: true, source: 'payload products query', options: { ram: ram.docs, size: size.docs, screenSize: screen.docs, connectivity: connectivity.docs }, variants: rows, summary: { total: rows.length, readyToMigrate: rows.filter((r) => r.status === 'ready_to_migrate').length, noChange: rows.filter((r) => r.status === 'no_change').length, manualReview: rows.filter((r) => r.status === 'manual_review').length, unresolved: rows.filter((r) => r.status === 'unresolved').length, writesPerformed: 0, protectedFields: ['price', 'sku', 'color', 'sim', 'name', 'slug', 'images'] } }
  const output = path.resolve(process.cwd(), 'backups', `catalog-characteristics-migration-plan-${stamp()}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report.summary, null, 2)); console.log(`Characteristics migration plan: ${output}`)
  await payload.destroy()
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
