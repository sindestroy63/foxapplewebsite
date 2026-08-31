import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "catalog_navigation" ADD COLUMN IF NOT EXISTS "parent_id" integer;
    ALTER TABLE "catalog_navigation" ADD COLUMN IF NOT EXISTS "product_id" integer;
    CREATE INDEX IF NOT EXISTS "catalog_navigation_parent_idx" ON "catalog_navigation" ("parent_id");
    CREATE INDEX IF NOT EXISTS "catalog_navigation_product_idx" ON "catalog_navigation" ("product_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "catalog_navigation_parent_idx";
    DROP INDEX IF EXISTS "catalog_navigation_product_idx";
    ALTER TABLE "catalog_navigation" DROP COLUMN IF EXISTS "parent_id";
    ALTER TABLE "catalog_navigation" DROP COLUMN IF EXISTS "product_id";
  `)
}
