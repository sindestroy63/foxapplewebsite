import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "catalog_navigation" ADD COLUMN IF NOT EXISTS "cover_image_id" integer`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "catalog_navigation_cover_image_idx" ON "catalog_navigation" ("cover_image_id")`)
  await db.execute(sql`ALTER TABLE "catalog_navigation" DROP CONSTRAINT IF EXISTS "catalog_navigation_cover_image_fk"`)
  await db.execute(sql`ALTER TABLE "catalog_navigation" ADD CONSTRAINT "catalog_navigation_cover_image_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE no action`)
  await db.execute(sql`UPDATE "catalog_navigation" n SET "cover_image_id" = r."media_id" FROM "catalog_navigation_rels" r WHERE r."parent_id" = n.id AND r."path" = 'coverImage' AND n."cover_image_id" IS NULL`)
  await db.execute(sql`DELETE FROM "catalog_navigation_rels" WHERE "path" = 'coverImage'`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" DROP CONSTRAINT IF EXISTS "catalog_navigation_rels_media_fk"`)
  await db.execute(sql`DROP INDEX IF EXISTS "catalog_navigation_rels_media_id_idx"`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" DROP COLUMN IF EXISTS "media_id"`)
  await db.execute(sql`ALTER TYPE "public"."enum_products_product_group" ADD VALUE IF NOT EXISTS 'trade-in'`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "catalog_navigation" DROP CONSTRAINT IF EXISTS "catalog_navigation_cover_image_fk"`)
  await db.execute(sql`DROP INDEX IF EXISTS "catalog_navigation_cover_image_idx"`)
  await db.execute(sql`ALTER TABLE "catalog_navigation" DROP COLUMN IF EXISTS "cover_image_id"`)
}
