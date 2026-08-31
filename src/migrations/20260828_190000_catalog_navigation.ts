import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "catalog_navigation" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "kind" varchar NOT NULL,
      "product_group" varchar,
      "brand" varchar,
      "product_line" varchar,
      "href" varchar,
      "sort_order" numeric DEFAULT 100 NOT NULL,
      "is_visible" boolean DEFAULT true NOT NULL,
      "is_new" boolean DEFAULT false NOT NULL,
      "badge_text" varchar,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "catalog_navigation_sort_order_idx" ON "catalog_navigation" ("sort_order");
    CREATE INDEX IF NOT EXISTS "catalog_navigation_visible_idx" ON "catalog_navigation" ("is_visible");
    CREATE TABLE IF NOT EXISTS "catalog_navigation_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "catalog_navigation_id" integer,
      "products_id" integer,
      "path" varchar NOT NULL,
      "order" integer
    );
    CREATE INDEX IF NOT EXISTS "catalog_navigation_rels_parent_idx" ON "catalog_navigation_rels" ("parent_id");
    CREATE INDEX IF NOT EXISTS "catalog_navigation_rels_target_idx" ON "catalog_navigation_rels" ("catalog_navigation_id");
    CREATE INDEX IF NOT EXISTS "catalog_navigation_rels_product_idx" ON "catalog_navigation_rels" ("products_id");
    DO $$ BEGIN
      ALTER TABLE "catalog_navigation_rels" ADD CONSTRAINT "catalog_navigation_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "catalog_navigation"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "catalog_navigation_rels" ADD CONSTRAINT "catalog_navigation_rels_target_fk" FOREIGN KEY ("catalog_navigation_id") REFERENCES "catalog_navigation"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "catalog_navigation_rels" ADD CONSTRAINT "catalog_navigation_rels_product_fk" FOREIGN KEY ("products_id") REFERENCES "products"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "catalog_navigation_rels"; DROP TABLE IF EXISTS "catalog_navigation";`)
}
