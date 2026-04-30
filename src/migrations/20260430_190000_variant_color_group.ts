import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add new structured color columns (color_secondary_hex already exists from previous migration)
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "color_value" varchar,
      ADD COLUMN IF NOT EXISTS "color_english_label" varchar,
      ADD COLUMN IF NOT EXISTS "color_russian_label" varchar,
      ADD COLUMN IF NOT EXISTS "color_primary_hex" varchar;
  `)

  // Migrate existing flat color data into new structure
  await db.execute(sql`
    UPDATE "products_variants"
    SET
      color_english_label = color,
      color_russian_label = color,
      color_primary_hex = color_hex,
      color_secondary_hex = color_secondary_hex
    WHERE color IS NOT NULL AND color != '';
  `)

  // Drop old flat columns (keep color_secondary_hex — reused by group schema)
  await db.execute(sql`
    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "color",
      DROP COLUMN IF EXISTS "color_hex";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Recreate old columns
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "color" varchar,
      ADD COLUMN IF NOT EXISTS "color_hex" varchar;
  `)

  // Migrate back
  await db.execute(sql`
    UPDATE "products_variants"
    SET
      color = color_english_label,
      color_hex = color_primary_hex
    WHERE color_english_label IS NOT NULL;
  `)

  // Drop new columns
  await db.execute(sql`
    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "color_value",
      DROP COLUMN IF EXISTS "color_english_label",
      DROP COLUMN IF EXISTS "color_russian_label",
      DROP COLUMN IF EXISTS "color_primary_hex";
  `)
}
