import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "brand_catalog_navigation_groups"
      ADD COLUMN IF NOT EXISTS "is_new" boolean DEFAULT false;
    ALTER TABLE "brand_catalog_navigation_groups_children"
      ADD COLUMN IF NOT EXISTS "is_new" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "brand_catalog_navigation_groups"
      DROP COLUMN IF EXISTS "is_new";
    ALTER TABLE "brand_catalog_navigation_groups_children"
      DROP COLUMN IF EXISTS "is_new";
  `)
}
