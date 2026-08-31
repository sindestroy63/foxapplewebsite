import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "products_variants" v
    SET "ram_option_id" = r."id"
    FROM "ram_options" r
    WHERE v."ram" IS NOT NULL AND trim(v."ram") <> ''
      AND upper(trim(v."ram")) = upper(r."key") AND r."archived" IS NOT TRUE
      AND (v."size" IS NULL OR trim(v."size") = '' OR upper(trim(v."size")) IN ('40MM','42MM','44MM','46MM','47MM','49MM'))
      AND (v."screen_size" IS NULL OR trim(v."screen_size") = '' OR trim(v."screen_size") IN ('11"','13"','15"'))
      AND (v."connectivity" IS NULL OR trim(v."connectivity") = '' OR trim(v."connectivity") IN ('Wi-Fi','LTE','Wi-Fi + Cellular'));
    UPDATE "products_variants" v SET "size_option_id" = r."id" FROM "variant_size_options" r
    WHERE v."size" IS NOT NULL AND trim(v."size") <> '' AND upper(trim(v."size")) = upper(r."key") AND r."archived" IS NOT TRUE
      AND (v."ram" IS NULL OR trim(v."ram") = '' OR upper(trim(v."ram")) IN ('8GB','12GB','16GB','24GB'))
      AND (v."screen_size" IS NULL OR trim(v."screen_size") = '' OR trim(v."screen_size") IN ('11"','13"','15"'))
      AND (v."connectivity" IS NULL OR trim(v."connectivity") = '' OR trim(v."connectivity") IN ('Wi-Fi','LTE','Wi-Fi + Cellular'));
    UPDATE "products_variants" v SET "screen_size_option_id" = r."id" FROM "screen_size_options" r
    WHERE v."screen_size" IS NOT NULL AND trim(v."screen_size") <> '' AND trim(v."screen_size") = r."key" AND r."archived" IS NOT TRUE
      AND (v."ram" IS NULL OR trim(v."ram") = '' OR upper(trim(v."ram")) IN ('8GB','12GB','16GB','24GB'))
      AND (v."size" IS NULL OR trim(v."size") = '' OR upper(trim(v."size")) IN ('40MM','42MM','44MM','46MM','47MM','49MM'))
      AND (v."connectivity" IS NULL OR trim(v."connectivity") = '' OR trim(v."connectivity") IN ('Wi-Fi','LTE','Wi-Fi + Cellular'));
    UPDATE "products_variants" v SET "connectivity_option_id" = r."id" FROM "connectivity_options" r
    WHERE v."connectivity" IS NOT NULL AND trim(v."connectivity") <> '' AND trim(v."connectivity") = r."key" AND r."archived" IS NOT TRUE
      AND (v."ram" IS NULL OR trim(v."ram") = '' OR upper(trim(v."ram")) IN ('8GB','12GB','16GB','24GB'))
      AND (v."size" IS NULL OR trim(v."size") = '' OR upper(trim(v."size")) IN ('40MM','42MM','44MM','46MM','47MM','49MM'))
      AND (v."screen_size" IS NULL OR trim(v."screen_size") = '' OR trim(v."screen_size") IN ('11"','13"','15"'));

    UPDATE "storage_options" s SET "archived" = true
    WHERE s."archived" IS NOT TRUE
      AND s."value" NOT IN ('64GB','128GB','256GB','512GB','1TB','2TB')
      AND NOT EXISTS (SELECT 1 FROM "products_variants" v WHERE v."storage_id" = s."id")
      AND NOT EXISTS (SELECT 1 FROM "device_models_rels" d WHERE d."storage_options_id" = s."id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`UPDATE "products_variants" SET "ram_option_id" = NULL, "size_option_id" = NULL, "screen_size_option_id" = NULL, "connectivity_option_id" = NULL;`)
}
