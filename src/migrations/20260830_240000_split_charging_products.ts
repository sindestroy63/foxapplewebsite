import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      source_id integer;
      target_id integer;
      item record;
      existing_count integer;
    BEGIN
      SELECT id INTO source_id FROM products WHERE id = 70 AND sku = 'PRD---P70';
      IF source_id IS NULL THEN RAISE EXCEPTION 'Product 70 with expected SKU not found'; END IF;
      IF (SELECT count(*) FROM products_variants WHERE _parent_id = source_id) <> 5 THEN RAISE EXCEPTION 'Product 70 must have exactly 5 variants'; END IF;
      IF (SELECT count(*) FROM products_rels WHERE parent_id = source_id AND path IN ('variants.0.images','variants.1.images','variants.2.images','variants.3.images','variants.4.images') AND media_id IN (1200,1202,1203,1204,1205)) <> 5 THEN RAISE EXCEPTION 'Expected five Product 70 Media relations with variant paths'; END IF;
      IF EXISTS (SELECT 1 FROM products WHERE sku IN ('PRD-USB-C-20W-CHARGER','PRD-USB-C-LIGHTNING-1M','PRD-USB-C-LIGHTNING-2M','PRD-USB-C-BRAIDED-1M','PRD-USB-C-BRAIDED-2M') AND id NOT IN (SELECT id FROM products WHERE id = 70)) THEN
        SELECT count(*) INTO existing_count FROM products WHERE sku IN ('PRD-USB-C-20W-CHARGER','PRD-USB-C-LIGHTNING-1M','PRD-USB-C-LIGHTNING-2M','PRD-USB-C-BRAIDED-1M','PRD-USB-C-BRAIDED-2M');
        IF existing_count <> 5 THEN RAISE EXCEPTION 'New Product SKU conflict detected'; END IF;
      END IF;
      FOR item IN SELECT * FROM (VALUES
        ('Зарядка USB-C 20W','Зарядка USB-C 20W','usb-c-20w-charger','PRD-USB-C-20W-CHARGER','Зарядное устройство','VAR---V6a16d6f9e7271d1292f1a28c',2500,1205),
        ('Кабель USB-C — Lightning 1 м','Кабель USB-C — Lightning 1 м','usb-c-lightning-1m','PRD-USB-C-LIGHTNING-1M','Кабель','VAR---V6a16013a55aa0ee5e3eee5c9',1990,1200),
        ('Кабель USB-C — Lightning 2 м','Кабель USB-C — Lightning 2 м','usb-c-lightning-2m','PRD-USB-C-LIGHTNING-2M','Кабель','VAR---V6a16d5e4e7271d1292f1a289',2590,1202),
        ('Кабель USB-C — USB-C в оплётке 1 м','Кабель USB-C — USB-C в оплётке 1 м','usb-c-usb-c-braided-1m','PRD-USB-C-BRAIDED-1M','Кабель','VAR---V6a16d6a7e7271d1292f1a28a',2490,1203),
        ('Кабель USB-C — USB-C в оплётке 2 м','Кабель USB-C — USB-C в оплётке 2 м','usb-c-usb-c-braided-2m','PRD-USB-C-BRAIDED-2M','Кабель','VAR---V6a16d6cbe7271d1292f1a28b',2990,1204)
      ) AS x(name,model,slug,sku,product_type,variant_sku,price,media_id) LOOP
        SELECT id INTO target_id FROM products WHERE sku = item.sku;
        IF target_id IS NULL THEN
          INSERT INTO products (name,model,slug,sku,price,is_available,status,product_group,brand,product_type,product_line,category_id,created_at,updated_at)
          VALUES (item.name,item.model,item.slug,item.sku,item.price,true,'in_stock','other',NULL,item.product_type,'Кабели и зарядные устройства',NULL,now(),now())
          RETURNING id INTO target_id;
        END IF;
        IF (SELECT count(*) FROM products_variants WHERE sku=item.variant_sku AND _parent_id=source_id) <> 1 THEN RAISE EXCEPTION 'Expected variant % on Product 70', item.variant_sku; END IF;
        UPDATE products_variants SET _parent_id=target_id, generation=NULL WHERE sku=item.variant_sku AND _parent_id=source_id;
        UPDATE products_rels SET parent_id=target_id, path='images' WHERE parent_id=source_id AND path IN ('variants.0.images','variants.1.images','variants.2.images','variants.3.images','variants.4.images') AND media_id=item.media_id;
        INSERT INTO catalog_navigation (title,kind,parent_id,product_id,href,sort_order,is_visible,is_new,stable_key,generated_by,product_group,brand,product_line,created_at,updated_at)
        SELECT item.name,'product',g.id,target_id,'/catalog/other/' || item.slug,100,true,false,'product:' || target_id,'migration','other',NULL,'Кабели и зарядные устройства',now(),now()
        FROM catalog_navigation g WHERE g.stable_key='group:other' AND NOT EXISTS (SELECT 1 FROM catalog_navigation n WHERE n.stable_key='product:' || target_id);
      END LOOP;
      UPDATE catalog_navigation SET is_visible=false WHERE product_id=source_id AND kind='product';
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  throw new Error('Irreversible charging split: restore from backup and perform a reviewed rollback')
}
