import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "colors" (
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar NOT NULL,
    "english_label" varchar NOT NULL,
    "russian_label" varchar NOT NULL,
    "primary_hex" varchar NOT NULL,
    "secondary_hex" varchar,
    "sort_order" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "colors_value_idx" ON "colors" USING btree ("value");
  CREATE INDEX IF NOT EXISTS "colors_updated_at_idx" ON "colors" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "colors_created_at_idx" ON "colors" USING btree ("created_at");

  CREATE TABLE IF NOT EXISTS "colors_device_types" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" varchar,
    "id" serial PRIMARY KEY NOT NULL
  );
  ALTER TABLE "colors_device_types" ADD CONSTRAINT "colors_device_types_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."colors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "colors_device_types_order_idx" ON "colors_device_types" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "colors_device_types_parent_idx" ON "colors_device_types" USING btree ("parent_id");

  CREATE TABLE IF NOT EXISTS "storage_options" (
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar NOT NULL,
    "sort_order" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "storage_options_value_idx" ON "storage_options" USING btree ("value");
  CREATE INDEX IF NOT EXISTS "storage_options_updated_at_idx" ON "storage_options" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "storage_options_created_at_idx" ON "storage_options" USING btree ("created_at");

  CREATE TABLE IF NOT EXISTS "sim_options" (
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar NOT NULL,
    "label" varchar NOT NULL,
    "sort_order" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "sim_options_value_idx" ON "sim_options" USING btree ("value");
  CREATE INDEX IF NOT EXISTS "sim_options_updated_at_idx" ON "sim_options" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "sim_options_created_at_idx" ON "sim_options" USING btree ("created_at");

  CREATE TABLE IF NOT EXISTS "device_models" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "category_id" integer,
    "chip" varchar,
    "ram" varchar,
    "screen_size" varchar,
    "connectivity" varchar,
    "base_price" numeric,
    "price_step" numeric DEFAULT 0,
    "storage_is_size" boolean DEFAULT false,
    "sort_order" numeric DEFAULT 0,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "device_models_name_idx" ON "device_models" USING btree ("name");
  CREATE INDEX IF NOT EXISTS "device_models_updated_at_idx" ON "device_models" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "device_models_created_at_idx" ON "device_models" USING btree ("created_at");
  ALTER TABLE "device_models" ADD CONSTRAINT "device_models_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;

  CREATE TABLE IF NOT EXISTS "device_models_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "colors_id" integer,
    "storage_options_id" integer,
    "sim_options_id" integer
  );
  ALTER TABLE "device_models_rels" ADD CONSTRAINT "device_models_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."device_models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "device_models_rels" ADD CONSTRAINT "device_models_rels_colors_fk" FOREIGN KEY ("colors_id") REFERENCES "public"."colors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "device_models_rels" ADD CONSTRAINT "device_models_rels_storage_options_fk" FOREIGN KEY ("storage_options_id") REFERENCES "public"."storage_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "device_models_rels" ADD CONSTRAINT "device_models_rels_sim_options_fk" FOREIGN KEY ("sim_options_id") REFERENCES "public"."sim_options"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX IF NOT EXISTS "device_models_rels_order_idx" ON "device_models_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "device_models_rels_parent_idx" ON "device_models_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "device_models_rels_path_idx" ON "device_models_rels" USING btree ("path");

  ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "device_model_id" integer;
  ALTER TABLE "products" ADD CONSTRAINT "products_device_model_id_device_models_id_fk" FOREIGN KEY ("device_model_id") REFERENCES "public"."device_models"("id") ON DELETE set null ON UPDATE no action;

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "colors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "storage_options_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "sim_options_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "device_models_id" integer;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "products" DROP COLUMN IF EXISTS "device_model_id";
  DROP TABLE IF EXISTS "device_models_rels" CASCADE;
  DROP TABLE IF EXISTS "device_models" CASCADE;
  DROP TABLE IF EXISTS "sim_options" CASCADE;
  DROP TABLE IF EXISTS "storage_options" CASCADE;
  DROP TABLE IF EXISTS "colors_device_types" CASCADE;
  DROP TABLE IF EXISTS "colors" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "colors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "storage_options_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sim_options_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "device_models_id";
  `)
}
