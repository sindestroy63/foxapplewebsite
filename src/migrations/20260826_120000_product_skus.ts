import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "sku" varchar;

    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "sku" varchar;

    UPDATE "products"
    SET "sku" = 'PRD-' || UPPER(REGEXP_REPLACE("slug", '[^a-zA-Z0-9]+', '-', 'g')) || '-P' || "id"
    WHERE "sku" IS NULL OR BTRIM("sku") = '';

    UPDATE "products_variants" AS variant
    SET "sku" = 'VAR-' ||
      UPPER(REGEXP_REPLACE(product."slug", '[^a-zA-Z0-9]+', '-', 'g')) ||
      '-V' || variant."id"
    FROM "products" AS product
    WHERE variant."_parent_id" = product."id"
      AND (variant."sku" IS NULL OR BTRIM(variant."sku") = '');

    CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_unique_idx"
      ON "products" (UPPER("sku"))
      WHERE "sku" IS NOT NULL AND BTRIM("sku") <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS "products_variants_sku_unique_idx"
      ON "products_variants" (UPPER("sku"))
      WHERE "sku" IS NOT NULL AND BTRIM("sku") <> '';

    CREATE OR REPLACE FUNCTION "enforce_catalog_sku_uniqueness"()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW."sku" IS NULL OR BTRIM(NEW."sku") = '' THEN
        RETURN NEW;
      END IF;

      -- Serialize writes for the same normalized SKU across both tables.
      PERFORM PG_ADVISORY_XACT_LOCK(HASHTEXTEXTENDED(UPPER(NEW."sku"), 0));

      IF TG_TABLE_NAME = 'products' THEN
        IF EXISTS (
          SELECT 1 FROM "products_variants"
          WHERE UPPER("sku") = UPPER(NEW."sku")
        ) THEN
          RAISE EXCEPTION 'SKU % is already used by a product variant', NEW."sku"
            USING ERRCODE = 'unique_violation';
        END IF;
      ELSE
        IF EXISTS (
          SELECT 1 FROM "products"
          WHERE UPPER("sku") = UPPER(NEW."sku")
        ) THEN
          RAISE EXCEPTION 'SKU % is already used by a product', NEW."sku"
            USING ERRCODE = 'unique_violation';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS "products_catalog_sku_unique" ON "products";
    CREATE TRIGGER "products_catalog_sku_unique"
      BEFORE INSERT OR UPDATE OF "sku" ON "products"
      FOR EACH ROW EXECUTE FUNCTION "enforce_catalog_sku_uniqueness"();

    DROP TRIGGER IF EXISTS "products_variants_catalog_sku_unique" ON "products_variants";
    CREATE TRIGGER "products_variants_catalog_sku_unique"
      BEFORE INSERT OR UPDATE OF "sku" ON "products_variants"
      FOR EACH ROW EXECUTE FUNCTION "enforce_catalog_sku_uniqueness"();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TRIGGER IF EXISTS "products_catalog_sku_unique" ON "products";
    DROP TRIGGER IF EXISTS "products_variants_catalog_sku_unique" ON "products_variants";
    DROP FUNCTION IF EXISTS "enforce_catalog_sku_uniqueness"();
    DROP INDEX IF EXISTS "products_sku_unique_idx";
    DROP INDEX IF EXISTS "products_variants_sku_unique_idx";

    ALTER TABLE "products_variants"
      DROP COLUMN IF EXISTS "sku";

    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "sku";
  `)
}
