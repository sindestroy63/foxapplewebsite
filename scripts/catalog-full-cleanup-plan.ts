import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const text = (v: unknown) => String(v ?? '').trim()

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const categories = (await client.query('SELECT id,name,slug,is_active,sort_order,cover_image_id FROM categories ORDER BY id')).rows
    const products = (await client.query('SELECT id,name,model,slug,sku,product_group,brand,product_type,product_line,is_available,price,category_id FROM products ORDER BY id')).rows
    const variants = (await client.query("SELECT id,_parent_id AS product_id,sku,generation,color_id,price,is_available FROM products_variants ORDER BY _parent_id,id")).rows
    const navigation = (await client.query('SELECT id,title,kind,parent_id,product_id,href,stable_key,generated_by,is_visible,product_group,brand,product_line FROM catalog_navigation ORDER BY id')).rows
    const other = products.filter((p) => p.product_group === 'other').map((p) => ({ product: p, navigation: navigation.filter((n) => String(n.product_id) === String(p.id)), variants: variants.filter((v) => String(v.product_id) === String(p.id)) }))
    const dyson = products.filter((p) => p.brand === 'Dyson').map((p) => ({ product: p, variants: variants.filter((v) => String(v.product_id) === String(p.id)) }))
    const charging = products.filter((p) => /заряд|кабел/iu.test(`${p.name} ${p.product_line || ''}`)).map((p) => ({ product: p, variants: variants.filter((v) => String(v.product_id) === String(p.id)) }))
    const protectors = products.filter((p) => /стекло/iu.test(`${p.name} ${p.product_line || ''}`)).map((p) => ({ product: p, variants: variants.filter((v) => String(v.product_id) === String(p.id)) }))
    const marshall = products.filter((p) => /marshall/iu.test(`${p.name} ${p.brand || ''}`)).map((p) => ({ product: p, navigation: navigation.filter((n) => String(n.product_id) === String(p.id)) }))
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, summary: { products: products.length, variants: variants.length, categories: categories.length, navigation: navigation.length, otherProducts: other.length, dysonProducts: dyson.length, chargingProducts: charging.length, protectorProducts: protectors.length }, categories, tradeIn: categories.filter((c) => c.slug.toLowerCase() === 'trade-in'), other, marshall, dyson, protectors, charging, product66: products.find((p) => p.id === 66) || null, navigation, actions: { safe_now: ['restore Categories visibility for admins (code-only)', 'keep Product 66 hidden', 'verify generated hrefs'], requires_confirmation: ['any Product split', 'navigation writes', 'field/data changes'], manual_review: ['Dyson model boundaries', 'protector device mapping', 'cable grouping'], blocked_by_media: ['Product 66 deletion or media reassignment'], do_not_touch: ['all Media, prices, SKU, existing slugs, variants, Product 66 data'] }, risks: ['Media volume is not modified; many DB Media records may have no physical files.', 'Product splitting would require new Product SKU/slug decisions and dependency review.'] }
    const dir = path.resolve(process.cwd(), 'backups'); await fs.mkdir(dir, { recursive: true }); const out = path.join(dir, `catalog-full-cleanup-plan-${stamp()}.json`); await fs.writeFile(out, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ ...report.summary, output: out, writesPerformed: 0 }, null, 2))
  } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
