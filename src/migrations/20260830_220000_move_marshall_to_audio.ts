import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      marshall_id integer;
      audio_id integer;
      brand_id integer;
      current_group text;
      current_brand text;
      current_line text;
    BEGIN
      SELECT id, product_group::text, brand, product_line
        INTO marshall_id, current_group, current_brand, current_line
        FROM products
       WHERE sku = 'PRD--MARSHALL-P67'
       LIMIT 1;
      IF marshall_id IS NULL THEN
        RAISE EXCEPTION 'Marshall product with SKU PRD--MARSHALL-P67 not found';
      END IF;
      IF current_group NOT IN ('other', 'audio')
         OR (current_group = 'audio' AND (current_brand IS DISTINCT FROM 'Marshall' OR current_line IS DISTINCT FROM 'Наушники Marshall'))
         OR (current_group = 'other' AND current_line IS DISTINCT FROM 'Наушники Marshall') THEN
        RAISE EXCEPTION 'Unexpected Marshall product metadata: group %, brand %, line %', current_group, current_brand, current_line;
      END IF;

      UPDATE products
         SET product_group = 'audio', brand = 'Marshall', product_type = 'Наушники', product_line = 'Наушники Marshall'
       WHERE id = marshall_id;

      SELECT id INTO audio_id FROM catalog_navigation WHERE stable_key = 'group:audio' LIMIT 1;
      IF audio_id IS NULL THEN RAISE EXCEPTION 'Audio navigation group not found'; END IF;

      SELECT id INTO brand_id
        FROM catalog_navigation
       WHERE stable_key = 'brand:audio:Marshall'
       LIMIT 1;
      IF brand_id IS NULL THEN
        INSERT INTO catalog_navigation (title, kind, product_group, brand, parent_id, sort_order, is_visible, is_new, stable_key, generated_by, created_at, updated_at)
        VALUES ('Marshall', 'brand', 'audio', 'Marshall', audio_id, 90, true, false, 'brand:audio:Marshall', 'catalog-navigation', now(), now())
        RETURNING id INTO brand_id;
      ELSE
        UPDATE catalog_navigation
           SET title = 'Marshall', kind = 'brand', product_group = 'audio', brand = 'Marshall', parent_id = audio_id,
               is_visible = true, generated_by = COALESCE(generated_by, 'catalog-navigation'), updated_at = now()
         WHERE id = brand_id AND (generated_by = 'catalog-navigation' OR generated_by IS NULL);
      END IF;

      UPDATE catalog_navigation
         SET parent_id = brand_id, product_group = 'audio', brand = 'Marshall', product_line = 'Наушники Marshall',
             href = '/catalog/drugoe/Наушники Marshall', is_visible = true, updated_at = now()
       WHERE stable_key = 'product:' || marshall_id
         AND kind = 'product' AND product_id = marshall_id
         AND (generated_by = 'catalog-navigation' OR generated_by IS NULL);
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Generated navigation item for Marshall product not found or is manually managed';
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE marshall_id integer; other_id integer;
    BEGIN
      SELECT id INTO marshall_id FROM products WHERE sku = 'PRD--MARSHALL-P67' LIMIT 1;
      IF marshall_id IS NULL THEN RETURN; END IF;
      UPDATE products SET product_group = 'other', brand = NULL, product_type = NULL, product_line = 'Наушники Marshall' WHERE id = marshall_id;
      SELECT id INTO other_id FROM catalog_navigation WHERE stable_key = 'group:other' LIMIT 1;
      UPDATE catalog_navigation SET parent_id = other_id, product_group = 'other', brand = NULL, product_line = 'Наушники Marshall', href = '/catalog/drugoe/Наушники Marshall', updated_at = now()
       WHERE stable_key = 'product:' || marshall_id AND kind = 'product' AND (generated_by = 'catalog-navigation' OR generated_by IS NULL);
    END $$;
  `)
}
