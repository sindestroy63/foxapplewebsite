import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Create site-appearance global table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_appearance" (
      "id" serial PRIMARY KEY,
      "hero_video_id" integer REFERENCES "media"("id") ON DELETE SET NULL,
      "media_block_title" varchar,
      "media_block_text" varchar,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );
  `)

  // 2. Create rels table for mediaBlockItems (hasMany relationship)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_appearance_rels" (
      "id" serial PRIMARY KEY,
      "order" integer,
      "parent_id" integer NOT NULL REFERENCES "site_appearance"("id") ON DELETE CASCADE,
      "path" varchar NOT NULL,
      "media_id" integer REFERENCES "media"("id") ON DELETE CASCADE
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_appearance_rels_order_idx" ON "site_appearance_rels" ("order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_appearance_rels_parent_idx" ON "site_appearance_rels" ("parent_id");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_appearance_rels_path_idx" ON "site_appearance_rels" ("path");
  `)

  // 3. Add cover_image_id column to categories
  await db.execute(sql`
    ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "cover_image_id" integer REFERENCES "media"("id") ON DELETE SET NULL;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "categories_cover_image_idx" ON "categories" ("cover_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories" DROP COLUMN IF EXISTS "cover_image_id";
  `)
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_appearance_rels";
  `)
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_appearance";
  `)
}
