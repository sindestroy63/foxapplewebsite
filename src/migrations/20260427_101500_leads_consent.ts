import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "leads"
      ADD COLUMN "email" varchar,
      ADD COLUMN "consent" boolean DEFAULT false,
      ADD COLUMN "consent_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "leads"
      DROP COLUMN "email",
      DROP COLUMN "consent",
      DROP COLUMN "consent_at";
  `)
}
