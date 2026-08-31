import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const stamp = () => new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, '').replace('T', '-')
const clean = (value: unknown) => String(value ?? '').trim()

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(`SELECT n.*, p.product_group AS real_product_group, p.brand AS real_brand, p.product_line AS real_product_line
      FROM catalog_navigation n LEFT JOIN products p ON p.id=n.product_id ORDER BY n.id`)
    const rows = result.rows as any[]
    const byId = new Map(rows.map((row) => [Number(row.id), row]))
    const records = rows.map((row) => {
      const ancestors: any[] = []
      let cursor = row.parent_id ? byId.get(Number(row.parent_id)) : null
      const seen = new Set<number>([Number(row.id)])
      while (cursor && !seen.has(Number(cursor.id))) { ancestors.push(cursor); seen.add(Number(cursor.id)); cursor = cursor.parent_id ? byId.get(Number(cursor.parent_id)) : null }
      const group = ancestors.find((item) => item.kind === 'group') || (row.kind === 'group' ? row : null)
      const brand = ancestors.find((item) => item.kind === 'brand') || (row.kind === 'brand' ? row : null)
      const line = ancestors.find((item) => item.kind === 'line') || (row.kind === 'line' ? row : null)
      const reasons: string[] = []
      if (row.kind === 'brand' && (!group || row.parent_id !== group.id)) reasons.push('brand parent must be its group')
      if (row.kind === 'line' && (!brand || row.parent_id !== brand.id)) reasons.push('line parent must be its brand')
      if (row.kind === 'product') {
        if (!group || clean(group.product_group) !== clean(row.real_product_group)) reasons.push('productGroup does not match ancestor group')
        if (clean(row.real_brand) && (!brand || clean(brand.brand || brand.title) !== clean(row.real_brand))) reasons.push('brand does not match product')
        if (clean(row.real_product_line) && line && clean(line.product_line || line.title) !== clean(row.real_product_line)) reasons.push('productLine does not match product')
        if (clean(row.real_brand) && !line && row.parent_id === group?.id) reasons.push('classified product is attached directly to group')
      }
      return { navigationId: row.id, kind: row.kind, title: row.title, stableKey: row.stable_key, parentId: row.parent_id, ancestorGroup: group?.title || null, ancestorBrand: brand?.title || null, ancestorLine: line?.title || null, productId: row.product_id, realProductGroup: row.real_product_group || null, realBrand: row.real_brand || null, realProductLine: row.real_product_line || null, valid: reasons.length === 0, reason: reasons.join('; ') || null }
    })
    const products = records.filter((record) => record.kind === 'product')
    const report = { generatedAt: new Date().toISOString(), readOnly: true, writesPerformed: 0, summary: { records: records.length, products: products.length, valid: records.filter((record) => record.valid).length, invalid: records.filter((record) => !record.valid).length, uniqueProducts: new Set(products.map((record) => record.productId)).size }, branches: { smartphonesApple: products.filter((record) => record.ancestorGroup === 'Смартфоны' && record.ancestorBrand === 'Apple'), smartphonesSamsung: products.filter((record) => record.ancestorGroup === 'Смартфоны' && record.ancestorBrand === 'Samsung'), smartWatchesApple: products.filter((record) => record.ancestorGroup === 'Смарт-часы' && record.ancestorBrand === 'Apple') }, records }
    const output = path.resolve(process.cwd(), 'backups', `catalog-navigation-semantic-audit-${stamp()}.json`)
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify(report.summary, null, 2)); console.log(output)
  } finally { await client.end() }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
