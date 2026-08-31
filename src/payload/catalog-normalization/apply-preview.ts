import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

import {
  createNormalizationReport,
  type NormalizationRow,
  type NormalizationStatus,
} from './dry-run.ts'

export const APPLY_STATUSES = ['auto_split', 'auto_size', 'auto_touch_id'] as const
export type ApplyStatus = (typeof APPLY_STATUSES)[number]

export const EXPECTED_APPLY_COUNTS: Record<ApplyStatus | 'total', number> = {
  auto_split: 88,
  auto_size: 35,
  auto_touch_id: 4,
  total: 127,
}

const FORBIDDEN_FIELDS = [
  'price', 'variantSku', 'color', 'sim', 'screenSize', 'connectivity', 'images',
  'productSlug', 'productName', 'productSku',
] as const

export type ApplyPreviewChange = {
  product: { id: number | string; sku: string | null; name: string; slug: string | null }
  variant: { id: string | null; sku: string | null }
  category: NormalizationRow['category']
  oldValues: { storage: string | null; ram: string | null; size: string | null; hasTouchId: boolean | null }
  newValues: { storage: string | null; ram: string | null; size: string | null; hasTouchId: boolean | null }
  rule: string
  status: ApplyStatus
}

export type PotentialDuplicate = {
  key: string
  variants: Array<{ productId: number | string; variantId: string | null; variantSku: string | null }>
}

export type ApplyPreviewReport = {
  generatedAt: string
  counts: Record<ApplyStatus | 'total', number>
  potentialDuplicates: PotentialDuplicate[]
  changes: ApplyPreviewChange[]
}

export type AppliedNormalizationCounts = {
  split: number
  size: number
  touchId: number
}

function comparable(value: unknown): string {
  return JSON.stringify(value ?? null)
}

export function assertNoForbiddenChanges(before: Record<string, unknown>, after: Record<string, unknown>): void {
  for (const field of FORBIDDEN_FIELDS) {
    if (comparable(before[field]) !== comparable(after[field])) {
      throw new Error(`Apply preview attempted to change forbidden field: ${field}`)
    }
  }
}

function variantIdentity(row: NormalizationRow): string {
  return `${row.productId}:${row.variantId ?? row.variantSku ?? ''}`
}

function futureVariantKey(row: NormalizationRow): string {
  const part = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('en-US')
  return [
    row.productId,
    row.color,
    row.proposedStorage,
    row.proposedRam,
    row.sim,
    row.screenSize,
    row.connectivity,
    row.proposedSize,
    row.generation,
    row.chip,
  ].map(part).join('|')
}

function expectedCounts(rows: NormalizationRow[]): Record<ApplyStatus | 'total', number> {
  const counts: Record<ApplyStatus | 'total', number> = { auto_split: 0, auto_size: 0, auto_touch_id: 0, total: 0 }
  for (const row of rows) {
    if (APPLY_STATUSES.includes(row.status as ApplyStatus)) {
      counts[row.status as ApplyStatus]++
      counts.total++
    }
  }
  return counts
}

function assertExpectedCounts(actual: Record<ApplyStatus | 'total', number>, expected: Record<ApplyStatus | 'total', number>): void {
  for (const field of [...APPLY_STATUSES, 'total'] as const) {
    if (actual[field] !== expected[field]) {
      throw new Error(`Unexpected ${field} count: expected ${expected[field]}, received ${actual[field]}.`)
    }
  }
}

function findPotentialDuplicates(rows: NormalizationRow[]): PotentialDuplicate[] {
  const groups = new Map<string, NormalizationRow[]>()
  for (const row of rows) {
    const key = futureVariantKey(row)
    groups.set(key, [...(groups.get(key) || []), row])
  }
  return [...groups.entries()]
    .filter(([, variants]) => variants.length > 1)
    .map(([key, variants]) => ({
      key,
      variants: variants.map((row) => ({ productId: row.productId, variantId: row.variantId ?? null, variantSku: row.variantSku ?? null })),
    }))
}

function toChange(row: NormalizationRow): ApplyPreviewChange {
  const before = { ...row }
  const after = {
    ...row,
    storage: row.proposedStorage,
    ram: row.proposedRam,
    size: row.proposedSize,
    hasTouchId: row.proposedHasTouchId,
  }
  assertNoForbiddenChanges(before, after)
  return {
    product: { id: row.productId, sku: row.productSku ?? null, name: row.productName, slug: row.productSlug ?? null },
    variant: { id: row.variantId ?? null, sku: row.variantSku ?? null },
    category: row.category,
    oldValues: { storage: row.storage ?? null, ram: row.ram ?? null, size: row.size ?? null, hasTouchId: row.hasTouchId ?? null },
    newValues: { storage: row.proposedStorage, ram: row.proposedRam, size: row.proposedSize, hasTouchId: row.proposedHasTouchId },
    rule: row.reason,
    status: row.status as ApplyStatus,
  }
}

