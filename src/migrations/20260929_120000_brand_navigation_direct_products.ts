import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brand_catalog_navigation_groups_children_products" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL REFERENCES "brand_catalog_navigation_groups_children"("id") ON DELETE CASCADE,
      "_path" varchar NOT NULL,
      "products_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      PRIMARY KEY ("_parent_id", "_path", "products_id")
    );
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_groups_children_products_parent_idx"
      ON "brand_catalog_navigation_groups_children_products" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_groups_children_products_product_idx"
      ON "brand_catalog_navigation_groups_children_products" ("products_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "brand_catalog_navigation_groups_children_products";
  `)
}