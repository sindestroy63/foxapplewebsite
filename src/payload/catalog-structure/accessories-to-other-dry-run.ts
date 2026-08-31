import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

export type AccessoriesToOtherRow = {
  id: number | string
  sku: string | null
  name: string
  slug: string | null
  currentProductGroup: string | null
  proposedProductGroup: 'other'
  price: number | null
  variants: Array<{ id: string | null; sku: string | null; price: number | null }>
  imageCount: number
  result: 'ready_for_transactional_migration'
}

export type AccessoriesToOtherReport = {
  generatedAt: string
  accessoriesCount: number
  alreadyOtherCount: number
  duplicateSkusInOther: string[]
  rows: AccessoriesToOtherRow[]
}

export async function createAccessoriesToOtherReport(payload: Pick<Payload, 'find'>): Promise<AccessoriesToOtherReport> {
  const result = await payload.find({ collection: 'products', depth: 0, limit: 10_000, pagination: false })
  const products = result.docs as Record<string, any>[]
  const accessories = products.filter((product) => product.productGroup === 'accessories')
  const otherSkus = new Set(products.filter((product) => product.productGroup === 'other').map((product) => String(product.sku || '')).filter(Boolean))
  const rows = accessories.map((product) => ({
    id: product.id,
    sku: typeof product.sku === 'string' ? product.sku : null,
    name: String(product.name || ''),
    slug: typeof product.slug === 'string' ? product.slug : null,
    currentProductGroup: typeof product.productGroup === 'string' ? product.productGroup : null,
    proposedProductGroup: 'other' as const,
    price: typeof product.price === 'number' ? product.price : null,
    variants: Array.isArray(product.variants) ? product.variants.map((variant: Record<string, any>) => ({ id: variant.id == null ? null : String(variant.id), sku: typeof variant.sku === 'string' ? variant.sku : null, price: typeof variant.price === 'number' ? variant.price : null })) : [],
    imageCount: Array.isArray(product.images) ? product.images.length : 0,
    result: 'ready_for_transactional_migration' as const,
  }))
  return {
    generatedAt: new Date().toISOString(),
    accessoriesCount: rows.length,
    alreadyOtherCount: products.filter((product) => product.productGroup === 'other').length,
    duplicateSkusInOther: rows.map((row) => row.sku).filter((sku): sku is string => Boolean(sku && otherSkus.has(sku))),
    rows,
  }
}

function filename(date: Date): string { return `accessories-to-other-dry-run-${date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')}.json` }

async function main(): Promise<void> {
  const [{ default: config }, { getPayload }] = await Promise.all([import(new URL('../../payload.config.ts', import.meta.url).href), import('payload')])
  const payload = await getPayload({ config })
  const report = await createAccessoriesToOtherReport(payload)
  const output = path.resolve(process.cwd(), 'backups', filename(new Date()))
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Accessories proposed for other: ${report.accessoriesCount}`)
  console.log(`Already in other: ${report.alreadyOtherCount}`)
  console.log(`Duplicate SKUs in other: ${report.duplicateSkusInOther.length}`)
  console.log(`Detailed report: ${output}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
