import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

const samsung = [
  ['52', 'PRD-S26-ULTRA-P52', 'Samsung Galaxy S26 Ultra', 'Samsung Galaxy S26 Ultra'],
  ['53', 'PRD-S26-PLUS-P53', 'Samsung Galaxy S26 Plus', 'Samsung Galaxy S26 Plus'],
  ['54', 'PRD-S-26-P54', 'Samsung Galaxy S26', 'Samsung Galaxy S26'],
  ['110', 'PRD-SAMSUNG-GALAXY-Z-FOLD8-2026-P110', 'Samsung Galaxy Z Fold8', 'Samsung Galaxy Z Fold8'],
] as const

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`BEGIN`)
  try {
    const count = await db.execute(sql`SELECT COUNT(*)::int AS count FROM products`)
    if (Number((count.rows[0] as { count: number }).count) !== 47) throw new Error('Catalog structure migration expected exactly 47 products.')

    for (const [id, sku, name, model] of samsung) {
      const check = await db.execute(sql`SELECT sku, name, model, slug FROM products WHERE id = ${Number(id)}`)
      const row = check.rows[0] as { sku?: string; name?: string; model?: string; slug?: string } | undefined
      if (!row || row.sku !== sku) throw new Error(`Samsung migration snapshot mismatch for product ${id}.`)
      if (!row.name || !row.model) throw new Error(`Samsung migration missing source name/model for product ${id}.`)
      await db.execute(sql`UPDATE products SET name = ${name}, model = ${model} WHERE id = ${Number(id)}`)
    }

    await db.execute(sql`
      UPDATE products p SET
        product_group = CASE
          WHEN c.slug IN ('iphone', 'samsung') THEN 'smartphones'::"enum_products_product_group"
          WHEN c.slug = 'ipad' THEN 'tablets'::"enum_products_product_group"
          WHEN c.slug = 'macbook' THEN 'laptops'::"enum_products_product_group"
          WHEN c.slug IN ('apple-watch', 'samsung-watch') THEN 'smart-watches'::"enum_products_product_group"
          WHEN c.slug IN ('airpods', 'Samsung-headphones') THEN 'audio'::"enum_products_product_group"
          WHEN c.slug = 'playstation' THEN 'gaming-consoles'::"enum_products_product_group"
          WHEN c.slug = 'dyson' THEN 'home-appliances'::"enum_products_product_group"
          WHEN c.slug = 'drugoe' AND lower(p.name) LIKE '%умные очки%' THEN 'smart-devices'::"enum_products_product_group"
          ELSE 'other'::"enum_products_product_group"
        END,
        brand = CASE
          WHEN c.slug IN ('samsung', 'samsung-watch', 'Samsung-headphones') THEN 'Samsung'
          WHEN c.slug IN ('iphone', 'ipad', 'macbook', 'apple-watch', 'airpods') THEN 'Apple'
          WHEN c.slug = 'dyson' THEN 'Dyson'
          WHEN c.slug = 'playstation' THEN 'Sony'
          WHEN lower(p.name) LIKE '%ray-ban%' THEN 'Ray-Ban'
          ELSE NULL
        END,
        product_type = CASE
          WHEN c.slug = 'dyson' AND lower(p.name) LIKE '%пылесос%' THEN 'Пылесос'
          WHEN c.slug = 'dyson' AND lower(p.name) LIKE '%стайлер%' THEN 'Стайлер'
          WHEN c.slug = 'dyson' AND lower(p.name) LIKE '%выпрямитель%' THEN 'Выпрямитель'
          WHEN c.slug = 'dyson' AND lower(p.name) LIKE '%фен%' THEN 'Фен'
          WHEN c.slug = 'dyson' THEN 'Бытовая техника'
          WHEN c.slug = 'drugoe' AND lower(p.name) LIKE '%умные очки%' THEN 'Умные очки'
          ELSE NULL
        END,
        product_line = NULLIF(BTRIM(p.model), '')
      FROM categories c WHERE c.id = p.category_id
    `)

    const missing = await db.execute(sql`SELECT COUNT(*)::int AS count FROM products WHERE product_group IS NULL`)
    if (Number((missing.rows[0] as { count: number }).count) !== 0) throw new Error('Catalog structure migration left products without productGroup.')
    await db.execute(sql`COMMIT`)
  } catch (error) {
    await db.execute(sql`ROLLBACK`)
    throw error
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`BEGIN`)
  try {
    await db.execute(sql`UPDATE products SET product_group = NULL, brand = NULL, product_type = NULL, product_line = NULL`)
    await db.execute(sql`UPDATE products SET name = CASE id WHEN 52 THEN 'Galaxy S26 Ultra' WHEN 53 THEN 'Galaxy S26 Plus' WHEN 54 THEN 'Galaxy S26' WHEN 110 THEN 'Samsung Galaxy Z Fold8 (2026)' ELSE name END, model = CASE id WHEN 52 THEN 'Galaxy S26 Ultra' WHEN 53 THEN 'Galaxy S26 Plus' WHEN 54 THEN 'Galaxy S26' WHEN 110 THEN 'Galaxy Z Fold8' ELSE model END WHERE id IN (52,53,54,110)`)
    await db.execute(sql`COMMIT`)
  } catch (error) { await db.execute(sql`ROLLBACK`); throw error }
}
