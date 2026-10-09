import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  // Check for duplicate slugs before adding constraint
  const duplicates = await payload.db.drizzle.execute(`
    SELECT slug, COUNT(*) as count
    FROM products
    GROUP BY slug
    HAVING COUNT(*) > 1
  `)

  if (duplicates.rows && duplicates.rows.length > 0) {
    throw new Error(`Cannot add UNIQUE constraint: duplicate slugs found: ${JSON.stringify(duplicates.rows)}`)
  }

  // Add UNIQUE constraint if not exists
  await payload.db.drizzle.execute(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_slug_unique'
      ) THEN
        ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
      END IF;
    END $$;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(`
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_slug_unique;
  `)
}
