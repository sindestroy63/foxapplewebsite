import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_products_product_group" AS ENUM('smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'accessories', 'other');
    ALTER TABLE "products"
      ADD COLUMN "product_group" "enum_products_product_group",
      ADD COLUMN "brand" varchar,
      ADD COLUMN "product_type" varchar,
      ADD COLUMN "product_line" varchar;
    ALTER TYPE "public"."enum_price_import_items_match_status" ADD VALUE IF NOT EXISTS 'excluded_used';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products" DROP COLUMN IF EXISTS "product_group", DROP COLUMN IF EXISTS "brand", DROP COLUMN IF EXISTS "product_type", DROP COLUMN IF EXISTS "product_line";
    DROP TYPE IF EXISTS "public"."enum_products_product_group";
  `)
}
