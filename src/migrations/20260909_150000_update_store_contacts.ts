import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings"
    SET
      "telegram_username" = '@FoxStorSeller',
      "telegram_channel_url" = 'https://t.me/foxstorerf',
      "address" = 'ТЦ «Русь на Волге», 1 этаж, секция 113',
      "work_time" = '10:00–21:00 ежедневно',
      "map_url" = NULL;

    ALTER TABLE "site_settings" ALTER COLUMN "telegram_username" SET DEFAULT '@FoxStorSeller';
    ALTER TABLE "site_settings" ALTER COLUMN "telegram_channel_url" SET DEFAULT 'https://t.me/foxstorerf';
    ALTER TABLE "site_settings" ALTER COLUMN "address" SET DEFAULT 'ТЦ «Русь на Волге», 1 этаж, секция 113';
    ALTER TABLE "site_settings" ALTER COLUMN "work_time" SET DEFAULT '10:00–21:00 ежедневно';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings" ALTER COLUMN "telegram_username" DROP DEFAULT;
    ALTER TABLE "site_settings" ALTER COLUMN "telegram_channel_url" DROP DEFAULT;
    ALTER TABLE "site_settings" ALTER COLUMN "address" DROP DEFAULT;
    ALTER TABLE "site_settings" ALTER COLUMN "work_time" DROP DEFAULT;
  `)
}
