import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const confirm = process.env.CATALOG_NAVIGATION_ORPHANS_CLEANUP_CONFIRM === 'YES'
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const rows = (await client.query(`SELECT n.id,n.title,n.kind,n.product_id,n.parent_id,n.stable_key,n.is_visible,n.generated_by,n.href,p.name AS product_name,(SELECT count(*) FROM catalog_navigation c WHERE c.parent_id=n.id)::int AS children_count FROM catalog_navigation n LEFT JOIN products p ON p.id=n.product_id WHERE n.kind='product' ORDER BY n.id`)).rows
    const orphans = rows.filter((row) => row.product_id != null && row.product_name == null)
    const manualReview = orphans.filter((row) => row.children_count > 0)
    const report = { generatedAt: new Date().toISOString(), readOnly: !confirm, totalProductNavigation: rows.length, orphanProductNavigation: orphans.map((row) => ({ ...row, action: row.children_count === 0 ? 'delete' : 'manual_review', risk: row.children_count === 0 ? 'orphan product relation only' : 'has children' })), manualReview, validDysonProducts: rows.filter((row) => [125,126,127,128].includes(Number(row.product_id))).map((row) => ({ id: row.product_id, title: row.title })) }
    const planPath = path.resolve(process.cwd(), 'backups', `catalog-navigation-orphans-plan-${stamp()}.json`); await fs.mkdir(path.dirname(planPath), { recursive: true }); await fs.writeFile(planPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify(report, null, 2))
    if (!confirm) return
    if (manualReview.length) throw new Error(`Manual review required for orphan navigation with children: ${manualReview.map((row) => row.id).join(',')}`)
    await client.query('BEGIN')
    const deleted = []
    for (const row of orphans) { const check = await client.query('SELECT count(*)::int AS n FROM catalog_navigation WHERE parent_id=$1', [row.id]); if (check.rows[0].n) throw new Error(`Orphan ${row.id} has children`); const result = await client.query('DELETE FROM catalog_navigation WHERE id=$1 AND kind=\'product\' AND NOT EXISTS (SELECT 1 FROM products WHERE id=catalog_navigation.product_id) RETURNING id,title,product_id', [row.id]); if (result.rowCount) deleted.push(result.rows[0]) }
    await client.query('COMMIT')
    const after = { generatedAt: new Date().toISOString(), deleted, remainingOrphans: (await client.query("SELECT n.id,n.product_id FROM catalog_navigation n LEFT JOIN products p ON p.id=n.product_id WHERE n.kind='product' AND n.product_id IS NOT NULL AND p.id IS NULL")).rows, validDysonProducts: (await client.query('SELECT id,name FROM products WHERE id IN (125,126,127,128) ORDER BY id')).rows }
    const afterPath = path.resolve(process.cwd(), 'backups', `catalog-navigation-orphans-after-${stamp()}.json`); await fs.writeFile(afterPath, `${JSON.stringify(after, null, 2)}\n`); console.log(JSON.stringify(after, null, 2))
  } catch (error) { if (confirm) await client.query('ROLLBACK').catch(() => undefined); throw error } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
