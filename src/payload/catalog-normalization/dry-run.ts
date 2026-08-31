import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'
import {
  classifyVariantForNormalization,
  type NormalizationRow,
  type NormalizationStatus,
} from './classification.ts'

export { classifyVariantForNormalization } from './classification.ts'
export type { NormalizationRow, NormalizationStatus, VariantForNormalization } from './classification.ts'

export type NormalizationReport = {
  generatedAt: string
  totalVariants: number
  counts: Record<NormalizationStatus, number>
  rows: NormalizationRow[]
}


function relation(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function relationKey(value: unknown): string | null {
  const expanded = relation(value)
  if (expanded?.id != null) return String(expanded.id)
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return null
}

export async function createNormalizationReport(payload: Payload): Promise<NormalizationReport> {
  const products = await payload.find({ collection: 'products', depth: 2, limit: 10_000, pagination: false })
  const rows: NormalizationRow[] = products.docs.flatMap((product: any): NormalizationRow[] => {
    const category = relation(product.category)
    return (product.variants || []).map((variant: Record<string, unknown>) => {
      const storage = relation(variant.storage)
      return classifyVariantForNormalization({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        productSlug: product.slug,
        category: { id: category?.id as number | string | undefined, slug: category?.slug as string | undefined, name: category?.name as string | undefined },
        variantId: variant.id as string | undefined,
        variantSku: variant.sku as string | undefined,
        storage: (storage?.value as string | null | undefined) ?? null,
        ram: (variant.ram as string | null | undefined) ?? null,
        size: (variant.size as string | null | undefined) ?? null,
        hasTouchId: typeof variant.hasTouchId === 'boolean' ? variant.hasTouchId : null,
        color: relationKey(variant.color),
        sim: relationKey(variant.sim),
        screenSize: (variant.screenSize as string | null | undefined) ?? null,
        connectivity: (variant.connectivity as string | null | undefined) ?? null,
        generation: (variant.generation as string | null | undefined) ?? null,
        chip: (variant.chip as string | null | undefined) ?? null,
        price: (variant.price as number | null | undefined) ?? null,
        images: variant.images ?? null,
      })
    })
  })
  const counts: Record<NormalizationStatus, number> = { auto_split: 0, auto_size: 0, auto_touch_id: 0, unchanged: 0, manual_review: 0, no_storage: 0 }
  for (const item of rows) counts[item.status]++
  return { generatedAt: new Date().toISOString(), totalVariants: rows.length, counts, rows }
}

function reportFilename(date: Date): string {
  const part = date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
  return `catalog-normalization-dry-run-${part}.json`
}

async function main(): Promise<void> {
  const [{ default: config }, { getPayload }] = await Promise.all([
    import(new URL('../../payload.config.ts', import.meta.url).href),
    import('payload'),
  ])
  const payload = await getPayload({ config })
  const report = await createNormalizationReport(payload)
  const outputDir = path.resolve(process.cwd(), 'backups')
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, reportFilename(new Date()))
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`Catalog normalization dry-run: ${report.totalVariants} variants`)
  for (const [status, count] of Object.entries(report.counts)) console.log(`${status}: ${count}`)
  console.log(`Detailed report: ${outputPath}`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main().catch((error) => {
    console.error('Catalog normalization dry-run failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
}
