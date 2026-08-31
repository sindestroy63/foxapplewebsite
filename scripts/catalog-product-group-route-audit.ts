import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const baseUrl = (process.env.CATALOG_AUDIT_BASE_URL || 'http://localhost:3001').replace(/\/$/u, '')
const groupSlugs = new Set(['smartphones', 'tablets', 'laptops', 'smart-watches', 'audio', 'gaming-consoles', 'home-appliances', 'smart-devices', 'other'])
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function status(href: string) {
  try { return (await fetch(new URL(href, baseUrl), { redirect: 'manual' })).status } catch { return null }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(`SELECT p.id,p.sku,p.name,p.slug,p.product_group,p.category_id,c.name AS category_name,c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id`)
    const products = result.rows as any[]
    const rows = []
    for (const p of products) {
      const groupSlug = groupSlugs.has(p.product_group) ? p.product_group : null
      const legacyUrl = p.category_slug && p.slug ? `/catalog/${p.category_slug}/${p.slug}` : null
      const canonicalUrl = groupSlug && p.slug ? `/catalog/${groupSlug}/${p.slug}` : null
      rows.push({
        productId: p.id, sku: p.sku, name: p.name, slug: p.slug, productGroup: p.product_group,
        category: { id: p.category_id, name: p.category_name, slug: p.category_slug },
        legacyUrl, canonicalUrl,
        legacyHttpStatus: legacyUrl ? await status(legacyUrl) : null,
        canonicalHttpStatus: canonicalUrl ? await status(canonicalUrl) : null,
        groupMatchesCategoryUrl: legacyUrl === canonicalUrl,
        action: canonicalUrl && legacyUrl !== canonicalUrl ? 'new_canonical_route' : 'keep',
      })
    }
    const report = {
      generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, baseUrl,
      summary: {
        products: rows.length,
        groupCategoryMismatches: rows.filter((r) => r.canonicalUrl && r.legacyUrl !== r.canonicalUrl).length,
        canonical200: rows.filter((r) => r.canonicalHttpStatus === 200).length,
        legacy200: rows.filter((r) => r.legacyHttpStatus === 200).length,
        canonicalBroken: rows.filter((r) => r.canonicalUrl && r.canonicalHttpStatus !== 200).length,
        manualReview: rows.filter((r) => !r.canonicalUrl || r.canonicalHttpStatus !== 200).length,
      },
      products: rows,
      proposedActions: rows.filter((r) => r.action !== 'keep').map((r) => ({ productId: r.productId, action: r.action, canonicalUrl: r.canonicalUrl })),
    }
    const output = path.resolve(process.cwd(), 'backups', `catalog-product-group-route-audit-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report.summary, null, 2))
    console.log(output)
  } finally { await client.end() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
