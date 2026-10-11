import * as types from 'payload'

export const up = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    -- Add services_id column to payload_locked_documents_rels
    ALTER TABLE "payload_locked_documents_rels"
    ADD COLUMN IF NOT EXISTS "services_id" INTEGER;

    -- Add foreign key constraint
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_services_fk'
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_services_fk"
        FOREIGN KEY ("services_id") REFERENCES "services" ("id") ON DELETE CASCADE;
      END IF;
    END $$;

    -- Add index for better query performance
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_services_id_idx"
    ON "payload_locked_documents_rels" ("services_id");
  `)
}

export const down = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    -- Remove index
    DROP INDEX IF EXISTS "payload_locked_documents_rels_services_id_idx";

    -- Remove foreign key constraint
    ALTER TABLE "payload_locked_documents_rels"
    DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_services_fk";

    -- Remove column
    ALTER TABLE "payload_locked_documents_rels"
    DROP COLUMN IF EXISTS "services_id";
  `)
}
