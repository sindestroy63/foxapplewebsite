import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "catalog_navigation" ADD COLUMN IF NOT EXISTS "stable_key" varchar;
    ALTER TABLE "catalog_navigation" ADD COLUMN IF NOT EXISTS "generated_by" varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS "catalog_navigation_stable_key_idx" ON "catalog_navigation" ("stable_key");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "catalog_navigation_stable_key_idx";
    ALTER TABLE "catalog_navigation" DROP COLUMN IF EXISTS "generated_by";
    ALTER TABLE "catalog_navigation" DROP COLUMN IF EXISTS "stable_key";
  `)
}
