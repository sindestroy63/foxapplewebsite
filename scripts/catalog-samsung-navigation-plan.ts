import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const oldSlugs = new Set(['samsung', 'samsung-watch', 'samsung-headphones'])
const clean = (v: unknown) => String(v ?? '').trim()

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const categories = (await client.query('SELECT id,name,slug,is_active,sort_order FROM categories WHERE lower(slug) IN ($1,$2,$3) ORDER BY id', [...oldSlugs])).rows
    const products = (await client.query(`SELECT p.id,p.sku,p.slug,p.name,p.product_group,p.brand,p.product_line,p.category_id,c.slug category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE lower(c.slug) IN ($1,$2,$3) ORDER BY p.id`, [...oldSlugs])).rows
    const navigation = (await client.query('SELECT id,title,kind,parent_id,product_id,href,stable_key,generated_by,is_visible,product_group,brand,product_line FROM catalog_navigation ORDER BY id')).rows
    const oldNodes = navigation.filter((n) => n.kind !== 'product' && ([...oldSlugs].some((s) => clean(n.href).toLowerCase().includes(`/catalog/${s}`)) || ['Samsung Phone','Samsung Watch','Samsung Headphones'].includes(clean(n.title))))
    const productItems = navigation.filter((n) => n.kind === 'product' && products.some((p) => String(p.id) === String(n.product_id)))
    const hrefChanges = productItems.map((n) => { const p = products.find((x) => String(x.id) === String(n.product_id)); return p ? { id: n.id, from: n.href, to: `/catalog/${p.product_group}/${p.slug}` } : null }).filter(Boolean)
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, categories, products, navigation: { oldCategoryNodes: oldNodes, affectedProductItems: productItems, hrefChanges }, legacyUrls: ['/catalog/samsung','/catalog/samsung-watch','/catalog/samsung-headphones'], proposedAction: 'hide only generated old category nodes and canonicalize generated Samsung product hrefs; preserve Categories and legacy routes', conflicts: oldNodes.filter((n) => n.generated_by !== 'catalog-navigation').map((n) => ({ id: n.id, reason: 'manual_or_unknown_navigation_record' })) }
    const dir = path.resolve(process.cwd(), 'backups'); await fs.mkdir(dir, { recursive: true }); const out = path.join(dir, `catalog-samsung-navigation-plan-${stamp()}.json`); await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`)
    const sql = `-- Read-only backup generated before Samsung navigation apply\n-- generatedAt: ${report.generatedAt}\nBEGIN;\n${navigation.map((n) => `-- catalog_navigation id=${n.id} stable_key=${JSON.stringify(n.stable_key)} is_visible=${n.is_visible}`).join('\n')}\nROLLBACK;\n`; await fs.writeFile(path.join(dir, `catalog-samsung-navigation-before-${stamp()}.sql`), sql)
    console.log(JSON.stringify({ categories: categories.length, products: products.length, oldCategoryNodes: oldNodes.length, affectedProductItems: productItems.length, conflicts: report.conflicts.length, output: out }, null, 2))
    if (report.conflicts.length) process.exitCode = 2
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
