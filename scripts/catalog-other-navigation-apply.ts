import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
async function main() {
  if (process.env.CATALOG_OTHER_NAVIGATION_APPLY_CONFIRM !== 'YES') throw new Error('Refusing to apply without CATALOG_OTHER_NAVIGATION_APPLY_CONFIRM=YES')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    await client.query('BEGIN')
    const group = await client.query("SELECT id FROM catalog_navigation WHERE stable_key='group:other' AND kind='group' LIMIT 1")
    if (!group.rows[0]) throw new Error('Generated Other group not found')
    const otherId = Number(group.rows[0].id)
    const apple = await client.query("SELECT id,generated_by FROM catalog_navigation WHERE stable_key='brand:other:Apple' AND kind='brand' LIMIT 1")
    if (!apple.rows[0] || !['migration','catalog-navigation'].includes(apple.rows[0].generated_by)) throw new Error('Apple navigation node missing or manually managed')
    const appleId = Number(apple.rows[0].id)
    await client.query('UPDATE catalog_navigation SET parent_id=$1 WHERE id=$2', [otherId, appleId])
    await client.query("DELETE FROM catalog_navigation_rels WHERE catalog_navigation_id=$1 AND path='parent'", [appleId])
    await client.query("INSERT INTO catalog_navigation_rels(parent_id,catalog_navigation_id,products_id,path,\"order\") VALUES($1,$2,NULL,'parent',0)", [otherId, appleId])
    const updated = await client.query("UPDATE catalog_navigation n SET href='/catalog/' || p.product_group || '/' || p.slug FROM products p WHERE n.kind='product' AND n.generated_by IN ('catalog-navigation','migration') AND p.id=n.product_id AND p.product_group='other' AND p.id<>66 RETURNING n.id,n.product_id,n.href", [])
    await client.query('COMMIT')
    const report = { generatedAt: new Date().toISOString(), writesPerformed: (updated.rowCount || 0) + 1, parent: { id: appleId, parentId: otherId }, updated: updated.rows, product66Excluded: true }
    const out = path.resolve(process.cwd(),'backups',`catalog-other-navigation-after-${stamp()}.json`); await fs.writeFile(out, `${JSON.stringify(report,null,2)}\n`); console.log(JSON.stringify({ ...report, output: out }, null, 2))
  } catch (e) { await client.query('ROLLBACK'); throw e } finally { await client.end() }
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
