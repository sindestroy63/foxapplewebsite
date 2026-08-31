import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

const covers = [
  ['group:smartphones', 626], ['group:tablets', 443], ['group:laptops', 503],
  ['group:smart-watches', 689], ['group:audio', 647], ['group:gaming-consoles', 666],
  ['group:home-appliances', 767], ['group:smart-devices', 1642], ['group:other', 686],
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" ADD COLUMN IF NOT EXISTS "media_id" integer`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "catalog_navigation_rels_media_id_idx" ON "catalog_navigation_rels" ("media_id")`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" DROP CONSTRAINT IF EXISTS "catalog_navigation_rels_media_fk"`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" ADD CONSTRAINT "catalog_navigation_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE no action`)
  for (const [key, mediaId] of covers) {
    await db.execute(sql`
      INSERT INTO "catalog_navigation_rels" ("parent_id", "path", "media_id")
      SELECT n.id, 'coverImage', ${mediaId}
      FROM "catalog_navigation" n JOIN "media" m ON m.id = ${mediaId}
      WHERE n."stable_key" = ${key} AND n."kind" = 'group'
        AND NOT EXISTS (SELECT 1 FROM "catalog_navigation_rels" r WHERE r."parent_id" = n.id AND r."path" = 'coverImage')
    `)
  }
  await db.execute(sql`
    INSERT INTO "catalog_navigation_rels" ("parent_id", "path", "media_id")
    SELECT n.id, 'coverImage', 37
    FROM "catalog_navigation" n
    JOIN "media" m ON m.id = 37
    WHERE n."stable_key" = 'group:trade-in' AND n."kind" = 'group'
      AND EXISTS (SELECT 1 FROM "categories" c WHERE c.id = 8 AND lower(c.slug) = 'trade-in')
      AND NOT EXISTS (SELECT 1 FROM "catalog_navigation_rels" r WHERE r."parent_id" = n.id AND r."path" = 'coverImage');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "catalog_navigation_rels" WHERE "path" = 'coverImage'`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" DROP CONSTRAINT IF EXISTS "catalog_navigation_rels_media_fk"`)
  await db.execute(sql`DROP INDEX IF EXISTS "catalog_navigation_rels_media_id_idx"`)
  await db.execute(sql`ALTER TABLE "catalog_navigation_rels" DROP COLUMN IF EXISTS "media_id"`)
}
