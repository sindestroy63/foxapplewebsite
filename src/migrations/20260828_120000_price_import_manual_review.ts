import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_price_import_items_match_status"
      ADD VALUE IF NOT EXISTS 'manual_review';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  void db
}
