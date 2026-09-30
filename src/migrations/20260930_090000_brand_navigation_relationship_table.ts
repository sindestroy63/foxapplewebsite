import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brand_catalog_navigation_rels" (
      "id" serial PRIMARY KEY,
      "order" integer,
      "path" varchar NOT NULL,
      "parent_id" integer NOT NULL REFERENCES "brand_catalog_navigation"("id") ON DELETE CASCADE,
      "products_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_rels_parent_idx"
      ON "brand_catalog_navigation_rels" ("parent_id");
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_rels_products_idx"
      ON "brand_catalog_navigation_rels" ("products_id");

    INSERT INTO "brand_catalog_navigation_rels" ("order", "path", "parent_id", "products_id")
    SELECT "_order", "_path", "_parent_id"::integer, "products_id"
    FROM "brand_catalog_navigation_groups_children_products"
    ON CONFLICT DO NOTHING;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "brand_catalog_navigation_rels";
  `)
}