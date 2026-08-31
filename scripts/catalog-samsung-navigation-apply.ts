import pg from 'pg'

const oldSlugs = ['samsung', 'samsung-watch', 'samsung-headphones']
async function main() {
  if (process.env.SAMSUNG_NAVIGATION_APPLY_CONFIRM !== 'YES') throw new Error('Refusing to apply without SAMSUNG_NAVIGATION_APPLY_CONFIRM=YES')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(`UPDATE catalog_navigation n SET is_visible=false WHERE n.kind <> 'product' AND n.generated_by='catalog-navigation' AND (lower(coalesce(n.href,'')) LIKE ANY($1) OR n.title IN ('Samsung Phone','Samsung Watch','Samsung Headphones')) RETURNING n.id,n.title,n.stable_key`, [oldSlugs.map((s) => `%/catalog/${s}%`)])
    const hrefs = await client.query(`UPDATE catalog_navigation n SET href='/catalog/' || p.product_group || '/' || p.slug FROM products p WHERE n.kind='product' AND n.generated_by='catalog-navigation' AND p.id=n.product_id AND lower(coalesce(p.brand,''))='samsung' AND p.product_group IN ('smartphones','smart-watches','audio') RETURNING n.id,n.href`, [])
    await client.query('COMMIT')
    console.log(JSON.stringify({ hidden: result.rows, canonicalizedProductHrefs: hrefs.rows, writesPerformed: (result.rowCount || 0) + (hrefs.rowCount || 0) }, null, 2))
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
