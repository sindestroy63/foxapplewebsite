import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

import { assertAppliedNormalizationState, buildApplyPreviewReport, EXPECTED_APPLY_COUNTS } from '../payload/catalog-normalization/apply-preview.ts'
import { classifyVariantForNormalization, type NormalizationRow } from '../payload/catalog-normalization/classification.ts'

type MigrationDB = MigrateUpArgs['db']

type RawVariant = {
  product_id: number
  product_sku: string | null
  product_name: string
  product_slug: string
  category_id: number | null
  category_slug: string | null
  category_name: string | null
  variant_id: string
  variant_sku: string | null
  storage_id: number | null
  storage: string | null
  ram: string | null
  size: string | null
  has_touch_id: boolean | null
  color_id: number | null
  sim_id: number | null
  screen_size: string | null
  connectivity: string | null
  generation: string | null
  chip: string | null
  price: string | number
}

function rowsOf<T>(result: unknown): T[] {
  return (result as { rows?: T[] }).rows || []
}

async function loadRawVariants(db: MigrationDB): Promise<RawVariant[]> {
  const result = await db.execute(sql`
    SELECT
      product."id" AS "product_id",
      product."sku" AS "product_sku",
      product."name" AS "product_name",
      product."slug" AS "product_slug",
      category."id" AS "category_id",
      category."slug" AS "category_slug",
      category."name" AS "category_name",
      variant."id" AS "variant_id",
      variant."sku" AS "variant_sku",
      variant."storage_id" AS "storage_id",
      storage."value" AS "storage",
      variant."ram" AS "ram",
      variant."size" AS "size",
      variant."has_touch_id" AS "has_touch_id",
      variant."color_id" AS "color_id",
      variant."sim_id" AS "sim_id",
      variant."screen_size" AS "screen_size",
      variant."connectivity" AS "connectivity",
      variant."generation" AS "generation",
      variant."chip" AS "chip",
      variant."price" AS "price"
    FROM "products_variants" AS variant
    INNER JOIN "products" AS product ON product."id" = variant."_parent_id"
    LEFT JOIN "categories" AS category ON category."id" = product."category_id"
    LEFT JOIN "storage_options" AS storage ON storage."id" = variant."storage_id"
    ORDER BY product."id", variant."_order", variant."id"
    FOR UPDATE OF variant;
  `)
  return rowsOf<RawVariant>(result)
}

function classifyRawVariant(raw: RawVariant): NormalizationRow {
  return classifyVariantForNormalization({
    productId: raw.product_id,
    productSku: raw.product_sku,
    productName: raw.product_name,
    productSlug: raw.product_slug,
    category: { id: raw.category_id ?? undefined, slug: raw.category_slug, name: raw.category_name },
    variantId: raw.variant_id,
    variantSku: raw.variant_sku,
    storage: raw.storage,
    ram: raw.ram,
    size: raw.size,
    hasTouchId: raw.has_touch_id,
    color: raw.color_id == null ? null : String(raw.color_id),
    sim: raw.sim_id == null ? null : String(raw.sim_id),
    screenSize: raw.screen_size,
    connectivity: raw.connectivity,
    generation: raw.generation,
    chip: raw.chip,
    price: Number(raw.price),
    images: null,
  })
}

async function loadStorageIds(db: MigrationDB): Promise<Map<string, number>> {
  const result = await db.execute(sql`
    SELECT "id", "value"
    FROM "storage_options"
    WHERE "value" IN ('64GB', '128GB', '256GB', '512GB', '1TB', '2TB');
  `)
  const rows = rowsOf<{ id: number; value: string }>(result)
  return new Map(rows.map((row) => [row.value, row.id]))
}

function assertStorageId(storageIds: Map<string, number>, value: string | null): number {
  if (!value) throw new Error('Normalization proposed an empty storage where a storage option is required.')
  const id = storageIds.get(value)
  if (id == null) throw new Error(`Required storage option does not exist: ${value}`)
  return id
}

