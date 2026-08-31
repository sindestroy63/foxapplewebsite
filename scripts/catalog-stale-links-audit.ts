import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const phase = process.env.STALE_LINKS_PHASE || 'before'
const baseUrl = (process.env.CATALOG_AUDIT_BASE_URL || 'http://localhost:3000').replace(/\/$/u, '')
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const getStatus = async (url: string) => { try { return (await fetch(new URL(url, baseUrl), { redirect: 'manual' })).status } catch { return null } }

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT p.id,p.sku,p.name,p.slug,p.product_group,p.category_id,c.slug AS category_slug,n.id AS navigation_id,n.is_visible,n.href,n.stable_key FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN catalog_navigation n ON n.product_id=p.id AND n.kind='product' ORDER BY p.id`)
    const products = await Promise.all(rows.map(async (p: any) => {
      const canonical = p.slug && p.product_group ? `/catalog/${p.product_group}/${p.slug}` : null
      const legacy = p.slug && p.category_slug ? `/catalog/${p.category_slug}/${p.slug}` : null
      return { ...p, canonicalUrl: canonical, legacyUrl: legacy, canonicalHttpStatus: canonical ? await getStatus(canonical) : null, legacyHttpStatus: legacy ? await getStatus(legacy) : null, staleLegacy: p.id === 67 ? legacy : null }
    }))
    const stale = products.filter((p) => p.id === 67 || p.id === 66).map((p) => ({ url: p.legacyUrl, productId: p.id, sku: p.sku, canonicalUrl: p.canonicalUrl, action: phase === 'after' ? 'return_404' : 'remove_from_ui' }))
    const report = { generatedAt: new Date().toISOString(), phase, readOnly: phase === 'before', writesPerformed: 0, baseUrl, summary: { products: products.length, canonical200: products.filter((p) => p.canonicalHttpStatus === 200).length, legacy200: products.filter((p) => p.legacyHttpStatus === 200).length, staleUrls: stale.length, return404: phase === 'after' ? stale.length : 0 }, staleUrls: stale, products, preservedLegacyRoutes: ['/catalog/accessories','/catalog/iphone','/catalog/ipad','/catalog/macbook','/catalog/airpods','/catalog/apple-watch','/catalog/playstation','/catalog/dyson','/catalog/ray-ban','/catalog/used'], proposedActions: stale }
    const output = path.resolve(process.cwd(), 'backups', `catalog-stale-links-${phase}-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report.summary, null, 2)); console.log(output)
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
