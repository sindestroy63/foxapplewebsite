import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'
import { productCanonicalUrl } from '../src/lib/product-url.ts'

const { Client } = pg
const apply = process.env.CATALOG_REPAIR_APPLY === '1'
const reviewNavigationIds = new Set([275])
const stableSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  let transactionStarted = false
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT n.id, n.product_id, n.href, p.slug, p.product_group,
             json_build_object('slug', c.slug) AS category
      FROM catalog_navigation n
      JOIN products p ON p.id = n.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE n.kind = 'product'
      ORDER BY n.id
    `)
    const changes: Array<{ id: number; from: string | null; to: string; status: 'SAFE' | 'REVIEW' }> = []
    for (const row of rows as any[]) {
      const canonical = productCanonicalUrl({
        slug: row.slug,
        productGroup: row.product_group,
        category: row.category,
      })
      if (canonical && row.href !== canonical) changes.push({
        id: row.id,
        from: row.href,
        to: canonical,
        status: reviewNavigationIds.has(Number(row.id)) || !stableSlugPattern.test(String(row.slug || '')) ? 'REVIEW' : 'SAFE',
      })
    }
    const safeChanges = changes.filter((change) => change.status === 'SAFE')
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', changes: changes.length, safe: safeChanges.length, review: changes.length - safeChanges.length }, null, 2))
    if (apply && safeChanges.length) {
      const backup = {
        generatedAt: new Date().toISOString(),
        source: 'catalog-canonical-repair',
        navigation: rows.filter((row: any) => safeChanges.some((change) => change.id === Number(row.id))),
      }
      const backupPath = path.resolve(process.cwd(), 'backups', `catalog-canonical-repair-${stamp()}.json`)
      await fs.mkdir(path.dirname(backupPath), { recursive: true })
      await fs.writeFile(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')
      await client.query('BEGIN')
      transactionStarted = true
    }
    for (const change of changes) {
      console.log(`${change.status} ${apply && change.status === 'SAFE' ? 'UPDATE' : 'WOULD_UPDATE'} navigation ${change.id}: ${change.from || '(empty)'} -> ${change.to}`)
      if (apply && change.status === 'SAFE') await client.query('UPDATE catalog_navigation SET href = $1 WHERE id = $2', [change.to, change.id])
    }
    if (apply && safeChanges.length) {
      await client.query('COMMIT')
      transactionStarted = false
    }
  } finally {
    if (transactionStarted) await client.query('ROLLBACK').catch(() => undefined)
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})