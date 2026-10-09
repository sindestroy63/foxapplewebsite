import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(`
    CREATE TABLE IF NOT EXISTS "url_redirects" (
      "id" serial PRIMARY KEY NOT NULL,
      "from" varchar NOT NULL,
      "to" varchar NOT NULL,
      "permanent" boolean DEFAULT true NOT NULL,
      "source" varchar DEFAULT 'auto',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "url_redirects_from_idx" ON "url_redirects" ("from");
    CREATE INDEX IF NOT EXISTS "url_redirects_to_idx" ON "url_redirects" ("to");
    CREATE INDEX IF NOT EXISTS "url_redirects_created_at_idx" ON "url_redirects" ("created_at");
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(`
    DROP TABLE IF EXISTS "url_redirects";
  `)
}