export function buildApplyPreviewReport(
  rows: NormalizationRow[],
  expected: Record<ApplyStatus | 'total', number> = EXPECTED_APPLY_COUNTS,
): ApplyPreviewReport {
  const identities = new Set<string>()
  for (const row of rows.filter((item) => APPLY_STATUSES.includes(item.status as ApplyStatus))) {
    const identity = variantIdentity(row)
    if (identities.has(identity)) throw new Error(`Variant appears in multiple apply groups: ${identity}`)
    identities.add(identity)
  }

  const counts = expectedCounts(rows)
  assertExpectedCounts(counts, expected)
  const potentialDuplicates = findPotentialDuplicates(rows)
  if (potentialDuplicates.length) {
    throw new Error(`Potential duplicate variants detected: ${JSON.stringify(potentialDuplicates)}`)
  }

  return {
    generatedAt: new Date().toISOString(),
    counts,
    potentialDuplicates,
    changes: rows
      .filter((row): row is NormalizationRow & { status: ApplyStatus } => APPLY_STATUSES.includes(row.status as ApplyStatus))
      .map(toChange),
  }
}

export function assertAppliedNormalizationState(rows: NormalizationRow[]): AppliedNormalizationCounts {
  const ramValues = new Set(['4GB', '6GB', '8GB', '12GB', '16GB', '24GB'])
  const storageValues = new Set(['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'])
  const sizeValues = new Set(['40mm', '42mm', '44mm', '46mm', '47mm', '49mm'])
  const counts: AppliedNormalizationCounts = {
    split: rows.filter((row) => ramValues.has(row.ram || '') && storageValues.has(row.storage || '')).length,
    size: rows.filter((row) => ['apple-watch', 'samsung-watch'].includes(row.category.slug || '') && sizeValues.has(row.size || '') && row.storage == null).length,
    touchId: rows.filter((row) => row.storage === '512GB' && row.hasTouchId === true).length,
  }
  if (counts.split !== 88 || counts.size !== 35 || counts.touchId !== 4) {
    throw new Error(`Unexpected applied normalization counts: split=${counts.split}, size=${counts.size}, touchId=${counts.touchId}.`)
  }
  if (rows.some((row) => APPLY_STATUSES.includes(row.status as ApplyStatus) || row.status === 'manual_review')) {
    throw new Error('Pending or manual-review normalization values remain after migration.')
  }
  buildApplyPreviewReport(rows, { auto_split: 0, auto_size: 0, auto_touch_id: 0, total: 0 })
  return counts
}

export async function createApplyPreviewReport(
  payload: Payload,
  expected: Record<ApplyStatus | 'total', number> = EXPECTED_APPLY_COUNTS,
): Promise<ApplyPreviewReport> {
  const normalization = await createNormalizationReport(payload)
  return buildApplyPreviewReport(normalization.rows, expected)
}

function reportFilename(date: Date): string {
  const part = date.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
  return `catalog-normalization-apply-preview-${part}.json`
}

async function main(): Promise<void> {
  const [{ default: config }, { getPayload }] = await Promise.all([
    import(new URL('../../payload.config.ts', import.meta.url).href),
    import('payload'),
  ])
  const payload = await getPayload({ config })
  const normalization = await createNormalizationReport(payload)
  const pendingTotal = APPLY_STATUSES.reduce((sum, status) => sum + normalization.counts[status], 0)
  const report = pendingTotal === 0
    ? (assertAppliedNormalizationState(normalization.rows), buildApplyPreviewReport(normalization.rows, { auto_split: 0, auto_size: 0, auto_touch_id: 0, total: 0 }))
    : buildApplyPreviewReport(normalization.rows, EXPECTED_APPLY_COUNTS)
  const outputDir = path.resolve(process.cwd(), 'backups')
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, reportFilename(new Date()))
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(`auto_split: ${report.counts.auto_split}`)
  console.log(`auto_size: ${report.counts.auto_size}`)
  console.log(`auto_touch_id: ${report.counts.auto_touch_id}`)
  console.log(`total changes: ${report.counts.total}`)
  console.log(`potential duplicates: ${report.potentialDuplicates.length}`)
  console.log(`Detailed report: ${outputPath}`)
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  main().catch((error) => {
    console.error('Catalog normalization apply preview failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
}
