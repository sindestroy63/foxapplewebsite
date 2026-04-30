import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add products_id column to site_appearance_rels for bestOffers relationship
  await db.execute(sql`
    ALTER TABLE "site_appearance_rels"
      ADD COLUMN IF NOT EXISTS "products_id" integer REFERENCES "products"("id") ON DELETE CASCADE;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "site_appearance_rels_products_id_idx"
      ON "site_appearance_rels" ("products_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "site_appearance_rels_products_id_idx";
  `)
  await db.execute(sql`
    ALTER TABLE "site_appearance_rels" DROP COLUMN IF EXISTS "products_id";
  `)
}
