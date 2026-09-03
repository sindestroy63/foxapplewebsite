import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "brand_catalog_navigation" (
      "id" serial PRIMARY KEY,
      "created_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone
    );
    CREATE TABLE IF NOT EXISTS "brand_catalog_navigation_groups" (
      "id" serial PRIMARY KEY,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "brand_catalog_navigation"("id") ON DELETE CASCADE,
      "title" varchar NOT NULL, "key" varchar NOT NULL, "href" varchar, "filter" jsonb,
      "sort_order" numeric DEFAULT 100, "is_visible" boolean DEFAULT true, "cover_image_id" integer REFERENCES "media"("id") ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS "brand_catalog_navigation_groups_children" (
      "id" serial PRIMARY KEY,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "brand_catalog_navigation_groups"("id") ON DELETE CASCADE,
      "title" varchar NOT NULL, "key" varchar NOT NULL, "href" varchar, "filter" jsonb,
      "sort_order" numeric DEFAULT 100, "is_visible" boolean DEFAULT true, "cover_image_id" integer REFERENCES "media"("id") ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_groups_parent_idx" ON "brand_catalog_navigation_groups" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "brand_catalog_navigation_groups_children_parent_idx" ON "brand_catalog_navigation_groups_children" ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "brand_catalog_navigation_groups_children";
    DROP TABLE IF EXISTS "brand_catalog_navigation_groups";
    DROP TABLE IF EXISTS "brand_catalog_navigation";
  `)
}