async function updateOne(db: MigrationDB, raw: RawVariant, row: NormalizationRow, storageIds: Map<string, number>): Promise<void> {
  let result: unknown
  if (row.status === 'auto_split') {
    const storageId = assertStorageId(storageIds, row.proposedStorage)
    result = await db.execute(sql`
      UPDATE "products_variants"
      SET "storage_id" = ${storageId}, "ram" = ${row.proposedRam}
      WHERE "id" = ${raw.variant_id}
        AND "storage_id" IS NOT DISTINCT FROM ${raw.storage_id}
        AND "ram" IS NOT DISTINCT FROM ${raw.ram}
        AND "sku" IS NOT DISTINCT FROM ${raw.variant_sku}
        AND "price" = ${raw.price}
      RETURNING "id";
    `)
  } else if (row.status === 'auto_size') {
    result = await db.execute(sql`
      UPDATE "products_variants"
      SET "storage_id" = NULL, "size" = ${row.proposedSize}
      WHERE "id" = ${raw.variant_id}
        AND "storage_id" IS NOT DISTINCT FROM ${raw.storage_id}
        AND "size" IS NOT DISTINCT FROM ${raw.size}
        AND "sku" IS NOT DISTINCT FROM ${raw.variant_sku}
        AND "price" = ${raw.price}
      RETURNING "id";
    `)
  } else if (row.status === 'auto_touch_id') {
    const storageId = assertStorageId(storageIds, row.proposedStorage)
    result = await db.execute(sql`
      UPDATE "products_variants"
      SET "storage_id" = ${storageId}, "has_touch_id" = TRUE
      WHERE "id" = ${raw.variant_id}
        AND "storage_id" IS NOT DISTINCT FROM ${raw.storage_id}
        AND "has_touch_id" IS NOT DISTINCT FROM ${raw.has_touch_id}
        AND "sku" IS NOT DISTINCT FROM ${raw.variant_sku}
        AND "price" = ${raw.price}
      RETURNING "id";
    `)
  } else {
    throw new Error(`Unexpected normalization status in migration plan: ${row.status}`)
  }
  if (rowsOf<{ id: string }>(result).length !== 1) {
    throw new Error(`Variant changed after preview or was not updated exactly once: ${raw.variant_id}`)
  }
}

function assertPostMigration(before: RawVariant[], after: RawVariant[], plan: NormalizationRow[]): void {
  const afterById = new Map(after.map((row) => [row.variant_id, row]))
  for (const planned of plan) {
    const original = before.find((row) => row.variant_id === planned.variantId)
    const current = afterById.get(String(planned.variantId))
    if (!original || !current) throw new Error(`Variant composition changed during migration: ${planned.variantId}`)
    if (current.variant_sku !== original.variant_sku || String(current.price) !== String(original.price)) {
      throw new Error(`SKU or price changed during normalization: ${planned.variantId}`)
    }
    if (
      current.color_id !== original.color_id || current.sim_id !== original.sim_id ||
      current.screen_size !== original.screen_size || current.connectivity !== original.connectivity ||
      current.generation !== original.generation || current.chip !== original.chip
    ) {
      throw new Error(`A forbidden variant attribute changed during normalization: ${planned.variantId}`)
    }
    if (
      current.storage !== planned.proposedStorage || current.ram !== planned.proposedRam ||
      current.size !== planned.proposedSize || current.has_touch_id !== planned.proposedHasTouchId
    ) {
      throw new Error(`Post-migration values do not match the approved preview: ${planned.variantId}`)
    }
  }

  assertAppliedNormalizationState(after.map(classifyRawVariant))
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const before = await loadRawVariants(db)
  const rows = before.map(classifyRawVariant)
  const preview = buildApplyPreviewReport(rows, EXPECTED_APPLY_COUNTS)
  const rawById = new Map(before.map((row) => [row.variant_id, row]))
  const classifiedById = new Map(rows.map((row) => [String(row.variantId), row]))
  const storageIds = await loadStorageIds(db)

  for (const change of preview.changes) {
    const id = String(change.variant.id)
    const raw = rawById.get(id)
    const row = classifiedById.get(id)
    if (!raw || !row) throw new Error(`Approved preview variant is missing: ${id}`)
    await updateOne(db, raw, row, storageIds)
  }

  const after = await loadRawVariants(db)
  if (after.length !== before.length) throw new Error('Variant composition changed during normalization.')
  assertPostMigration(before, after, preview.changes.map((change) => classifiedById.get(String(change.variant.id))!))
  payload.logger.info(`Normalized variants: auto_split=${preview.counts.auto_split}, auto_size=${preview.counts.auto_size}, auto_touch_id=${preview.counts.auto_touch_id}, total=${preview.counts.total}`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Variant attribute normalization is intentionally irreversible. Restore a database backup instead.')
}
