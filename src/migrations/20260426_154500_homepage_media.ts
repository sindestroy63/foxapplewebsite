import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN "homepage_media_title" varchar DEFAULT 'FOX APPLE вживую',
      ADD COLUMN "homepage_media_text" varchar DEFAULT 'Загружайте фото, видео и GIF из офиса, выдач и новых поставок в раздел «Медиа», а затем выбирайте их здесь для главной страницы.';

    CREATE TABLE "site_settings_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "media_id" integer
    );

    ALTER TABLE "site_settings_rels"
      ADD CONSTRAINT "site_settings_rels_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "site_settings_rels"
      ADD CONSTRAINT "site_settings_rels_media_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
    CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
    CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
    CREATE INDEX "site_settings_rels_media_id_idx" ON "site_settings_rels" USING btree ("media_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "site_settings_rels" CASCADE;

    ALTER TABLE "site_settings"
      DROP COLUMN "homepage_media_title",
      DROP COLUMN "homepage_media_text";
  `)
}
