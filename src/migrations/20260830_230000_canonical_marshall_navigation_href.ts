import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE catalog_navigation AS n
       SET href = '/catalog/audio/' || p.slug,
           updated_at = now()
      FROM products AS p
     WHERE n.stable_key = 'product:67'
       AND n.kind = 'product'
       AND n.product_id = p.id
       AND n.generated_by = 'catalog-navigation'
       AND p.sku = 'PRD--MARSHALL-P67'
       AND p.product_group = 'audio';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE catalog_navigation AS n
       SET href = '/catalog/drugoe/' || p.slug,
           updated_at = now()
      FROM products AS p
     WHERE n.stable_key = 'product:67'
       AND n.kind = 'product'
       AND n.product_id = p.id
       AND n.generated_by = 'catalog-navigation'
       AND p.sku = 'PRD--MARSHALL-P67';
  `)
}
