import * as types from 'payload'

export const up = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    ALTER TABLE "payload_locked_documents_rels"
    ADD COLUMN IF NOT EXISTS "services_id" INTEGER;

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

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_services_id_idx"
    ON "payload_locked_documents_rels" ("services_id");
  `)
}

export const down = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_services_id_idx";

    ALTER TABLE "payload_locked_documents_rels"
    DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_services_fk";

    ALTER TABLE "payload_locked_documents_rels"
    DROP COLUMN IF EXISTS "services_id";
  `)
}
