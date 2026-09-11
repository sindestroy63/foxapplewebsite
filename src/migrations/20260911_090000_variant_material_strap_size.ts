import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "material" varchar NULL,
      ADD COLUMN IF NOT EXISTS "strap_size" varchar NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "material",
      DROP COLUMN IF EXISTS "strap_size";
  `)
}
