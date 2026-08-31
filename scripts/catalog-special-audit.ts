import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const kind = process.env.CATALOG_SPECIAL_AUDIT || 'placement'
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const products = (await client.query(`SELECT p.id,p.name,p.model,p.sku,p.slug,p.product_group,p.brand,p.product_type,p.product_line,p.price,p.is_available,p.category_id,c.name category_name,c.slug category_slug,(SELECT count(*) FROM products_variants v WHERE v._parent_id=p.id)::int variant_count FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`)).rows
    const variants = (await client.query(`SELECT v.id,v._parent_id product_id,v.sku,v.generation,v.price,v.is_available,v.color_id,v.package_label FROM products_variants v ORDER BY v._parent_id,v.id`)).rows
    const navigation = (await client.query(`SELECT id,kind,title,parent_id,product_id,href,is_visible,stable_key,product_group,brand,product_line FROM catalog_navigation ORDER BY id`)).rows
    const media = (await client.query(`SELECT r.parent_id product_id,r.path,r.media_id,m.filename,m.alt,m.url FROM products_rels r JOIN media m ON m.id=r.media_id WHERE r.parent_id IN (66,67,70) ORDER BY r.parent_id,r.id`)).rows
    const selected = kind === 'apple' ? products.filter((p: any) => [66,115,116,117,118].includes(p.id)) : kind === 'charging' ? products.filter((p: any) => p.id === 70) : products
    const rows = selected.map((p: any) => ({ product: p, variants: variants.filter((v: any) => v.product_id === p.id), navigation: navigation.filter((n: any) => n.product_id === p.id), media: media.filter((m: any) => m.product_id === p.id) }))
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, audit: kind, summary: { products: products.length, variants: variants.length, navigation: navigation.length, selectedProducts: selected.length }, products: rows, allNavigation: kind === 'placement' ? navigation : undefined, proposedActions: kind === 'apple' ? [{ target: 66, action: 'manual_review', reason: 'legacy aggregate with media relations; do not delete automatically' }, { target: [115,116,117,118], action: 'keep' }] : kind === 'charging' ? [{ target: 70, action: 'manual_review', reason: 'generation contains cable/charger product names; split requires confirmation' }] : [{ target: 67, action: 'manual_review', reason: 'Marshall remains productGroup=other; evaluate move to audio without changing data automatically' }], invariants: { pricesChanged: false, skusChanged: false, writesPerformed: 0 } }
    const prefix = kind === 'apple' ? 'catalog-apple-accessories-audit' : kind === 'charging' ? 'catalog-charging-products-audit' : 'catalog-placement-audit'
    const output = path.resolve(process.cwd(), 'backups', `${prefix}-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ ...report.summary, audit: kind, writesPerformed: 0, output }, null, 2))
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
