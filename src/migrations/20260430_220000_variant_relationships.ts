import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "color_id" integer,
      ADD COLUMN IF NOT EXISTS "storage_id" integer,
      ADD COLUMN IF NOT EXISTS "sim_id" integer;

    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "color_value",
      DROP COLUMN IF EXISTS "color_english_label",
      DROP COLUMN IF EXISTS "color_russian_label",
      DROP COLUMN IF EXISTS "color_primary_hex",
      DROP COLUMN IF EXISTS "color_secondary_hex",
      DROP COLUMN IF EXISTS "memory",
      DROP COLUMN IF EXISTS "sim_type",
      DROP COLUMN IF EXISTS "size";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "color_value" varchar,
      ADD COLUMN IF NOT EXISTS "color_english_label" varchar,
      ADD COLUMN IF NOT EXISTS "color_russian_label" varchar,
      ADD COLUMN IF NOT EXISTS "color_primary_hex" varchar,
      ADD COLUMN IF NOT EXISTS "color_secondary_hex" varchar,
      ADD COLUMN IF NOT EXISTS "memory" varchar,
      ADD COLUMN IF NOT EXISTS "sim_type" varchar,
      ADD COLUMN IF NOT EXISTS "size" varchar;

    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "color_id",
      DROP COLUMN IF EXISTS "storage_id",
      DROP COLUMN IF EXISTS "sim_id";
  `)
}
