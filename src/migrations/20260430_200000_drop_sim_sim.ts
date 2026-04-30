import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Delete variants with SIM_SIM
  await db.execute(sql`
    DELETE FROM "products_variants" WHERE "sim_type" = 'SIM_SIM';
  `)

  // Recreate enum without SIM_SIM
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE varchar;
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_products_variants_sim_type";
  `)
  await db.execute(sql`
    CREATE TYPE "public"."enum_products_variants_sim_type" AS ENUM('SIM_ESIM', 'ESIM');
  `)
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE "enum_products_variants_sim_type"
      USING "sim_type"::"enum_products_variants_sim_type";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restore enum with SIM_SIM
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE varchar;
  `)
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_products_variants_sim_type";
  `)
  await db.execute(sql`
    CREATE TYPE "public"."enum_products_variants_sim_type" AS ENUM('SIM_ESIM', 'ESIM', 'SIM_SIM');
  `)
  await db.execute(sql`
    ALTER TABLE "products_variants" ALTER COLUMN "sim_type" TYPE "enum_products_variants_sim_type"
      USING "sim_type"::"enum_products_variants_sim_type";
  `)
}
