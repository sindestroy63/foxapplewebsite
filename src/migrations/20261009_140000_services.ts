import * as types from 'payload'

export const up = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    CREATE TABLE IF NOT EXISTS "services" (
      "id" SERIAL PRIMARY KEY,
      "name" VARCHAR NOT NULL,
      "slug" VARCHAR NOT NULL UNIQUE,
      "description" TEXT,
      "price" NUMERIC,
      "price_label" VARCHAR,
      "is_available" BOOLEAN DEFAULT true NOT NULL,
      "sort_order" INTEGER DEFAULT 0 NOT NULL,
      "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
      "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "services_slug_idx" ON "services" ("slug");
    CREATE INDEX IF NOT EXISTS "services_is_available_idx" ON "services" ("is_available");
    CREATE INDEX IF NOT EXISTS "services_sort_order_idx" ON "services" ("sort_order");

    CREATE TABLE IF NOT EXISTS "services_rels" (
      "id" SERIAL PRIMARY KEY,
      "parent_id" INTEGER NOT NULL,
      "path" VARCHAR NOT NULL,
      "media_id" INTEGER,
      "order" INTEGER,
      CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "services" ("id") ON DELETE CASCADE,
      CONSTRAINT "services_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "services_rels_parent_idx" ON "services_rels" ("parent_id");
    CREATE INDEX IF NOT EXISTS "services_rels_path_idx" ON "services_rels" ("path");
  `)
}

export const down = async ({ payload }: { payload: types.Payload }): Promise<void> => {
  await payload.db.drizzle.execute(`
    DROP TABLE IF EXISTS "services_rels";
    DROP TABLE IF EXISTS "services";
  `)
}
