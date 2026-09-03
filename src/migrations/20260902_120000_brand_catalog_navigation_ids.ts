import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "brand_catalog_navigation_groups_children"
      DROP CONSTRAINT "brand_catalog_navigation_groups_children__parent_id_fkey";

    ALTER TABLE "brand_catalog_navigation_groups"
      ALTER COLUMN "id" DROP DEFAULT;

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ALTER COLUMN "id" DROP DEFAULT;

    ALTER SEQUENCE IF EXISTS "brand_catalog_navigation_groups_id_seq"
      OWNED BY NONE;

    ALTER SEQUENCE IF EXISTS "brand_catalog_navigation_groups_children_id_seq"
      OWNED BY NONE;

    DROP SEQUENCE IF EXISTS "brand_catalog_navigation_groups_id_seq";
    DROP SEQUENCE IF EXISTS "brand_catalog_navigation_groups_children_id_seq";

    ALTER TABLE "brand_catalog_navigation_groups"
      ALTER COLUMN "id" TYPE varchar USING "id"::text;

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ALTER COLUMN "id" TYPE varchar USING "id"::text,
      ALTER COLUMN "_parent_id" TYPE varchar USING "_parent_id"::text;

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ADD CONSTRAINT "brand_catalog_navigation_groups_children__parent_id_fkey"
      FOREIGN KEY ("_parent_id")
      REFERENCES "brand_catalog_navigation_groups"("id")
      ON DELETE CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "brand_catalog_navigation_groups"
        WHERE "id" !~ '^[0-9]+$'
      ) THEN
        RAISE EXCEPTION
          'Cannot rollback brand catalog navigation: groups contain non-numeric Payload IDs';
      END IF;

      IF EXISTS (
        SELECT 1 FROM "brand_catalog_navigation_groups_children"
        WHERE "id" !~ '^[0-9]+$' OR "_parent_id" !~ '^[0-9]+$'
      ) THEN
        RAISE EXCEPTION
          'Cannot rollback brand catalog navigation: children contain non-numeric Payload IDs';
      END IF;

      IF EXISTS (
        SELECT 1 FROM "brand_catalog_navigation_groups"
        WHERE "id"::numeric > 2147483647
      ) OR EXISTS (
        SELECT 1 FROM "brand_catalog_navigation_groups_children"
        WHERE "id"::numeric > 2147483647 OR "_parent_id"::numeric > 2147483647
      ) THEN
        RAISE EXCEPTION
          'Cannot rollback brand catalog navigation: an ID exceeds the integer range';
      END IF;
    END
    $$;

    ALTER TABLE "brand_catalog_navigation_groups_children"
      DROP CONSTRAINT "brand_catalog_navigation_groups_children__parent_id_fkey";

    ALTER TABLE "brand_catalog_navigation_groups"
      ALTER COLUMN "id" TYPE integer USING "id"::integer;

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ALTER COLUMN "id" TYPE integer USING "id"::integer,
      ALTER COLUMN "_parent_id" TYPE integer USING "_parent_id"::integer;

    CREATE SEQUENCE "brand_catalog_navigation_groups_id_seq" AS integer;
    CREATE SEQUENCE "brand_catalog_navigation_groups_children_id_seq" AS integer;

    ALTER SEQUENCE "brand_catalog_navigation_groups_id_seq"
      OWNED BY "brand_catalog_navigation_groups"."id";

    ALTER SEQUENCE "brand_catalog_navigation_groups_children_id_seq"
      OWNED BY "brand_catalog_navigation_groups_children"."id";

    ALTER TABLE "brand_catalog_navigation_groups"
      ALTER COLUMN "id"
      SET DEFAULT nextval('brand_catalog_navigation_groups_id_seq'::regclass);

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ALTER COLUMN "id"
      SET DEFAULT nextval('brand_catalog_navigation_groups_children_id_seq'::regclass);

    SELECT setval(
      'brand_catalog_navigation_groups_id_seq'::regclass,
      COALESCE(MAX("id"), 1),
      COUNT(*) > 0
    ) FROM "brand_catalog_navigation_groups";

    SELECT setval(
      'brand_catalog_navigation_groups_children_id_seq'::regclass,
      COALESCE(MAX("id"), 1),
      COUNT(*) > 0
    ) FROM "brand_catalog_navigation_groups_children";

    ALTER TABLE "brand_catalog_navigation_groups_children"
      ADD CONSTRAINT "brand_catalog_navigation_groups_children__parent_id_fkey"
      FOREIGN KEY ("_parent_id")
      REFERENCES "brand_catalog_navigation_groups"("id")
      ON DELETE CASCADE;
  `)
}
