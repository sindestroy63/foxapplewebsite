import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

const columns = [
  'ram_options_id',
  'screen_size_options_id',
  'connectivity_options_id',
  'variant_size_options_id',
  'catalog_navigation_id',
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "ram_options_id" integer,
      ADD COLUMN IF NOT EXISTS "screen_size_options_id" integer,
      ADD COLUMN IF NOT EXISTS "connectivity_options_id" integer,
      ADD COLUMN IF NOT EXISTS "variant_size_options_id" integer,
      ADD COLUMN IF NOT EXISTS "catalog_navigation_id" integer;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ram_options_id_idx" ON "payload_locked_documents_rels" USING btree ("ram_options_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_screen_size_options_id_idx" ON "payload_locked_documents_rels" USING btree ("screen_size_options_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_connectivity_options_id_idx" ON "payload_locked_documents_rels" USING btree ("connectivity_options_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_variant_size_options_id_idx" ON "payload_locked_documents_rels" USING btree ("variant_size_options_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_catalog_navigation_id_idx" ON "payload_locked_documents_rels" USING btree ("catalog_navigation_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_ram_options_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_screen_size_options_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_connectivity_options_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_variant_size_options_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_catalog_navigation_id_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "ram_options_id",
      DROP COLUMN IF EXISTS "screen_size_options_id",
      DROP COLUMN IF EXISTS "connectivity_options_id",
      DROP COLUMN IF EXISTS "variant_size_options_id",
      DROP COLUMN IF EXISTS "catalog_navigation_id";
  `)
}
