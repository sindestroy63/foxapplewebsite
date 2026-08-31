import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const confirm = process.env.OTHER_CHARGING_LINE_APPLY_CONFIRM === 'YES'
const productIds = [119, 120, 121, 122, 123]
const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')

async function writeReport(name: string, report: unknown) {
  const output = path.resolve(process.cwd(), 'backups', `${name}-${stamp()}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return output
}

async function snapshot(client: pg.Client) {
  const products = (await client.query('SELECT id,name,sku,slug,product_group,product_type,product_line FROM products WHERE id=ANY($1::int[]) ORDER BY id', [productIds])).rows
  const navigation = (await client.query('SELECT id,kind,title,parent_id,product_id,href,is_visible,stable_key,generated_by,product_group,product_line FROM catalog_navigation WHERE product_id=ANY($1::int[]) OR parent_id=(SELECT id FROM catalog_navigation WHERE stable_key=\'group:other\') ORDER BY id', [productIds])).rows
  return { products, navigation }
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect()
  try {
    const before = await snapshot(client)
    const plan = { generatedAt: new Date().toISOString(), readOnly: !confirm, products: before.products, navigation: before.navigation, action: 'create_or_reuse_generated_line_and_reparent_generated_items', productIds, writesPerformed: 0 }
    const planOutput = await writeReport('catalog-other-charging-line-plan', plan)
    if (!confirm) { console.log(JSON.stringify({ ...plan, planOutput }, null, 2)); return }
    await client.query('BEGIN')
    const group = (await client.query("SELECT id FROM catalog_navigation WHERE stable_key='group:other' AND kind='group' FOR UPDATE")).rows[0]
    if (!group) throw new Error('Other group navigation is missing')
    const products = (await client.query('SELECT id,name,sku,slug,product_group FROM products WHERE id=ANY($1::int[]) FOR SHARE', [productIds])).rows
    if (products.length !== productIds.length || products.some((p: any) => p.product_group !== 'other')) throw new Error('Charging Products preflight failed')
    let line = (await client.query("SELECT * FROM catalog_navigation WHERE stable_key='line:other:charging' FOR UPDATE")).rows[0]
    if (line && (line.kind !== 'line' || line.parent_id !== group.id)) throw new Error('Charging line stableKey conflict')
    if (!line) line = (await client.query(`INSERT INTO catalog_navigation (title,kind,parent_id,href,sort_order,is_visible,is_new,stable_key,generated_by,product_group,product_line,created_at,updated_at) VALUES ('Зарядные устройства','line',$1,'/catalog?group=other&line=%D0%97%D0%B0%D1%80%D1%8F%D0%B4%D0%BD%D1%8B%D0%B5%20%D1%83%D1%81%D1%82%D1%80%D0%BE%D0%B9%D1%81%D1%82%D0%B2%D0%B0',300,true,false,'line:other:charging','other-charging-line','other','Зарядные устройства',now(),now()) RETURNING *`, [group.id])).rows[0]
    const items = (await client.query('SELECT * FROM catalog_navigation WHERE product_id=ANY($1::int[]) AND kind=\'product\' FOR UPDATE', [productIds])).rows
    if (items.some((item: any) => item.generated_by === 'manual')) throw new Error('Manual navigation item found; refusing to change it')
    if (items.length !== productIds.length) throw new Error('Expected one generated product item for every charging Product')
    for (const item of items) await client.query('UPDATE catalog_navigation SET parent_id=$1,is_visible=true,updated_at=now() WHERE id=$2 AND generated_by<>\'manual\'', [line.id, item.id])
    const after = await snapshot(client)
    await client.query('COMMIT')
    const afterOutput = await writeReport('catalog-other-charging-line-after', { generatedAt: new Date().toISOString(), before, after, line, writesPerformed: 1 })
    console.log(JSON.stringify({ applied: true, line, itemIds: items.map((i: any) => i.id), planOutput, afterOutput, writesPerformed: 1 }, null, 2))
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { await client.end() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
