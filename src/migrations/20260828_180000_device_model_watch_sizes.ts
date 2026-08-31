import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "device_models_rels" ADD COLUMN IF NOT EXISTS "variant_size_options_id" integer;
    ALTER TABLE "device_models_rels" ADD CONSTRAINT "device_models_rels_variant_size_options_fk" FOREIGN KEY ("variant_size_options_id") REFERENCES "public"."variant_size_options"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    CREATE INDEX IF NOT EXISTS "device_models_rels_variant_size_options_idx" ON "device_models_rels" ("variant_size_options_id");
    INSERT INTO "device_models_rels" ("order", "parent_id", "path", "variant_size_options_id")
    SELECT row_number() OVER (PARTITION BY d.id ORDER BY s.id) - 1, d.id, 'availableSizes', z.id
    FROM device_models d
    JOIN device_models_rels r ON r.parent_id=d.id AND r.path='availableStorage'
    JOIN storage_options s ON s.id=r.storage_options_id
    JOIN variant_size_options z ON z.key=s.value AND z.archived IS NOT TRUE
    WHERE d.name ILIKE '%watch%'
    ON CONFLICT DO NOTHING;
    DELETE FROM "device_models_rels" r USING device_models d, storage_options s
    WHERE r.parent_id=d.id AND r.path='availableStorage' AND r.storage_options_id=s.id
      AND d.name ILIKE '%watch%' AND s.value IN ('40mm','42mm','44mm','46mm','47mm','49mm');
    UPDATE storage_options s SET archived=true
    WHERE s.value IN ('40mm','42mm','44mm','46mm','47mm','49mm') AND NOT EXISTS (SELECT 1 FROM products_variants v WHERE v.storage_id=s.id)
      AND NOT EXISTS (SELECT 1 FROM device_models_rels r WHERE r.storage_options_id=s.id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "device_models_rels" DROP COLUMN IF EXISTS "variant_size_options_id";`)
}
