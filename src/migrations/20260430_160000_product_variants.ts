import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Add size column to products
  await db.execute(sql`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size" varchar;
  `)

  // 2. Create enum for variant status
  await db.execute(sql`
    CREATE TYPE "public"."enum_products_variants_status" AS ENUM('in_stock', 'preorder', 'out_of_stock');
  `)

  // 3. Create products_variants table for the array field
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products_variants" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "color" varchar,
      "memory" varchar,
      "sim_type" varchar,
      "size" varchar,
      "price" numeric NOT NULL,
      "old_price" numeric,
      "status" "enum_products_variants_status" DEFAULT 'in_stock',
      "is_available" boolean DEFAULT true
    );
  `)

  // 4. Indexes for variants
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_order_idx" ON "products_variants" USING btree ("_order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_parent_id_idx" ON "products_variants" USING btree ("_parent_id");
  `)

  // 5. Foreign key
  await db.execute(sql`
    ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  `)

  // 6. Create rels table for variant images (upload hasMany inside array)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products_variants_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" varchar NOT NULL,
      "path" varchar NOT NULL,
      "media_id" integer
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_rels_order_idx" ON "products_variants_rels" USING btree ("order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_rels_parent_idx" ON "products_variants_rels" USING btree ("parent_id");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_rels_path_idx" ON "products_variants_rels" USING btree ("path");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_variants_rels_media_id_idx" ON "products_variants_rels" USING btree ("media_id");
  `)
  await db.execute(sql`
    ALTER TABLE "products_variants_rels" ADD CONSTRAINT "products_variants_rels_media_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "products_variants_rels" CASCADE;
  `)
  await db.execute(sql`
    DROP TABLE IF EXISTS "products_variants" CASCADE;
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_products_variants_status";
  `)
  await db.execute(sql`
    ALTER TABLE "products" DROP COLUMN IF EXISTS "size";
  `)
}
