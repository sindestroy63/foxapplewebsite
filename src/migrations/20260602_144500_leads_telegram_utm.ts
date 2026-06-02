import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add telegram_status column to leads table
  await db.execute(sql`
    ALTER TABLE "leads"
      ADD COLUMN IF NOT EXISTS "telegram_status" varchar DEFAULT 'not_sent';
  `)

  // Add utm column (JSON) to leads table
  await db.execute(sql`
    ALTER TABLE "leads"
      ADD COLUMN IF NOT EXISTS "utm" jsonb;
  `)

  // Update source enum to include new values
  // First, alter the column to allow new values
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