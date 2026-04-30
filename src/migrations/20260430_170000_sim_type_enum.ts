import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create enum for variant SIM types
  await db.execute(sql`
    CREATE TYPE "public"."enum_products_variants_sim_type" AS ENUM('SIM_ESIM', 'ESIM', 'SIM_SIM');
  `)

  // Convert variant simType column from varchar to enum
  await db.execute(sql`
    UPDATE "products_variants" SET "sim_type" = NULL WHERE "sim_type" IS NOT NULL
      AND "sim_type" NOT IN ('SIM_ESIM', 'ESIM', 'SIM_SIM');
  `)
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE "enum_products_variants_sim_type"
      USING "sim_type"::"enum_products_variants_sim_type";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE varchar
      USING "sim_type"::text;
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_products_variants_sim_type";
  `)
}
