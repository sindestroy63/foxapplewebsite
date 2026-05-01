import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products_color_images" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "color_id" integer
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_order_idx" ON "products_color_images" USING btree ("_order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_parent_id_idx" ON "products_color_images" USING btree ("_parent_id");
  `)
  await db.execute(sql`
    ALTER TABLE "products_color_images" ADD CONSTRAINT "products_color_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  `)
  await db.execute(sql`
    ALTER TABLE "products_color_images" ADD CONSTRAINT "products_color_images_color_fk" FOREIGN KEY ("color_id") REFERENCES "public"."colors"("id") ON DELETE set null ON UPDATE no action;
  `)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products_color_images_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" varchar NOT NULL,
      "path" varchar NOT NULL,
      "media_id" integer
    );
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_rels_order_idx" ON "products_color_images_rels" USING btree ("order");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_rels_parent_idx" ON "products_color_images_rels" USING btree ("parent_id");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_rels_path_idx" ON "products_color_images_rels" USING btree ("path");
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_color_images_rels_media_id_idx" ON "products_color_images_rels" USING btree ("media_id");
  `)
  await db.execute(sql`
    ALTER TABLE "products_color_images_rels" ADD CONSTRAINT "products_color_images_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "products_color_images_rels" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "products_color_images" CASCADE;`)
}
