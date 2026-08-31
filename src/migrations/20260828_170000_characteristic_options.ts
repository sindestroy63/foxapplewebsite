import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

const tables = [
  ['ram_options', 'ram-options', [['8GB', '8GB', 10], ['12GB', '12GB', 20], ['16GB', '16GB', 30], ['24GB', '24GB', 40]]],
  ['variant_size_options', 'variant-size-options', [['40mm', '40mm', 10], ['42mm', '42mm', 20], ['44mm', '44mm', 30], ['46mm', '46mm', 40], ['47mm', '47mm', 50], ['49mm', '49mm', 60]]],
  ['screen_size_options', 'screen-size-options', [['11"', '11"', 10], ['13"', '13"', 20], ['15"', '15"', 30]]],
  ['connectivity_options', 'connectivity-options', [['Wi-Fi', 'Wi-Fi', 10], ['LTE', 'LTE', 20], ['Wi-Fi + Cellular', 'Wi-Fi + Cellular', 30]]],
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [table, , values] of tables) {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" varchar NOT NULL,
        "label" varchar NOT NULL,
        "sort_order" numeric DEFAULT 0,
        "archived" boolean DEFAULT false,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "${table}_key_idx" ON "${table}" USING btree ("key");
      CREATE INDEX IF NOT EXISTS "${table}_archived_idx" ON "${table}" USING btree ("archived");
    `))
    for (const [key, label, sortOrder] of values) {
      await db.execute(sql`INSERT INTO ${sql.raw(`"${table}"`)} ("key", "label", "sort_order") VALUES (${key}, ${label}, ${sortOrder}) ON CONFLICT ("key") DO NOTHING`)
    }
  }

  await db.execute(sql`
    ALTER TABLE "products_variants"
      ADD COLUMN IF NOT EXISTS "ram_option_id" integer,
      ADD COLUMN IF NOT EXISTS "size_option_id" integer,
      ADD COLUMN IF NOT EXISTS "screen_size_option_id" integer,
      ADD COLUMN IF NOT EXISTS "connectivity_option_id" integer;
    DO $$ BEGIN
      ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_ram_option_id_fk" FOREIGN KEY ("ram_option_id") REFERENCES "public"."ram_options"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_size_option_id_fk" FOREIGN KEY ("size_option_id") REFERENCES "public"."variant_size_options"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_screen_size_option_id_fk" FOREIGN KEY ("screen_size_option_id") REFERENCES "public"."screen_size_options"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_connectivity_option_id_fk" FOREIGN KEY ("connectivity_option_id") REFERENCES "public"."connectivity_options"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "products_variants_ram_option_idx" ON "products_variants" ("ram_option_id");
    CREATE INDEX IF NOT EXISTS "products_variants_size_option_idx" ON "products_variants" ("size_option_id");
    CREATE INDEX IF NOT EXISTS "products_variants_screen_size_option_idx" ON "products_variants" ("screen_size_option_id");
    CREATE INDEX IF NOT EXISTS "products_variants_connectivity_option_idx" ON "products_variants" ("connectivity_option_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "products_variants" DROP COLUMN IF EXISTS "ram_option_id", DROP COLUMN IF EXISTS "size_option_id", DROP COLUMN IF EXISTS "screen_size_option_id", DROP COLUMN IF EXISTS "connectivity_option_id"; DROP TABLE IF EXISTS "connectivity_options" CASCADE; DROP TABLE IF EXISTS "screen_size_options" CASCADE; DROP TABLE IF EXISTS "variant_size_options" CASCADE; DROP TABLE IF EXISTS "ram_options" CASCADE;`)
}
