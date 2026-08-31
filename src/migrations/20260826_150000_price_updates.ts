import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_price_update_batches_status" AS ENUM(
      'preview', 'confirming', 'confirmed', 'failed', 'expired'
    );
    CREATE TYPE "public"."enum_price_update_items_match_type" AS ENUM('product', 'variant');
    CREATE TYPE "public"."enum_price_update_items_status" AS ENUM(
      'ready', 'not_found', 'invalid_price', 'duplicate_sku_in_input', 'conflict', 'updated', 'failed'
    );

    CREATE TABLE "price_update_batches" (
      "id" serial PRIMARY KEY NOT NULL,
      "author_id" integer NOT NULL,
      "source_text" varchar NOT NULL,
      "status" "enum_price_update_batches_status" DEFAULT 'preview' NOT NULL,
      "confirmation_token" varchar NOT NULL,
      "expires_at" timestamp(3) with time zone NOT NULL,
      "confirmed_at" timestamp(3) with time zone,
      "total_lines" numeric DEFAULT 0 NOT NULL,
      "ready_count" numeric DEFAULT 0 NOT NULL,
      "error_count" numeric DEFAULT 0 NOT NULL,
      "updated_count" numeric DEFAULT 0 NOT NULL,
      "error_message" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE "price_update_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "author_id" integer NOT NULL,
      "batch_id" integer NOT NULL,
      "line_number" numeric NOT NULL,
      "source_line" varchar NOT NULL,
      "sku" varchar,
      "match_type" "enum_price_update_items_match_type",
      "product_id" integer,
      "product_label" varchar,
      "variant_id" varchar,
      "old_cash_price" numeric,
      "new_cash_price" numeric,
      "old_card_price" numeric,
      "new_card_price" numeric,
      "status" "enum_price_update_items_status" NOT NULL,
      "error_message" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "price_update_batches"
      ADD CONSTRAINT "price_update_batches_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "price_update_items"
      ADD CONSTRAINT "price_update_items_author_id_users_id_fk"
      FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "price_update_items"
      ADD CONSTRAINT "price_update_items_batch_id_price_update_batches_id_fk"
      FOREIGN KEY ("batch_id") REFERENCES "public"."price_update_batches"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "price_update_items"
      ADD CONSTRAINT "price_update_items_product_id_products_id_fk"
      FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "price_update_batches_author_idx" ON "price_update_batches" USING btree ("author_id");
    CREATE INDEX "price_update_batches_status_idx" ON "price_update_batches" USING btree ("status");
    CREATE UNIQUE INDEX "price_update_batches_confirmation_token_idx" ON "price_update_batches" USING btree ("confirmation_token");
    CREATE INDEX "price_update_batches_updated_at_idx" ON "price_update_batches" USING btree ("updated_at");
    CREATE INDEX "price_update_batches_created_at_idx" ON "price_update_batches" USING btree ("created_at");
    CREATE INDEX "price_update_items_author_idx" ON "price_update_items" USING btree ("author_id");
    CREATE INDEX "price_update_items_batch_idx" ON "price_update_items" USING btree ("batch_id");
    CREATE INDEX "price_update_items_sku_idx" ON "price_update_items" USING btree ("sku");
    CREATE INDEX "price_update_items_product_idx" ON "price_update_items" USING btree ("product_id");
    CREATE INDEX "price_update_items_status_idx" ON "price_update_items" USING btree ("status");
    CREATE INDEX "price_update_items_updated_at_idx" ON "price_update_items" USING btree ("updated_at");
    CREATE INDEX "price_update_items_created_at_idx" ON "price_update_items" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "price_update_batches_id" integer,
      ADD COLUMN IF NOT EXISTS "price_update_items_id" integer;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "price_update_batches_id",
      DROP COLUMN IF EXISTS "price_update_items_id";
    DROP TABLE IF EXISTS "price_update_items" CASCADE;
    DROP TABLE IF EXISTS "price_update_batches" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_price_update_items_status";
    DROP TYPE IF EXISTS "public"."enum_price_update_items_match_type";
    DROP TYPE IF EXISTS "public"."enum_price_update_batches_status";
  `)
}
