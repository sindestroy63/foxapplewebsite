import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_price_import_sessions_status" AS ENUM('matching', 'resolved', 'previewed', 'expired', 'failed');
    CREATE TYPE "public"."enum_price_import_items_match_status" AS ENUM('matched', 'ambiguous', 'not_found', 'missing_attributes', 'unsupported_region');
    CREATE TYPE "public"."enum_price_import_items_resolution" AS ENUM('pending', 'automatic', 'manual', 'skipped');

    CREATE TABLE "price_import_sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "author_id" integer NOT NULL,
      "source_text" varchar NOT NULL,
      "questions" jsonb,
      "status" "enum_price_import_sessions_status" DEFAULT 'matching' NOT NULL,
      "session_token" varchar NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "total_items" numeric DEFAULT 0 NOT NULL,
      "resolved_count" numeric DEFAULT 0 NOT NULL,
      "skipped_count" numeric DEFAULT 0 NOT NULL,
      "preview_batch_id" integer,
      "error_message" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "price_import_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "author_id" integer NOT NULL,
      "session_id" integer NOT NULL,
      "item_number" numeric NOT NULL,
      "source_line" varchar NOT NULL,
      "context_heading" varchar,
      "model_text" varchar NOT NULL,
      "price" numeric NOT NULL,
      "storage" varchar,
      "ram" varchar,
      "color" varchar,
      "sim" varchar,
      "region" varchar,
      "revision" varchar,
      "manufacturer_model_number" varchar,
      "notes" jsonb,
      "match_status" "enum_price_import_items_match_status" NOT NULL,
      "reason" varchar NOT NULL,
      "candidates" jsonb NOT NULL,
      "resolution" "enum_price_import_items_resolution" DEFAULT 'pending' NOT NULL,
      "selected_candidate_key" varchar,
      "selected_sku" varchar,
      "selected_product_id" integer,
      "selected_variant_id" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "price_import_sessions" ADD CONSTRAINT "price_import_sessions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null;
    ALTER TABLE "price_import_sessions" ADD CONSTRAINT "price_import_sessions_preview_batch_id_fk" FOREIGN KEY ("preview_batch_id") REFERENCES "public"."price_update_batches"("id") ON DELETE set null;
    ALTER TABLE "price_import_items" ADD CONSTRAINT "price_import_items_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null;
    ALTER TABLE "price_import_items" ADD CONSTRAINT "price_import_items_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."price_import_sessions"("id") ON DELETE cascade;
    ALTER TABLE "price_import_items" ADD CONSTRAINT "price_import_items_selected_product_id_fk" FOREIGN KEY ("selected_product_id") REFERENCES "public"."products"("id") ON DELETE set null;

    CREATE INDEX "price_import_sessions_author_idx" ON "price_import_sessions" ("author_id");
    CREATE INDEX "price_import_sessions_status_idx" ON "price_import_sessions" ("status");
    CREATE UNIQUE INDEX "price_import_sessions_token_idx" ON "price_import_sessions" ("session_token");
    CREATE INDEX "price_import_sessions_preview_batch_idx" ON "price_import_sessions" ("preview_batch_id");
    CREATE INDEX "price_import_sessions_updated_at_idx" ON "price_import_sessions" ("updated_at");
    CREATE INDEX "price_import_sessions_created_at_idx" ON "price_import_sessions" ("created_at");
    CREATE INDEX "price_import_items_author_idx" ON "price_import_items" ("author_id");
    CREATE INDEX "price_import_items_session_idx" ON "price_import_items" ("session_id");
    CREATE INDEX "price_import_items_match_status_idx" ON "price_import_items" ("match_status");
    CREATE INDEX "price_import_items_resolution_idx" ON "price_import_items" ("resolution");
    CREATE INDEX "price_import_items_selected_sku_idx" ON "price_import_items" ("selected_sku");
    CREATE INDEX "price_import_items_updated_at_idx" ON "price_import_items" ("updated_at");
    CREATE INDEX "price_import_items_created_at_idx" ON "price_import_items" ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "price_import_sessions_id" integer,
      ADD COLUMN IF NOT EXISTS "price_import_items_id" integer;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "price_import_sessions_id", DROP COLUMN IF EXISTS "price_import_items_id";
    DROP TABLE IF EXISTS "price_import_items" CASCADE;
    DROP TABLE IF EXISTS "price_import_sessions" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_price_import_items_resolution";
    DROP TYPE IF EXISTS "public"."enum_price_import_items_match_status";
    DROP TYPE IF EXISTS "public"."enum_price_import_sessions_status";
  `)
}
