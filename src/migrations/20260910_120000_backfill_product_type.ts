import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "products"
    SET "product_type" = CASE
      WHEN lower(coalesce("name", '') || ' ' || coalesce("model", '') || ' ' || coalesce("product_line", '')) LIKE '%airpods%' THEN 'airpods'
      WHEN lower(coalesce("name", '') || ' ' || coalesce("model", '') || ' ' || coalesce("product_line", '')) LIKE '%iphone%' THEN 'iphone'
      WHEN lower(coalesce("name", '') || ' ' || coalesce("model", '') || ' ' || coalesce("product_line", '')) LIKE '%ipad%' THEN 'ipad'
      WHEN lower(coalesce("name", '') || ' ' || coalesce("model", '') || ' ' || coalesce("product_line", '')) LIKE '%macbook%' THEN 'mac'
      WHEN lower(coalesce("name", '') || ' ' || coalesce("model", '') || ' ' || coalesce("product_line", '')) LIKE '%apple watch%' THEN 'apple-watch'
      WHEN lower(coalesce("brand", '')) = 'samsung' OR lower(coalesce("name", '')) LIKE '%samsung%' OR lower(coalesce("name", '')) LIKE '%galaxy%' THEN 'samsung'
      WHEN lower(coalesce("brand", '')) = 'apple' AND "product_group" = 'smartphones' THEN 'iphone'
      WHEN lower(coalesce("brand", '')) = 'apple' AND "product_group" = 'laptops' THEN 'mac'
      WHEN lower(coalesce("brand", '')) = 'apple' AND "product_group" = 'tablets' THEN 'ipad'
      WHEN lower(coalesce("brand", '')) = 'apple' AND "product_group" = 'smart-watches' THEN 'apple-watch'
      WHEN lower(coalesce("brand", '')) = 'apple' AND "product_group" = 'audio' THEN 'airpods'
      ELSE 'other'
    END
    WHERE "product_type" IS NULL OR btrim("product_type") = '';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Existing and backfilled text values cannot be distinguished safely.
}
