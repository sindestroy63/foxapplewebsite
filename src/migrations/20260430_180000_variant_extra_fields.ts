import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "color_hex" varchar,
      ADD COLUMN IF NOT EXISTS "color_secondary_hex" varchar,
      ADD COLUMN IF NOT EXISTS "chip" varchar,
      ADD COLUMN IF NOT EXISTS "ram" varchar,
      ADD COLUMN IF NOT EXISTS "screen_size" varchar,
      ADD COLUMN IF NOT EXISTS "connectivity" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "color_hex",
      DROP COLUMN IF EXISTS "color_secondary_hex",
      DROP COLUMN IF EXISTS "chip",
      DROP COLUMN IF EXISTS "ram",
      DROP COLUMN IF EXISTS "screen_size",
      DROP COLUMN IF EXISTS "connectivity";
  `)
}
