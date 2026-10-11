import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Add url_redirects_id column to payload_locked_documents_rels
    ALTER TABLE payload_locked_documents_rels
    ADD COLUMN IF NOT EXISTS url_redirects_id INTEGER;

    -- Add index for performance
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_url_redirects_id_idx
    ON payload_locked_documents_rels(url_redirects_id);

    -- Add foreign key constraint
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_url_redirects_fk'
      ) THEN
        ALTER TABLE payload_locked_documents_rels
        ADD CONSTRAINT payload_locked_documents_rels_url_redirects_fk
        FOREIGN KEY (url_redirects_id) REFERENCES url_redirects(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Remove foreign key constraint
    ALTER TABLE payload_locked_documents_rels
    DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_url_redirects_fk;

    -- Remove index
    DROP INDEX IF EXISTS payload_locked_documents_rels_url_redirects_id_idx;

    -- Remove column
    ALTER TABLE payload_locked_documents_rels
    DROP COLUMN IF EXISTS url_redirects_id;
  `)
}
