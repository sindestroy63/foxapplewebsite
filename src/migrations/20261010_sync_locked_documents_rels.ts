import * as types from 'payload'

export const up = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  // Add missing foreign key columns to payload_locked_documents_rels
  // These columns are required for all registered collections in Payload CMS

  await payload.db.drizzle.execute(`
    DO $$
    BEGIN
        -- Add colors_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='colors_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN colors_id integer;
            CREATE INDEX payload_locked_documents_rels_colors_id_idx ON payload_locked_documents_rels(colors_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_colors_fk
                FOREIGN KEY (colors_id) REFERENCES colors(id) ON DELETE CASCADE;
        END IF;

        -- Add storage_options_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='storage_options_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN storage_options_id integer;
            CREATE INDEX payload_locked_documents_rels_storage_options_id_idx ON payload_locked_documents_rels(storage_options_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_storage_options_fk
                FOREIGN KEY (storage_options_id) REFERENCES storage_options(id) ON DELETE CASCADE;
        END IF;

        -- Add sim_options_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='sim_options_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN sim_options_id integer;
            CREATE INDEX payload_locked_documents_rels_sim_options_id_idx ON payload_locked_documents_rels(sim_options_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_sim_options_fk
                FOREIGN KEY (sim_options_id) REFERENCES sim_options(id) ON DELETE CASCADE;
        END IF;

        -- Add device_models_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='device_models_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN device_models_id integer;
            CREATE INDEX payload_locked_documents_rels_device_models_id_idx ON payload_locked_documents_rels(device_models_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_device_models_fk
                FOREIGN KEY (device_models_id) REFERENCES device_models(id) ON DELETE CASCADE;
        END IF;

        -- Add price_update_batches_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='price_update_batches_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN price_update_batches_id integer;
            CREATE INDEX payload_locked_documents_rels_price_update_batches_id_idx ON payload_locked_documents_rels(price_update_batches_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_price_update_batches_fk
                FOREIGN KEY (price_update_batches_id) REFERENCES price_update_batches(id) ON DELETE CASCADE;
        END IF;

        -- Add price_update_items_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='price_update_items_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN price_update_items_id integer;
            CREATE INDEX payload_locked_documents_rels_price_update_items_id_idx ON payload_locked_documents_rels(price_update_items_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_price_update_items_fk
                FOREIGN KEY (price_update_items_id) REFERENCES price_update_items(id) ON DELETE CASCADE;
        END IF;

        -- Add price_import_sessions_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='price_import_sessions_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN price_import_sessions_id integer;
            CREATE INDEX payload_locked_documents_rels_price_import_sessions_id_idx ON payload_locked_documents_rels(price_import_sessions_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_price_import_sessions_fk
                FOREIGN KEY (price_import_sessions_id) REFERENCES price_import_sessions(id) ON DELETE CASCADE;
        END IF;

        -- Add price_import_items_id if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='payload_locked_documents_rels'
                       AND column_name='price_import_items_id') THEN
            ALTER TABLE payload_locked_documents_rels ADD COLUMN price_import_items_id integer;
            CREATE INDEX payload_locked_documents_rels_price_import_items_id_idx ON payload_locked_documents_rels(price_import_items_id);
            ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_price_import_items_fk
                FOREIGN KEY (price_import_items_id) REFERENCES price_import_items(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `)
}

export const down = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  // Removing these columns would break document locking for these collections
  // This migration should not be rolled back in production
  await payload.db.drizzle.execute(`
    DO $$
    BEGIN
        -- Drop columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='colors_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_colors_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_colors_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN colors_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='storage_options_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_storage_options_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_storage_options_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN storage_options_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='sim_options_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_sim_options_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_sim_options_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN sim_options_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='device_models_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_device_models_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_device_models_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN device_models_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='price_update_batches_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_price_update_batches_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_price_update_batches_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN price_update_batches_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='price_update_items_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_price_update_items_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_price_update_items_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN price_update_items_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='price_import_sessions_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_price_import_sessions_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_price_import_sessions_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN price_import_sessions_id;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='payload_locked_documents_rels'
                   AND column_name='price_import_items_id') THEN
            ALTER TABLE payload_locked_documents_rels DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_price_import_items_fk;
            DROP INDEX IF EXISTS payload_locked_documents_rels_price_import_items_id_idx;
            ALTER TABLE payload_locked_documents_rels DROP COLUMN price_import_items_id;
        END IF;
    END $$;
  `)
}
