import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings" SET "phone" = '+7 (917) 954-64-64' WHERE "phone" = '+7 (917) 974-62-02';
    ALTER TABLE "site_settings" ALTER COLUMN "phone" SET DEFAULT '+7 (917) 954-64-64';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings" SET "phone" = '+7 (917) 974-62-02' WHERE "phone" = '+7 (917) 954-64-64';
    ALTER TABLE "site_settings" ALTER COLUMN "phone" SET DEFAULT '+7 (917) 974-62-02';
  `)
}
