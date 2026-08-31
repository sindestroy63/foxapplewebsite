import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const navigation = (await client.query('SELECT id,title,kind,parent_id,product_group,brand,product_line,href,sort_order,is_visible,is_new,stable_key,generated_by,product_id FROM catalog_navigation ORDER BY parent_id NULLS FIRST, sort_order NULLS LAST, id')).rows
    const conditionColumn = Number((await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='condition' LIMIT 1")).rowCount || 0) > 0
    const products = (await client.query(`SELECT id,name,product_group,slug,sku${conditionColumn ? ',condition' : ''} FROM products WHERE product_group=$1${conditionColumn ? " OR condition=$2" : ''} ORDER BY id`, conditionColumn ? ['trade-in', 'used'] : ['trade-in'])).rows
    const tradeinLinks = navigation.filter((row: any) => row.stable_key === 'service:trade-in' || (row.kind === 'custom_link' && row.href === '/trade-in'))
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, current: { tradeinLinks, tradeinGroup: navigation.filter((row: any) => row.stable_key === 'group:trade-in'), products, navigationChildren: navigation.filter((row: any) => tradeinLinks.some((link: any) => link.id === row.parent_id)) }, proposed: { createGroup: true, deleteOnlyLegacyTradeinLinks: tradeinLinks.map((row: any) => row.id), productGroup: 'trade-in', condition: 'used', canonicalPrefix: '/catalog/trade-in/', servicePath: '/trade-in', migrationNeeded: conditionColumn ? 'No condition column migration needed.' : 'Required before apply: add nullable condition column; this plan does not create migrations or alter rows.' }, risks: ['Existing used products are not moved automatically.', 'A DB migration may be required before storing condition.', 'Trade-in catalog is empty until products are explicitly assigned by a future approved action.'], manualDecisions: ['Confirm whether Trade-in should appear as a tenth catalog group card or a separate service/used section.'] }
    const output = path.resolve(process.cwd(), 'backups', `catalog-tradein-group-plan-${stamp()}.json`); await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8'); console.log(JSON.stringify(report.proposed, null, 2)); console.log(output)
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
