import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_variants" ADD COLUMN IF NOT EXISTS "package_label" varchar;
    DO $$
    DECLARE category_id integer; brand_id integer; airtag_id integer; mouse_id integer; pencil_usb_id integer; pencil_pro_id integer;
    BEGIN
      SELECT p.category_id INTO category_id FROM products p WHERE p.id=66;
      IF category_id IS NULL THEN RAISE EXCEPTION 'Product 66 not found'; END IF;
      INSERT INTO products (category_id,name,slug,model,price,is_available,sku,product_group,brand,product_type,product_line,created_at,updated_at) VALUES
        (category_id,'Apple AirTag','apple-airtag','Apple AirTag',4990,true,'PRD-APPLE-AIRTAG','other','Apple','Трекер','AirTag',now(),now()) ON CONFLICT DO NOTHING RETURNING id INTO airtag_id;
      IF airtag_id IS NULL THEN SELECT id INTO airtag_id FROM products WHERE sku='PRD-APPLE-AIRTAG'; END IF;
      INSERT INTO products (category_id,name,slug,model,price,is_available,sku,product_group,brand,product_type,product_line,created_at,updated_at) VALUES
        (category_id,'Apple Magic Mouse USB-C','apple-magic-mouse-usb-c','Apple Magic Mouse USB-C',8990,true,'PRD-APPLE-MAGIC-MOUSE-USB-C','other','Apple','Мышь','Magic Mouse',now(),now()) ON CONFLICT DO NOTHING RETURNING id INTO mouse_id;
      IF mouse_id IS NULL THEN SELECT id INTO mouse_id FROM products WHERE sku='PRD-APPLE-MAGIC-MOUSE-USB-C'; END IF;
      INSERT INTO products (category_id,name,slug,model,price,is_available,sku,product_group,brand,product_type,product_line,created_at,updated_at) VALUES
        (category_id,'Apple Pencil USB-C','apple-pencil-usb-c','Apple Pencil USB-C',7700,true,'PRD-APPLE-PENCIL-USB-C','other','Apple','Стилус','Apple Pencil',now(),now()) ON CONFLICT DO NOTHING RETURNING id INTO pencil_usb_id;
      IF pencil_usb_id IS NULL THEN SELECT id INTO pencil_usb_id FROM products WHERE sku='PRD-APPLE-PENCIL-USB-C'; END IF;
      INSERT INTO products (category_id,name,slug,model,price,is_available,sku,product_group,brand,product_type,product_line,created_at,updated_at) VALUES
        (category_id,'Apple Pencil Pro','apple-pencil-pro','Apple Pencil Pro',11100,true,'PRD-APPLE-PENCIL-PRO','other','Apple','Стилус','Apple Pencil',now(),now()) ON CONFLICT DO NOTHING RETURNING id INTO pencil_pro_id;
      IF pencil_pro_id IS NULL THEN SELECT id INTO pencil_pro_id FROM products WHERE sku='PRD-APPLE-PENCIL-PRO'; END IF;
      UPDATE products_variants SET _parent_id=airtag_id, package_label=CASE WHEN generation ILIKE '%4шт%' THEN '4 шт' ELSE '1 шт' END, generation=NULL WHERE _parent_id=66 AND sku IN ('VAR--APPLE-V6a16ed93e7271d1292f1a298','VAR--APPLE-V6a16edd1e7271d1292f1a299');
      UPDATE products_variants SET _parent_id=mouse_id, generation=NULL WHERE _parent_id=66 AND sku IN ('VAR--APPLE-V6a16ecece7271d1292f1a295','VAR--APPLE-V6a16ec8ce7271d1292f1a294');
      UPDATE products_variants SET _parent_id=pencil_usb_id, generation=NULL, package_label=NULL WHERE _parent_id=66 AND sku='VAR--APPLE-V6a16ed4de7271d1292f1a297';
      UPDATE products_variants SET _parent_id=pencil_pro_id, generation=NULL, package_label=NULL WHERE _parent_id=66 AND sku='VAR--APPLE-V6a16ed21e7271d1292f1a296';
      SELECT id INTO brand_id FROM catalog_navigation WHERE stable_key='brand:other:Apple' LIMIT 1;
      IF brand_id IS NULL THEN
        INSERT INTO catalog_navigation (title,kind,product_group,brand,href,sort_order,is_visible,is_new,stable_key,generated_by,created_at,updated_at) VALUES ('Apple','brand','other','Apple',NULL,90,true,false,'brand:other:Apple','migration',now(),now()) RETURNING id INTO brand_id;
      ELSE
        UPDATE catalog_navigation SET is_visible=true, updated_at=now() WHERE id=brand_id;
      END IF;
      UPDATE catalog_navigation SET is_visible=false WHERE product_id=66 AND kind='product';
      INSERT INTO catalog_navigation (title,kind,product_group,brand,product_line,href,sort_order,is_visible,is_new,stable_key,generated_by,parent_id,product_id,created_at,updated_at)
        SELECT 'Apple AirTag','product','other','Apple','AirTag','/catalog/drugoe/apple-airtag',100,true,false,'product:'||airtag_id,'migration',brand_id,airtag_id,now(),now()
        WHERE NOT EXISTS (SELECT 1 FROM catalog_navigation WHERE stable_key='product:'||airtag_id);
      UPDATE catalog_navigation SET parent_id=brand_id,product_id=airtag_id,is_visible=true,href='/catalog/drugoe/apple-airtag',updated_at=now() WHERE stable_key='product:'||airtag_id;
      INSERT INTO catalog_navigation (title,kind,product_group,brand,product_line,href,sort_order,is_visible,is_new,stable_key,generated_by,parent_id,product_id,created_at,updated_at)
        SELECT 'Apple Magic Mouse USB-C','product','other','Apple','Magic Mouse','/catalog/drugoe/apple-magic-mouse-usb-c',101,true,false,'product:'||mouse_id,'migration',brand_id,mouse_id,now(),now()
        WHERE NOT EXISTS (SELECT 1 FROM catalog_navigation WHERE stable_key='product:'||mouse_id);
      UPDATE catalog_navigation SET parent_id=brand_id,product_id=mouse_id,is_visible=true,href='/catalog/drugoe/apple-magic-mouse-usb-c',updated_at=now() WHERE stable_key='product:'||mouse_id;
      INSERT INTO catalog_navigation (title,kind,product_group,brand,product_line,href,sort_order,is_visible,is_new,stable_key,generated_by,parent_id,product_id,created_at,updated_at)
        SELECT 'Apple Pencil USB-C','product','other','Apple','Apple Pencil','/catalog/drugoe/apple-pencil-usb-c',102,true,false,'product:'||pencil_usb_id,'migration',brand_id,pencil_usb_id,now(),now()
        WHERE NOT EXISTS (SELECT 1 FROM catalog_navigation WHERE stable_key='product:'||pencil_usb_id);
      UPDATE catalog_navigation SET parent_id=brand_id,product_id=pencil_usb_id,is_visible=true,href='/catalog/drugoe/apple-pencil-usb-c',updated_at=now() WHERE stable_key='product:'||pencil_usb_id;
      INSERT INTO catalog_navigation (title,kind,product_group,brand,product_line,href,sort_order,is_visible,is_new,stable_key,generated_by,parent_id,product_id,created_at,updated_at)
        SELECT 'Apple Pencil Pro','product','other','Apple','Apple Pencil','/catalog/drugoe/apple-pencil-pro',103,true,false,'product:'||pencil_pro_id,'migration',brand_id,pencil_pro_id,now(),now()
        WHERE NOT EXISTS (SELECT 1 FROM catalog_navigation WHERE stable_key='product:'||pencil_pro_id);
      UPDATE catalog_navigation SET parent_id=brand_id,product_id=pencil_pro_id,is_visible=true,href='/catalog/drugoe/apple-pencil-pro',updated_at=now() WHERE stable_key='product:'||pencil_pro_id;
    END $$;
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> { await db.execute(sql`ALTER TABLE "products_variants" DROP COLUMN IF EXISTS "package_label";`) }
