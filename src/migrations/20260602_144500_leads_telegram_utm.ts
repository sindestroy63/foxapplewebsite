import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "leads"
      ADD COLUMN IF NOT EXISTS "telegram_status" varchar DEFAULT 'not_sent';
  `)

  await db.execute(sql`
    ALTER TABLE "leads"
      ADD COLUMN IF NOT EXISTS "utm" jsonb;
  `)

  await db.execute(sql`
    ALTER TABLE "leads"
      ALTER COLUMN "source" TYPE varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "leads"
      DROP COLUMN IF EXISTS "telegram_status";
  `)

  await db.execute(sql`
    ALTER TABLE "leads"
      DROP COLUMN IF EXISTS "utm";
  `)
}