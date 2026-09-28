import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "site_appearance_rels" WHERE "path" = 'mediaBlockItems';`)
  await db.execute(sql`ALTER TABLE "site_appearance" DROP COLUMN IF EXISTS "media_block_title", DROP COLUMN IF EXISTS "media_block_text";`)
  await db.execute(sql`DELETE FROM "site_settings_rels" WHERE "path" = 'homepageMedia';`)
  await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "homepage_media_title", DROP COLUMN IF EXISTS "homepage_media_text";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "site_appearance" ADD COLUMN IF NOT EXISTS "media_block_title" varchar, ADD COLUMN IF NOT EXISTS "media_block_text" varchar;`)
  await db.execute(sql`ALTER TABLE "site_appearance_rels" ADD COLUMN IF NOT EXISTS "media_id" integer REFERENCES "media"("id") ON DELETE CASCADE;`)
  await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "homepage_media_title" varchar, ADD COLUMN IF NOT EXISTS "homepage_media_text" varchar;`)
}