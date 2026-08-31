import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

const legacyPredicate = sql.raw("'iphone','ipad','macbook','airpods','apple-watch','samsung','samsung-watch','samsung-headphones','playstation','dyson','drugoe'")

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE category_count integer;
    BEGIN
      SELECT count(*) INTO category_count FROM categories WHERE lower(slug) IN (${legacyPredicate});
      IF category_count <> 11 THEN RAISE EXCEPTION 'Expected exactly 11 legacy categories, found %', category_count; END IF;
      ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;
      UPDATE products SET category_id = NULL WHERE category_id IN (SELECT id FROM categories WHERE lower(slug) IN (${legacyPredicate}));
      DELETE FROM categories WHERE lower(slug) IN (${legacyPredicate});
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  throw new Error('Irreversible: legacy product categories and assignments were removed')
}
